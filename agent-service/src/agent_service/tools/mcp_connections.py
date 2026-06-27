"""Attach tools from a user's connected MCP servers (Notion, Linear, …).

The Next.js chat route forwards `connections: [{provider, url, token}]` (live OAuth
bearer tokens) in the turn payload. Here we turn each into a Strands `MCPClient`
over streamable HTTP; the harness enters them for the duration of the turn and
merges `list_tools_sync()` into the Agent's tool set.

Design rules:
- LAZY import of `mcp`/`strands.tools.mcp` so the core service never hard-depends
  on them until a connection is actually used.
- NEVER raise — a bad/missing entry is skipped. Connections are an enhancement;
  they must not break a normal generation (no connections → today's behavior).
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def build_mcp_clients(
    connections: list[dict[str, Any]] | None,
) -> list[tuple[str, Any]]:
    """Build an (un-entered) MCPClient per connection.

    Returns a list of (provider, MCPClient). The caller is responsible for
    entering each client as a context manager (which opens the session on a
    background thread) and tearing it down at end of turn. Returns [] when there
    are no connections or the MCP libraries are unavailable.
    """
    if not connections:
        return []

    try:
        from mcp.client.streamable_http import streamablehttp_client
        from strands.tools.mcp import MCPClient
    except Exception as e:  # noqa: BLE001 — degrade to a plain agent
        logger.warning("MCP libraries unavailable; skipping connections: %s", e)
        return []

    clients: list[tuple[str, Any]] = []
    for conn in connections:
        url = conn.get("url")
        token = conn.get("token")
        provider = conn.get("provider") or "mcp"
        if not url or not token:
            continue

        # Bind url/token per-iteration (default args) so each client gets its own.
        def transport(u: str = url, t: str = token):
            return streamablehttp_client(u, headers={"Authorization": f"Bearer {t}"})

        clients.append((provider, MCPClient(transport)))
    return clients
