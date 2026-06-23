"""Paths-only repo-map — the agent's only project-state signal each turn.

One line per file: `path — one-liner`, recently-edited files marked. Built fresh
each turn from the union of `screens.files` keys and `screens.file_meta`, so it
is always complete and current. No file contents are injected — the agent reads
on demand.
"""

from __future__ import annotations

from typing import Any

_EDIT_MARK = "▸ "  # ▸
_EDITED_SUFFIX = "  ⟵ edited last turn"  # ⟵


def render(
    files: dict[str, Any] | None,
    file_meta: dict[str, Any] | None,
    recent_edits: list[str] | None,
) -> str:
    files = files or {}
    file_meta = file_meta or {}
    recent = set(recent_edits or [])

    # Union of file paths from on-disk files and the meta map; drop deleted.
    paths: set[str] = set(files.keys())
    for path, meta in file_meta.items():
        if (meta or {}).get("status") != "deleted":
            paths.add(path)
        else:
            paths.discard(path)

    if not paths:
        return (
            "<repo_map>\n(empty project — nothing built yet; this is a fresh sandbox)\n"
            "</repo_map>"
        )

    lines: list[str] = []
    for path in sorted(paths):
        desc = ((file_meta.get(path) or {}).get("description") or "").strip()
        marker = _EDIT_MARK if path in recent else ""
        suffix = _EDITED_SUFFIX if path in recent else ""
        body = f"{path} — {desc}" if desc else path
        lines.append(f"{marker}{body}{suffix}")

    return "<repo_map>\n" + "\n".join(lines) + "\n</repo_map>"
