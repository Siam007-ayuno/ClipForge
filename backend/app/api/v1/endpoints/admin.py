from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.tasks.cleanup import cleanup_expired_storage

router = APIRouter()


@router.post("/cleanup", status_code=status.HTTP_200_OK)
def trigger_storage_cleanup(
    retention_days: int = Query(30, ge=1, le=365, description="Retention window in days (default: 30)"),
    dry_run: bool = Query(False, description="Simulate cleanup without deleting files or updating database"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Automated Data Retention & Cleanup Trigger.
    Purges raw source videos, intermediate audio, and temporary renders older than retention_days.
    Also cleans up expired 7-day share links and stale chunk parts.
    """
    result = cleanup_expired_storage(
        retention_days=retention_days,
        dry_run=dry_run,
        db=db,
    )
    return result
