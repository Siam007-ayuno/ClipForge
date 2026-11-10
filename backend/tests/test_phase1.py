import io
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data


def test_auth_and_rights_flow():
    # 1. Register User with unique test email
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"creator_{unique_suffix}@clipforge.ai"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": "SuperSecretPassword123!", "full_name": "Test Creator"},
    )
    assert reg_res.status_code == 201
    auth_data = reg_res.json()
    assert "access_token" in auth_data
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify /me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email

    # 3. Confirm Rights Check (Required Compliance step)
    rights_res = client.post(
        "/api/v1/rights/confirm",
        headers=headers,
        json={
            "source_type": "upload",
            "identifier": "podcast_sample.mp4",
            "agreed_text": "I own this video, have permission from the owner, or it is licensed for reuse (e.g. Creative Commons)."
        }
    )
    assert rights_res.status_code == 201
    rights_data = rights_res.json()
    assert "id" in rights_data
    rights_id = rights_data["id"]

    # 4. Chunked Upload Flow
    # 4a. Init upload
    init_res = client.post(
        "/api/v1/uploads/init",
        headers=headers,
        json={
            "filename": "podcast_sample.mp4",
            "total_size": 2048,
            "total_chunks": 2,
            "mime_type": "video/mp4"
        }
    )
    assert init_res.status_code == 200
    upload_info = init_res.json()
    upload_id = upload_info["upload_id"]

    # 4b. Send Chunk 0
    chunk0_data = b"CLIPFORGE_SAMPLE_VIDEO_CHUNK_0" * 32
    c0_res = client.post(
        "/api/v1/uploads/chunk",
        headers=headers,
        data={"upload_id": upload_id, "chunk_index": 0},
        files={"chunk": ("chunk_0.part", io.BytesIO(chunk0_data), "application/octet-stream")}
    )
    assert c0_res.status_code == 200

    # 4c. Send Chunk 1
    chunk1_data = b"CLIPFORGE_SAMPLE_VIDEO_CHUNK_1" * 32
    c1_res = client.post(
        "/api/v1/uploads/chunk",
        headers=headers,
        data={"upload_id": upload_id, "chunk_index": 1},
        files={"chunk": ("chunk_1.part", io.BytesIO(chunk1_data), "application/octet-stream")}
    )
    assert c1_res.status_code == 200

    # 4d. Complete Upload WITHOUT Rights Check -> Expect 403 Forbidden!
    bad_complete = client.post(
        "/api/v1/uploads/complete",
        headers=headers,
        json={
            "upload_id": upload_id,
            "filename": "podcast_sample.mp4",
            "total_chunks": 2,
            "rights_confirmation_id": "invalid-rights-id",
            "project_title": "Podcast Episode 1"
        }
    )
    assert bad_complete.status_code == 403

    # 4e. Complete Upload WITH valid Rights Check
    good_complete = client.post(
        "/api/v1/uploads/complete",
        headers=headers,
        json={
            "upload_id": upload_id,
            "filename": "podcast_sample.mp4",
            "total_chunks": 2,
            "rights_confirmation_id": rights_id,
            "project_title": "Podcast Episode 1"
        }
    )
    assert good_complete.status_code == 200
    comp_data = good_complete.json()
    assert "project_id" in comp_data
    project_id = comp_data["project_id"]

    # 5. List Projects
    projects_res = client.get("/api/v1/projects", headers=headers)
    assert projects_res.status_code == 200
    projects = projects_res.json()
    assert len(projects) >= 1
    assert any(p["id"] == project_id for p in projects)

    # 6. Get Project Details
    p_detail = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert p_detail.status_code == 200
    assert p_detail.json()["title"] == "Podcast Episode 1"
    assert p_detail.json()["source_video"]["original_filename"] == "podcast_sample.mp4"
