"""The `finish` tool — the only way to complete a turn.

Replaces the old "router until <task_summary>" mechanism. Calling `finish` runs
the verification gate; if typecheck fails the tool returns the errors and the
agent stays in the loop to fix them. On pass, the result (title/changes/summary)
is stashed into the harness's `result_holder` (a mutable dict passed via
invocation_state) for the persistence step to read.
"""

from __future__ import annotations

from typing import Any

from strands import tool

from ..tools.sandbox import get_files_state, get_sandbox
from .gate import verification_gate


@tool(context=True)
async def finish(
    summary: str,
    changes: list[dict],
    title: str = "",
    tool_context: Any = None,
) -> str:
    """Finish the task. THIS IS THE ONLY WAY TO COMPLETE — do not summarize as plain text.

    Calling this runs `tsc --noEmit`. If there are TypeScript/import errors in
    files you changed, this returns them and the task is NOT done — fix them and
    call finish again.

    Args:
        summary: 1–3 sentences in plain language, shown to the user, describing
            what you built or changed and why. No tags, no file list.
        changes: One entry per file you created/updated/deleted this turn, each
            {"path": <relative path>, "action": "created"|"updated"|"deleted",
            "description": <one concise line of what the file now does>}.
        title: ONLY on the first build of a screen — a short 2–5 word name.
            Omit on follow-up edits.
    """
    sandbox = get_sandbox(tool_context)
    files_state = get_files_state(tool_context)

    ok, errors = await verification_gate(sandbox, list(files_state.keys()))
    if not ok:
        return (
            "VERIFICATION FAILED — the project has TypeScript errors in files you "
            "changed:\n\n" + errors + "\n\nFix ALL of these (create any missing files, "
            "correct any wrong import paths), then call finish again."
        )

    holder = tool_context.invocation_state.get("result_holder")
    if holder is not None:
        holder["result"] = {
            "title": (title or "").strip() or None,
            "changes": changes or [],
            "summary": (summary or "").strip(),
        }
    return "OK — verification passed. Task accepted."
