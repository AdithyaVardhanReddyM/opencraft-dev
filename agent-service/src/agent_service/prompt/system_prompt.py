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
    return "\n\n".join(parts)
