"""Durable turn execution — shared by both entrypoints (FastAPI + AgentCore).

The agent-service is pure compute and never touches the DB; the caller (Next.js,
which owns Aurora) persists the terminal `result`/`error` frame. To make that
persistence survive a client disconnect, the turn is driven by a background task
that consumes `run_turn` to completion INDEPENDENTLY of the streaming response,
and POSTs the terminal frame to a caller-supplied webhook when it finishes.

Both entrypoints stream `run_turn_durable(...)` to their client and rely on this
module for the identical durability semantics — there is no second copy of the
callback logic to drift out of sync.
"""

from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator

import httpx
from pydantic import BaseModel

from .harness import run_turn

_QUEUE_SENTINEL = object()


class Callback(BaseModel):
    # Where the terminal result/error is POSTed (Next.js /api/internal/agent-result).
    url: str
    secret: str | None = None
    # Opaque payload echoed back so the caller knows what to persist.
    context: dict[str, Any] | None = None


async def post_callback(callback: Callback, terminal: dict[str, Any]) -> None:
    """Best-effort deliver the terminal frame to the caller's webhook.

    Decoupled from the streaming response, so it survives client disconnect.
    Retries a few times on connection/5xx errors, then gives up (never raises).
    """
    payload = {"context": callback.context, "result": terminal}
    headers = {"content-type": "application/json"}
    if callback.secret:
        headers["x-agent-secret"] = callback.secret
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(3):
            try:
                resp = await client.post(callback.url, json=payload, headers=headers)
                if resp.status_code < 400:
                    return
            except Exception:  # noqa: BLE001 — best-effort; retry then drop
                pass
            await asyncio.sleep(0.5 * (attempt + 1))


async def run_turn_durable(
    *,
    message: str,
    screen: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
    model_id: str | None = None,
    thinking: bool = False,
    image_urls: list[str] | None = None,
    callback: Callback | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Yield turn frames while running the turn in a decoupled task.

    The task runs `run_turn` to completion and fires `callback` with the terminal
    frame whether or not the consumer is still attached. If the client goes away
    (SSE proxy disconnect, AgentCore cancelling the response generator), the
    generator stops yielding but the background task keeps running — so the
    durable callback still delivers the result the caller persists.
    """
    queue: asyncio.Queue[Any] = asyncio.Queue()

    async def run_and_callback() -> None:
        terminal: dict[str, Any] | None = None
        try:
            async for frame in run_turn(
                message=message,
                screen=screen,
                history=history,
                model_id=model_id,
                thinking=thinking,
                image_urls=image_urls,
            ):
                await queue.put(frame)
                if frame.get("type") in ("result", "error"):
                    terminal = frame
        except Exception as e:  # noqa: BLE001
            terminal = {"type": "error", "message": f"Unhandled: {e}"}
            await queue.put(terminal)
        finally:
            await queue.put(_QUEUE_SENTINEL)
            # Fire the durable callback whether or not the client is still
            # attached. This is the persistence path Next.js relies on.
            if callback is not None and terminal is not None:
                await post_callback(callback, terminal)

    # Independent task — NOT tied to this generator's lifecycle.
    task = asyncio.create_task(run_and_callback())

    try:
        while True:
            frame = await queue.get()
            if frame is _QUEUE_SENTINEL:
                break
            yield frame
    finally:
        # If the consumer went away, the background task keeps running (and fires
        # the callback). Keep a reference so it isn't GC'd mid-flight.
        _ = task
