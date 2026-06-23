"""terminal tool — run shell commands in the sandbox."""

from __future__ import annotations

from typing import Any

from strands import tool

from .sandbox import get_sandbox, run_command


@tool(context=True)
async def terminal(command: str, tool_context: Any = None) -> str:
    """Execute a shell command in the sandbox.

    Use for installing packages (`npm install <pkg> --yes`), inspecting the
    project, or one-off scripts. NEVER run `npm run dev/build/start` or `next
    dev/build/start` — the dev server is already running on port 3000 with hot
    reload.

    Args:
        command: The shell command to execute.
    """
    sandbox = get_sandbox(tool_context)
    exit_code, stdout, stderr = await run_command(sandbox, command)
    if exit_code == 0:
        return stdout or "(no output)"
    return f"(exit {exit_code})\n{stdout}\n{stderr}".strip()
