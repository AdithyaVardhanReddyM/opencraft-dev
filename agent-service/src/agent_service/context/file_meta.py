"""fileMeta + active-screen anchor helpers.

`file_meta` is the persisted `{path: {description, updatedAt, status}}` map that
feeds the repo-map's one-liners. The agent reports per-file changes via the
`finish` tool; `merge_changes` folds those into the map. The active-screen
anchor tells the agent which route/file this conversation edits.
"""

from __future__ import annotations

import re
import time
from typing import Any


def _now_ms() -> int:
    return int(time.time() * 1000)


def route_to_page_file(route: str | None) -> str:
    """Map a screen route to its Next.js app-router page file.

    "/" or None -> "app/page.tsx"; "/pricing" -> "app/pricing/page.tsx".
    """
    if not route or route.strip() in ("", "/"):
        return "app/page.tsx"
    slug = route.strip().strip("/")
    return f"app/{slug}/page.tsx"


def page_file_to_route(path: str) -> str | None:
    """Inverse: "app/pricing/page.tsx" -> "/pricing".

    Route groups "(group)" are stripped; dynamic "[param]" segments kept.
    Returns None for the root page ("app/page.tsx") or non-page paths.
    """
    p = path.lstrip("./")
    m = re.match(r"^app/(.+)/page\.(?:tsx|ts|jsx|js)$", p)
    if not m:
        return None
    segments = [
        s for s in m.group(1).split("/") if s and not (s.startswith("(") and s.endswith(")"))
    ]
    if not segments:
        return None
    return "/" + "/".join(segments)


def derive_route_from_changes(changes: list[dict[str, Any]]) -> str | None:
    """For a flow build, the route is the new page file the agent created."""
    for c in changes or []:
        if (c or {}).get("action") == "created":
            route = page_file_to_route((c or {}).get("path", ""))
            if route:
                return route
    # fall back to any page file mentioned in changes
    for c in changes or []:
        route = page_file_to_route((c or {}).get("path", ""))
        if route:
            return route
    return None


def build_anchor(screen: dict[str, Any] | None) -> str:
    """The active-screen anchor block injected into the current turn."""
    route = (screen or {}).get("route")
    page_file = route_to_page_file(route)
    display_route = route if route else "/"
    return (
        "<active_screen>\n"
        f'This conversation edits the screen at route "{display_route}" -> {page_file}. '
        "Scope edits to this page unless the user explicitly asks otherwise.\n"
        "</active_screen>"
    )


def merge_changes(
    prev_meta: dict[str, Any] | None, changes: list[dict[str, Any]]
) -> dict[str, Any]:
    """Fold the agent's `<changes>` into the persisted file_meta map.

    Each change is {"path", "description", "action": created|updated|deleted}.
    """
    meta: dict[str, Any] = dict(prev_meta or {})
    now = _now_ms()
    for c in changes or []:
        path = (c or {}).get("path")
        if not path:
            continue
        action = (c or {}).get("action", "updated")
        if action == "deleted":
            meta[path] = {
                "description": (c or {}).get("description", ""),
                "updatedAt": now,
                "status": "deleted",
            }
        else:
            meta[path] = {
                "description": (c or {}).get("description", ""),
                "updatedAt": now,
                "status": "active",
            }
    return meta


def changed_paths(changes: list[dict[str, Any]]) -> list[str]:
    """Paths touched this turn (for screens.recent_edits / next turn's markers)."""
    return [c["path"] for c in (changes or []) if (c or {}).get("path")]
