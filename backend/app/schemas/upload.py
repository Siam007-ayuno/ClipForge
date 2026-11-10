from typing import Optional
from pydantic import BaseModel, Field


class InitUploadRequest(BaseModel):
    filename: str = Field(..., description="Original video filename")
    total_size: int = Field(..., description="Total size in bytes (up to 2GB)")
    total_chunks: int = Field(..., description="Calculated total number of chunks")
    mime_type: Optional[str] = "video/mp4"


class InitUploadResponse(BaseModel):
    upload_id: str
    chunk_size: int
    total_chunks: int


class CompleteUploadRequest(BaseModel):
    upload_id: str
    filename: str
    total_chunks: int
    rights_confirmation_id: str = Field(..., description="Mandatory rights confirmation ID")
    project_title: Optional[str] = None


class CompleteUploadResponse(BaseModel):
    project_id: str
    storage_key: str
    file_size_bytes: int
    message: str = "Video uploaded and verified successfully."
