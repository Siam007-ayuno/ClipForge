from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class RightsConfirmRequest(BaseModel):
    source_type: str = Field(..., description="upload or youtube")
    identifier: str = Field(..., description="Original filename or video URL")
    agreed_text: str = Field(
        ..., 
        description="The rights declaration text acknowledged by the user"
    )
    project_id: Optional[str] = None


class RightsConfirmResponse(BaseModel):
    id: str
    user_id: str
    source_type: str
    identifier: str
    confirmed_at: datetime
    message: str = "Rights confirmation logged successfully."

    model_config = ConfigDict(from_attributes=True)
