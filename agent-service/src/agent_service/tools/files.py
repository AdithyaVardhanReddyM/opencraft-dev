"""File tools: create_files (new/rewrite), edit_file (search-replace), read_files.

All operate on the live sandbox from `invocation_state` and keep the harness's
in-memory {path: content} map in sync so the screen's `files` column is
persisted accurately after the turn.
"""

from __future__ import annotations

import json
from typing import Any

from strands import tool

from .sandbox import get_files_state, get_sandbox


@tool(context=True)
async def create_files(files: list[dict], tool_context: Any = None) -> str:
    """Create new files or fully rewrite existing files in the project.

    Use this for NEW files or a genuine full rewrite. For small edits to an
    EXISTING file, prefer `edit_file` (cheaper, safer). Paths must be relative
    to the project root (e.g. "app/page.tsx", "components/hero.tsx") — never
    absolute, never the "@/" alias. You can batch many files in one call.

    Args:
        files: A list of objects, each {"path": <relative path>, "content":
            <complete file content>}.
    """
    sandbox = get_sandbox(tool_context)
    state = get_files_state(tool_context)

    written: list[str] = []
    failed: list[str] = []
    for f in files:
        path = (f or {}).get("path")
        content = (f or {}).get("content", "")
        if not path:
            failed.append("<missing path>")
            continue
        try:
            await sandbox.files.write(path, content)
            state[path] = content
            written.append(path)
        except Exception as e:  # noqa: BLE001 — report per-file, don't abort batch
            failed.append(f"{path} ({e})")

    ok = f"Successfully wrote {len(written)} file(s): {', '.join(written) or '—'}"
    if failed:
        return (
            f"{ok}. FAILED to write {len(failed)} file(s) — you MUST retry these: "
            + "; ".join(failed)
        )
    return ok


@tool(context=True)
async def edit_file(path: str, edits: list[dict], tool_context: Any = None) -> str:
    """Make targeted search-and-replace edits to an EXISTING file.

    Preferred for small changes (cheaper than rewriting the whole file). Read
    the file first (or rely on content you just wrote) so each `old_string`
    matches exactly. Each `old_string` must appear EXACTLY ONCE in the file
    unless `replace_all` is true; otherwise the edit is rejected (no partial
    apply) and you should add more surrounding context.

    Args:
        path: Relative path of the file to edit.
        edits: A list of objects, each {"old_string": <exact text to find>,
            "new_string": <replacement>, "replace_all": <optional bool>}.
    """
    sandbox = get_sandbox(tool_context)
    state = get_files_state(tool_context)

    try:
        content = await sandbox.files.read(path)
    except Exception as e:  # noqa: BLE001
        return f"Error: could not read {path} ({e}). Create it with create_files if new."

    for i, e in enumerate(edits):
        old = (e or {}).get("old_string")
        new = (e or {}).get("new_string", "")
        replace_all = bool((e or {}).get("replace_all", False))
        if old is None or old == "":
            return f"Error: edit #{i + 1} has an empty old_string."
        count = content.count(old)
        if count == 0:
            return f"Error: old_string for edit #{i + 1} not found in {path}."
        if count > 1 and not replace_all:
            return (
                f"Error: old_string for edit #{i + 1} is not unique in {path} "
                f"({count} matches). Add surrounding context or set replace_all."
            )
        content = content.replace(old, new) if replace_all else content.replace(old, new, 1)

    try:
        await sandbox.files.write(path, content)
        state[path] = content
    except Exception as e:  # noqa: BLE001
        return f"Error: could not write {path} ({e})."

    return f"Edited {path} ({len(edits)} change(s))."


@tool(context=True)
async def read_files(paths: list[str], tool_context: Any = None) -> str:
    """Read the contents of one or more files.

    Use ACTUAL relative paths (e.g. "app/page.tsx", "components/ui/button.tsx").
    Never use the "@/" alias. Read a file before editing it if you don't already
    know its current contents.

    Args:
        paths: A list of relative file paths to read.
    """
    sandbox = get_sandbox(tool_context)
    out: list[dict[str, str]] = []
    for p in paths:
        try:
            content = await sandbox.files.read(p)
            out.append({"path": p, "content": content})
        except Exception as e:  # noqa: BLE001
            out.append({"path": p, "content": f"<error reading file: {e}>"})
    return json.dumps(out)
