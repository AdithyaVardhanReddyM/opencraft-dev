"""Bedrock AgentCore Runtime entrypoint — PHASE C (deploy).

Wraps the same durable turn seam in a BedrockAgentCoreApp so deployment requires
no agent-logic changes. Requires `pip install bedrock-agentcore` (kept out of the
core deps until Phase C; see the `agentcore` extra in pyproject). AgentCore
provides /invocations + /ping on port 8080.

The invoke payload mirrors the FastAPI POST /chat body the Next.js proxy sends:

    payload = {
        "message": str,
        "screen": dict | None,        # sandbox_id, files, file_meta, route, ...
        "history": list[dict] | None, # prior messages, oldest-first
        "modelId": str | None,
        "thinking": bool,
        "imageUrls": list[str] | None,
        "callback": {                 # durable terminal-persistence webhook
            "url": str,               #   Next.js /api/internal/agent-result
            "secret": str | None,
            "context": dict | None,   #   echoed back: {screenId, clerkId, modelId}
        } | None,
    }

Frames are streamed back to the caller; the durable callback (run via a decoupled
task in run_turn_durable) fires the terminal frame to `callback.url` even if the
client disconnects — the persistence path the agent-service never owns itself.
"""

from __future__ import annotations

from .runner.durable import Callback, run_turn_durable

try:
    from bedrock_agentcore.runtime import BedrockAgentCoreApp
except ImportError:  # pragma: no cover - bedrock-agentcore is a Phase-C dep
    BedrockAgentCoreApp = None  # type: ignore[assignment]

if BedrockAgentCoreApp is None:
    raise SystemExit(
        "bedrock-agentcore is not installed. Install it for AgentCore deploy "
        "(Phase C): uv pip install -e '.[agentcore]'"
    )

app = BedrockAgentCoreApp()


@app.entrypoint
async def invoke(payload: dict):
    cb = payload.get("callback")
    callback = Callback(**cb) if cb else None
    async for frame in run_turn_durable(
        message=payload["message"],
        screen=payload.get("screen"),
        history=payload.get("history"),
        model_id=payload.get("modelId"),
        thinking=bool(payload.get("thinking", False)),
        image_urls=payload.get("imageUrls"),
        callback=callback,
    ):
        yield frame


if __name__ == "__main__":  # pragma: no cover
    app.run()
