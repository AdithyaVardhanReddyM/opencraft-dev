"""Central configuration for the agent service.

Loads from `agent-service/.env` (copied from the repo-root .env plus a few
service-specific keys). Everything the agent needs — DB, Bedrock, E2B, tool API
keys, model mapping, iteration/timeout budgets — is resolved here once.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# agent-service/.env  (this file lives at src/agent_service/config.py)
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

# UI model id (as stored on messages.model_id / sent by the frontend) -> Google
# Gemini model id. Gemini is the only provider. The legacy Anthropic id is kept
# as a fallback so older clients still resolve to a model.
MODEL_ID_MAP: dict[str, str] = {
    "google/gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
    "anthropic/claude-sonnet-4.6": "gemini-3.1-pro-preview",  # legacy fallback
}

# E2B preview server port (the baked Next.js dev server) and sandbox lifetime.
PREVIEW_PORT = 3000
SANDBOX_TIMEOUT_MS = 15 * 60 * 1000  # 15 min auto-pause, mirrors the TS runtime

# Agent loop caps (mirror inngest/functions.ts maxIter), with headroom for the
# verification gate's fix-retries.
MAX_ITERATIONS = 35
MAX_ITERATIONS_FLOW = 40

# Thinking budget when the per-request toggle is on (Bedrock min is 1024).
THINKING_BUDGET_TOKENS = 4096


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATH,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Google Gemini (active provider). google-genai reads the key; we also pass it
    # explicitly. GOOGLE_MODEL_ID overrides the default model id.
    google_api_key: str | None = None
    google_model_id: str = "gemini-3.1-pro-preview"

    # Vertex AI mode. When true, Gemini runs through Vertex AI (Google Cloud) and
    # bills to GOOGLE_CLOUD_PROJECT — so a Vertex/GCP credit can fund it — instead
    # of the Developer API key. Vertex auth is ADC (gcloud auth
    # application-default login, or a service account via
    # GOOGLE_APPLICATION_CREDENTIALS), NOT an API key.
    use_vertex: bool = False
    google_cloud_project: str | None = None
    google_cloud_location: str = "global"
    # Headless Vertex auth (e.g. AgentCore): the FULL service-account key JSON as
    # a string, injected as a secret env var. When unset, default ADC is used
    # (local `gcloud auth application-default login`, GOOGLE_APPLICATION_CREDENTIALS
    # file, GCE metadata, or Workload Identity Federation).
    google_service_account_json: str | None = None

    # AWS / Bedrock (legacy; unused now that the provider is Google — kept so old
    # env files don't break and Phase C/AgentCore can still read them).
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "us.anthropic.claude-sonnet-4-6"

    # Visual Mode — AWS AgentCore Browser (aws.browser.v1) for the post-build
    # screenshot self-check. `aws_region` selects the browser region (must be an
    # AgentCore region). Keep the session timeout modest: a leaked session bills
    # until it's stopped or this elapses.
    agentcore_browser_identifier: str = "aws.browser.v1"
    agentcore_browser_session_timeout: int = 600  # seconds

    # E2B
    e2b_api_key: str
    sandbox_template: str = "unitset-sandbox-v1"

    # tool APIs
    firecrawl_api_key: str | None = None
    pexels_api_key: str | None = None

    # server
    agent_service_port: int = 8080
    # Shared secret for the POST /chat guard and the result callback header. When
    # unset the guard is disabled (fine for local dev); set it in any shared env.
    agent_shared_secret: str | None = None

    def resolve_model_id(self, ui_model_id: str | None) -> str:
        """Map a UI model id to a Gemini id, defaulting to the configured model."""
        if not ui_model_id:
            return self.google_model_id
        return MODEL_ID_MAP.get(ui_model_id, self.google_model_id)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Populate os.environ so boto3's default credential chain (used by Bedrock)
    # and Google ADC (GOOGLE_APPLICATION_CREDENTIALS) pick up values from the
    # service .env, in addition to pydantic Settings.
    #
    # override=True so the .env is authoritative over a polluted parent shell.
    # Without it, a stale `export GOOGLE_APPLICATION_CREDENTIALS=...` (e.g. left
    # over from `source .env` when the file was malformed) silently wins over the
    # corrected .env, since load_dotenv defaults to NOT overriding existing vars.
    # Safe on AgentCore: the Dockerfile doesn't copy .env, so this is a no-op
    # there and the container's injected secrets are untouched.
    load_dotenv(_ENV_PATH, override=True)
    return Settings()  # type: ignore[call-arg]
