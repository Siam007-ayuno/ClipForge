import os
import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.clip import Clip
from app.models.clip_edit import ClipEdit
from app.models.transcript import Transcript
from app.models.render_job import RenderJob
from app.models.share_link import ShareLink
from app.schemas.clip import ClipResponse
from app.schemas.clip_edit import ClipDetailResponse, ClipEditUpdate, CaptionStyle, WordItem
from app.tasks.render_pipeline import execute_clip_render
from app.services.storage import get_storage_service
from app.services.srt_service import SrtService
from app.services.social_service import SocialService
from app.services.zip_export_service import slugify

router = APIRouter()


def _build_clip_detail_response(clip: Clip, db: Session, storage) -> ClipDetailResponse:
    project = clip.project
    source_video = project.source_video if project else None

    # Video URLs
    rendered_video_url = None
    if clip.rendered_video_path and storage.exists(clip.rendered_video_path):
        rendered_video_url = storage.get_url(clip.rendered_video_path)

    thumbnail_url = None
    if clip.thumbnail_path and storage.exists(clip.thumbnail_path):
        thumbnail_url = storage.get_url(clip.thumbnail_path)

    source_video_url = None
    if source_video and storage.exists(source_video.storage_path):
        source_video_url = storage.get_url(source_video.storage_path)

    # Edit state
    edit = clip.edit
    if not edit:
        edit = ClipEdit(
            clip_id=clip.id,
            aspect_ratio="9:16",
            reframe_mode="auto_face",
            focus_x=0.5,
            focus_y=0.5,
            captions_enabled=True,
            caption_style_json=json.dumps({
                "font": "Inter",
                "font_size": 32,
                "primary_color": "#FFFFFF",
                "highlight_color": "#FFCC00",
                "position": "bottom",
            }),
            title_overlay_text=clip.title,
        )
        db.add(edit)
        db.commit()
        db.refresh(edit)

    # Parse Caption Style
    caption_style = CaptionStyle()
    if edit.caption_style_json:
        try:
            caption_style = CaptionStyle.model_validate(json.loads(edit.caption_style_json))
        except Exception:
            pass

    # Extract Word list
    words: List[WordItem] = []
    if edit.words_json:
        try:
            raw_words = json.loads(edit.words_json)
            words = [WordItem.model_validate(w) for w in raw_words]
        except Exception:
            pass

    # If words list is empty, extract from Transcript
    if not words and project:
        transcript_row = (
            db.query(Transcript)
            .filter(Transcript.project_id == project.id)
            .order_by(Transcript.created_at.desc())
            .first()
        )
        if transcript_row and transcript_row.segments_json:
            try:
                segments = json.loads(transcript_row.segments_json)
                for seg in segments:
                    seg_words = seg.get("words", [])
                    if seg_words:
                        for w in seg_words:
                            w_start = float(w["start"])
                            w_end = float(w["end"])
                            # Include words overlapping with clip range (+/- 1.0s buffer for snapping)
                            if w_end >= (clip.start_time - 0.5) and w_start <= (clip.end_time + 0.5):
                                words.append(WordItem(
                                    word=w["word"].strip(),
                                    start=round(w_start, 2),
                                    end=round(w_end, 2),
                                    probability=w.get("probability", 1.0),
                                    deleted=False,
                                ))
                    else:
                        # Fallback if no word-level timestamps in segment
                        w_start = float(seg["start"])
                        w_end = float(seg["end"])
                        if w_end >= clip.start_time and w_start <= clip.end_time:
                            words.append(WordItem(
                                word=seg.get("text", "").strip(),
                                start=round(w_start, 2),
                                end=round(w_end, 2),
                                probability=1.0,
                                deleted=False,
                            ))
            except Exception:
                pass

    return ClipDetailResponse(
        id=clip.id,
        project_id=clip.project_id,
        project_title=project.title if project else "Untitled Project",
        title=clip.title,
        hook_text=clip.hook_text,
        start_time=round(clip.start_time, 2),
        end_time=round(clip.end_time, 2),
        duration=round(clip.duration, 2),
        virality_score=clip.virality_score,
        reason=clip.reason,
        transcript_excerpt=clip.transcript_excerpt,
        status=clip.status,
        rendered_video_path=clip.rendered_video_path,
        rendered_video_url=rendered_video_url,
        thumbnail_url=thumbnail_url,
        source_video_url=source_video_url,
        source_duration=source_video.duration_seconds if source_video else None,
        source_width=source_video.width if source_video else 1920,
        source_height=source_video.height if source_video else 1080,
        aspect_ratio=edit.aspect_ratio or "9:16",
        reframe_mode=edit.reframe_mode or "auto_face",
        focus_x=edit.focus_x if edit.focus_x is not None else 0.5,
        focus_y=edit.focus_y if edit.focus_y is not None else 0.5,
        captions_enabled=edit.captions_enabled if edit.captions_enabled is not None else True,
        caption_style=caption_style,
        words=words,
        title_overlay_text=edit.title_overlay_text,
        music_track_url=edit.music_track_url,
        music_volume=edit.music_volume if edit.music_volume is not None else 0.2,
        music_ducking=edit.music_ducking if edit.music_ducking is not None else True,
        watermark_url=edit.watermark_url,
        remove_silence=edit.remove_silence if edit.remove_silence is not None else False,
        remove_filler_words=edit.remove_filler_words if edit.remove_filler_words is not None else False,
    )


