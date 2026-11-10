import os
import shutil
import subprocess
from typing import Dict, Any, Optional
from app.services.audio_extractor import get_ffmpeg_executable
from app.services.reframe import ReframeService
from app.services.captions import CaptionGenerator
from app.services.storage import get_storage_service


class VideoRenderer:
    """Renders video clips with trimming, multi-aspect ratio reframing, animated captions, and audio overlays."""

    def __init__(self):
        self.ffmpeg_bin = get_ffmpeg_executable()
        self.reframe_service = ReframeService()
        self.caption_generator = CaptionGenerator()
        self.storage = get_storage_service()

    def render_clip(
        self,
        source_video_path: str,
        start_time: float,
        end_time: float,
        output_mp4_path: str,
        words_data: Optional[list] = None,
        aspect_ratio: str = "9:16",
        reframe_mode: str = "auto_face",
        focus_x: Optional[float] = None,
        resolution: str = "1080p",
        captions_enabled: bool = True,
        style_config: Optional[Dict[str, Any]] = None,
        title_overlay_text: Optional[str] = None,
        music_track_path: Optional[str] = None,
        music_volume: float = 0.2,
        music_ducking: bool = True,
        watermark_path: Optional[str] = None,
        remove_filler_words: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes FFmpeg pipeline: Trim -> Face/Aspect Reframe -> Burn Captions -> Audio Mix -> H.264 encode.
        """
        os.makedirs(os.path.dirname(output_mp4_path), exist_ok=True)
        probe_meta = self._probe_video(source_video_path)
        src_w = probe_meta.get("width", 1920)
        src_h = probe_meta.get("height", 1080)

        # 1. Determine Speaker Focus Coordinate
        if focus_x is None:
            if reframe_mode == "auto_face":
                focus_x = self.reframe_service.detect_speaker_focus(
                    source_video_path, start_time, end_time
                )
            else:
                focus_x = 0.5

        # 2. Build Reframe Filter & Determine Target Dimensions
        reframe_filter = self.reframe_service.build_ffmpeg_filter(
            video_width=src_w,
            video_height=src_h,
            aspect_ratio=aspect_ratio,
            reframe_mode=reframe_mode,
            focus_x=focus_x,
            target_resolution=resolution,
        )

        if aspect_ratio == "1:1":
            out_w, out_h = (1080, 1080) if resolution == "1080p" else (720, 720)
        elif aspect_ratio == "16:9":
            out_w, out_h = (1920, 1080) if resolution == "1080p" else (1280, 720)
        else:  # 9:16 vertical
            out_w, out_h = (1080, 1920) if resolution == "1080p" else (720, 1280)

        # 3. Generate ASS Subtitle File if captions enabled
        filters = [reframe_filter]
        ass_temp_path = None
        if captions_enabled and words_data:
            ass_temp_path = output_mp4_path.replace(".mp4", ".ass")
            self.caption_generator.generate_ass_file(
                words_data=words_data,
                clip_start=start_time,
                clip_end=end_time,
                output_ass_path=ass_temp_path,
                style_config=style_config,
                video_width=out_w,
                video_height=out_h,
                title_overlay_text=title_overlay_text,
                remove_filler_words=remove_filler_words,
            )
            # Escape path for FFmpeg filter on Windows
            escaped_ass = ass_temp_path.replace("\\", "/").replace(":", "\\:")
            filters.append(f"ass='{escaped_ass}'")

        # 4. Optional Watermark Filter
        if watermark_path and os.path.exists(watermark_path):
            escaped_wm = watermark_path.replace("\\", "/").replace(":", "\\:")
            # Scale watermark to max 12% width and position in top-right with margin
            wm_w = int(out_w * 0.14)
            filters.append(f"movie='{escaped_wm}',scale={wm_w}:-1[wm];[in][wm]overlay=W-w-30:30")

        combined_vf = ",".join(filters)

        # 5. Build FFmpeg command inputs
        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-ss", str(start_time),
            "-to", str(end_time),
            "-i", source_video_path,
        ]

        # Check background music
        has_bgm = music_track_path and os.path.exists(music_track_path)
        if has_bgm:
            cmd.extend(["-stream_loop", "-1", "-i", music_track_path])

        cmd.extend(["-vf", combined_vf])

        # Audio mixing
        if has_bgm:
            # Ducked or mixed audio
            bgm_vol = max(0.01, min(1.0, music_volume))
            if music_ducking:
                # Lower BGM volume when speech is present
                filter_complex = f"[1:a]volume={bgm_vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]"
            else:
                filter_complex = f"[1:a]volume={bgm_vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]"
            cmd.extend(["-filter_complex", filter_complex, "-map", "0:v", "-map", "[aout]"])

        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-movflags", "+faststart",
            output_mp4_path,
        ])

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace")
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg rendering failed: {res.stderr}")

        # 6. Generate Thumbnail Image at 1.5s mark
        thumb_path = output_mp4_path.replace(".mp4", "_thumb.jpg")
        self._generate_thumbnail(output_mp4_path, thumb_path)

        # Cleanup temp ASS file
        if ass_temp_path and os.path.exists(ass_temp_path):
            try:
                os.remove(ass_temp_path)
            except Exception:
                pass

        file_size = os.path.getsize(output_mp4_path)
        return {
            "output_path": output_mp4_path,
            "thumbnail_path": thumb_path if os.path.exists(thumb_path) else None,
            "file_size": file_size,
            "focus_x": focus_x,
            "width": out_w,
            "height": out_h,
        }

    def _generate_thumbnail(self, video_path: str, thumb_path: str):
        """Extracts a crisp frame at 1.5s mark for the video thumbnail."""
        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-ss", "00:00:01.500",
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            thumb_path,
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _probe_video(self, video_path: str) -> Dict[str, Any]:
        """Probes video dimensions via FFmpeg."""
        cmd = [self.ffmpeg_bin, "-i", video_path, "-hide_banner"]
        res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="replace")
        import re
        meta = {"width": 1920, "height": 1080}
        m = re.search(r"Video:.*?(\d{3,4})x(\d{3,4})", res.stderr)
        if m:
            meta["width"] = int(m.group(1))
            meta["height"] = int(m.group(2))
        return meta
