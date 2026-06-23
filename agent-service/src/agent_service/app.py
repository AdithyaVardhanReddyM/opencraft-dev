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

import json
from typing import Any, AsyncIterator

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import get_settings
from .runner.durable import Callback, run_turn_durable

app = FastAPI(title="OpenCraft Agent Service")


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

    async def gen() -> AsyncIterator[str]:
        async for frame in run_turn_durable(
            message=req.message,
            screen=req.screen,
            history=req.history,
            model_id=req.modelId,
            thinking=req.thinking,
            image_urls=req.imageUrls,
            callback=req.callback,
        ):
            yield _sse(frame)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
