import re
from typing import Dict, Any, List


class SocialService:
    """Generates viral social media copy, hook titles, descriptions, and hashtags."""

    BASE_HASHTAGS = ["#shorts", "#reels", "#fyp", "#viral", "#trending"]

    @classmethod
    def generate_social_metadata(
        cls,
        title: str,
        hook_text: str,
        transcript_excerpt: str = "",
        virality_score: int = 85,
    ) -> Dict[str, Any]:
        # Clean title
        clean_title = re.sub(r"^Key Moment #\d+:\s*", "", title).strip()
        if not clean_title:
            clean_title = hook_text.strip() or "Incredible Moment"

        # Emojis based on score/topic
        hook_title = f"🔥 {clean_title.upper()}"
        if not hook_title.endswith(("!", "?", ".")):
            hook_title += " 🚀"

        # Topic tags
        topic_tags = set(cls.BASE_HASHTAGS)
        combined_text = (clean_title + " " + transcript_excerpt).lower()

        keywords = {
            "tech": ["#tech", "#technology", "#futuristic"],
            "mars": ["#mars", "#space", "#science"],
            "car": ["#supercars", "#flyingcar", "#automotive"],
            "rocket": ["#rocket", "#spacex", "#nasa"],
            "clone": ["#dna", "#genetics", "#future"],
            "ai": ["#ai", "#artificialintelligence"],
            "food": ["#food", "#challenge"],
            "million": ["#crazy", "#mindblown"],
        }

        for key, tags in keywords.items():
            if key in combined_text:
                topic_tags.update(tags)

        hashtags_list = list(topic_tags)[:8]
        hashtags_str = " ".join(hashtags_list)

        # Engaging description
        hook_sentence = hook_text.strip() if hook_text else clean_title
        if not hook_sentence.endswith((".", "!", "?")):
            hook_sentence += "."

        description = (
            f"{hook_sentence}\n\n"
            f"Wait till you see what happens next! What would you do in this situation? Drop a comment below 👇\n\n"
            f"{hashtags_str}"
        )

        full_copy = f"{hook_title}\n\n{description}"

        return {
            "hook_title": hook_title,
            "description": description,
            "hashtags": hashtags_str,
            "hashtags_list": hashtags_list,
            "full_copy": full_copy,
        }
