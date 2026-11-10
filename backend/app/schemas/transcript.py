from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class TranscriptResponse(BaseModel):
    id: str
    project_id: str
    language: str
    language_probability: Optional[float] = None
    raw_text: str
    segments: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
