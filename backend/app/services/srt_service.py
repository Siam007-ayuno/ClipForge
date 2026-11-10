from typing import List, Dict, Any


def seconds_to_srt_time(seconds: float) -> str:
    """Converts seconds into standard SRT timestamp format: HH:MM:SS,mmm"""
    if seconds < 0:
        seconds = 0.0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


class SrtService:
    """Generates standard SubRip (.srt) caption files from word timestamps."""

    @staticmethod
    def generate_srt(
        words_data: List[Dict[str, Any]],
        clip_start: float,
        clip_end: float,
        words_per_line: int = 5,
    ) -> str:
        """
        Groups words into readable chunks (4-6 words) with relative timestamps.
        """
        filtered = []
        for w in words_data:
            if w.get("deleted", False):
                continue
            text = w.get("word", "").strip()
            if not text:
                continue
            w_start = float(w["start"]) - clip_start
            w_end = float(w["end"]) - clip_start

            if w_end > 0 and w_start < (clip_end - clip_start):
                filtered.append({
                    "word": text,
                    "start": max(0.0, w_start),
                    "end": min(clip_end - clip_start, w_end),
                })

        if not filtered:
            return ""

        srt_lines = []
        cue_index = 1

        for i in range(0, len(filtered), words_per_line):
            chunk = filtered[i:i + words_per_line]
            if not chunk:
                continue

            chunk_start = seconds_to_srt_time(chunk[0]["start"])
            chunk_end = seconds_to_srt_time(chunk[-1]["end"])
            text = " ".join(c["word"] for c in chunk)

            srt_lines.append(f"{cue_index}\n{chunk_start} --> {chunk_end}\n{text}\n")
            cue_index += 1

        return "\n".join(srt_lines)
