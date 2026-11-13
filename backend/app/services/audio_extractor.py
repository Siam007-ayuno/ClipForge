import os
import shutil
import subprocess
import json
from typing import Dict, Any, Tuple, Optional
from app.services.storage import get_storage_service
from app.core.config import settings


def get_ffmpeg_executable() -> str:
    """Returns the path to the ffmpeg executable across system, venv, and imageio."""
    bin_path = shutil.which("ffmpeg")
    if bin_path:
        return bin_path

    # Check right next to current python interpreter
    import sys
    py_dir_ffmpeg = os.path.join(os.path.dirname(sys.executable), "ffmpeg.exe")
    if os.path.isfile(py_dir_ffmpeg):
        return py_dir_ffmpeg

    venv_ffmpeg = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", ".venv", "Scripts", "ffmpeg.exe")
    )
    if os.path.isfile(venv_ffmpeg):
        return venv_ffmpeg

    try:
        import imageio_ffmpeg
        img_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if os.path.isfile(img_exe):
            return img_exe
    except Exception:
        pass

    return "ffmpeg"


class AudioExtractor:
    """Extracts 16kHz mono audio from video files and probes media properties."""

    def __init__(self):
        self.ffmpeg_bin = get_ffmpeg_executable()
        self.storage = get_storage_service()

    def probe_video(self, video_path: str) -> Dict[str, Any]:
        """
        Extracts duration, width, height, and FPS from the video using FFmpeg.
        """
        cmd = [
            self.ffmpeg_bin,
            "-i", video_path,
            "-hide_banner",
        ]
        result = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="replace")
        output = result.stderr

        metadata = {
            "duration": None,
            "width": None,
            "height": None,
            "fps": None,
        }

        # Parse Duration: HH:MM:SS.xx
        import re
        dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", output)
        if dur_match:
            hours, mins, secs = dur_match.groups()
            metadata["duration"] = int(hours) * 3600 + int(mins) * 60 + float(secs)

        # Parse Resolution: 1920x1080
        res_match = re.search(r"Video:.*?(\d{3,4})x(\d{3,4})", output)
        if res_match:
            metadata["width"] = int(res_match.group(1))
            metadata["height"] = int(res_match.group(2))

        # Parse FPS: 29.97 fps, 30 fps, etc.
        fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", output)
        if fps_match:
            metadata["fps"] = float(fps_match.group(1))

        return metadata

    def extract_audio(self, video_path: str, output_wav_path: str, max_duration: Optional[float] = None) -> str:
        """
        Extracts 16kHz mono 16-bit PCM WAV audio for optimal Whisper transcription.
        If max_duration is specified, limits extraction to the first N seconds for 10x faster scans.
        """
        os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)
        cmd = [
            self.ffmpeg_bin,
            "-y",
        ]
        if max_duration and max_duration > 0:
            cmd.extend(["-t", str(max_duration)])
        cmd.extend([
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_wav_path,
        ])
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace")
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg audio extraction failed: {res.stderr}")
        return output_wav_path
