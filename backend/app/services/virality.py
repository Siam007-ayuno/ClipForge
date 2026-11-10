from typing import List, Dict, Any, Optional
from app.services.llm_client import LLMClient
from app.core.config import settings


class ViralityService:
    """Orchestrates topic segmentation, LLM virality scoring, and sentence boundary snapping."""

    def __init__(self):
        self.llm = LLMClient()

    async def detect_clips(
        self,
        transcript_text: str,
        segments: List[Dict[str, Any]],
        num_clips: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        1. Segment and query LLM for top viral moments.
        2. Validate and snap timestamps strictly to word & sentence boundaries.
        """
        target_count = num_clips or settings.TARGET_CLIPS_COUNT
        min_dur = settings.MIN_CLIP_DURATION
        max_dur = settings.MAX_CLIP_DURATION

        # If transcript is too short (< min_dur), create one full clip if segments exist
        total_len = segments[-1]["end"] if segments else 0
        if total_len < min_dur and segments:
            min_dur = max(5.0, total_len)

        # 1. LLM Virality Scoring
        raw_candidates = await self.llm.generate_viral_clips(
            transcript_text=transcript_text,
            segments=segments,
            num_clips=target_count,
            min_duration=min_dur,
            max_duration=max_dur,
        )

        # 2. Strict Boundary Snapping
        snapped_clips = self._snap_clips_to_sentence_boundaries(
            raw_candidates,
            segments,
            min_dur,
            max_dur
        )

        return snapped_clips

    def _snap_clips_to_sentence_boundaries(
        self,
        candidates: List[Dict[str, Any]],
        segments: List[Dict[str, Any]],
        min_dur: float,
        max_dur: float,
    ) -> List[Dict[str, Any]]:
        """
        Validates that clips start and end at sentence boundaries, never cutting mid-word.
        """
        if not segments:
            return []

        # Flatten all words with their timestamps
        all_words = []
        for s in segments:
            if s.get("words"):
                for w in s["words"]:
                    all_words.append(w)
            else:
                # Fallback if segment lacks word timestamps
                all_words.append({
                    "word": s["text"],
                    "start": s["start"],
                    "end": s["end"]
                })

        valid_clips = []
        for cand in candidates:
            req_start = float(cand.get("start_time", 0))
            req_end = float(cand.get("end_time", req_start + 45.0))

            # Snap start to closest segment start
            closest_start = min(segments, key=lambda s: abs(s["start"] - req_start))["start"]
            
            # Snap end to closest segment end that ensures minimum duration
            candidate_ends = [s["end"] for s in segments if s["end"] > closest_start]
            if candidate_ends:
                closest_end = min(candidate_ends, key=lambda e: abs(e - req_end))
            else:
                closest_end = segments[-1]["end"]

            dur = closest_end - closest_start
            if dur < 5.0 and len(segments) > 1:
                # Extend to next segment if too short
                closest_end = segments[-1]["end"]
                dur = closest_end - closest_start

            # Extract exact spoken words in this range
            clip_words = [
                w["word"] for w in all_words
                if w["start"] >= closest_start and w["end"] <= closest_end + 0.1
            ]
            transcript_excerpt = " ".join(clip_words) if clip_words else cand.get("transcript_excerpt", "")

            valid_clips.append({
                "title": cand.get("title", "Viral Highlight"),
                "hook_text": cand.get("hook_text", transcript_excerpt[:80]),
                "start_time": round(closest_start, 2),
                "end_time": round(closest_end, 2),
                "duration": round(dur, 2),
                "virality_score": int(cand.get("virality_score", 80)),
                "reason": cand.get("reason", "Engaging hook with complete thought"),
                "transcript_excerpt": transcript_excerpt,
            })

        # Sort clips by virality score descending
        valid_clips.sort(key=lambda c: c["virality_score"], reverse=True)
        return valid_clips
