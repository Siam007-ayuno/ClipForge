import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.core.config import settings
from app.services.storage import get_storage_service

router = APIRouter()


@router.get("/health")
def health_check():
    """System health check endpoint."""
    storage = get_storage_service()
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "storage_type": settings.STORAGE_TYPE,
        "database_configured": bool(settings.DATABASE_URL),
    }


@router.get("/storage/files/{file_path:path}")
@router.head("/storage/files/{file_path:path}")
def serve_storage_file(file_path: str):
    """Serves uploaded and rendered media files during local development."""
    storage = get_storage_service()
    full_path = storage.get_file_path(file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)
