from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class SourceVideoResponse(BaseModel):
    id: str
    original_filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    source_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    rights_confirmation_id: str


class ProjectUrlImport(BaseModel):
    url: str = Field(..., description="YouTube or direct video URL")
    title: Optional[str] = None
    rights_confirmation_id: str = Field(..., description="Mandatory rights confirmation ID")


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    progress: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    source_video: Optional[SourceVideoResponse] = None
    clips_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
