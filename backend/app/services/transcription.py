import os
import math
import wave
import subprocess
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from faster_whisper import WhisperModel
from app.core.config import settings
from app.services.audio_extractor import get_ffmpeg_executable

_models_cache: Dict[str, WhisperModel] = {}


def load_wav_to_numpy(wav_path: str) -> np.ndarray:
    """Reads 16kHz WAV file into float32 numpy array directly without external C libraries."""
    with wave.open(wav_path, "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())

        if sampwidth == 2:
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        elif sampwidth == 4:
            audio = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
        else:
            audio = np.frombuffer(frames, dtype=np.float32)

        if n_channels > 1:
            audio = audio.reshape(-1, n_channels).mean(axis=1)

        return audio


def get_whisper_model(model_size: Optional[str] = None) -> WhisperModel:
    """Returns singleton WhisperModel instance with CUDA auto-detection for 10x-50x speedup."""
    size = model_size or settings.WHISPER_MODEL_SIZE
    device = settings.WHISPER_DEVICE
    compute_type = settings.WHISPER_COMPUTE_TYPE

    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda"
            compute_type = "float16"
    except Exception:
        pass

    cache_key = f"{size}_{device}_{compute_type}"
    if cache_key not in _models_cache:
        _models_cache[cache_key] = WhisperModel(
            size,
            device=device,
            compute_type=compute_type,
        )
    return _models_cache[cache_key]


@dataclass
class WordTimestamp:
    word: str
    start: float
    end: float
    probability: float


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str
    words: List[Dict[str, Any]]


@dataclass
class TranscriptionResult:
    language: str
    language_probability: float
    raw_text: str
    segments: List[Dict[str, Any]]


class TranscriptionService:
    """Handles speech-to-text with word-level timestamps and auto language detection."""

    def __init__(self, model_size: Optional[str] = None):
        self.model = get_whisper_model(model_size)
        self.ffmpeg_bin = get_ffmpeg_executable()

    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        duration: Optional[float] = None,
    ) -> TranscriptionResult:
        """
        Transcribes audio with word-level timestamps.
        Automatically chunks long audio files (> 30 mins) to optimize memory and stability.
        """
        # If duration is unknown, inspect audio duration
        if not duration:
            duration = self._get_audio_duration(audio_path)

        # For long audio (> 1800s / 30m), chunk into 15m (900s) slices
        CHUNK_LIMIT_SECONDS = 1800.0
        if duration > CHUNK_LIMIT_SECONDS:
            return self._transcribe_long_audio_in_chunks(audio_path, duration, language)

        return self._transcribe_single_file(audio_path, language=language)

    def _transcribe_single_file(
        self,
        audio_path: str,
        time_offset: float = 0.0,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        """Transcribes a single audio file or slice."""
        try:
            audio_input = load_wav_to_numpy(audio_path)
        except Exception:
            audio_input = audio_path

        segments_gen, info = self.model.transcribe(
            audio_input,
            language=language,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        all_segments: List[Dict[str, Any]] = []
        raw_text_parts: List[str] = []

        for seg in segments_gen:
            words_data = []
            if seg.words:
                for w in seg.words:
                    words_data.append({
                        "word": w.word.strip(),
                        "start": round(w.start + time_offset, 2),
                        "end": round(w.end + time_offset, 2),
                        "probability": round(w.probability, 3) if hasattr(w, "probability") else 0.95,
                    })

            clean_text = seg.text.strip()
            if clean_text:
                raw_text_parts.append(clean_text)
                all_segments.append({
                    "start": round(seg.start + time_offset, 2),
                    "end": round(seg.end + time_offset, 2),
                    "text": clean_text,
                    "words": words_data,
                })

        return TranscriptionResult(
            language=info.language,
            language_probability=round(info.language_probability, 3),
            raw_text=" ".join(raw_text_parts),
            segments=all_segments,
        )

    def _transcribe_long_audio_in_chunks(
        self,
        audio_path: str,
        total_duration: float,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        """
        Handles 2+ hour long videos by splitting audio into 15-minute chunks with FFmpeg,
        transcribing each chunk sequentially, and stitching word timestamps with exact offsets.
        """
        CHUNK_SECONDS = 900.0  # 15 minutes
        num_chunks = math.ceil(total_duration / CHUNK_SECONDS)
        temp_dir = os.path.join(os.path.dirname(audio_path), "chunks")
        os.makedirs(temp_dir, exist_ok=True)

        merged_segments: List[Dict[str, Any]] = []
        merged_text: List[str] = []
        detected_lang = "en"
        detected_prob = 1.0

        for i in range(num_chunks):
            start_time = i * CHUNK_SECONDS
            chunk_file = os.path.join(temp_dir, f"chunk_{i:04d}.wav")
            
            # Extract slice
            cmd = [
                self.ffmpeg_bin,
                "-y",
                "-ss", str(start_time),
                "-t", str(CHUNK_SECONDS),
                "-i", audio_path,
                "-acodec", "copy",
                chunk_file,
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            if os.path.exists(chunk_file):
                chunk_res = self._transcribe_single_file(
                    chunk_file,
                    time_offset=start_time,
                    language=language or (detected_lang if i > 0 else None),
                )
                if i == 0:
                    detected_lang = chunk_res.language
                    detected_prob = chunk_res.language_probability
                
                merged_segments.extend(chunk_res.segments)
                if chunk_res.raw_text:
                    merged_text.append(chunk_res.raw_text)

                try:
                    os.remove(chunk_file)
                except Exception:
                    pass

        try:
            os.rmdir(temp_dir)
        except Exception:
            pass

        return TranscriptionResult(
            language=detected_lang,
            language_probability=detected_prob,
            raw_text=" ".join(merged_text),
            segments=merged_segments,
        )

    def _get_audio_duration(self, audio_path: str) -> float:
        """Quickly reads audio duration via ffprobe/ffmpeg."""
        cmd = [
            self.ffmpeg_bin,
            "-i", audio_path,
            "-hide_banner",
        ]
        res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="replace")
        import re
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
        if m:
            h, mm, s = m.groups()
            return int(h) * 3600 + int(mm) * 60 + float(s)
        return 60.0
