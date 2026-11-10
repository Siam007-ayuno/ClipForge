import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return uuid.uuid4().hex


class RightsConfirmation(Base):
    __tablename__ = "rights_confirmations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type = Column(String(50), nullable=False)  # "upload" or "youtube"
    identifier = Column(String(1024), nullable=False)  # original filename or URL
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(512), nullable=True)
    agreed_text = Column(Text, nullable=False)
    confirmed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    user = relationship("User", back_populates="rights_confirmations")
    project = relationship("Project", back_populates="rights_confirmations")
