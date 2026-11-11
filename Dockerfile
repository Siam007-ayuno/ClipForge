# ==========================================
# Multi-Stage Build for ClipForge Full-Stack
# Deployable to Hugging Face Spaces (Free 16GB RAM), Render, Railway, Fly.io & Docker
# ==========================================

# Stage 1: Build Next.js Frontend
FROM node:20-bullseye-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Runtime image with Python 3.11, FFmpeg, and Node.js
FROM python:3.11-slim-bullseye

WORKDIR /app

# Install system dependencies (FFmpeg, system libraries for MediaPipe / OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend Code
COPY backend/ ./backend/

# Copy Frontend Built App & node_modules
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY frontend/next.config.ts ./frontend/

# Create persistent storage directory
RUN mkdir -p /app/backend/storage_data

# Startup entrypoint
COPY start-cloud.sh ./start-cloud.sh
RUN chmod +x ./start-cloud.sh

# Expose port (7860 for Hugging Face Spaces / 3000 for standard)
EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["./start-cloud.sh"]
