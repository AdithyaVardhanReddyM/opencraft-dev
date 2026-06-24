# OpenCraft infra (CDK)

Provisions the **AWS AppSync Events API** that powers live canvas collaboration
(presence + Yjs document sync). Clients connect over WebSocket and publish/subscribe
directly; the backend never proxies messages. Channel authorization is handled by a
Lambda authorizer that verifies the short-lived HMAC token the Next.js app mints
after a Clerk + project-membership check.

## What it creates

- `AWS::AppSync::Api` (EVENT protocol), API name `opencraft-collab`
- Channel namespace `canvas` — one channel per project: `/canvas/{projectId}`
- Lambda authorizer (`lambda/authorizer/index.mjs`, plain Node, `node:crypto` only)

All three connection/publish/subscribe auth modes are `AWS_LAMBDA`.

## Prerequisites

- Node 20+, AWS credentials for account `339712700064` (us-east-1)
- A bootstrapped CDK environment: `npx cdk bootstrap aws://339712700064/us-east-1`
- A shared secret used to sign/verify realtime tokens. Generate one:
  ```bash
  openssl rand -hex 32
  ```
  Use the **same value** here and in the Next.js app's `APPSYNC_REALTIME_SHARED_SECRET`.

## Deploy

```bash
cd infra
npm install
export AWS_REGION=us-east-1
export APPSYNC_REALTIME_SHARED_SECRET=<the value from above>
npm run deploy        # or: npx cdk deploy
```

## Wire up the app

Copy the stack outputs into the Next.js `.env`:

```bash
APPSYNC_EVENTS_HTTP_URL=https://<EventApiHttpDns>/event          # from EventApiHttpUrl
APPSYNC_EVENTS_REALTIME_URL=wss://<...>.appsync-realtime-api.us-east-1.amazonaws.com/event/realtime
APPSYNC_EVENTS_HTTP_DNS=<EventApiHttpDns>                         # host field for the WS auth subprotocol
APPSYNC_REALTIME_SHARED_SECRET=<same secret as deploy>
```

`APPSYNC_EVENTS_REALTIME_URL` and `APPSYNC_EVENTS_HTTP_DNS` are read by the browser
client, so they must also be exposed as `NEXT_PUBLIC_*` (see the app's
`lib/realtime/config.ts`). The shared secret is **server-only** — never expose it.

## Notes

- The Lambda asset folder (`lambda/authorizer`) ships as-is (no bundler); it only
  depends on Node built-ins.
- Re-deploying after changing the authorizer code updates the function in place.
- Costs: AppSync Events is ~$1.00 / million operations + $0.08 / million
  connection-minutes, with a 12-month free tier (250k ops + 600k conn-min/mo).
