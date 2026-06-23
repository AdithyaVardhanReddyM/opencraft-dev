"""FastAPI entrypoint for local dev — POST /chat streams the turn as SSE.

Stateless: the caller (Next.js, which owns Aurora) sends the screen + history in
the request and persists the final `result` frame. This is the seam the frontend
points at in Phase B; Phase C wraps the same `run_turn` for Bedrock AgentCore.

Durability: when the caller supplies a `callback`, the run is driven by a
background task that consumes `run_turn` to completion INDEPENDENTLY of the SSE
response. If the SSE client (the Next.js proxy) disconnects — e.g. its serverless
function hits its timeout, or the browser tab closes — the background task keeps
running and POSTs the terminal `result`/`error` frame to the callback. The
service never touches the DB; it just delivers the result to a caller-supplied
webhook with the opaque `context` echoed back.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import get_settings
from .runner.harness import run_turn

app = FastAPI(title="OpenCraft Agent Service")

_QUEUE_SENTINEL = object()


class Callback(BaseModel):
    # Where the terminal result/error is POSTed (Next.js /api/internal/agent-result).
    url: str
    secret: str | None = None
    # Opaque payload echoed back so the caller knows what to persist.
    context: dict[str, Any] | None = None


class ChatRequest(BaseModel):
    message: str
    # The screen row (sandbox_id, files, file_meta, recent_edits, route, title,
    # parent_screen_id, ...) and prior messages, supplied by the caller.
    screen: dict[str, Any] | None = None
    history: list[dict[str, Any]] | None = None
    modelId: str | None = None
    thinking: bool = False
    imageUrls: list[str] | None = None
    callback: Callback | None = None


def _sse(frame: dict) -> str:
    return f"event: {frame.get('type', 'message')}\ndata: {json.dumps(frame)}\n\n"


async def _post_callback(callback: Callback, terminal: dict[str, Any]) -> None:
    """Best-effort deliver the terminal frame to the caller's webhook.

    Decoupled from the SSE response, so it survives client disconnect. Retries a
    few times on connection/5xx errors, then gives up (logged, never raises).
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


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/chat")
async def chat(
    req: ChatRequest,
    x_agent_secret: str | None = Header(default=None),
) -> StreamingResponse:
    settings = get_settings()
    # Optional shared-secret guard: when AGENT_SHARED_SECRET is set, require a
    # matching header so the otherwise-unauthenticated compute endpoint isn't open.
    if settings.agent_shared_secret and x_agent_secret != settings.agent_shared_secret:
        raise HTTPException(status_code=401, detail="Invalid agent secret")

    queue: asyncio.Queue[Any] = asyncio.Queue()

    async def run_and_callback() -> None:
        terminal: dict[str, Any] | None = None
        try:
            async for frame in run_turn(
                message=req.message,
                screen=req.screen,
                history=req.history,
                model_id=req.modelId,
                thinking=req.thinking,
                image_urls=req.imageUrls,
            ):
                await queue.put(frame)
                if frame.get("type") in ("result", "error"):
                    terminal = frame
        except Exception as e:  # noqa: BLE001
            terminal = {"type": "error", "message": f"Unhandled: {e}"}
            await queue.put(terminal)
        finally:
            await queue.put(_QUEUE_SENTINEL)
            # Fire the durable callback whether or not the SSE client is still
            # attached. This is the persistence path Next.js relies on.
            if req.callback is not None and terminal is not None:
                await _post_callback(req.callback, terminal)

    # Independent task — NOT tied to the response generator's lifecycle.
    task = asyncio.create_task(run_and_callback())

    async def gen() -> AsyncIterator[str]:
        try:
            while True:
                frame = await queue.get()
                if frame is _QUEUE_SENTINEL:
                    break
                yield _sse(frame)
        finally:
            # If the client went away, the background task keeps running (and
            # fires the callback). Keep a reference so it isn't GC'd.
            _ = task

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
