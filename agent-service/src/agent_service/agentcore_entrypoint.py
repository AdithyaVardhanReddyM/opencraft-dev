"""Bedrock AgentCore Runtime entrypoint — PHASE C (deploy), not used in local dev.

Wraps the same `run_turn` seam in a BedrockAgentCoreApp so deployment requires no
agent-logic changes. Requires `pip install bedrock-agentcore` (kept out of the
core deps until Phase C). AgentCore provides /invocations + /ping on port 8080.

    payload = {"screenId", "message", "modelId"?, "thinking"?, "imageUrls"?, "clerkId"?}
"""

from __future__ import annotations

from .runner.harness import run_turn

try:
    from bedrock_agentcore.runtime import BedrockAgentCoreApp
except ImportError:  # pragma: no cover - bedrock-agentcore is a Phase-C dep
    BedrockAgentCoreApp = None  # type: ignore[assignment]

if BedrockAgentCoreApp is None:
    raise SystemExit(
        "bedrock-agentcore is not installed. Install it for AgentCore deploy "
        "(Phase C): pip install bedrock-agentcore"
    )

app = BedrockAgentCoreApp()


@app.entrypoint
async def invoke(payload: dict):
    async for frame in run_turn(
        message=payload["message"],
        screen=payload.get("screen"),
        history=payload.get("history"),
        model_id=payload.get("modelId"),
        thinking=bool(payload.get("thinking", False)),
        image_urls=payload.get("imageUrls"),
    ):
        yield frame


if __name__ == "__main__":  # pragma: no cover
    app.run()
