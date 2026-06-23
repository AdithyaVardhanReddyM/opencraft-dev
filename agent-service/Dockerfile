# Bedrock AgentCore Runtime image — PHASE C deploy. Build context is agent-service/.
# AgentCore REQUIRES linux/arm64; the AgentCore CodeBuild host is arm64, so the
# image is built arm64 natively (no --platform flag needed). Pull the base image
# from AWS's ECR Public mirror of Docker Official Images, NOT Docker Hub — Docker
# Hub rate-limits CodeBuild's shared IPs (429 toomanyrequests) on anon pulls.
FROM public.ecr.aws/docker/library/python:3.12-slim

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
