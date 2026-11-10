import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional, Callable
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.project import Project
from app.models.source_video import SourceVideo
from app.models.transcript import Transcript
from app.models.clip import Clip
from app.models.clip_edit import ClipEdit
from app.services.storage import get_storage_service
from app.services.audio_extractor import AudioExtractor
from app.services.transcription import TranscriptionService
from app.services.virality import ViralityService
from app.tasks.celery_app import celery_app


def update_project_progress(
    project_id: str,
    status: str,
    progress: int,
    error_message: Optional[str] = None,
    db: Optional[Session] = None,
):
    """Updates project status and completion percentage in the database."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.status = status
            project.progress = progress
            if error_message:
                project.error_message = error_message
            project.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        if should_close:
            db.close()


def run_pipeline_sync(project_id: str):
    """Synchronous pipeline runner used by Celery or background threads."""
    execute_pipeline(project_id)


def execute_url_import_pipeline(project_id: str, url: str, custom_title: Optional[str] = None):
    """
    Downloads video from YouTube/URL, creates SourceVideo record,
    then automatically runs the AI clipping pipeline in a background thread.
    """
    db = SessionLocal()
    try:
        update_project_progress(project_id, "uploading", 10, db=db)
        from app.services.ingestion import get_ingestion_provider
        provider = get_ingestion_provider("youtube")

        result = asyncio.run(provider.ingest(url=url, project_id=project_id))

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return

        if not project.title or project.title == "Importing video...":
            project.title = custom_title or result.title or "Imported Video Project"

        source_video = SourceVideo(
            project_id=project.id,
            original_filename=result.original_filename,
            storage_path=result.storage_key,
            file_size_bytes=result.file_size_bytes,
            duration_seconds=result.duration_seconds,
            width=result.width,
            height=result.height,
            fps=result.fps,
            source_url=url,
        )
        db.add(source_video)
        project.status = "ready"
        project.progress = 20
        db.commit()

        # Run AI processing on downloaded video
        run_pipeline_sync(project_id)
    except Exception as e:
        print(f"[URL IMPORT ERROR] {project_id}: {str(e)}")
        update_project_progress(project_id, "failed", 0, error_message=str(e), db=db)
    finally:
        db.close()


def execute_pipeline(project_id: str):
    """
    Core AI Pipeline:
    1. Audio extraction & probing (0% - 15%)
    2. Whisper transcription with word timestamps (15% - 60%)
    3. LLM Virality Scoring (60% - 85%)
    4. Sentence boundary snapping & clip creation (85% - 100%)
    Runs in threadpool to keep the web server non-blocking.
    """
    db = SessionLocal()
    storage = get_storage_service()

    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or not project.source_video:
            raise ValueError(f"Project or Source Video not found for ID: {project_id}")

        source_video = project.source_video
        video_full_path = storage.get_file_path(source_video.storage_path)

        # ----------------------------------------------------
        # Step 1: Probe video & Extract 16kHz mono audio (10%)
        # ----------------------------------------------------
        update_project_progress(project_id, "extracting_audio", 10, db=db)
        extractor = AudioExtractor()

        # Probe video properties
        meta = extractor.probe_video(video_full_path)
        if meta.get("duration"):
            source_video.duration_seconds = meta["duration"]
        if meta.get("width"):
            source_video.width = meta["width"]
        if meta.get("height"):
            source_video.height = meta["height"]
        if meta.get("fps"):
            source_video.fps = meta["fps"]

        # Extract WAV audio
        audio_key = f"videos/{project_id}/audio.wav"
        audio_full_path = storage.get_file_path(audio_key)
        extractor.extract_audio(video_full_path, audio_full_path)
        source_video.audio_storage_path = audio_key
        db.commit()

        # ----------------------------------------------------
        # Step 2: Speech-to-Text Transcription with Whisper (35%)
        # ----------------------------------------------------
        update_project_progress(project_id, "transcribing", 35, db=db)
        transcriber = TranscriptionService()
        trans_result = transcriber.transcribe(
            audio_full_path,
            duration=source_video.duration_seconds,
        )

        update_project_progress(project_id, "transcribing", 60, db=db)

        # Persist Transcript in DB
        transcript_row = Transcript(
            project_id=project.id,
            language=trans_result.language,
            language_probability=trans_result.language_probability,
            raw_text=trans_result.raw_text,
            segments_json=json.dumps(trans_result.segments, ensure_ascii=False),
        )
        db.add(transcript_row)
        db.commit()

        # ----------------------------------------------------
        # Step 3: LLM Virality Scoring & Topic Segmentation (75%)
        # ----------------------------------------------------
        update_project_progress(project_id, "detecting_highlights", 75, db=db)
        virality_service = ViralityService()
        clips_data = asyncio.run(virality_service.detect_clips(
            transcript_text=trans_result.raw_text,
            segments=trans_result.segments,
        ))

        update_project_progress(project_id, "detecting_highlights", 90, db=db)

        # ----------------------------------------------------
        # Step 4: Persist Clips & Edit States (100%)
        # ----------------------------------------------------
        for c in clips_data:
            clip = Clip(
                project_id=project.id,
                title=c["title"],
                hook_text=c["hook_text"],
                start_time=c["start_time"],
                end_time=c["end_time"],
                duration=c["duration"],
                virality_score=c["virality_score"],
                reason=c["reason"],
                transcript_excerpt=c["transcript_excerpt"],
                status="suggested",
            )
            db.add(clip)
            db.flush()

            # Initialize ClipEdit state for Phase 4 Editor
            edit_state = ClipEdit(
                clip_id=clip.id,
                aspect_ratio="9:16",
                reframe_mode="auto_face",
                focus_x=0.5,
                focus_y=0.5,
                captions_enabled=True,
                caption_style_json=json.dumps({
                    "font": "Inter",
                    "font_size": 28,
                    "primary_color": "#FFFFFF",
                    "highlight_color": "#FFCC00",
                    "position": "bottom",
                }),
                title_overlay_text=c["title"],
            )
            db.add(edit_state)

        # Mark project ready
        project.status = "ready"
        project.progress = 100
        db.commit()

    except Exception as e:
        print(f"[PIPELINE ERROR] {str(e)}")
        update_project_progress(project_id, "failed", 0, error_message=str(e), db=db)
        raise e
    finally:
        db.close()


@celery_app.task(bind=True)
def process_video_pipeline(self, project_id: str):
    """Celery task entrypoint."""
    run_pipeline_sync(project_id)
    return {"status": "completed", "project_id": project_id}
