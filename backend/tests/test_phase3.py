import os
import pytest
from app.core.database import SessionLocal
from app.models.clip import Clip
from app.services.reframe import ReframeService
from app.services.captions import CaptionGenerator


def test_reframe_filter_builder():
    service = ReframeService()
    # 1. 9:16 Auto Face Crop
    flt_916 = service.build_ffmpeg_filter(
        video_width=1920,
        video_height=1080,
        aspect_ratio="9:16",
        reframe_mode="auto_face",
        focus_x=0.5,
        target_resolution="1080p",
    )
    assert "crop=" in flt_916
    assert "scale=1080:1920" in flt_916

    # 2. 9:16 Blurred Fit
    flt_blur = service.build_ffmpeg_filter(
        video_width=1920,
        video_height=1080,
        aspect_ratio="9:16",
        reframe_mode="blurred_fit",
        target_resolution="1080p",
    )
    assert "boxblur=" in flt_blur
    assert "overlay=" in flt_blur


def test_ass_caption_generation(tmp_path):
    gen = CaptionGenerator()
    words = [
        {"word": "Welcome", "start": 1.0, "end": 1.5},
        {"word": "to", "start": 1.5, "end": 1.7},
        {"word": "ClipForge", "start": 1.7, "end": 2.5},
    ]
    out_file = str(tmp_path / "test_subs.ass")
    gen.generate_ass_file(
        words_data=words,
        clip_start=1.0,
        clip_end=3.0,
        output_ass_path=out_file,
    )
    assert os.path.exists(out_file)
    with open(out_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert "[Script Info]" in content
    assert "Dialogue:" in content
    assert "ClipForge" in content
