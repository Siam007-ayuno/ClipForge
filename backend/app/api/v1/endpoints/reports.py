from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.report import Report
from app.models.clip import Clip
from app.models.share_link import ShareLink
from app.schemas.report import ReportCreate, ReportResponse, ReportUpdate

router = APIRouter()


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def submit_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
):
    """
    Public reporting endpoint for DMCA takedowns, copyright claims, and content violations.
    Receives and logs reports for immediate administrative review.
    """
    if not payload.good_faith_statement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must affirm the good-faith statement to submit a valid compliance notice.",
        )

    report = Report(
        report_type=payload.report_type,
        target_type=payload.target_type,
        target_id=payload.target_id,
        target_url=payload.target_url,
        reporter_name=payload.reporter_name,
        reporter_email=payload.reporter_email,
        original_work_url=payload.original_work_url,
        description=payload.description,
        good_faith_statement=payload.good_faith_statement,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.get("", response_model=List[ReportResponse])
def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    target_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lists submitted reports for moderation review (requires authenticated user)."""
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    if target_id:
        query = query.filter(Report.target_id == target_id)

    reports = query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()
    return reports


@router.get("/{report_id}", response_model=ReportResponse)
def get_report_detail(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetches full details of a specific compliance report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: str,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Moderator endpoint to update report status and resolution notes.
    If status is changed to 'content_removed' and target is a clip or share link,
    takes appropriate takedown actions.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if payload.status:
        report.status = payload.status
        if payload.status in ("content_removed", "dismissed"):
            report.resolved_at = datetime.now(timezone.utc)

        # Automatic takedown handling if actioned
        if payload.status == "content_removed" and report.target_id:
            if report.target_type == "clip":
                clip = db.query(Clip).filter(Clip.id == report.target_id).first()
                if clip:
                    # Clear rendered video path to block streaming
                    clip.rendered_video_path = None
                    clip.render_status = "removed_compliance"
            elif report.target_type == "share_link":
                # Expire share link immediately
                link = db.query(ShareLink).filter(ShareLink.token == report.target_id).first()
                if link:
                    link.expires_at = datetime.now(timezone.utc)

    if payload.resolution_notes is not None:
        report.resolution_notes = payload.resolution_notes

    db.commit()
    db.refresh(report)
    return report
