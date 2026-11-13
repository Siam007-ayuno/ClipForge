import os
import uuid
import shutil
import asyncio
from typing import Optional
import yt_dlp
from app.services.ingestion.base import IngestionProvider, IngestionResult
from app.services.storage import get_storage_service
from app.services.audio_extractor import get_ffmpeg_executable
from app.core.config import settings


class YouTubeIngestionProvider(IngestionProvider):
    """Downloads and ingests video from YouTube links via yt-dlp."""

    def __init__(self):
        self.storage = get_storage_service()

    async def ingest(self, url: str, project_id: Optional[str] = None, **kwargs) -> IngestionResult:
        """
        Downloads the video from YouTube using yt-dlp to a temporary location,
        then stores it via the storage service.
        """
        temp_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "temp", "ytdl")
        os.makedirs(temp_dir, exist_ok=True)
        unique_id = uuid.uuid4().hex
        out_template = os.path.join(temp_dir, f"{unique_id}_%(id)s.%(ext)s")

        # Locate ffmpeg executable
        ffmpeg_bin = get_ffmpeg_executable()
        if ffmpeg_bin and os.path.isfile(ffmpeg_bin):
            ffmpeg_dir = os.path.dirname(os.path.abspath(ffmpeg_bin))
            if ffmpeg_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
        else:
            ffmpeg_dir = None

        ydl_opts = {
            "format": "best[height<=1080][ext=mp4]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]/best",
            "outtmpl": out_template,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "format_sort": ["res:1080", "ext:mp4:m4a"],
            "concurrent_fragment_downloads": 4,
            "socket_timeout": 20,
            "retries": 3,
            "js_runtimes": {"node": {}},
        }
        if ffmpeg_dir:
            ydl_opts["ffmpeg_location"] = ffmpeg_dir

        # Run yt_dlp in a thread pool to avoid blocking the event loop
        def run_ydl():
            # Auto-detect cookies.txt if present
            cookie_candidates = [
                os.path.join(os.getcwd(), "cookies.txt"),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "cookies.txt")),
            ]
            for c in cookie_candidates:
                if os.path.isfile(c):
                    ydl_opts["cookiefile"] = c
                    break

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    downloaded_file = ydl.prepare_filename(info)
                    # Ensure actual extension if remuxed
                    if not os.path.exists(downloaded_file):
                        base, _ = os.path.splitext(downloaded_file)
                        for ext in [".mp4", ".mkv", ".webm"]:
                            if os.path.exists(base + ext):
                                downloaded_file = base + ext
                                break
                    return info, downloaded_file
            except Exception as e:
                err_msg = str(e)
                if "Sign in to confirm your age" in err_msg or "age-restricted" in err_msg.lower():
                    raise ValueError(
                        "YouTube Age Restriction: This video is 18+ age-restricted by YouTube. "
                        "Please download the video and upload it directly via Direct Upload, or place a cookies.txt file in the workspace."
                    )
                raise

        info, downloaded_filepath = await asyncio.to_thread(run_ydl)

        if not os.path.exists(downloaded_filepath):
            raise FileNotFoundError(f"Failed to download video from {url}")

        file_size = os.path.getsize(downloaded_filepath)
        filename = os.path.basename(downloaded_filepath)
        storage_key = f"videos/{project_id or unique_id}/{filename}"

        with open(downloaded_filepath, "rb") as f:
            self.storage.save_file(f, storage_key)

        # Cleanup temp file
        try:
            os.remove(downloaded_filepath)
        except Exception:
            pass

        return IngestionResult(
            storage_key=storage_key,
            original_filename=info.get("title", filename) + ".mp4",
            file_size_bytes=file_size,
            duration_seconds=float(info.get("duration", 0)),
            width=info.get("width"),
            height=info.get("height"),
            fps=info.get("fps"),
            title=info.get("title", "Imported Video"),
            metadata={
                "channel": info.get("uploader"),
                "webpage_url": info.get("webpage_url", url),
                "description": info.get("description", "")[:500],
            }
        )