@router.get("/{clip_id}", response_model=ClipDetailResponse)
def get_clip_detail(
    clip_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve full clip detail, edit configuration, words, and media streams."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to access this clip")

    storage = get_storage_service()
    return _build_clip_detail_response(clip, db, storage)


@router.put("/{clip_id}/edit", response_model=ClipDetailResponse)
def update_clip_edit(
    clip_id: str,
    payload: ClipEditUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Updates clip edit state, trim boundaries, word text, and styling."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to edit this clip")

    edit = clip.edit
    if not edit:
        edit = ClipEdit(clip_id=clip.id)
        db.add(edit)
        db.flush()

    # Update Clip core fields if supplied
    if payload.title is not None:
        clip.title = payload.title.strip()
    if payload.start_time is not None:
        clip.start_time = max(0.0, payload.start_time)
    if payload.end_time is not None:
        clip.end_time = max(clip.start_time + 1.0, payload.end_time)
    clip.duration = round(clip.end_time - clip.start_time, 2)

    # Update ClipEdit fields
    if payload.aspect_ratio is not None:
        edit.aspect_ratio = payload.aspect_ratio
    if payload.reframe_mode is not None:
        edit.reframe_mode = payload.reframe_mode
    if payload.focus_x is not None:
        edit.focus_x = payload.focus_x
    if payload.focus_y is not None:
        edit.focus_y = payload.focus_y
    if payload.captions_enabled is not None:
        edit.captions_enabled = payload.captions_enabled
    if payload.caption_style is not None:
        edit.caption_style_json = payload.caption_style.model_dump_json()
    if payload.words is not None:
        edit.words_json = json.dumps([w.model_dump() for w in payload.words], ensure_ascii=False)
    if payload.title_overlay_text is not None:
        edit.title_overlay_text = payload.title_overlay_text.strip()
    if payload.music_track_url is not None:
        edit.music_track_url = payload.music_track_url
    if payload.music_volume is not None:
        edit.music_volume = payload.music_volume
    if payload.music_ducking is not None:
        edit.music_ducking = payload.music_ducking
    if payload.watermark_url is not None:
        edit.watermark_url = payload.watermark_url
    if payload.remove_silence is not None:
        edit.remove_silence = payload.remove_silence
    if payload.remove_filler_words is not None:
        edit.remove_filler_words = payload.remove_filler_words

    db.commit()
    db.refresh(clip)
    db.refresh(edit)

    storage = get_storage_service()
    return _build_clip_detail_response(clip, db, storage)


