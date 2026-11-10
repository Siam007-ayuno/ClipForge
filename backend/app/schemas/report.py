from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class ReportCreate(BaseModel):
    report_type: str = Field("copyright_dmca", description="Type of report: copyright_dmca, inappropriate, unauthorized_use, other")
    target_type: str = Field("clip", description="Target type: clip, project, share_link, general")
    target_id: Optional[str] = Field(None, description="ID of the clip, project, or token being reported")
    target_url: Optional[str] = Field(None, description="Direct URL of the reported clip or page")
    reporter_name: str = Field(..., min_length=2, max_length=255, description="Full name of reporter or copyright owner/agent")
    reporter_email: EmailStr = Field(..., description="Contact email for official response")
    original_work_url: Optional[str] = Field(None, description="URL to the copyrighted original work, if applicable")
    description: str = Field(..., min_length=10, description="Detailed explanation of the complaint or infringement claim")
    good_faith_statement: bool = Field(True, description="Statutory affirmation of good faith belief and statement under penalty of perjury")


class ReportUpdate(BaseModel):
    status: Optional[str] = Field(None, description="pending, under_review, content_removed, dismissed")
    resolution_notes: Optional[str] = Field(None, description="Moderator resolution notes")


class ReportResponse(BaseModel):
    id: str
    report_type: str
    target_type: str
    target_id: Optional[str] = None
    target_url: Optional[str] = None
    reporter_name: str
    reporter_email: str
    original_work_url: Optional[str] = None
    description: str
    good_faith_statement: bool
    status: str
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
