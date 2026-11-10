from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.share_link import ShareLink
from app.models.clip import Clip
from app.services.storage import get_storage_service

router = APIRouter()


@router.get("/{token}")
def get_shared_clip_public(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Public endpoint to view a shared clip without logging in.
    Validates 7-day expiration and returns clip details with video stream URL.
    """
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared preview link not found or invalid",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    # Handle timezone-naive/aware datetime comparison
    link_exp = link.expires_at
    if link_exp.tzinfo is None:
        link_exp = link_exp.replace(tzinfo=timezone.utc)

    if link_exp < now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share preview link has expired (links are valid for 7 days)",
        )

    # Increment view counter
    link.views_count += 1
    db.commit()

    clip = link.clip
    storage = get_storage_service()

    video_url = None
    if clip.rendered_video_path and storage.exists(clip.rendered_video_path):
        video_url = storage.get_url(clip.rendered_video_path)

    thumb_url = None
    if clip.thumbnail_path and storage.exists(clip.thumbnail_path):
        thumb_url = storage.get_url(clip.thumbnail_path)

    aspect_ratio = "9:16"
    if clip.edit and clip.edit.aspect_ratio:
        aspect_ratio = clip.edit.aspect_ratio

    return {
        "clip_id": clip.id,
        "token": link.token,
        "title": clip.title,
        "hook_text": clip.hook_text,
        "duration": round(clip.duration, 2),
        "virality_score": clip.virality_score,
        "reason": clip.reason,
        "transcript_excerpt": clip.transcript_excerpt,
        "aspect_ratio": aspect_ratio,
        "video_url": video_url,
        "thumbnail_url": thumb_url,
        "views_count": link.views_count,
        "expires_at": link.expires_at.isoformat(),
        "project_title": clip.project.title if clip.project else "ClipForge Project",
    }
