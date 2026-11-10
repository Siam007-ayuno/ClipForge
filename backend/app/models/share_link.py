import uuid
import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return uuid.uuid4().hex


def generate_token() -> str:
    return secrets.token_urlsafe(24)


def default_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=7)


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    clip_id = Column(String(36), ForeignKey("clips.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(64), unique=True, default=generate_token, nullable=False, index=True)
    expires_at = Column(DateTime, default=default_expires_at, nullable=False)
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    clip = relationship("Clip", backref="share_links")
