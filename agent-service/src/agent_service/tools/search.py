"""search_project tool — grep/regex across the project to locate code."""

from __future__ import annotations

import shlex
from typing import Any

from strands import tool

from .sandbox import get_sandbox, run_command


@tool(context=True)
async def search_project(
    query: str,
    path_glob: str = "",
    max_results: int = 50,
    tool_context: Any = None,
) -> str:
    """Search the project for a string or regex and return matching locations.

    Cheaper than reading whole files — use it to find where a symbol, import,
    className, or string lives before deciding what to read or edit (e.g. "where
    is the theme defined", "which files import Hero").

    Args:
        query: The text or regex to search for.
        path_glob: Optional path scope, e.g. "components" or "app". Empty = whole project.
        max_results: Maximum number of matching lines to return.
    """
    sandbox = get_sandbox(tool_context)
    scope = shlex.quote(path_glob) if path_glob else "."
    # Exclude noise; -n for line numbers, -I to skip binary, -r recursive.
    cmd = (
        f"grep -rnI --exclude-dir=node_modules --exclude-dir=.next "
        f"-e {shlex.quote(query)} {scope} | head -n {int(max_results)}"
    )
    exit_code, stdout, stderr = await run_command(sandbox, cmd)
    if stdout.strip():
        return stdout.strip()
    if exit_code == 1:  # grep exit 1 == no matches (not an error)
        return f"No matches for {query!r}."
    return f"(search error)\n{stderr}".strip()
