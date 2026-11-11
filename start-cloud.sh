#!/bin/bash
set -e

echo "=========================================="
echo "    Starting ClipForge AI Full-Stack      "
echo "=========================================="

# 1. Start FastAPI backend on internal loopback port 8000
cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "[*] Waiting for backend to become healthy..."
while ! curl -s http://127.0.0.1:8000/api/v1/health > /dev/null; do
    sleep 1
done
echo "[v] Backend is healthy on port 8000!"

# 2. Start Next.js frontend on public PORT (7860 on Hugging Face Spaces, or 3000)
cd /app/frontend
TARGET_PORT=${PORT:-7860}
echo "[*] Starting Next.js frontend on port $TARGET_PORT..."
npm run start -- -p $TARGET_PORT &
FRONTEND_PID=$!

# Trap signals for clean termination
trap "kill -TERM $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM

wait -n
