"""Conversation history -> Strands messages.

History is append-all (every turn for the screen): user prompts verbatim,
assistant turns reduced to their short summary. Defensively strips any
structured tags (`<task_summary>`, `<files_summary>`, `<changes>`, `<summary>`,
`<title>`, `<route>`) so older messages stored in the legacy blob format still
render as clean text.
"""

from __future__ import annotations

import re
from typing import Any

_TAG_BLOCKS = re.compile(
    r"<(task_summary|files_summary|changes|summary|title|route)>"
    r"[\s\S]*?</\1>",
    re.IGNORECASE,
)
_STRAY_TAGS = re.compile(
    r"</?(task_summary|files_summary|changes|summary|title|route)>",
    re.IGNORECASE,
)


def clean_assistant_text(content: str) -> str:
    """Reduce an assistant message to clean prose (strip structured tags)."""
    # If a <summary> block exists, prefer its inner text (new format).
    m = re.search(r"<summary>([\s\S]*?)</summary>", content, re.IGNORECASE)
    if m and m.group(1).strip():
        return m.group(1).strip()
    text = _TAG_BLOCKS.sub("", content)
    text = _STRAY_TAGS.sub("", text)
    return text.strip()


def to_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """DB message rows (oldest-first) -> Strands message list."""
    out: list[dict[str, Any]] = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content") or ""
        if role == "assistant":
            content = clean_assistant_text(content)
        if not content:
            continue
        out.append({"role": role, "content": [{"text": content}]})
    return out
