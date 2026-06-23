"""Normalize Strands stream_async events into transport-agnostic frames.

Each frame is a small dict the entrypoints encode (SSE for the web, stdout for
the CLI). Tool-use events stream incrementally, so the harness dedupes them by
tool-use id; this normalizer is stateless.
"""

from __future__ import annotations

import json
import re
from typing import Any


def normalize_event(event: Any) -> dict[str, Any] | None:
    """Strands event -> frame dict, or None to drop the event."""
    if not isinstance(event, dict):
        return None

    # Streamed assistant text.
    if event.get("data"):
        return {"type": "text", "text": event["data"]}

    # Tool use (name appears once enough of the call has streamed). The tool
    # input streams incrementally too, so we forward the accumulated `input`
    # (str of partial JSON, or dict) — the harness derives a target label from
    # it (e.g. "Editing app/page.tsx") as soon as enough has streamed.
    ctu = event.get("current_tool_use")
    if ctu and ctu.get("name"):
        return {
            "type": "tool",
            "name": ctu.get("name"),
            "tool_use_id": ctu.get("toolUseId") or ctu.get("tool_use_id"),
            "input": ctu.get("input"),
        }

    # Extended thinking / reasoning deltas (key varies across SDK versions).
    for key in ("reasoningText", "reasoning_text", "reasoning"):
        val = event.get(key)
        if isinstance(val, str) and val:
            return {"type": "reasoning", "text": val}

    return None


# Lenient extractors so we can pull a target out of *partial* tool input (the
# args stream as JSON one chunk at a time, so full json.loads often fails until
# the call is complete). Each matches the first occurrence of its key.
_PATH_RE = re.compile(r'"path"\s*:\s*"([^"]+)"')
_CMD_RE = re.compile(r'"command"\s*:\s*"([^"]+)"')
_QUERY_RE = re.compile(r'"(?:query|pattern)"\s*:\s*"([^"]+)"')
_URL_RE = re.compile(r'"url"\s*:\s*"([^"]+)"')


def _coerce_input(raw: Any) -> dict | None:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return json.loads(raw)
        except Exception:  # noqa: BLE001 — partial JSON; caller falls back to regex
            return None
    return None


def enriched_tool_label(name: str | None, raw_input: Any) -> str | None:
    """A detailed step label like 'Editing app/page.tsx' from a tool's input.

    Returns None when no target can be derived yet (input still streaming, or the
    tool has no meaningful target) — the caller keeps the generic label in that
    case. Tolerant of partial JSON so the detail can appear mid-stream.
    """
    if not name:
        return None
    parsed = _coerce_input(raw_input)
    raw_str = raw_input if isinstance(raw_input, str) else ""

    def first(key_re: re.Pattern[str]) -> str | None:
        m = key_re.search(raw_str)
        return m.group(1) if m else None

    if name == "edit_file":
        path = (parsed or {}).get("path") or first(_PATH_RE)
        return f"Editing {path}" if path else None

    if name == "create_files":
        files = (parsed or {}).get("files") if parsed else None
        if isinstance(files, list) and files:
            paths = [
                f.get("path")
                for f in files
                if isinstance(f, dict) and f.get("path")
            ]
            if paths:
                extra = f" (+{len(paths) - 1})" if len(paths) > 1 else ""
                return f"Writing {paths[0]}{extra}"
            return None
        path = first(_PATH_RE)  # partial: first "path" seen
        return f"Writing {path}" if path else None

    if name == "read_files":
        paths = (parsed or {}).get("paths") if parsed else None
        if isinstance(paths, list) and paths:
            extra = f" (+{len(paths) - 1})" if len(paths) > 1 else ""
            return f"Reading {paths[0]}{extra}"
        return None

    if name == "terminal":
        cmd = (parsed or {}).get("command") or first(_CMD_RE)
        if cmd:
            cmd = cmd.strip().splitlines()[0][:48] if cmd.strip() else None
            return f"Running {cmd}" if cmd else None
        return None

    if name == "search_project":
        q = None
        if parsed:
            q = parsed.get("query") or parsed.get("pattern")
        q = q or first(_QUERY_RE)
        return f"Searching “{q[:40]}”" if q else None

    if name == "scrape_webpage":
        url = (parsed or {}).get("url") or first(_URL_RE)
        if url:
            host = re.sub(r"^https?://", "", url).split("/")[0]
            return f"Inspecting {host}" if host else None
        return None

    return None
