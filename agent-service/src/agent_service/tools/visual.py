"""Visual Mode — the agent verifies its render in a real browser.

`check_preview` opens the live E2B preview inside an AWS AgentCore Browser
(`aws.browser.v1`), captures a screenshot the model can actually SEE, and reports
console errors, uncaught page errors, failed network requests, and any Next.js dev
error overlay. It catches the class of problems `tsc` can't: blank screens, runtime
/ hydration crashes, broken layout, overlap, bad contrast, and output that simply
doesn't match the request.

Gated behind Visual Mode: the harness only adds this tool (and the matching prompt
block) when the per-turn `visual_mode` flag is on, so the lean path never spends
image tokens.

Why we drive the browser ourselves instead of the stock `strands_tools` browser
tool: that tool's `screenshot` action returns a file PATH on the remote browser's
disk as text — the model never sees pixels. We connect to the same managed browser
over CDP with async Playwright, pull the screenshot BYTES back, and return them as
an image content block — the shape the Gemini provider feeds back to the model
(mirrors `context/assembler.build_image_blocks`). Console/network capture also needs
Playwright listeners installed before navigation, which the stock tool doesn't expose.

NOTE: like `tools/sandbox.py`, the exact BrowserClient / Playwright surface is
verified at install time; the helpers degrade defensively across small SDK diffs.
"""

from __future__ import annotations

import asyncio
import base64
from typing import Any

from strands import tool

from ..config import get_settings

# Viewport presets. Desktop is the default; mobile is for responsive checks.
_VIEWPORTS: dict[str, dict[str, int]] = {
    "desktop": {"width": 1280, "height": 800},
    "mobile": {"width": 390, "height": 844},
}
_NAV_TIMEOUT_MS = 25_000
_SETTLE_MS = 1200  # let the client render + runtime errors surface after load
_SHOT_QUALITY = 72  # JPEG quality — keep frames small (≈100-200 KB) for SSE
_MAX_PERSIST = 3  # cap screenshots accumulated for persistence per turn

# Probe for the Next.js dev error overlay (the dev server renders a <nextjs-portal>
# web component with the red error dialog on a compile/runtime error). Best-effort:
# returns the overlay text, or "" when there's no overlay.
_OVERLAY_JS = """() => {
  const portal = document.querySelector('nextjs-portal');
  if (!portal) return '';
  const root = portal.shadowRoot || portal;
  const dialog = root.querySelector('[data-nextjs-dialog], [role="dialog"]');
  const text = (dialog ? dialog.textContent : (root.textContent || '')) || '';
  return text.trim().slice(0, 1500);
}"""


def _join_url(base: str, route: str | None) -> str:
    base = (base or "").rstrip("/")
    if not route or route == "/":
        return base
    return base + (route if route.startswith("/") else "/" + route)


def _attr(obj: Any, name: str) -> Any:
    """Read a Playwright field that may be a property or a method across versions."""
    val = getattr(obj, name, None)
    return val() if callable(val) else val


async def _get_page(state: dict[str, Any]):
    """Lazily start ONE aws.browser.v1 session for the turn and return a Playwright page.

    Stashes the client + playwright + browser on `state` so `close_browser` (called
    from the harness's finally) can tear them down. Reused across multiple
    `check_preview` calls within the same turn.
    """
    page = state.get("_vm_page")
    if page is not None:
        return page

    # BrowserClient ships with bedrock-agentcore (the agentcore extra); Playwright
    # with the visual extra. Imported lazily so the lean path never needs them.
    from bedrock_agentcore.tools.browser_client import BrowserClient
    from playwright.async_api import async_playwright

    settings = get_settings()
    client = BrowserClient(region=settings.aws_region)
    # start() is a sync boto3 control-plane call — keep it off the event loop. Try
    # the explicit signature, then fall back to defaults (identifier aws.browser.v1).
    try:
        await asyncio.to_thread(
            client.start,
            identifier=settings.agentcore_browser_identifier,
            session_timeout_seconds=settings.agentcore_browser_session_timeout,
        )
    except TypeError:
        await asyncio.to_thread(client.start)
    ws_url, headers = await asyncio.to_thread(client.generate_ws_headers)

    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(ws_url, headers=headers)
    context = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = context.pages[0] if context.pages else await context.new_page()

    state["_vm_client"] = client
    state["_vm_pw"] = pw
    state["_vm_browser"] = browser
    state["_vm_page"] = page
    return page


async def close_browser(state: dict[str, Any]) -> None:
    """Best-effort teardown of the per-turn AgentCore Browser session. NEVER raises.

    Cost-critical: a session bills until stopped or its timeout elapses, so the
    harness MUST call this in a finally that runs even on client disconnect.
    """
    browser = state.pop("_vm_browser", None)
    pw = state.pop("_vm_pw", None)
    client = state.pop("_vm_client", None)
    state.pop("_vm_page", None)
    for closer in (
        lambda: browser and browser.close(),
        lambda: pw and pw.stop(),
    ):
        try:
            res = closer()
            if res is not None:
                await res
        except Exception:  # noqa: BLE001 — cleanup must never mask the real result
            pass
    if client is not None:
        try:
            await asyncio.to_thread(client.stop)
        except Exception:  # noqa: BLE001
            pass


