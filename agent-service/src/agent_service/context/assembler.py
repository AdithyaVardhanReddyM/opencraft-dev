"""Per-turn context assembly.

Produces the doc's payload: a stable cached system prompt + tool defs (owned by
`prompt/` and `tools/`), append-all history, and a fresh volatile block (active-
screen anchor + paths-only repo-map) wrapped INSIDE the current user turn so the
message history stays append-only and cacheable. No file contents are injected.
"""

from __future__ import annotations

import re
from typing import Any

import httpx

from ..prompt.system_prompt import build_system_prompt
from . import history as history_mod
from . import repo_map
from .file_meta import build_anchor

_URL_RE = re.compile(r"https?://[^\s]+")
_CAPTURE_MARKER = "[UNITSET_ELEMENT_CAPTURE]"


def build_turn(
    screen: dict[str, Any] | None,
    messages: list[dict[str, Any]],
    user_message: str,
    visual_mode: bool = False,
    connections: list[str] | None = None,
) -> tuple[str, list[dict[str, Any]], str]:
    """Build the turn inputs.

    Returns (system_prompt, history_messages, current_turn_text). The caller
    passes `history_messages` as the Agent's `messages=` and feeds
    `current_turn_text` (optionally wrapped with image blocks) as the prompt.
    `connections` is the list of connected provider names (e.g. ["notion"]),
    used only to append the connections prompt block.
    """
    is_flow = bool((screen or {}).get("parent_screen_id"))
    has_url = bool(_URL_RE.search(user_message))
    has_capture = _CAPTURE_MARKER in user_message

    system_prompt = build_system_prompt(
        is_flow=is_flow,
        include_recreation=has_url,
        include_capture=has_capture,
        include_visual=visual_mode,
        connections=connections,
    )

    history_messages = history_mod.to_messages(messages)

    anchor = build_anchor(screen)
    repo = repo_map.render(
        (screen or {}).get("files"),
        (screen or {}).get("file_meta"),
        (screen or {}).get("recent_edits"),
    )
    current_text = f"{anchor}\n\n{repo}\n\n{user_message}"

    return system_prompt, history_messages, current_text


async def build_image_blocks(image_urls: list[str] | None) -> list[dict[str, Any]]:
    """Fetch image bytes and build Bedrock/Strands image content blocks.

    Best-effort: any image that fails to fetch is skipped. Returns [] when there
    are no images.
    """
    if not image_urls:
        return []
    blocks: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in image_urls:
            try:
                resp = await client.get(url)
                if resp.status_code >= 400:
                    continue
                fmt = _image_format(url, resp.headers.get("content-type", ""))
                blocks.append(
                    {"image": {"format": fmt, "source": {"bytes": resp.content}}}
                )
            except Exception:  # noqa: BLE001 — images are optional, skip on failure
                continue
    return blocks


def _image_format(url: str, content_type: str) -> str:
    ct = content_type.lower()
    for fmt in ("png", "jpeg", "gif", "webp"):
        if fmt in ct:
            return fmt
    if "jpg" in ct:
        return "jpeg"
    lower = url.lower()
    if lower.endswith((".jpg", ".jpeg")):
        return "jpeg"
    if lower.endswith(".png"):
        return "png"
    if lower.endswith(".webp"):
        return "webp"
    if lower.endswith(".gif"):
        return "gif"
    return "png"
