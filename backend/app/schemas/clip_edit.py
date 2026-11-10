from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class WordItem(BaseModel):
    word: str
    start: float
    end: float
    probability: Optional[float] = None
    deleted: bool = False


class CaptionStyle(BaseModel):
    font: str = "Inter"
    font_size: int = 32
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FFCC00"
    position: str = "bottom"  # bottom, center, top
    box_bg: Optional[str] = None


class ClipEditUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    aspect_ratio: Optional[str] = Field(default=None, pattern="^(9:16|1:1|16:9)$")
    reframe_mode: Optional[str] = Field(default=None, pattern="^(auto_face|manual|blurred_fit|center)$")
    focus_x: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    focus_y: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    captions_enabled: Optional[bool] = None
    caption_style: Optional[CaptionStyle] = None
    words: Optional[List[WordItem]] = None
    title_overlay_text: Optional[str] = None
    music_track_url: Optional[str] = None
    music_volume: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    music_ducking: Optional[bool] = None
    watermark_url: Optional[str] = None
    remove_silence: Optional[bool] = None
    remove_filler_words: Optional[bool] = None


class ClipDetailResponse(BaseModel):
    id: str
    project_id: str
    project_title: str
    title: str
    hook_text: Optional[str] = None
    start_time: float
    end_time: float
    duration: float
    virality_score: int
    reason: Optional[str] = None
    transcript_excerpt: Optional[str] = None
    status: str
    rendered_video_path: Optional[str] = None
    rendered_video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    source_video_url: Optional[str] = None
    source_duration: Optional[float] = None
    source_width: Optional[int] = None
    source_height: Optional[int] = None
    aspect_ratio: str = "9:16"
    reframe_mode: str = "auto_face"
    focus_x: float = 0.5
    focus_y: float = 0.5
    captions_enabled: bool = True
    caption_style: CaptionStyle
    words: List[WordItem] = []
    title_overlay_text: Optional[str] = None
    music_track_url: Optional[str] = None
    music_volume: float = 0.2
    music_ducking: bool = True
    watermark_url: Optional[str] = None
    remove_silence: bool = False
    remove_filler_words: bool = False

    model_config = ConfigDict(from_attributes=True)
