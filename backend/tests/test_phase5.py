import os
import zipfile
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.clip import Clip
from app.models.project import Project
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


def test_download_clip_srt():
    token = get_auth_token()
    db = SessionLocal()
    clip = db.query(Clip).first()
    db.close()

    assert clip is not None
    response = client.get(
        f"/api/v1/clips/{clip.id}/captions/srt",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["content-type"] == "application/x-subrip"
    text = response.text
    assert "-->" in text


def test_get_social_copy():
    token = get_auth_token()
    db = SessionLocal()
    clip = db.query(Clip).first()
    db.close()

    assert clip is not None
    response = client.get(
        f"/api/v1/clips/{clip.id}/social-copy",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "hook_title" in data
    assert "description" in data
    assert "hashtags" in data
    assert "full_copy" in data
    assert len(data["hashtags_list"]) > 0


def test_share_link_lifecycle():
    token = get_auth_token()
    db = SessionLocal()
    clip = db.query(Clip).first()
    db.close()

    assert clip is not None
    # 1. Create temporary share link
    share_res = client.post(
        f"/api/v1/clips/{clip.id}/share",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert share_res.status_code == 200
    share_data = share_res.json()
    share_token = share_data["share_token"]
    assert share_token
    assert "expires_at" in share_data

    # 2. Access public link WITHOUT authorization header
    public_res = client.get(f"/api/v1/share/{share_token}")
    assert public_res.status_code == 200
    public_data = public_res.json()
    assert public_data["clip_id"] == clip.id
    assert public_data["title"] == clip.title
    assert public_data["token"] == share_token
    assert public_data["views_count"] >= 1


def test_download_project_zip():
    token = get_auth_token()
    db = SessionLocal()
    project = db.query(Project).filter(Project.id == "b2d2cc8bcd404e28addb02bc17e74d46").first()
    if not project:
        project = db.query(Project).first()
    db.close()

    assert project is not None
    response = client.get(
        f"/api/v1/projects/{project.id}/download-all?resolution=720p",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in response.headers["content-disposition"]

    # Verify valid zip in memory
    zip_bytes = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "manifest.json" in namelist
        assert "README.txt" in namelist
        # Verify captions and clips folders exist in zip
        assert any(n.startswith("captions/") for n in namelist)
        assert any(n.startswith("social_copy/") for n in namelist)
