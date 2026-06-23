"""Model construction — Google Gemini provider (Strands `GeminiModel`).

Default model is `gemini-3.1-pro-preview` (see config.google_model_id /
MODEL_ID_MAP). The frontend's UI model id is mapped to a Gemini id by
`config.resolve_model_id`. Extended thinking is a per-request toggle: when on, we
ask Gemini to return its thoughts so they stream as `reasoning` frames.
"""

from __future__ import annotations

import json

from strands.models.gemini import GeminiModel

from .config import Settings, get_settings

_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


def _vertex_credentials(settings: Settings):
    """Explicit Vertex credentials for headless environments (e.g. AgentCore).

    Returns service-account credentials built from GOOGLE_SERVICE_ACCOUNT_JSON
    (the key's JSON content, injected as a secret env var) when set; otherwise
    None so google-genai falls back to default ADC — a local `gcloud auth
    application-default login`, a GOOGLE_APPLICATION_CREDENTIALS file, GCE
    metadata, or Workload Identity Federation.
    """
    raw = settings.google_service_account_json
    if not raw:
        return None
    from google.oauth2 import service_account

    info = json.loads(raw)
    return service_account.Credentials.from_service_account_info(
        info, scopes=[_CLOUD_PLATFORM_SCOPE]
    )


def build_model(
    ui_model_id: str | None = None, thinking: bool = False
) -> GeminiModel:
    """Build a GeminiModel for a turn.

    Args:
        ui_model_id: the model id the frontend/message carries (e.g.
            "google/gemini-3.1-pro-preview"); mapped to a Gemini id, defaulting
            to the configured model.
        thinking: when True, surface the model's reasoning (Gemini "thoughts") so
            it streams to the caller as `reasoning` frames.
    """
    settings = get_settings()
    model_id = settings.resolve_model_id(ui_model_id)

    # `params` is forwarded to genai GenerateContentConfig. Leaving max_output_tokens
    # unset lets the model use its full default output budget (important so large
    # create_files tool-call args aren't truncated).
    params: dict = {}
    if thinking:
        params["thinking_config"] = {"include_thoughts": True}

    if settings.use_vertex:
        # Vertex AI mode: no api_key; usage bills to the GCP project, so a
        # Vertex/GCP credit can fund it. Auth via explicit service-account creds
        # when provided (headless/AgentCore), else default ADC (local login).
        client_args: dict = {
            "vertexai": True,
            "project": settings.google_cloud_project,
            "location": settings.google_cloud_location,
        }
        creds = _vertex_credentials(settings)
        if creds is not None:
            client_args["credentials"] = creds
    else:
        # Developer API (AI Studio) key path. google-genai also reads
        # GOOGLE_API_KEY/GEMINI_API_KEY from the env (get_settings loads .env into
        # os.environ); we pass it explicitly when set.
        client_args = {}
        if settings.google_api_key:
            client_args["api_key"] = settings.google_api_key

    return GeminiModel(client_args=client_args, model_id=model_id, params=params)


# Back-compat alias: harness historically imported build_bedrock_model.
build_bedrock_model = build_model
