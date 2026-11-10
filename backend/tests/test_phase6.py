import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.models.project import Project
from app.models.clip import Clip
from app.models.source_video import SourceVideo
from app.models.share_link import ShareLink
from app.models.report import Report
from app.tasks.cleanup import cleanup_expired_storage, purge_project_assets
from app.services.storage import get_storage_service

client = TestClient(app)


def get_auth_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@clipforge.ai", "password": "DemoPassword123!"},
    )
    if res.status_code != 200:
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "demo@clipforge.ai",
                "password": "DemoPassword123!",
                "full_name": "Demo Creator",
            },
        )
    return res.json()["access_token"]


def test_submit_and_list_reports():
    # 1. Submit public report without authentication
    report_data = {
        "report_type": "copyright_dmca",
        "target_type": "clip",
        "target_id": "test_clip_12345",
        "target_url": "http://localhost:3000/share/test_token",
        "reporter_name": "Acme Rights Management Ltd",
        "reporter_email": "dmca@acmerights.com",
        "original_work_url": "https://www.youtube.com/watch?v=original123",
        "description": "This clip contains unauthorized proprietary footage owned by Acme Corp without license.",
        "good_faith_statement": True,
    }
    res = client.post("/api/v1/reports", json=report_data)
    assert res.status_code == 201
    created = res.json()
    assert created["reporter_email"] == "dmca@acmerights.com"
    assert created["status"] == "pending"
    report_id = created["id"]

    # 2. List reports with authenticated user
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    list_res = client.get("/api/v1/reports", headers=headers)
    assert list_res.status_code == 200
    reports = list_res.json()
    assert any(r["id"] == report_id for r in reports)

    # 3. Get single report detail
    detail_res = client.get(f"/api/v1/reports/{report_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["target_id"] == "test_clip_12345"


def test_report_good_faith_validation():
    invalid_report = {
        "report_type": "copyright_dmca",
        "target_type": "clip",
        "reporter_name": "Jane Doe",
        "reporter_email": "jane@example.com",
        "description": "Infringing content without affirmation.",
        "good_faith_statement": False,
    }
    res = client.post("/api/v1/reports", json=invalid_report)
    assert res.status_code == 400
    assert "good-faith statement" in res.json()["detail"].lower()


def test_moderation_takedown_action():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Submit report
    res = client.post(
        "/api/v1/reports",
        json={
            "report_type": "copyright_dmca",
            "target_type": "clip",
            "target_id": "clip_to_remove_abc",
            "reporter_name": "Studio Legal",
            "reporter_email": "legal@studio.com",
            "description": "Unauthorized copyright use.",
            "good_faith_statement": True,
        },
    )
    report_id = res.json()["id"]

    # Moderator reviews and actions takedown
    patch_res = client.patch(
        f"/api/v1/reports/{report_id}",
        headers=headers,
        json={
            "status": "content_removed",
            "resolution_notes": "DMCA Verified. Content de-listed immediately.",
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "content_removed"
    assert updated["resolution_notes"] == "DMCA Verified. Content de-listed immediately."
    assert updated["resolved_at"] is not None


def test_admin_cleanup_trigger_endpoint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Test dry run
    res_dry = client.post(
        "/api/v1/admin/cleanup?retention_days=30&dry_run=true",
        headers=headers,
    )
    assert res_dry.status_code == 200
    data_dry = res_dry.json()
    assert data_dry["dry_run"] is True
    assert "retention_days" in data_dry
    assert "freed_bytes" in data_dry

    # Test live execution
    res_live = client.post(
        "/api/v1/admin/cleanup?retention_days=30&dry_run=false",
        headers=headers,
    )
    assert res_live.status_code == 200
    data_live = res_live.json()
    assert data_live["dry_run"] is False
    assert "expired_projects_count" in data_live
