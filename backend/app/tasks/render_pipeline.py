import os
import json
import shutil
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.clip import Clip
from app.models.clip_edit import ClipEdit
from app.models.project import Project
from app.models.transcript import Transcript
from app.models.render_job import RenderJob
from app.services.video_renderer import VideoRenderer
from app.services.storage import get_storage_service


def execute_clip_render(clip_id: str, resolution: str = "1080p"):
    """
    Renders an individual clip with face tracking, custom aspect ratio,
    animated styled captions, audio ducking, and watermark.
    Runs synchronously in a background thread to prevent starving the web server event loop.
    """
    db = SessionLocal()
    storage = get_storage_service()

    # Find clip and create RenderJob
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        db.close()
        raise ValueError(f"Clip not found: {clip_id}")

    project = clip.project
    source_video = project.source_video if project else None
    if not source_video:
        db.close()
        raise ValueError("Source video not found for this clip")

    job = db.query(RenderJob).filter(RenderJob.clip_id == clip_id).first()
    if not job:
        job = RenderJob(
            clip_id=clip_id,
            user_id=project.user_id,
            status="processing",
            progress=20,
            resolution=resolution,
        )
        db.add(job)
    else:
        job.status = "processing"
        job.progress = 20
        job.error_message = None

    clip.status = "rendering"
    db.commit()

    try:
        edit_state = clip.edit

        # 1. Load words: prefer edited words_json if available, otherwise transcript
        words_data = []
        if edit_state and edit_state.words_json:
            try:
                words_data = json.loads(edit_state.words_json)
            except Exception:
                pass

        if not words_data:
            transcript_row = (
                db.query(Transcript)
                .filter(Transcript.project_id == project.id)
                .order_by(Transcript.created_at.desc())
                .first()
            )
            if transcript_row and transcript_row.segments_json:
                try:
                    segments = json.loads(transcript_row.segments_json)
                    for s in segments:
                        if s.get("words"):
                            words_data.extend(s["words"])
                        else:
                            words_data.append({
                                "word": s["text"],
                                "start": s["start"],
                                "end": s["end"]
                            })
                except Exception:
                    pass

        # 2. Extract styling and options
        aspect_ratio = edit_state.aspect_ratio if edit_state else "9:16"
        reframe_mode = edit_state.reframe_mode if edit_state else "auto_face"
        focus_x = edit_state.focus_x if (edit_state and reframe_mode == "manual") else None
        captions_enabled = edit_state.captions_enabled if edit_state else True
        
        style_config = None
        if edit_state and edit_state.caption_style_json:
            try:
                style_config = json.loads(edit_state.caption_style_json)
            except Exception:
                pass

        title_overlay = edit_state.title_overlay_text if edit_state else None
        remove_filler = edit_state.remove_filler_words if edit_state else False

        # Resolve asset paths if present
        music_path = None
        if edit_state and edit_state.music_track_url:
            music_path = storage.get_file_path(edit_state.music_track_url)

        watermark_path = None
        if edit_state and edit_state.watermark_url:
            watermark_path = storage.get_file_path(edit_state.watermark_url)

        # Resolve paths
        source_video_full_path = storage.get_file_path(source_video.storage_path)
        rel_output_key = f"clips/{clip.id}/render_{resolution}.mp4"
        dest_full_path = storage.get_file_path(rel_output_key)

        renderer = VideoRenderer()
        render_res = renderer.render_clip(
            source_video_path=source_video_full_path,
            start_time=clip.start_time,
            end_time=clip.end_time,
            output_mp4_path=dest_full_path,
            words_data=words_data,
            aspect_ratio=aspect_ratio,
            reframe_mode=reframe_mode,
            focus_x=focus_x,
            resolution=resolution,
            captions_enabled=captions_enabled,
            style_config=style_config,
            title_overlay_text=title_overlay,
            music_track_path=music_path,
            music_volume=edit_state.music_volume if edit_state else 0.2,
            music_ducking=edit_state.music_ducking if edit_state else True,
            watermark_path=watermark_path,
            remove_filler_words=remove_filler,
        )

        job.progress = 90
        db.commit()

        # Save thumbnail
        rel_thumb_key = None
        if render_res.get("thumbnail_path") and os.path.exists(render_res["thumbnail_path"]):
            rel_thumb_key = f"thumbnails/{clip.id}.jpg"
            dest_thumb_path = storage.get_file_path(rel_thumb_key)
            os.makedirs(os.path.dirname(dest_thumb_path), exist_ok=True)
            shutil.copyfile(render_res["thumbnail_path"], dest_thumb_path)

        # Update clip and job
        clip.rendered_video_path = rel_output_key
        clip.thumbnail_path = rel_thumb_key
        clip.status = "completed"
        clip.updated_at = datetime.now(timezone.utc)

        job.status = "completed"
        job.progress = 100
        job.output_path = rel_output_key
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        print(f"[RENDER ERROR] Clip {clip_id}: {str(e)}")
        clip.status = "failed"
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
        raise e
    finally:
        db.close()
