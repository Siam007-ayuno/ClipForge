import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.project import Project
from app.models.source_video import SourceVideo
from app.models.rights import RightsConfirmation
from app.schemas.upload import (
    InitUploadRequest,
    InitUploadResponse,
    CompleteUploadRequest,
    CompleteUploadResponse,
)
from app.services.storage import get_storage_service

router = APIRouter()


@router.post("/init", response_model=InitUploadResponse)
def init_chunked_upload(
    data: InitUploadRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Initializes a chunked file upload session (up to 2GB)."""
    if data.total_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024 * 1024)}GB.",
        )

    upload_id = uuid.uuid4().hex
    return InitUploadResponse(
        upload_id=upload_id,
        chunk_size=settings.CHUNK_SIZE_BYTES,
        total_chunks=data.total_chunks,
    )


@router.post("/chunk")
async def upload_chunk(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Receives and stores an individual file chunk."""
    storage = get_storage_service()
    chunk_bytes = await chunk.read()
    if not chunk_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chunk payload is empty.",
        )

    storage.append_chunk(upload_id, chunk_bytes, chunk_index)
    return {
        "status": "success",
        "upload_id": upload_id,
        "chunk_index": chunk_index,
        "bytes_received": len(chunk_bytes),
    }


@router.post("/complete", response_model=CompleteUploadResponse)
def complete_chunked_upload(
    data: CompleteUploadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Finalizes the chunk assembly into the complete video file.
    STRICT RIGHTS CHECK: Verifies rights confirmation was logged for this user.
    """
    # 1. Verify Rights Confirmation
    confirmation = db.query(RightsConfirmation).filter(
        RightsConfirmation.id == data.rights_confirmation_id,
        RightsConfirmation.user_id == current_user.id,
    ).first()

    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Processing rejected: A valid rights confirmation must be submitted before processing.",
        )

    # 2. Assemble chunks via storage service
    storage = get_storage_service()
    clean_filename = os.path.basename(data.filename)
    project_id = uuid.uuid4().hex
    final_storage_key = f"videos/{project_id}/{clean_filename}"

    try:
        storage.finalize_chunked_file(data.upload_id, final_storage_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assemble video chunks: {str(e)}",
        )

    file_size = storage.get_size(final_storage_key)

    # 3. Create Project record
    title = data.project_title or os.path.splitext(clean_filename)[0]
    project = Project(
        id=project_id,
        user_id=current_user.id,
        title=title,
        status="ready",  # In Phase 1 ready for inspection; in Phase 2 Celery kicks off transcription
        progress=100,
    )
    db.add(project)

    # 4. Create SourceVideo record
    source_video = SourceVideo(
        project_id=project.id,
        original_filename=clean_filename,
        storage_path=final_storage_key,
        file_size_bytes=file_size,
        mime_type="video/mp4",
    )
    db.add(source_video)

    # 5. Link rights confirmation to project
    confirmation.project_id = project.id
    db.commit()

    return CompleteUploadResponse(
        project_id=project.id,
        storage_key=final_storage_key,
        file_size_bytes=file_size,
    )
