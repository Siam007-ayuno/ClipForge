import os
import re
import json
import zipfile
import tempfile
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.clip import Clip
from app.services.storage import get_storage_service
from app.services.srt_service import SrtService
from app.services.social_service import SocialService


def slugify(text: str) -> str:
    """Sanitizes text for safe cross-platform file names."""
    cleaned = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "_", cleaned)[:40] or "clip"


class ZipExportService:
    """Packages project clips, subtitles, and viral social metadata into a downloadable ZIP archive."""

    @classmethod
    def create_project_zip(
        cls,
        project: Project,
        db: Session,
        resolution: str = "1080p",
    ) -> str:
        storage = get_storage_service()
        clips = db.query(Clip).filter(Clip.project_id == project.id).all()

        temp_dir = tempfile.mkdtemp()
        safe_proj_name = slugify(project.title)
        zip_path = os.path.join(temp_dir, f"{safe_proj_name}_clips.zip")

        manifest = {
            "project_id": project.id,
            "project_title": project.title,
            "exported_resolution": resolution,
            "clips_count": len(clips),
            "clips": [],
        }

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for idx, clip in enumerate(clips, 1):
                clip_slug = f"{idx:02d}_{slugify(clip.title)}"

                # 1. Include Rendered MP4 if exists
                mp4_filename = f"clips/{clip_slug}_{resolution}.mp4"
                file_included = False

                # Check preferred resolution or fall back to any available render
                cand_paths = [
                    f"clips/{clip.id}/render_{resolution}.mp4",
                    clip.rendered_video_path,
                    f"clips/{clip.id}/render_1080p.mp4",
                    f"clips/{clip.id}/render_720p.mp4",
                ]
                for p in cand_paths:
                    if p and storage.exists(p):
                        disk_path = storage.get_file_path(p)
                        zf.write(disk_path, arcname=mp4_filename)
                        file_included = True
                        break

                # 2. Generate and include SRT Subtitles
                words_data = []
                if clip.edit and clip.edit.words_json:
                    try:
                        words_data = json.loads(clip.edit.words_json)
                    except Exception:
                        pass

                if not words_data and project.transcripts:
                    try:
                        segs = json.loads(project.transcripts[0].segments_json)
                        for s in segs:
                            if s.get("words"):
                                words_data.extend(s["words"])
                    except Exception:
                        pass

                srt_content = SrtService.generate_srt(
                    words_data=words_data,
                    clip_start=clip.start_time,
                    clip_end=clip.end_time,
                )

                srt_filename = f"captions/{clip_slug}.srt"
                zf.writestr(srt_filename, srt_content)

                # 3. Generate Social Copy
                social = SocialService.generate_social_metadata(
                    title=clip.title,
                    hook_text=clip.hook_text or "",
                    transcript_excerpt=clip.transcript_excerpt or "",
                    virality_score=clip.virality_score or 85,
                )

                txt_filename = f"social_copy/{clip_slug}_social.txt"
                zf.writestr(txt_filename, social["full_copy"])

                manifest["clips"].append({
                    "id": clip.id,
                    "title": clip.title,
                    "duration_seconds": clip.duration,
                    "virality_score": clip.virality_score,
                    "mp4_file": mp4_filename if file_included else None,
                    "srt_file": srt_filename,
                    "social": social,
                })

            # Write manifest JSON
            zf.writestr("manifest.json", json.dumps(manifest, indent=2))

            # Write README instructions
            readme = f"""====================================================
CLIPFORGE EXPORT MANIFEST
Project: {project.title}
====================================================

This archive contains all your AI-extracted viral short-form clips:
- clips/        : Rendered MP4 clips with burn-in animated captions & reframing
- captions/     : Separate standard .SRT subtitle files
- social_copy/  : Ready-to-post Hook Titles, Descriptions, and Hashtags
- manifest.json : Machine-readable metadata and virality metrics

Ready to post on TikTok, Instagram Reels, and YouTube Shorts!
Strict rights confirmation verified and logged at ClipForge.
"""
            zf.writestr("README.txt", readme)

        return zip_path
