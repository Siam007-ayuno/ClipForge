from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ClipResponse(BaseModel):
    id: str
    project_id: str
    title: str
    hook_text: str
    start_time: float
    end_time: float
    duration: float
    virality_score: int
    reason: Optional[str] = None
    transcript_excerpt: Optional[str] = None
    status: str
    rendered_video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
