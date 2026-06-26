"""Design-system extraction from a website URL.

Firecrawl screenshots the page + returns its raw HTML; a one-shot Gemini call
(vision + the page's CSS custom properties) synthesizes a shadcn-style token set
{ theme, light, dark } plus a name + rail swatches. Reached via the
`op: "extract_design_system"` field on the agent-service entrypoint payload (both
the FastAPI /chat handler and the AgentCore /invocations entrypoint), so it ships
in the same image — no new endpoint, IAM, or secrets (Firecrawl + Gemini are
already configured for the chat path).

Returns either {"tokens", "name", "previewColors"} or {"error": <message>}.
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any, AsyncIterator

import httpx

from .config import get_settings

_FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape"

# Default shadcn token sets — the model's output is merged over these so the
# result is always complete + previewable even if the model omits a few keys.
# Values mirror lib/canvas/theme-utils.ts:DEFAULT_GLOBALS_CSS.
_DEFAULT_THEME = {
    "font-sans": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "font-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    "font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    "radius": "0.625rem",
}
_DEFAULT_LIGHT = {
    "radius": "0.625rem",
    "background": "oklch(1 0 0)",
    "foreground": "oklch(0.145 0 0)",
    "card": "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    "popover": "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    "primary": "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    "secondary": "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    "muted": "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    "accent": "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    "destructive": "oklch(0.577 0.245 27.325)",
    "border": "oklch(0.922 0 0)",
    "input": "oklch(0.922 0 0)",
    "ring": "oklch(0.708 0 0)",
    "chart-1": "oklch(0.646 0.222 41.116)",
    "chart-2": "oklch(0.6 0.118 184.704)",
    "chart-3": "oklch(0.398 0.07 227.392)",
    "chart-4": "oklch(0.828 0.189 84.429)",
    "chart-5": "oklch(0.769 0.188 70.08)",
    "sidebar": "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.145 0 0)",
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.97 0 0)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.922 0 0)",
    "sidebar-ring": "oklch(0.708 0 0)",
}
_DEFAULT_DARK = {
    "radius": "0.625rem",
    "background": "oklch(0.145 0 0)",
    "foreground": "oklch(0.985 0 0)",
    "card": "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    "popover": "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    "primary": "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    "secondary": "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    "muted": "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    "accent": "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    "destructive": "oklch(0.704 0.191 22.216)",
    "border": "oklch(1 0 0 / 10%)",
    "input": "oklch(1 0 0 / 15%)",
    "ring": "oklch(0.556 0 0)",
    "chart-1": "oklch(0.488 0.243 264.376)",
    "chart-2": "oklch(0.696 0.17 162.48)",
    "chart-3": "oklch(0.769 0.188 70.08)",
    "chart-4": "oklch(0.627 0.265 303.9)",
    "chart-5": "oklch(0.645 0.246 16.439)",
    "sidebar": "oklch(0.205 0 0)",
    "sidebar-foreground": "oklch(0.985 0 0)",
    "sidebar-primary": "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.269 0 0)",
    "sidebar-accent-foreground": "oklch(0.985 0 0)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.556 0 0)",
}

_SYSTEM = (
    "You are a meticulous design-system extraction engine. Given a screenshot of "
    "a website plus the CSS custom properties and color declarations found in its "
    "HTML, infer a cohesive shadcn/Tailwind design system. Prefer the oklch() "
    "color format. Ensure strong foreground/background contrast. Always produce a "
    "tasteful DARK variant even if the site is light-only. Output ONLY valid JSON, "
    "no prose, no markdown fences."
)

_COLOR_KEYS = list(_DEFAULT_LIGHT.keys())


def _user_prompt(url: str, hints: str) -> str:
    keys = ", ".join(k for k in _COLOR_KEYS if k != "radius")
    return (
        f"Source URL: {url}\n\n"
        f"CSS hints extracted from the page (may be noisy/incomplete):\n{hints}\n\n"
        "Produce a JSON object with EXACTLY these top-level fields:\n"
        '  "name": a short human name for this design system (from the brand),\n'
        '  "theme": { "font-sans", "font-serif", "font-mono", "radius" },\n'
        '  "light": an object of color tokens,\n'
        '  "dark": an object of the same color tokens for dark mode,\n'
        '  "previewColors": [primary, secondary, accent] as 3 color strings.\n\n'
        f'Each of "light" and "dark" MUST include these keys: radius, {keys}.\n'
        "Values are CSS colors (prefer oklch(...), hex is acceptable). 'radius' is "
        "a length like '0.5rem'. Match the site's look; keep chart-1..5 distinct."
    )


async def _scrape(url: str) -> tuple[str, Any, str | None]:
    """POST to Firecrawl. Returns (raw_html, screenshot_raw, error). screenshot_raw
    is Firecrawl's raw value (hosted URL or data URI); it's downloaded separately
    (_fetch_screenshot) so the UI can show a distinct 'capturing' step."""
    settings = get_settings()
    if not settings.firecrawl_api_key:
        return ("", None, "Web import isn't configured (no Firecrawl key).")
    try:
        async with httpx.AsyncClient(timeout=80.0) as client:
            resp = await client.post(
                _FIRECRAWL_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.firecrawl_api_key}",
                },
                json={
                    "url": url,
                    "formats": ["rawHtml", "screenshot"],
                    "onlyMainContent": False,
                    "blockAds": True,
                    "waitFor": 1500,
                    "timeout": 60000,
                },
            )
    except Exception as e:  # noqa: BLE001
        return ("", None, f"Couldn't reach the site ({e}).")

    if resp.status_code == 402:
        return ("", None, "Web import is out of Firecrawl credits.")
    if resp.status_code == 429:
        return ("", None, "Rate limited — wait a few seconds and try again.")
    if resp.status_code >= 400:
        return ("", None, f"Couldn't load that URL (HTTP {resp.status_code}).")

    data = resp.json().get("data", {})
    raw_html = data.get("rawHtml") or data.get("html") or ""
    return (raw_html, data.get("screenshot"), None)


async def _fetch_screenshot(shot: Any) -> bytes | None:
    """Firecrawl returns a screenshot as a hosted URL or a data: URI."""
    if not shot or not isinstance(shot, str):
        return None
    if shot.startswith("data:"):
        try:
            return base64.b64decode(shot.split(",", 1)[1])
        except Exception:  # noqa: BLE001
            return None
    if shot.startswith("http"):
        try:
            async with httpx.AsyncClient(timeout=30.0) as c:
                r = await c.get(shot)
                return r.content if r.status_code == 200 else None
        except Exception:  # noqa: BLE001
            return None
    return None


def _css_hints(html: str) -> str:
    """Cheap ground-truth for the model: custom properties + color declarations."""
    lines: list[str] = []
    seen: set[str] = set()
    for k, v in re.findall(r"(--[\w-]+)\s*:\s*([^;}{]+)", html):
        entry = f"{k}: {v.strip()}"
        if entry not in seen:
            seen.add(entry)
            lines.append(entry)
        if len(lines) >= 100:
            break
    colors = re.findall(
        r"(?:color|background(?:-color)?)\s*:\s*"
        r"(#[0-9a-fA-F]{3,8}|oklch\([^)]+\)|hsla?\([^)]+\)|rgba?\([^)]+\))",
        html,
        re.I,
    )
    for c in colors:
        entry = f"color: {c}"
        if entry not in seen:
            seen.add(entry)
            lines.append(entry)
        if len(lines) >= 160:
            break
    return "\n".join(lines) if lines else "(no inline CSS variables found)"


def _genai_client():
    from google import genai

    from .models import _vertex_credentials

    settings = get_settings()
    if settings.use_vertex:
        kwargs: dict = {
            "vertexai": True,
            "project": settings.google_cloud_project,
            "location": settings.google_cloud_location,
        }
        creds = _vertex_credentials(settings)
        if creds is not None:
            kwargs["credentials"] = creds
        return genai.Client(**kwargs)
    kwargs = {}
    if settings.google_api_key:
        kwargs["api_key"] = settings.google_api_key
    return genai.Client(**kwargs)


async def _call_gemini(url: str, hints: str, shot: bytes | None) -> dict:
    from google.genai import types

    settings = get_settings()
    client = _genai_client()
    parts: list[Any] = []
    if shot:
        parts.append(types.Part.from_bytes(data=shot, mime_type="image/png"))
    parts.append(types.Part.from_text(text=_user_prompt(url, hints)))

    resp = await client.aio.models.generate_content(
        model=settings.google_model_id,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM,
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    text = (resp.text or "").strip()
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001 — salvage the first {...} block if fences slipped in
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise
        return json.loads(m.group(0))


def _str_dict(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {str(k): str(v) for k, v in value.items() if isinstance(v, (str, int, float))}


def _normalize(model_json: dict, url: str) -> dict:
    theme = {**_DEFAULT_THEME, **_str_dict(model_json.get("theme"))}
    light = {**_DEFAULT_LIGHT, **_str_dict(model_json.get("light"))}
    dark = {**_DEFAULT_DARK, **_str_dict(model_json.get("dark"))}

    name = str(model_json.get("name") or "").strip()
    if not name:
        host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
        name = (host.split(".")[0] or "Imported").capitalize()
    name = name[:60]

    preview = model_json.get("previewColors")
    if (
        isinstance(preview, list)
        and len(preview) >= 3
        and all(isinstance(c, str) for c in preview[:3])
    ):
        preview_colors = [preview[0], preview[1], preview[2]]
    else:
        preview_colors = [light["primary"], light["secondary"], light["accent"]]

    return {
        "tokens": {"theme": theme, "light": light, "dark": dark},
        "name": name,
        "previewColors": preview_colors,
    }


async def extract_design_system_stream(url: str) -> AsyncIterator[dict]:
    """Extract a design system from a URL, yielding `progress` frames per phase and
    a final `design_system` frame (with tokens/name/previewColors, or `error`).

    It yields, so BOTH entrypoints (FastAPI /chat and the AgentCore /invocations
    handler) stream the steps to the UI live in dev AND prod — no extra wiring,
    since the runtime already streams whatever the entrypoint yields. Never raises.
    """
    url = (url or "").strip()
    if not url:
        yield {"type": "design_system", "error": "No URL provided."}
        return
    if not re.match(r"^https?://", url):
        url = "https://" + url

    yield {"type": "progress", "step": "fetch"}
    raw_html, shot_raw, err = await _scrape(url)
    if err:
        yield {"type": "design_system", "error": err}
        return
    if not raw_html and not shot_raw:
        yield {"type": "design_system", "error": "Nothing to read from that page."}
        return

    yield {"type": "progress", "step": "capture"}
    shot = await _fetch_screenshot(shot_raw)

    yield {"type": "progress", "step": "analyze"}
    try:
        model_json = await _call_gemini(url, _css_hints(raw_html), shot)
    except Exception as e:  # noqa: BLE001
        yield {
            "type": "design_system",
            "error": f"Couldn't synthesize a design system ({e}).",
        }
        return

    yield {"type": "progress", "step": "build"}
    yield {"type": "design_system", **_normalize(model_json, url)}
