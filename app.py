import os
import sys
import shutil
import tempfile
import asyncio
from typing import List, Tuple, Optional
import gradio as gr

# Ensure backend package is bound properly into sys.modules
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import backend.app as backend_app
sys.modules["app"] = backend_app

from app.services.audio_extractor import AudioExtractor
from app.services.transcription import TranscriptionService
from app.services.virality import ViralityService
from app.services.captions import CaptionGenerator, hex_to_ass_color
from app.services.video_renderer import VideoRenderer
from app.services.srt_service import SrtService
from app.services.social_service import SocialService
import yt_dlp


def download_youtube_video(url: str, output_dir: str) -> str:
    """Downloads a YouTube video stream capped at 1080p."""
    ydl_opts = {
        "format": "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": os.path.join(output_dir, "source.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        if not filename.endswith(".mp4"):
            filename = os.path.splitext(filename)[0] + ".mp4"
        return filename


def process_video_pipeline(
    video_file,
    youtube_url: str,
    aspect_ratio: str,
    caption_color: str,
    target_clips: int,
    rights_confirmed: bool,
    progress=gr.Progress(track_tqdm=True),
) -> Tuple[Optional[str], Optional[str], str, str]:
    """
    End-to-End AI Clipping Pipeline for Gradio:
    1. Ingestion (File or YouTube)
    2. 16kHz Audio extraction
    3. Faster-Whisper Speech-to-Text
    4. Virality scoring
    5. FFmpeg smart reframe + animated karaoke captions
    """
    if not rights_confirmed:
        raise gr.Error("You must affirm copyright ownership or permission to process this video.")

    work_dir = tempfile.mkdtemp(prefix="clipforge_")

    try:
        # Step 1: Ingestion
        progress(0.05, desc="Ingesting source video...")
        if video_file:
            source_path = video_file
        elif youtube_url and youtube_url.strip():
            progress(0.1, desc="Downloading video from YouTube link...")
            source_path = download_youtube_video(youtube_url.strip(), work_dir)
        else:
            raise gr.Error("Please provide either a video file upload or a valid YouTube URL.")

        if not os.path.exists(source_path):
            raise gr.Error("Source video file could not be found.")

        # Step 2: Audio extraction
        progress(0.2, desc="Extracting 16kHz audio stream with FFmpeg...")
        audio_extractor = AudioExtractor()
        meta = audio_extractor.probe_video(source_path)
        duration = meta.get("duration", 60.0)
        audio_path = os.path.join(work_dir, "audio.wav")
        audio_extractor.extract_audio(source_path, audio_path)

        # Step 3: Transcription
        progress(0.35, desc="Transcribing speech with Whisper AI (word timestamps)...")
        transcriber = TranscriptionService()
        trans_result = transcriber.transcribe(audio_path, duration=duration)

        if not trans_result.segments:
            raise gr.Error("No intelligible speech detected in the source video.")

        # Step 4: Virality Scoring
        progress(0.65, desc="Analyzing virality, emotional hooks & punchlines...")
        virality_service = ViralityService()
        clips_data = asyncio.run(
            virality_service.detect_clips(
                transcript_text=trans_result.raw_text,
                segments=trans_result.segments,
                num_clips=target_clips,
            )
        )

        if not clips_data:
            raise gr.Error("Could not extract any viral moments within duration constraints.")

        # Pick top clip
        top_clip = clips_data[0]
        start_t = top_clip["start_time"]
        end_t = top_clip["end_time"]
        clip_dur = top_clip["duration"]

        progress(0.8, desc=f"Rendering top viral clip ({clip_dur:.1f}s) in {aspect_ratio}...")

        # Step 5: Caption styling & burning
        caption_gen = CaptionGenerator()
        color_map = {
            "Yellow": "#FFCC00",
            "Cyan": "#00FFFF",
            "White": "#FFFFFF",
            "Magenta": "#FF007F",
        }
        highlight_hex = color_map.get(caption_color, "#FFCC00")

        # Filter words for this clip
        clip_words = []
        for seg in trans_result.segments:
            for w in seg.get("words", []):
                if w["start"] >= start_t - 0.5 and w["end"] <= end_t + 0.5:
                    clip_words.append(w)

        ass_path = os.path.join(work_dir, "captions.ass")
        caption_gen.generate_ass_subtitles(
            words=clip_words,
            clip_start=start_t,
            clip_end=end_t,
            output_ass_path=ass_path,
            style={
                "font": "Inter",
                "font_size": 28,
                "primary_color": "#FFFFFF",
                "highlight_color": highlight_hex,
                "position": "bottom",
            },
            title_banner=top_clip.get("title", ""),
        )

        # Step 6: Render clip with FFmpeg
        rendered_mp4 = os.path.join(work_dir, "viral_clip.mp4")
        renderer = VideoRenderer()
        renderer.render_clip(
            source_video_path=source_path,
            output_clip_path=rendered_mp4,
            start_time=start_t,
            end_time=end_t,
            aspect_ratio=aspect_ratio,
            reframe_mode="auto_face",
            ass_subtitle_path=ass_path if os.path.exists(ass_path) else None,
            target_resolution="1080p",
        )

        # Step 7: Export SRT
        srt_path = os.path.join(work_dir, "captions.srt")
        srt_content = SrtService.generate_srt_for_clip(clip_words, start_t, end_t)
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # Social metadata
        social = SocialService.generate_social_metadata(
            clip_title=top_clip.get("title", "Viral Clip"),
            hook_text=top_clip.get("hook_text", ""),
            transcript_excerpt=top_clip.get("transcript_excerpt", ""),
            duration=clip_dur,
            virality_score=top_clip.get("virality_score", 85),
        )

        progress(1.0, desc="Clip generation complete!")

        summary_md = f"""
### 🔥 Top Viral Clip Extracted
- **Title**: {top_clip.get('title', 'Viral Clip')}
- **Virality Score**: **{top_clip.get('virality_score', 85)}/100**
- **Duration**: {clip_dur:.1f} seconds ({start_t:.1f}s - {end_t:.1f}s)
- **Opening Hook**: *"{top_clip.get('hook_text', '')}"*

#### 📱 Ready-to-Post Social Copy:
```
{social['full_copy']}
```
"""
        return rendered_mp4, srt_path, summary_md, social["full_copy"]

    except Exception as e:
        raise gr.Error(f"Pipeline error: {str(e)}")


# -------------------------------------------------------------
# Gradio Modern Dark UI Definition
# -------------------------------------------------------------
custom_theme = gr.themes.Soft(
    primary_hue="rose",
    secondary_hue="amber",
    neutral_hue="zinc",
).set(
    body_background_fill="#09090b",
    block_background_fill="#18181b",
    block_border_width="1px",
    block_border_color="#27272a",
)

with gr.Blocks(title="ClipForge AI") as demo:
    gr.Markdown(
        """
        # 🎬 ClipForge AI — Video Repurposing Studio
        ### Transform long videos, lectures, and podcasts into viral vertical short-form clips (9:16) with animated subtitles and smart reframing.
        """
    )

    with gr.Row():
        with gr.Column(scale=5):
            with gr.Tab("YouTube Import"):
                yt_input = gr.Textbox(
                    label="YouTube Video Link",
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/...",
                )
            with gr.Tab("Direct Video Upload"):
                file_input = gr.Video(label="Upload Video File (MP4, MOV)", sources=["upload"])

            with gr.Row():
                ratio_dropdown = gr.Dropdown(
                    label="Aspect Ratio",
                    choices=["9:16", "1:1", "16:9"],
                    value="9:16",
                )
                color_dropdown = gr.Dropdown(
                    label="Caption Highlight Color",
                    choices=["Yellow", "Cyan", "White", "Magenta"],
                    value="Yellow",
                )
                clips_count_slider = gr.Slider(
                    label="Viral Moments to Probe",
                    minimum=1,
                    maximum=5,
                    value=3,
                    step=1,
                )

            rights_check = gr.Checkbox(
                label="I own this video, have license/permission, or it is authorized for reuse (Required)",
                value=True,
            )

            submit_btn = gr.Button("⚡ Extract Viral Short Clip", variant="primary", size="lg")

        with gr.Column(scale=5):
            output_video = gr.Video(label="Generated Viral Clip (9:16 / 1:1)")
            output_srt = gr.File(label="Download SubRip Captions (.SRT)")
            output_summary = gr.Markdown(label="Clip Intelligence & Virality Breakdown")
            copy_box = gr.Textbox(label="One-Click Social Post Copy & Hashtags", lines=4, buttons=["copy"])

    submit_btn.click(
        fn=process_video_pipeline,
        inputs=[
            file_input,
            yt_input,
            ratio_dropdown,
            color_dropdown,
            clips_count_slider,
            rights_check,
        ],
        outputs=[output_video, output_srt, output_summary, copy_box],
    )

    gr.Markdown(
        """
        ---
        <div style="text-align: center; font-size: 12px; color: #71717a;">
            ClipForge AI • Strict Copyright Compliance • 30-Day Auto Retention • No Bypass Filters
        </div>
        """
    )


if __name__ == "__main__":
    demo.launch(theme=custom_theme, server_name="0.0.0.0", server_port=7860)
