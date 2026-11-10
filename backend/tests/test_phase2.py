import os
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.source_video import SourceVideo
from app.services.audio_extractor import AudioExtractor
from app.services.virality import ViralityService
from app.tasks.pipeline import execute_pipeline

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_virality_boundary_snapping():
    """Verify sentence boundary validation and duration constraints."""
    service = ViralityService()
    
    # Mock transcript segments
    mock_segments = [
        {
            "start": 0.0,
            "end": 4.5,
            "text": "Have you ever wondered why most creators give up in their first year?",
            "words": [
                {"word": "Have", "start": 0.0, "end": 0.3},
                {"word": "you", "start": 0.3, "end": 0.5},
                {"word": "ever", "start": 0.5, "end": 0.9},
                {"word": "wondered", "start": 0.9, "end": 1.4},
                {"word": "why", "start": 1.4, "end": 1.8},
                {"word": "most", "start": 1.8, "end": 2.2},
                {"word": "creators", "start": 2.2, "end": 2.9},
                {"word": "give", "start": 2.9, "end": 3.3},
                {"word": "up", "start": 3.3, "end": 3.6},
                {"word": "in", "start": 3.6, "end": 3.8},
                {"word": "their", "start": 3.8, "end": 4.0},
                {"word": "first", "start": 4.0, "end": 4.3},
                {"word": "year?", "start": 4.3, "end": 4.5},
            ]
        },
        {
            "start": 4.8,
            "end": 38.0,
            "text": "It is not lack of talent. It is because they expect immediate validation without doing the boring work.",
            "words": [
                {"word": "It", "start": 4.8, "end": 5.0},
                {"word": "is", "start": 5.0, "end": 5.2},
                {"word": "not", "start": 5.2, "end": 5.5},
                {"word": "lack", "start": 5.5, "end": 6.0},
                {"word": "of", "start": 6.0, "end": 6.2},
                {"word": "talent.", "start": 6.2, "end": 7.0},
                {"word": "It", "start": 7.5, "end": 7.8},
                {"word": "is", "start": 7.8, "end": 8.0},
                {"word": "because", "start": 8.0, "end": 8.5},
                {"word": "they", "start": 8.5, "end": 8.8},
                {"word": "expect", "start": 8.8, "end": 9.4},
                {"word": "immediate", "start": 9.4, "end": 10.2},
                {"word": "validation", "start": 10.2, "end": 11.0},
                {"word": "without", "start": 11.2, "end": 11.8},
                {"word": "doing", "start": 11.8, "end": 12.2},
                {"word": "the", "start": 12.2, "end": 12.4},
                {"word": "boring", "start": 12.4, "end": 13.0},
                {"word": "work.", "start": 13.0, "end": 38.0},
            ]
        }
    ]

    mock_candidates = [
        {
            "start_time": 0.2,  # mid-word
            "end_time": 36.5,   # mid-word
            "title": "Why Creators Quit Early",
            "hook_text": "Have you ever wondered why most creators give up",
            "virality_score": 94,
            "reason": "Strong provocative question leading to mindset breakthrough.",
            "transcript_excerpt": "Have you ever wondered...",
        }
    ]

    snapped = service._snap_clips_to_sentence_boundaries(
        mock_candidates,
        mock_segments,
        min_dur=10.0,
        max_dur=60.0
    )

    assert len(snapped) == 1
    clip = snapped[0]
    # Check that start and end snapped to exact segment boundaries
    assert clip["start_time"] == 0.0
    assert clip["end_time"] == 38.0
    assert clip["duration"] == 38.0
    assert clip["virality_score"] == 94
    assert "Have you ever wondered" in clip["transcript_excerpt"]
