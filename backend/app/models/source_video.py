import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return uuid.uuid4().hex


class SourceVideo(Base):
    __tablename__ = "source_videos"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(1024), nullable=False)  # local path or S3 key
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    audio_storage_path = Column(String(1024), nullable=True)
    source_url = Column(String(1024), nullable=True)  # if imported via YouTube or direct link
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="source_video")
