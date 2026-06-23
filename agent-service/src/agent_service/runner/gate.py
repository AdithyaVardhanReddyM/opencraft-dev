"""Verification gate — typecheck must pass before a turn is accepted.

Runs `tsc --noEmit` in the sandbox and filters the errors to files the agent
touched THIS turn. That mirrors the TS prompt's "only fix errors in files you
created or edited" rule and prevents pre-existing errors (common on flow builds
that reuse an existing app) from blocking completion.

When Visual Mode lands later, a screenshot self-check slots in here after the
typecheck step.
"""

from __future__ import annotations

from typing import Iterable

from ..tools.sandbox import run_command

_TSC_CMD = "./node_modules/.bin/tsc --noEmit"
_TSC_TIMEOUT_S = 180


async def verification_gate(
    sandbox, touched_paths: Iterable[str]
) -> tuple[bool, str]:
    """Returns (ok, filtered_error_output)."""
    exit_code, stdout, stderr = await run_command(sandbox, _TSC_CMD, timeout=_TSC_TIMEOUT_S)
    if exit_code == 0:
        return True, ""

    output = (stdout + "\n" + stderr).strip()
    touched = {p.lstrip("./") for p in touched_paths if p}
    if not touched:
        # No file changes this turn -> nothing of the agent's to validate.
        return True, ""

    relevant = [
        line
        for line in output.splitlines()
        if "error TS" in line and any(t in line for t in touched)
    ]
    if not relevant:
        # Remaining errors are all in files the agent did not touch.
        return True, ""
    return False, "\n".join(relevant[:60])
