import os
import json
from typing import List, Dict, Any, Optional


def seconds_to_ass_time(seconds: float) -> str:
    """Converts seconds into ASS timestamp format: H:MM:SS.cc"""
    if seconds < 0:
        seconds = 0.0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        secs += 1
        centis = 0
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def hex_to_ass_color(hex_str: str, alpha: int = 0) -> str:
    """Converts #RRGGBB into ASS &HAABBGGRR& format (BGR order)."""
    if not hex_str:
        return "&H00FFFFFF&"
    if hex_str.startswith("&H"):
        return hex_str
    cleaned = hex_str.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(c * 2 for c in cleaned)
    if len(cleaned) >= 6:
        r, g, b = cleaned[0:2], cleaned[2:4], cleaned[4:6]
        return f"&H{alpha:02X}{b.upper()}{g.upper()}{r.upper()}&"
    return "&H00FFFFFF&"


class CaptionGenerator:
    """Generates Advanced SubStation Alpha (.ass) subtitles with karaoke active-word highlighting."""

    FILLER_WORDS = {"um", "uh", "uhm", "erm", "ah", "er"}

    def generate_ass_file(
        self,
        words_data: List[Dict[str, Any]],
        clip_start: float,
        clip_end: float,
        output_ass_path: str,
        style_config: Optional[Dict[str, Any]] = None,
        video_width: int = 1080,
        video_height: int = 1920,
        title_overlay_text: Optional[str] = None,
        remove_filler_words: bool = False,
    ) -> str:
        """
        Creates an ASS subtitle file with animated/karaoke active-word highlighting,
        customizable fonts/colors/positions, and optional opening hook banner.
        """
        os.makedirs(os.path.dirname(output_ass_path), exist_ok=True)
        config = style_config or {}

        font_name = config.get("font", "Arial")
        font_size = int(config.get("font_size", 52 if video_height >= 1920 else 36))
        
        # Color parsing
        raw_primary = config.get("primary_color", "#FFFFFF")
        raw_highlight = config.get("highlight_color", "#FFCC00")
        primary_color = hex_to_ass_color(raw_primary)
        highlight_color = hex_to_ass_color(raw_highlight)
        outline_color = "&H00000000&"  # Solid black outline

        # Position alignment & vertical margin
        position = config.get("position", "bottom")
        if position == "center":
            alignment = 5  # Middle-center
            margin_v = 0
        elif position == "top":
            alignment = 8  # Top-center
            margin_v = int(video_height * 0.12)
        else:
            alignment = 2  # Bottom-center
            margin_v = int(video_height * 0.18)

        # Filter words within the clip range and adjust offset
        filtered_words = []
        for w in words_data:
            # Check if user flagged word as deleted
            if w.get("deleted", False):
                continue

            word_text = w.get("word", "").strip()
            if not word_text:
                continue

            # Check filler words if enabled
            if remove_filler_words and word_text.lower().strip(",.!?") in self.FILLER_WORDS:
                continue

            w_start = float(w["start"]) - clip_start
            w_end = float(w["end"]) - clip_start

            if w_end > 0 and w_start < (clip_end - clip_start):
                filtered_words.append({
                    "word": word_text,
                    "start": max(0.0, w_start),
                    "end": min(clip_end - clip_start, w_end),
                })

        # Group words into short 3-5 word readable chunks for vertical screens
        dialogues = []

        # Optional Hook / Title Overlay for the first 3.5 seconds
        if title_overlay_text and title_overlay_text.strip():
            hook_text = title_overlay_text.strip().replace("\n", " ")
            banner_end = min(3.5, max(1.0, clip_end - clip_start))
            dialogues.append(
                f"Dialogue: 1,0:00:00.00,{seconds_to_ass_time(banner_end)},HookBanner,,0,0,0,,{{\\fad(200,300)}}[ {hook_text.upper()} ]"
            )

        CHUNK_WORDS = 4
        for i in range(0, len(filtered_words), CHUNK_WORDS):
            group = filtered_words[i:i + CHUNK_WORDS]
            if not group:
                continue

            # For each word in this group, generate a sub-line where only the active word is highlighted
            for active_idx, active_word in enumerate(group):
                w_start_str = seconds_to_ass_time(active_word["start"])
                w_end_str = seconds_to_ass_time(active_word["end"])

                # Build line text with active word highlighted
                line_parts = []
                for idx, w in enumerate(group):
                    if idx == active_idx:
                        # Highlighted active word: bold highlight color + slight scale
                        line_parts.append(f"{{\\c{highlight_color}\\b1}}{w['word']}{{\\r}}")
                    else:
                        line_parts.append(f"{{\\c{primary_color}\\b0}}{w['word']}{{\\r}}")

                formatted_text = " ".join(line_parts)
                dialogues.append(
                    f"Dialogue: 0,{w_start_str},{w_end_str},Default,,0,0,0,,{formatted_text}"
                )

        hook_font_size = int(font_size * 0.85)
        top_banner_margin = int(video_height * 0.08)

        ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},&H000000FF&,{outline_color},&H80000000&,-1,0,0,0,100,100,0,0,1,5,2,{alignment},40,40,{margin_v},1
Style: HookBanner,{font_name},{hook_font_size},&H0000D7FF&,&H000000FF&,&H00000000&,&HB0000000&,-1,0,0,0,100,100,0,0,3,4,0,8,40,40,{top_banner_margin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(dialogues) + "\n"

        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

        return output_ass_path