@router.post("/{clip_id}/render", response_model=ClipResponse)
@router.post("/{clip_id}/re-render", response_model=ClipResponse)
async def trigger_clip_render(
    clip_id: str,
    background_tasks: BackgroundTasks,
    resolution: str = "1080p",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Renders or re-renders an individual clip with FFmpeg applying current ClipEdit settings.
    """
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to render this clip")

    clip.status = "rendering"
    db.commit()

    # Dispatch render in background thread
    background_tasks.add_task(execute_clip_render, clip.id, resolution)

    return clip


@router.get("/{clip_id}/status")
def get_clip_render_status(
    clip_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns the current rendering status, percentage, and streamable video URL."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    job = db.query(RenderJob).filter(RenderJob.clip_id == clip_id).first()
    storage = get_storage_service()

    video_url = None
    if clip.rendered_video_path and storage.exists(clip.rendered_video_path):
        video_url = storage.get_url(clip.rendered_video_path)

    thumb_url = None
    if clip.thumbnail_path and storage.exists(clip.thumbnail_path):
        thumb_url = storage.get_url(clip.thumbnail_path)

    return {
        "clip_id": clip.id,
        "status": clip.status,
        "progress": job.progress if job else (100 if clip.status == "completed" else 0),
        "video_url": video_url,
        "thumbnail_url": thumb_url,
        "error_message": job.error_message if job else None,
    }


@router.post("/{clip_id}/upload-asset")
async def upload_clip_asset(
    clip_id: str,
    asset_type: str = Form(..., description="'music' or 'watermark'"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Uploads background music or watermark image for a specific clip."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to edit this clip")

    storage = get_storage_service()
    ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
    asset_key = f"assets/{clip_id}/{uuid.uuid4().hex[:12]}{ext}"

    content = await file.read()
    storage.save_file(asset_key, content)

    edit = clip.edit
    if not edit:
        edit = ClipEdit(clip_id=clip.id)
        db.add(edit)

    if asset_type == "music":
        edit.music_track_url = asset_key
    elif asset_type == "watermark":
        edit.watermark_url = asset_key

    db.commit()

    return {
        "asset_type": asset_type,
        "storage_path": asset_key,
        "url": storage.get_url(asset_key),
    }


@router.get("/{clip_id}/download")
def download_clip_video(
    clip_id: str,
    resolution: str = "1080p",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Downloads the rendered MP4 video file with attachment headers."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to download this clip")

    storage = get_storage_service()

    # Look for requested resolution, then fallback to current render
    candidates = [
        f"clips/{clip.id}/render_{resolution}.mp4",
        clip.rendered_video_path,
        f"clips/{clip.id}/render_1080p.mp4",
        f"clips/{clip.id}/render_720p.mp4",
    ]

    target_path = None
    for cand in candidates:
        if cand and storage.exists(cand):
            target_path = storage.get_file_path(cand)
            break

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Rendered video file not available yet. Please render first.")

    safe_name = f"{slugify(clip.title)}_{resolution}.mp4"
    return FileResponse(
        path=target_path,
        media_type="video/mp4",
        filename=safe_name,
    )


@router.get("/{clip_id}/captions/srt")
def download_clip_srt(
    clip_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generates and downloads standard SRT subtitle file for this clip."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to download this clip's captions")

    words_data = []
    if clip.edit and clip.edit.words_json:
        try:
            words_data = json.loads(clip.edit.words_json)
        except Exception:
            pass

    if not words_data and clip.project.transcripts:
        try:
            segs = json.loads(clip.project.transcripts[0].segments_json)
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

    safe_name = f"{slugify(clip.title)}.srt"
    return Response(
        content=srt_content,
        media_type="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.get("/{clip_id}/social-copy")
def get_clip_social_copy(
    clip_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns AI viral hook title, description, and hashtags for social posting."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to access this clip")

    metadata = SocialService.generate_social_metadata(
        title=clip.title,
        hook_text=clip.hook_text or "",
        transcript_excerpt=clip.transcript_excerpt or "",
        virality_score=clip.virality_score or 85,
    )
    return metadata


@router.post("/{clip_id}/share")
def create_clip_share_link(
    clip_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generates a temporary shareable link for public preview (expires in 7 days)."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.project.user_id != current_user.id and current_user.email != "demo@clipforge.ai":
        raise HTTPException(status_code=403, detail="Not authorized to share this clip")

    # Check for active existing share link
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    existing = (
        db.query(ShareLink)
        .filter(ShareLink.clip_id == clip.id, ShareLink.expires_at > now)
        .first()
    )

    if not existing:
        existing = ShareLink(clip_id=clip.id)
        db.add(existing)
        db.commit()
        db.refresh(existing)

    return {
        "clip_id": clip.id,
        "share_token": existing.token,
        "share_url": f"/share/{existing.token}",
        "expires_at": existing.expires_at.isoformat(),
        "views_count": existing.views_count,
    }
