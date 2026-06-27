"""Assemble the system prompt from blocks.

Core sections are always present (stable -> cacheable). Recreation, captured-
element, and flow sections are conditionally appended only when relevant, to
keep the prompt focused and tokens down.
"""

from __future__ import annotations

from . import blocks


def build_system_prompt(
    is_flow: bool = False,
    include_recreation: bool = False,
    include_capture: bool = False,
    include_visual: bool = False,
    connections: list[str] | None = None,
) -> str:
    parts: list[str] = [
        blocks.HEADER,
        blocks.ENVIRONMENT,
        blocks.TOOLS,
        blocks.CRITICAL_RULES,
        blocks.IMAGES,
        blocks.DESIGN_LEAD,
        blocks.WORKFLOW,
        blocks.FINISH_CONTRACT,
    ]
    if include_recreation:
        parts.append(blocks.WEBPAGE_RECREATION)
    if include_capture:
        parts.append(blocks.CAPTURED_ELEMENT)
    if is_flow:
        parts.append(blocks.FLOW_ADDENDUM)
    # Last so it sits closest to the user turn — and conditional, so toggling
    # Visual Mode only busts the cache on the turn it flips.
    if include_visual:
        parts.append(blocks.VISUAL_MODE)
    # Connections nudge — appended only when the user has connected accounts, so a
    # normal (unconnected) turn's prompt is byte-for-byte unchanged.
    if connections:
        parts.append(blocks.connections_block(connections))
    return "\n\n".join(parts)
