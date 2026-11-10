import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime
from app.core.database import Base


def generate_uuid() -> str:
    return uuid.uuid4().hex


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    report_type = Column(String(50), nullable=False, default="copyright_dmca")  # copyright_dmca, inappropriate, unauthorized_use, other
    target_type = Column(String(50), nullable=False, default="clip")  # clip, project, share_link, general
    target_id = Column(String(255), nullable=True, index=True)
    target_url = Column(String(500), nullable=True)
    reporter_name = Column(String(255), nullable=False)
    reporter_email = Column(String(255), nullable=False, index=True)
    original_work_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)
    good_faith_statement = Column(Boolean, default=True)
    status = Column(String(50), default="pending", index=True)  # pending, under_review, content_removed, dismissed
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
