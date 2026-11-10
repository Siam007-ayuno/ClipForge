import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return uuid.uuid4().hex


class Clip(Base):
    __tablename__ = "clips"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    hook_text = Column(String(512), nullable=False)
    start_time = Column(Float, nullable=False)  # seconds
    end_time = Column(Float, nullable=False)    # seconds
    duration = Column(Float, nullable=False)    # seconds
    virality_score = Column(Integer, default=70)  # 0 to 100
    reason = Column(Text, nullable=True)
    transcript_excerpt = Column(Text, nullable=True)
    status = Column(String(50), default="suggested")  # suggested, rendering, completed, failed
    rendered_video_path = Column(String(1024), nullable=True)
    thumbnail_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="clips")
    edit = relationship("ClipEdit", back_populates="clip", uselist=False, cascade="all, delete-orphan")
    render_jobs = relationship("RenderJob", back_populates="clip", cascade="all, delete-orphan")