def drain_visual_checks(state: dict[str, Any]) -> list[dict[str, Any]]:
    """Pop the cards check_preview stashed since the last call (harness emits them
    as `visual_check` frames) and accumulate their images for end-of-turn persistence.
    """
    queue = state.get("visual_checks") or []
    if not queue:
        return []
    state["visual_checks"] = []
    acc = state.setdefault("screenshots_acc", [])
    for card in queue:
        if len(acc) < _MAX_PERSIST and card.get("image"):
            acc.append(card["image"])
    return queue


@tool(context=True)
async def check_preview(
    route: str = "", viewport: str = "desktop", tool_context: Any = None
) -> dict:
    """Open the live preview in a real browser, screenshot it, and report runtime errors.

    Call this BEFORE `finish` (Visual Mode) to SEE what you built and catch problems
    `tsc` can't: blank screens, runtime/hydration crashes, broken layout, overlap, bad
    contrast, or output that doesn't match the request. Study the screenshot, fix
    anything wrong, and re-check.

    Args:
        route: route to open, e.g. "/" or "/pricing". Defaults to the screen's active
            route — pass the route you actually built.
        viewport: "desktop" (1280x800) or "mobile" (390x844). Use "mobile" to verify
            responsive layout.

    Returns:
        A screenshot image (look at it) plus a text summary of any console errors,
        uncaught page errors, failed network requests, and Next.js error-overlay text.
    """
    state = tool_context.invocation_state
    sandbox_url = state.get("sandbox_url") or ""
    active_route = state.get("route")
    if not sandbox_url:
        return {
            "status": "error",
            "content": [{"text": "No preview URL is available for this screen yet."}],
        }
    target = _join_url(sandbox_url, route or active_route)
    vp = _VIEWPORTS.get(viewport, _VIEWPORTS["desktop"])

    try:
        page = await _get_page(state)
    except Exception as e:  # noqa: BLE001
        return {
            "status": "error",
            "content": [{"text": f"Could not start the browser session: {e}"}],
        }

    console_errors: list[str] = []
    page_errors: list[str] = []
    failed_requests: list[str] = []

    def on_console(msg: Any) -> None:
        try:
            mtype = _attr(msg, "type")
            if mtype in ("error", "warning"):
                console_errors.append(f"[{mtype}] {_attr(msg, 'text')}"[:300])
        except Exception:  # noqa: BLE001
            pass

    def on_pageerror(err: Any) -> None:
        page_errors.append(str(err)[:300])

    def on_response(resp: Any) -> None:
        try:
            status = _attr(resp, "status")
            if isinstance(status, int) and status >= 400:
                failed_requests.append(f"{status} {_attr(resp, 'url')}"[:300])
        except Exception:  # noqa: BLE001
            pass

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("response", on_response)
    try:
        await page.set_viewport_size(vp)
        try:
            await page.goto(target, wait_until="networkidle", timeout=_NAV_TIMEOUT_MS)
        except Exception:  # noqa: BLE001 — HMR/long-poll sockets can defeat networkidle
            await page.goto(target, wait_until="domcontentloaded", timeout=_NAV_TIMEOUT_MS)
        await page.wait_for_timeout(_SETTLE_MS)
        try:
            overlay = await page.evaluate(_OVERLAY_JS)
        except Exception:  # noqa: BLE001
            overlay = ""
        shot = await page.screenshot(type="jpeg", quality=_SHOT_QUALITY, full_page=False)
    except Exception as e:  # noqa: BLE001
        return {
            "status": "error",
            "content": [{"text": f"Failed to render {target}: {e}"}],
        }
    finally:
        for evt, fn in (
            ("console", on_console),
            ("pageerror", on_pageerror),
            ("response", on_response),
        ):
            try:
                page.remove_listener(evt, fn)
            except Exception:  # noqa: BLE001
                pass

    lines = [f"Rendered {target} at {viewport} ({vp['width']}x{vp['height']})."]
    if overlay:
        lines.append("⚠️ Next.js error overlay is showing:\n" + overlay)
    if page_errors:
        lines.append("Uncaught page errors:\n- " + "\n- ".join(page_errors[:8]))
    if console_errors:
        lines.append("Console (errors/warnings):\n- " + "\n- ".join(console_errors[:10]))
    if failed_requests:
        lines.append("Failed network requests:\n- " + "\n- ".join(failed_requests[:8]))
    if not (overlay or page_errors or console_errors or failed_requests):
        lines.append("No console errors, page errors, or failed requests detected.")
    lines.append(
        "Now LOOK at the screenshot: check layout, spacing, overlap, alignment, "
        "contrast, broken images, and whether it satisfies the request. If anything "
        "is wrong, fix it and call check_preview again; otherwise call finish."
    )
    summary = "\n\n".join(lines)

    # Stash a card for the UI (harness drains it into a `visual_check` frame).
    data_url = "data:image/jpeg;base64," + base64.b64encode(shot).decode()
    state.setdefault("visual_checks", []).append(
        {
            "route": route or active_route or "/",
            "viewport": viewport,
            "image": data_url,
            "findings": {
                "consoleErrors": console_errors[:10],
                "pageErrors": page_errors[:8],
                "failedRequests": failed_requests[:8],
                "overlay": bool(overlay),
            },
        }
    )

    # Return to the model: text findings + the screenshot as a viewable image block.
    return {
        "status": "success",
        "content": [
            {"text": summary},
            {"image": {"format": "jpeg", "source": {"bytes": shot}}},
        ],
    }
