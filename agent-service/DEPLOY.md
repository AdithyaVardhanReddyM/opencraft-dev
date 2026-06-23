# Deploying the agent-service to Bedrock AgentCore Runtime (Phase C)

The service is pure compute and stateless — local dev (FastAPI, `app.py`) and
AgentCore (`agentcore_entrypoint.py`) wrap the *same* `run_turn_durable` seam, so
deploying changes transport only. State lives in E2B (keyed by `sandbox_id`) and
Aurora (owned by Next.js); the service persists nothing itself.

## 0. Prerequisites

- **Vertex AI**: the service runs Gemini through Vertex (`USE_VERTEX=true`),
  billed to GCP project `unit-set`. The service account
  `opencraft-agent@unit-set.iam.gserviceaccount.com` needs **Vertex AI User**
  (`roles/aiplatform.user`) and the **Vertex AI API** enabled. (Local dev already
  uses this SA, so this is likely done.)
- **AWS**: credentials able to create an AgentCore runtime, an ECR repo, and an
  execution IAM role — the starter toolkit creates the last two for you.
- Keys: `E2B_API_KEY`, `FIRECRAWL_API_KEY`, `PEXELS_API_KEY`.
- The SA key JSON, **single-line** (the headless Vertex credential):
  `jq -c . .secrets/vertex-sa.json`

## 1. Runtime environment variables

These are read by `config.py` from the process environment (the `.env` file is
**not** shipped — `.dockerignore` excludes it). Set them at deploy time.

| Var | Value | Required |
|-----|-------|----------|
| `E2B_API_KEY` | your E2B key | ✅ |
| `USE_VERTEX` | `true` | ✅ |
| `GOOGLE_CLOUD_PROJECT` | `unit-set` | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | single-line SA key JSON | ✅ (headless Vertex auth) |
| `GOOGLE_CLOUD_LOCATION` | `global` | default ok |
| `GOOGLE_MODEL_ID` | `gemini-3.1-pro-preview` | default ok |
| `AGENT_SHARED_SECRET` | random string | recommended — guards the entrypoint + signs the callback; **must match Next.js** |
| `FIRECRAWL_API_KEY` / `PEXELS_API_KEY` | tool keys | for scrape/image tools |
| `SANDBOX_TEMPLATE` | `unitset-sandbox-v1` | default ok |

**Not needed:** `AWS_*` (the runtime's IAM role is its identity; the provider is
Google now), `GOOGLE_API_KEY` (Vertex uses the SA creds), and
`GOOGLE_APPLICATION_CREDENTIALS` (a local file path — replaced by
`GOOGLE_SERVICE_ACCOUNT_JSON` in the container).

> AgentCore Runtime has outbound internet by default (PUBLIC network mode), which
> the service needs for E2B, Vertex, and the durable callback to your app.

## 2. Build + deploy (starter toolkit)

```bash
cd agent-service
uv pip install -e '.[agentcore]'         # bedrock-agentcore + starter toolkit
SA_JSON=$(jq -c . .secrets/vertex-sa.json)

# Uses the arm64 Dockerfile in this dir; creates the ECR repo + execution role.
agentcore configure --entrypoint src/agent_service/agentcore_entrypoint.py --name opencraft_agent

agentcore launch \
  --env USE_VERTEX=true \
  --env GOOGLE_CLOUD_PROJECT=unit-set \
  --env GOOGLE_CLOUD_LOCATION=global \
  --env "GOOGLE_SERVICE_ACCOUNT_JSON=$SA_JSON" \
  --env E2B_API_KEY="$E2B_API_KEY" \
  --env AGENT_SHARED_SECRET="$AGENT_SHARED_SECRET" \
  --env FIRECRAWL_API_KEY="$FIRECRAWL_API_KEY" \
  --env PEXELS_API_KEY="$PEXELS_API_KEY" \
  --env SANDBOX_TEMPLATE=unitset-sandbox-v1
```

`agentcore launch` prints the **agent runtime ARN** — copy it for step 3.

> The toolkit CLI surface shifts between versions — confirm flags with
> `agentcore configure --help` / `agentcore launch --help`. For very large env
> values, AWS Secrets Manager is cleaner than `--env`; the SA key fits inline.

## 3. Wire Next.js to the runtime

Set in the **deployed** Next.js environment (the SigV4 path in
`lib/agent-service.ts` activates only when `AGENT_RUNTIME_ARN` is present):

```
AGENT_RUNTIME_ARN=<arn from `agentcore launch`>
AGENT_RUNTIME_QUALIFIER=DEFAULT          # optional, default DEFAULT
AGENT_SHARED_SECRET=<same value as the runtime>
NEXT_PUBLIC_APP_URL=https://<your-app>   # so the callback reaches /api/internal/agent-result
AWS_REGION=<region>                      # already set for S3
# AWS creds: already present for S3 — just add the IAM action below.
```

The AWS principal Next.js already uses for S3 needs one more action:

```json
{
  "Effect": "Allow",
  "Action": "bedrock-agentcore:InvokeAgentRuntime",
  "Resource": [
    "arn:aws:bedrock-agentcore:<region>:<account>:runtime/<runtime-id>",
    "arn:aws:bedrock-agentcore:<region>:<account>:runtime/<runtime-id>/*"
  ]
}
```

## 4. Verify

- **Directly:** `agentcore invoke '{"message":"add a hero section","screen":null}'`
  (or use the console's test panel).
- **Through the app:** open a screen, send a prompt → canvas updates, the
  assistant message persists (via the callback, not the live stream).
- **Parallelism:** open 2–3 screens and send prompts together. Each screen maps to
  a distinct `runtimeSessionId` (`screen-<uuid>`, see `lib/agent-service.ts`), so
  each gets its own microVM and they run concurrently.

## Rollback

Unset `AGENT_RUNTIME_ARN` in Next.js → `/api/chat` instantly falls back to the
direct FastAPI call at `AGENT_SERVICE_URL`. No code change, no redeploy of the
service. Local dev is unaffected (ARN unset → always FastAPI at `localhost:8080`).
