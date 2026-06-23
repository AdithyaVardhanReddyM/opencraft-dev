"""run_turn — the single orchestration seam (stateless).

The agent-service is pure compute: it receives the screen + history from the
caller (Next.js, which owns Aurora), runs the agent against an E2B sandbox, and
EMITS a final `result` frame describing the state to persist. It never touches
the database itself.

Frames yielded (see runner/stream.py for the streamed ones):
  {type: sandbox}  early — sandboxId/sandboxUrl, so the caller can persist the id
  {type: text|tool|reasoning}  streamed agent output
  {type: notice}   non-fatal info (e.g. sandbox was recreated)
  {type: result}   SUCCESS — the full state for the caller to persist
  {type: error}    failure — the caller decides what to record
"""

from __future__ import annotations

from typing import Any, AsyncIterator

from strands import Agent

from ..context.assembler import build_image_blocks, build_turn
from ..context.file_meta import changed_paths, derive_route_from_changes, merge_changes
from ..models import build_model
from ..tools import DEFAULT_TOOLS
from ..tools.sandbox import get_or_create_sandbox, host_url
from .finish import finish
from .stream import enriched_tool_label, normalize_event


async def run_turn(
    *,
    message: str,
    screen: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
    model_id: str | None = None,
    thinking: bool = False,
    image_urls: list[str] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Run one turn. `screen` and `history` are supplied by the caller (no DB).

    screen: the screen row as a dict (sandbox_id, files, file_meta, recent_edits,
        route, title, parent_screen_id, ...). None/empty = a brand-new screen.
    history: prior messages oldest-first, each {role, content}.
    """
    screen = screen or {}
    history = history or []

    # 1. sandbox
    try:
        sandbox, sandbox_id, context_lost = await get_or_create_sandbox(screen)
    except Exception as e:  # noqa: BLE001
        yield {"type": "error", "message": f"Failed to start sandbox: {e}"}
        return

    try:
        sandbox_url = await host_url(sandbox)
    except Exception:  # noqa: BLE001
        sandbox_url = screen.get("sandbox_url")
    # Early so the caller can persist sandboxId even if the run later fails.
    yield {"type": "sandbox", "sandboxId": sandbox_id, "sandboxUrl": sandbox_url}
    if context_lost:
        yield {"type": "notice", "message": "Previous sandbox expired; created a fresh one."}

    # On a fresh/lost sandbox the old files map is stale (template default).
    if context_lost or not screen.get("sandbox_id"):
        seed_files: dict[str, str] = {}
    else:
        seed_files = dict(screen.get("files") or {})

    # 2. assemble context
    system_prompt, history_msgs, current_text = build_turn(screen, history, message)
    image_blocks = await build_image_blocks(image_urls)
    prompt: Any = (
        current_text if not image_blocks else [{"text": current_text}, *image_blocks]
    )

    # 3. build + run agent
    model = build_model(model_id, thinking)
    is_flow = bool(screen.get("parent_screen_id"))
    result_holder: dict[str, Any] = {}
    invocation_state = {
        "sandbox": sandbox,
        "files": seed_files,
        "is_first_build": not seed_files,
        "result_holder": result_holder,
    }

    agent = Agent(
        model=model,
        system_prompt=system_prompt,
        tools=[*DEFAULT_TOOLS, finish],
        messages=history_msgs,
        callback_handler=None,
    )

    seen_tools: set[str] = set()
    tool_label_sent: dict[str, str] = {}  # tool_use_id -> last detail label emitted
    narration_parts: list[str] = []  # the model's visible prose, for user display
    reasoning_parts: list[str] = []  # the model's thinking, for persistence/display
    try:
        async for event in agent.stream_async(prompt, invocation_state=invocation_state):
            frame = normalize_event(event)
            if frame is None:
                continue
            ftype = frame["type"]
            if ftype == "tool":
                # Tool-use events stream repeatedly with growing `input`. Emit the
                # generic label once (immediate), then a `tool_detail` carrying the
                # resolved target ("Editing app/page.tsx") as soon — and only when —
                # it changes. The frontend swaps the step's label in place.
                key = frame.get("tool_use_id") or frame.get("name")
                raw_input = frame.pop("input", None)
                if key not in seen_tools:
                    seen_tools.add(key)
                    yield {
                        "type": "tool",
                        "name": frame.get("name"),
                        "tool_use_id": frame.get("tool_use_id"),
                    }
                label = enriched_tool_label(frame.get("name"), raw_input)
                if label and tool_label_sent.get(key) != label:
                    tool_label_sent[key] = label
                    yield {
                        "type": "tool_detail",
                        "tool_use_id": frame.get("tool_use_id"),
                        "label": label,
                    }
                continue
            if ftype == "text":
                narration_parts.append(frame.get("text") or "")
            elif ftype == "reasoning":
                reasoning_parts.append(frame.get("text") or "")
            yield frame
    except Exception as e:  # noqa: BLE001 — final failure handler
        yield {"type": "error", "message": f"Agent run failed: {e}"}
        return

    # 4. emit the result for the caller to persist (no DB writes here)
    result = result_holder.get("result")
    if not result:
        yield {"type": "error", "message": "Run ended without a finish (no result)."}
        return

    files_state = invocation_state["files"]
    changes = result.get("changes") or []
    new_file_meta = merge_changes(screen.get("file_meta"), changes)
    recent = changed_paths(changes)
    route = (derive_route_from_changes(changes) if is_flow else None) or screen.get("route")
    # Title only on the first build (when the screen has none yet).
    title = result.get("title") if not screen.get("title") else None

    yield {
        "type": "result",
        "sandboxId": sandbox_id,
        "sandboxUrl": sandbox_url,
        "title": title,
        "route": route,
        "summary": result.get("summary", ""),
        # Full streamed prose for user display (the caller persists this as the
        # message content; `summary` is kept for history/context).
        "narration": "".join(narration_parts).strip(),
        # The model's thinking, when extended-thinking was on — persisted so the
        # collapsed "Thought process" chip survives the turn / a reload. None when
        # thinking was off (no reasoning streamed).
        "reasoning": "".join(reasoning_parts).strip() or None,
        "changes": changes,
        # Final state for the caller to write verbatim:
        "files": files_state,        # full merged {path: content}
        "fileMeta": new_file_meta,   # full merged {path: {description, updatedAt, status}}
        "recentEdits": recent,       # paths edited this turn
    }
