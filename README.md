---
title: ClipForge AI
emoji: 🎬
colorFrom: red
colorTo: amber
sdk: gradio
sdk_version: 5.16.0
app_file: app.py
pinned: false
license: mit
short_description: Turn long videos into viral vertical short clips with AI
---

# ClipForge 🎬⚡

> **AI tool that turns long videos into short, viral, ready-to-post clips**

ClipForge automatically extracts high-impact moments from long videos (podcasts, streams, interviews, lectures), generates word-level animated subtitles, reframes speakers to 9:16 vertical ratio with face detection, and provides an in-browser timeline editor.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Axios
- **Backend**: Python 3.11+ / FastAPI, Pydantic v2
- **Database**: PostgreSQL (SQLAlchemy 2.0 + Alembic migrations), SQLite fallback for zero-config local dev
- **Storage**: Pluggable storage adapter (`LocalStorageService` for dev, `S3StorageService` for Cloudflare R2 / AWS S3)
- **Ingestion**: `DirectUploadProvider` (resumable chunked upload up to 2GB) and `YouTubeIngestionProvider` (`yt-dlp`)
- **Job Queue**: Celery + Redis
- **Compliance & Rights**: Mandatory cryptographic and database rights confirmation logging before video ingestion

---

## 🚀 Quickstart Guide

### 1. Clone & Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```

### 2. Backend Setup (Local Dev)
```bash
# Navigate to backend
cd backend

# Create & activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- Interactive API Docs (Swagger): [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 3. Frontend Setup (Local Dev)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Phase 1

To execute the automated test suite for Phase 1 (Auth, Rights Verification, Chunked Upload & Assembly):

```bash
cd backend
$env:PYTHONPATH="."
..\backend\.venv\Scripts\pytest tests/test_phase1.py -v
```

---

## 🐳 Docker Compose (Production / Full-Stack)

To spin up all services together (`api`, `worker`, `redis`, `postgres`, `web`):

```bash
docker compose up --build
```

---

## 📋 Implementation Roadmap

- [x] **Phase 1: Project Scaffold + Auth + Upload + Storage**
  - Database schema & Alembic migrations (8 tables)
  - JWT auth (Register, Login, Me)
  - Pluggable storage adapter (Local + S3/R2)
  - Ingestion providers: 2GB chunked direct file upload & YouTube link import (`yt-dlp`)
  - Mandatory legal rights confirmation logging (refuses processing without it)
  - Next.js dashboard, dark mode, responsive upload wizard
- [ ] **Phase 2: Transcription + LLM Clip Selection**
  - Audio extraction + faster-whisper word-level timestamps (Bengali & English)
  - Topic segmentation
  - LLM Virality scoring (Claude / Gemini API) with strict JSON output
  - Sentence boundary validation
- [ ] **Phase 3: FFmpeg Rendering + Captions + Reframe**
  - MediaPipe face detection & auto-centering in 9:16
  - Animated subtitle burn-in
- [ ] **Phase 4: In-Browser Timeline Editor UI**
- [ ] **Phase 5: Export, Download & ZIP**
- [ ] **Phase 6: Policy Pages, Content ID compliance & Cleanup Jobs**
