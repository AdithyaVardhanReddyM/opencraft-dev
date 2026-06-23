# Bedrock AgentCore Runtime image — PHASE C deploy.
# AgentCore REQUIRES linux/arm64. Build context is agent-service/.
FROM --platform=linux/arm64 python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps from pyproject (the `agentcore` extra adds bedrock-agentcore +
# the AWS OTEL distro). Copy build inputs first for better layer caching.
COPY pyproject.toml ./
COPY src ./src
RUN pip install --upgrade pip && pip install '.[agentcore]'

# AgentCore Runtime calls POST /invocations and GET /ping on 8080 — both served
# by BedrockAgentCoreApp.run() in agentcore_entrypoint.py.
EXPOSE 8080

# `opentelemetry-instrument` wires AgentCore's built-in tracing (from the AWS
# OTEL distro). Drop the prefix to `python -m ...` if you don't want tracing.
CMD ["opentelemetry-instrument", "python", "-m", "agent_service.agentcore_entrypoint"]
