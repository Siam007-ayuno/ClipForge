import os
import shutil
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.clip import Clip
from app.models.share_link import ShareLink
from app.models.source_video import SourceVideo
from app.services.storage import get_storage_service


def purge_project_assets(project: Project, db: Session, storage=None) -> Dict[str, Any]:
    """
    Completely purges all physical files from disk associated with a project:
    - Raw source video file and folder
    - Extracted audio files
    - Rendered short clips (all resolutions)
    - Thumbnails and poster frames
    - Temporary assets
    """
    if storage is None:
        storage = get_storage_service()

    deleted_files = 0
    freed_bytes = 0

    # 1. Purge clips and thumbnails
    for clip in project.clips:
        if clip.rendered_video_path and storage.exists(clip.rendered_video_path):
            try:
                freed_bytes += storage.get_size(clip.rendered_video_path)
                storage.delete(clip.rendered_video_path)
                deleted_files += 1
            except Exception:
                pass

        if clip.thumbnail_path and storage.exists(clip.thumbnail_path):
            try:
                freed_bytes += storage.get_size(clip.thumbnail_path)
                storage.delete(clip.thumbnail_path)
                deleted_files += 1
            except Exception:
                pass

        # Also purge clip subfolder if exists
        clip_folder = f"clips/{clip.id}"
        if storage.exists(clip_folder):
            try:
                storage.delete(clip_folder)
            except Exception:
                pass

    # 2. Purge source video
    if project.source_video:
        sv = project.source_video
        if sv.storage_path and storage.exists(sv.storage_path):
            try:
                freed_bytes += storage.get_size(sv.storage_path)
                storage.delete(sv.storage_path)
                deleted_files += 1
            except Exception:
                pass

        video_folder = f"videos/{project.id}"
        if storage.exists(video_folder):
            try:
                storage.delete(video_folder)
            except Exception:
                pass

    # 3. Purge extracted transcripts audio
    for tr in project.transcripts:
        if getattr(tr, "audio_path", None) and storage.exists(tr.audio_path):
            try:
                freed_bytes += storage.get_size(tr.audio_path)
                storage.delete(tr.audio_path)
                deleted_files += 1
            except Exception:
                pass

    return {
        "deleted_files": deleted_files,
        "freed_bytes": freed_bytes,
    }


def cleanup_orphaned_temp_files(max_age_hours: int = 24, storage=None) -> int:
    """Removes leftover chunk parts or stale temp files older than max_age_hours."""
    if storage is None:
        storage = get_storage_service()

    cleaned_count = 0
    # For local storage, inspect temp dir
    if hasattr(storage, "base_dir"):
        temp_dir = os.path.join(storage.base_dir, "temp")
        if os.path.isdir(temp_dir):
            now_ts = time.time()
            cutoff_ts = now_ts - (max_age_hours * 3600)
            for item in os.listdir(temp_dir):
                item_path = os.path.join(temp_dir, item)
                try:
                    stat = os.stat(item_path)
                    if stat.st_mtime < cutoff_ts:
                        if os.path.isdir(item_path):
                            shutil.rmtree(item_path, ignore_errors=True)
                        else:
                            os.remove(item_path)
                        cleaned_count += 1
                except Exception:
                    pass
    return cleaned_count


def cleanup_expired_share_links(db: Session, dry_run: bool = False) -> int:
    """Removes or flags share links that have exceeded their 7-day TTL."""
    now = datetime.now(timezone.utc)
    expired_links = db.query(ShareLink).filter(ShareLink.expires_at < now).all()
    count = len(expired_links)

    if not dry_run and count > 0:
        for link in expired_links:
            db.delete(link)
        db.commit()

    return count


def cleanup_expired_storage(
    retention_days: int = 30,
    dry_run: bool = False,
    db: Session = None,
) -> Dict[str, Any]:
    """
    Automated retention policy execution:
    Identifies projects older than retention_days (default 30 days) and purges their
    raw video files, render artifacts, and temporary storage.
    """
    storage = get_storage_service()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=retention_days)

    query = db.query(Project).filter(Project.created_at < cutoff)
    expired_projects = query.all()

    total_files_purged = 0
    total_bytes_freed = 0
    affected_project_ids = []

    for proj in expired_projects:
        affected_project_ids.append(proj.id)
        if dry_run:
            # Estimate bytes
            if proj.source_video and proj.source_video.storage_path and storage.exists(proj.source_video.storage_path):
                total_bytes_freed += storage.get_size(proj.source_video.storage_path)
                total_files_purged += 1
            for clip in proj.clips:
                if clip.rendered_video_path and storage.exists(clip.rendered_video_path):
                    total_bytes_freed += storage.get_size(clip.rendered_video_path)
                    total_files_purged += 1
        else:
            # Actually purge assets
            res = purge_project_assets(proj, db, storage)
            total_files_purged += res["deleted_files"]
            total_bytes_freed += res["freed_bytes"]

            # Retain project record but flag as archived / source purged
            if proj.source_video:
                proj.source_video.storage_path = ""
            proj.status = "archived_expired"

    if not dry_run:
        db.commit()

    # Clean expired share links
    expired_links_purged = cleanup_expired_share_links(db, dry_run=dry_run)

    # Clean orphaned temp files
    temp_cleaned = cleanup_orphaned_temp_files(max_age_hours=24, storage=storage) if not dry_run else 0

    return {
        "retention_days": retention_days,
        "cutoff_date": cutoff.isoformat(),
        "dry_run": dry_run,
        "expired_projects_count": len(expired_projects),
        "affected_project_ids": affected_project_ids,
        "purged_files_count": total_files_purged,
        "freed_bytes": total_bytes_freed,
        "freed_mb": round(total_bytes_freed / (1024 * 1024), 2),
        "expired_share_links_removed": expired_links_purged,
        "temp_files_cleaned": temp_cleaned,
    }
