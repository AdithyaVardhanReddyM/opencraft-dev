"""scrape_webpage tool — fetch a live page via Firecrawl for recreation."""

from __future__ import annotations

from typing import Any

import httpx
from strands import tool

from ..config import get_settings

_FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape"


@tool
async def scrape_webpage(url: str) -> str:
    """Fetch a live webpage and return its structure/content for recreation.

    Returns the page's cleaned HTML (with class names + inline styles), markdown
    content, and links as text context. ONLY use this when the user provides a
    URL AND asks to recreate / clone / redesign / take inspiration from that
    specific page. Do NOT use it for generic build requests.

    Args:
        url: The full URL to scrape, e.g. "https://stripe.com/pricing".
    """
    settings = get_settings()
    if not settings.firecrawl_api_key:
        return "Error: FIRECRAWL_API_KEY is not configured. Cannot scrape the webpage."

    try:
        async with httpx.AsyncClient(timeout=70.0) as client:
            resp = await client.post(
                _FIRECRAWL_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.firecrawl_api_key}",
                },
                json={
                    # Keep nav/header/footer — part of a landing page's design.
                    # "branding" format is intentionally omitted (slow LLM extraction).
                    "formats": ["markdown", "html", "links"],
                    "onlyMainContent": False,
                    "blockAds": True,
                    "waitFor": 1500,
                    "timeout": 60000,
                    "url": url,
                },
            )
    except Exception as e:  # noqa: BLE001
        return f"Error: Firecrawl request failed ({e})."

    if resp.status_code == 402:
        return "Error: Firecrawl request failed (402) — out of credits. Tell the user the scraping quota is exhausted."
    if resp.status_code == 429:
        return "Error: Firecrawl request failed (429) — rate limited. Wait a few seconds and try again."
    if resp.status_code >= 400:
        return f"Error: Firecrawl request failed ({resp.status_code}). {resp.text[:500]}"

    data = resp.json().get("data", {})
    html = data.get("html", "")
    markdown = data.get("markdown", "")
    links = data.get("links", [])
    return (
        f"<scraped_url>{url}</scraped_url>\n\n"
        f"<html>\n{html}\n</html>\n\n"
        f"<markdown>\n{markdown}\n</markdown>\n\n"
        f"<links>\n{chr(10).join(links[:50]) if isinstance(links, list) else ''}\n</links>"
    )
