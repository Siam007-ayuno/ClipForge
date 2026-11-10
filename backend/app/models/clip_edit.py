import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return uuid.uuid4().hex


class ClipEdit(Base):
    __tablename__ = "clip_edits"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    clip_id = Column(String(36), ForeignKey("clips.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    aspect_ratio = Column(String(20), default="9:16")  # 9:16, 1:1, 16:9
    reframe_mode = Column(String(50), default="auto_face")  # auto_face, manual, blurred_fit, center
    focus_x = Column(Float, default=0.5)  # 0.0 to 1.0
    focus_y = Column(Float, default=0.5)  # 0.0 to 1.0
    captions_enabled = Column(Boolean, default=True)
    caption_style_json = Column(Text, nullable=True)  # font, size, primary_color, highlight_color, position
    words_json = Column(Text, nullable=True)  # editable array of words with start/end
    title_overlay_text = Column(String(255), nullable=True)
    music_track_url = Column(String(1024), nullable=True)
    music_volume = Column(Float, default=0.2)
    music_ducking = Column(Boolean, default=True)
    watermark_url = Column(String(1024), nullable=True)
    remove_silence = Column(Boolean, default=False)
    remove_filler_words = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    clip = relationship("Clip", back_populates="edit")
