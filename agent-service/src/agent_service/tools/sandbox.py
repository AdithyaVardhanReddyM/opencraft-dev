"""E2B sandbox lifecycle + shared helpers used by the tools.

The harness creates/connects ONE sandbox per turn and stashes the live
`AsyncSandbox` object (plus the screen's mutable files map) in the agent's
`invocation_state`, so tools reach it via `tool_context.invocation_state`
without reconnecting per call.

NOTE: the exact E2B Python async API (beta_create/auto_pause, get_host,
sandbox_id attr, commands.run result shape) is verified at install time — the
helpers below are written defensively so small SDK differences degrade safely.
"""

from __future__ import annotations

import inspect
from typing import Any

from e2b import AsyncSandbox

from ..config import PREVIEW_PORT, SANDBOX_TIMEOUT_MS, get_settings

_TIMEOUT_S = SANDBOX_TIMEOUT_MS // 1000


async def get_or_create_sandbox(
    screen: dict[str, Any] | None,
) -> tuple[AsyncSandbox, str, bool]:
    """Connect to the screen's sandbox (auto-resumes if paused) or create one.

    Returns (sandbox, sandbox_id, context_lost). `context_lost` is True when we
    had a sandbox_id but failed to connect and created a fresh sandbox — mirrors
    the TS `contextLost` branch.
    """
    settings = get_settings()
    sandbox_id = (screen or {}).get("sandbox_id")

    if sandbox_id:
        try:
            sb = await AsyncSandbox.connect(sandbox_id, timeout=_TIMEOUT_S)
            return sb, _sandbox_id(sb), False
        except Exception:
            pass  # fall through to create a new one

    sb = await _create(settings.sandbox_template)
    return sb, _sandbox_id(sb), bool(sandbox_id)


async def _create(template: str) -> AsyncSandbox:
    # e2b v2: auto-pause-and-resume is configured via `lifecycle` (on_timeout
    # 'pause' keeps fs+memory; connect() auto-resumes). Mirrors the TS runtime's
    # betaCreate({ autoPause: true }).
    return await AsyncSandbox.create(
        template,
        timeout=_TIMEOUT_S,
        lifecycle={"on_timeout": "pause", "auto_resume": True},
    )


async def host_url(sandbox: AsyncSandbox) -> str:
    """Public preview URL for the baked Next.js dev server (port 3000)."""
    host = sandbox.get_host(PREVIEW_PORT)
    if inspect.isawaitable(host):
        host = await host
    return f"https://{host}"


async def run_command(
    sandbox: AsyncSandbox, command: str, timeout: int | None = None
) -> tuple[int, str, str]:
    """Run a shell command, NEVER raising on non-zero exit.

    Returns (exit_code, stdout, stderr). E2B raises CommandExitException on a
    non-zero exit; that exception carries stdout/stderr, which we surface so the
    verification gate can read tsc errors instead of crashing.
    """
    try:
        kwargs = {"timeout": timeout} if timeout is not None else {}
        res = await sandbox.commands.run(command, **kwargs)
        return (
            getattr(res, "exit_code", 0) or 0,
            getattr(res, "stdout", "") or "",
            getattr(res, "stderr", "") or "",
        )
    except Exception as e:  # CommandExitException or transport error
        return (
            getattr(e, "exit_code", 1) or 1,
            getattr(e, "stdout", "") or "",
            getattr(e, "stderr", "") or str(e),
        )


def _sandbox_id(sb: AsyncSandbox) -> str:
    return getattr(sb, "sandbox_id", None) or getattr(sb, "sandboxId", "")


# ---- tool-context accessors ------------------------------------------------


def get_sandbox(tool_context: Any) -> AsyncSandbox:
    return tool_context.invocation_state["sandbox"]


def get_files_state(tool_context: Any) -> dict[str, str]:
    """The mutable {path: content} map the harness persists after the turn."""
    return tool_context.invocation_state.setdefault("files", {})
