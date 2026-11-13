import uuid
import os
from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.project import Project
from app.models.source_video import SourceVideo
from app.models.rights import RightsConfirmation
from app.models.clip import Clip
from app.models.transcript import Transcript
from app.schemas.project import (
    ProjectResponse,
    ProjectCreate,
    ProjectUpdate,
    ProjectUrlImport,
)
from app.schemas.clip import ClipResponse
from app.schemas.transcript import TranscriptResponse
from app.services.ingestion import get_ingestion_provider
from app.services.storage import get_storage_service
from app.services.zip_export_service import ZipExportService, slugify
from app.tasks.pipeline import execute_pipeline, execute_url_import_pipeline
from app.tasks.render_pipeline import execute_clip_render

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List all projects belonging to current user (or all projects if demo admin)."""
    query = db.query(Project)
    if current_user.email != "demo@clipforge.ai":
        query = query.filter(Project.user_id == current_user.id)
    projects = (
        query.order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for p in projects:
        resp = ProjectResponse.model_validate(p)
        resp.clips_count = len(p.clips) if p.clips else 0
        result.append(resp)
    return result


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve detailed information for a single project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    if project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this project",
        )
    resp = ProjectResponse.model_validate(project)
    resp.clips_count = len(project.clips) if project.clips else 0
    return resp


@router.post("/import-url", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def import_video_url(
    data: ProjectUrlImport,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Imports a video from YouTube / web URL.
    STRICT RIGHTS CHECK: Requires explicit Rights Confirmation record.
    Returns immediately in <50ms and dispatches video download + AI pipeline in the background.
    """
    # 1. Verify Rights Confirmation
    confirmation = db.query(RightsConfirmation).filter(
        RightsConfirmation.id == data.rights_confirmation_id,
        RightsConfirmation.user_id == current_user.id,
    ).first()

    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Processing rejected: A valid rights confirmation must be submitted before importing content.",
        )

    # 2. Initialize project immediately
    project_id = uuid.uuid4().hex
    project_title = data.title or "Importing video from link..."
    project = Project(
        id=project_id,
        user_id=current_user.id,
        title=project_title,
        status="uploading",
        progress=5,
    )
    db.add(project)

    # 3. Link rights confirmation
    confirmation.project_id = project.id
    db.commit()
    db.refresh(project)

    # 4. Dispatch download and AI pipeline in background worker thread
    background_tasks.add_task(
        execute_url_import_pipeline,
        project_id,
        data.url,
        data.title,
    )

    resp = ProjectResponse.model_validate(project)
    resp.clips_count = 0
    return resp


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a project and completely cascade-purge all its stored video assets, renders, and clips."""
    query = db.query(Project).filter(Project.id == project_id)
    if current_user.email != "demo@clipforge.ai":
        query = query.filter(Project.user_id == current_user.id)
    project = query.first()

    # Idempotent delete: if already deleted, return 204 cleanly
    if not project:
        return None

    from app.tasks.cleanup import purge_project_assets
    storage = get_storage_service()
    try:
        purge_project_assets(project, db, storage)
    except Exception:
        pass

    db.delete(project)
    db.commit()
    return None


@router.post("/{project_id}/process", response_model=ProjectResponse)
async def process_project_video(
    project_id: str,
    background_tasks: BackgroundTasks,
    min_duration: Optional[float] = None,
    max_duration: Optional[float] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Triggers Phase 2 AI video processing pipeline:
    Audio Extraction -> Speech-to-Text (Whisper) -> Topic Segmentation -> Virality Scoring.
    Supports min_duration and max_duration query params for fast 20-30s shorts.
    """
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # If already running or downloading, return current progress gracefully (no 400 error)
    if project.status in ["uploading", "ingesting", "extracting_audio", "transcribing", "detecting_highlights"]:
        resp = ProjectResponse.model_validate(project)
        resp.clips_count = len(project.clips) if project.clips else 0
        return resp

    if not project.source_video:
        raise HTTPException(status_code=400, detail="Project source video is not yet ready")

    # Mark as queued
    project.status = "extracting_audio"
    project.progress = 5
    project.error_message = None
    db.commit()

    # Dispatch pipeline in background task
    background_tasks.add_task(execute_pipeline, project.id, min_duration, max_duration)

    resp = ProjectResponse.model_validate(project)
    resp.clips_count = len(project.clips) if project.clips else 0
    return resp


@router.get("/{project_id}/progress")
def get_project_progress(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns current pipeline execution status and progress percentage."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "status": project.status,
        "progress": project.progress,
        "error_message": project.error_message,
        "clips_count": len(project.clips) if project.clips else 0,
    }


@router.get("/{project_id}/clips", response_model=List[ClipResponse])
def get_project_clips(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns all extracted clips for the project with their virality scores."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to view clips for this project")

    clips = (
        db.query(Clip)
        .filter(Clip.project_id == project_id)
        .order_by(Clip.virality_score.desc())
        .all()
    )
    return clips


@router.get("/{project_id}/transcript", response_model=TranscriptResponse)
def get_project_transcript(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns the full speech-to-text transcript with word timestamps."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to view transcript")

    transcript = (
        db.query(Transcript)
        .filter(Transcript.project_id == project_id)
        .order_by(Transcript.created_at.desc())
        .first()
    )
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found for this project")

    segments_list = []
    if transcript.segments_json:
        try:
            segments_list = json.loads(transcript.segments_json)
        except Exception:
            pass

    return TranscriptResponse(
        id=transcript.id,
        project_id=transcript.project_id,
        language=transcript.language,
        language_probability=transcript.language_probability,
        raw_text=transcript.raw_text,
        segments=segments_list,
        created_at=transcript.created_at,
    )


@router.post("/{project_id}/render-all")
async def render_all_project_clips(
    project_id: str,
    background_tasks: BackgroundTasks,
    resolution: str = "1080p",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Triggers batch FFmpeg rendering for all clips in this project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clips = db.query(Clip).filter(Clip.project_id == project_id).all()
    if not clips:
        raise HTTPException(status_code=400, detail="No clips available to render. Run highlight extraction first.")

    for c in clips:
        c.status = "rendering"
        background_tasks.add_task(execute_clip_render, c.id, resolution)

    db.commit()
    return {"status": "rendering_queued", "clips_count": len(clips)}


@router.get("/{project_id}/download-all")
def download_all_project_clips_zip(
    project_id: str,
    resolution: str = "1080p",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Exports all project clips, captions (.srt), and viral social copy as a downloadable ZIP archive.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to export this project")

    zip_file_path = ZipExportService.create_project_zip(
        project=project,
        db=db,
        resolution=resolution,
    )

    safe_name = f"{slugify(project.title)}_clips.zip"
    return FileResponse(
        path=zip_file_path,
        media_type="application/zip",
        filename=safe_name,
    )
