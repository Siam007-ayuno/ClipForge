import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.clip import Clip
from app.models.user import User
from app.core.security import create_access_token

client = TestClient(app)


def get_auth_token():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "demo@clipforge.ai").first()
    db.close()
    if user:
        return create_access_token(user.id)
    return ""


def test_get_clip_detail():
    token = get_auth_token()
    db = SessionLocal()
    clip = db.query(Clip).first()
    db.close()

    assert clip is not None
    response = client.get(
        f"/api/v1/clips/{clip.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == clip.id
    assert "words" in data
    assert "caption_style" in data
    assert data["aspect_ratio"] in ["9:16", "1:1", "16:9"]


def test_update_clip_edit_and_styles():
    token = get_auth_token()
    db = SessionLocal()
    clip = db.query(Clip).first()
    db.close()

    assert clip is not None
    update_payload = {
        "title": "Updated Test Clip Title",
        "aspect_ratio": "1:1",
        "title_overlay_text": "HOOK OVERLAY BANNER",
        "caption_style": {
            "font": "Montserrat",
            "font_size": 36,
            "primary_color": "#FFFFFF",
            "highlight_color": "#00FFFF",
            "position": "bottom",
        },
        "remove_filler_words": True,
    }

    response = client.put(
        f"/api/v1/clips/{clip.id}/edit",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Test Clip Title"
    assert data["aspect_ratio"] == "1:1"
    assert data["title_overlay_text"] == "HOOK OVERLAY BANNER"
    assert data["caption_style"]["highlight_color"] == "#00FFFF"
    assert data["remove_filler_words"] is True


def test_clip_status_endpoint():
    token = get_auth_token()
    db = SessionLocal()
    clip = db.query(Clip).first()
    db.close()

    assert clip is not None
    response = client.get(
        f"/api/v1/clips/{clip.id}/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["clip_id"] == clip.id
    assert "status" in data
    assert "progress" in data
