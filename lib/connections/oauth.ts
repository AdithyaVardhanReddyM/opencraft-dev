import "server-only";
import { createHash, randomBytes } from "crypto";

/**
 * Minimal, provider-agnostic OAuth 2.1 client for the MCP authorization spec
 * (RFC 8414 / 9728 metadata, RFC 7591 dynamic client registration, PKCE, and the
 * RFC 8707 `resource` binding). Hand-rolled on `fetch` + `node:crypto` — no extra
 * dependency, full control over the redirect flow.
 *
 * Flow, split across the two routes:
 *   start:    discoverMetadata → (registerClient | static creds) → buildAuthUrl
 *   callback: exchangeCode → store
 *   per-turn: refreshAccessToken when the stored token is near expiry
 */

export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null; // epoch-ms, or null when the provider issues no expiry
  scope: string | null;
  accountId: string | null;
  accountName: string | null;
}

// Discovery is stable per server; cache it for the process to avoid re-fetching
// the well-known docs on every connect/refresh.
const metadataCache = new Map<string, AuthServerMetadata>();

async function tryFetchJson(
  urls: string[]
): Promise<Record<string, unknown> | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/**
 * Resolve a hosted MCP server URL to its authorization-server metadata. Tries the
 * RFC 9728 protected-resource doc first (to find the auth server), then RFC 8414 /
 * OIDC metadata, with the URL variants different providers use.
 */
export async function discoverMetadata(
  mcpUrl: string
): Promise<AuthServerMetadata> {
  const cached = metadataCache.get(mcpUrl);
  if (cached) return cached;

  const u = new URL(mcpUrl);
  const path = u.pathname.replace(/\/$/, ""); // e.g. "/mcp"

  // 1. Protected Resource Metadata (RFC 9728) → which auth server protects this.
  const prm = await tryFetchJson([
    `${u.origin}/.well-known/oauth-protected-resource${path}`,
    `${u.origin}/.well-known/oauth-protected-resource`,
  ]);
  let issuer = u.origin;
  const authServers = prm?.authorization_servers;
  if (Array.isArray(authServers) && authServers.length > 0) {
    issuer = String(authServers[0]).replace(/\/$/, "");
  }

  // 2. Authorization Server Metadata (RFC 8414, with OIDC fallback).
  const iu = new URL(issuer);
  const issuerPath = iu.pathname.replace(/\/$/, "");
  const asm = await tryFetchJson([
    `${iu.origin}/.well-known/oauth-authorization-server${issuerPath}`,
    `${issuer}/.well-known/oauth-authorization-server`,
    `${iu.origin}/.well-known/openid-configuration${issuerPath}`,
    `${issuer}/.well-known/openid-configuration`,
  ]);

  const authorizationEndpoint = asm?.authorization_endpoint;
  const tokenEndpoint = asm?.token_endpoint;
  if (typeof authorizationEndpoint !== "string" || typeof tokenEndpoint !== "string") {
    throw new Error(`Could not discover OAuth metadata for ${mcpUrl}`);
  }

  const meta: AuthServerMetadata = {
    issuer,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    registration_endpoint:
      typeof asm?.registration_endpoint === "string"
        ? asm.registration_endpoint
        : undefined,
    scopes_supported: Array.isArray(asm?.scopes_supported)
      ? (asm.scopes_supported as string[])
      : undefined,
  };
  metadataCache.set(mcpUrl, meta);
  return meta;
}

/**
 * Register a public PKCE client via RFC 7591 Dynamic Client Registration. Returns
 * the issued client id (and secret, if the server made it confidential).
 */
export async function registerClient(
  meta: AuthServerMetadata,
  redirectUri: string
): Promise<{ clientId: string; clientSecret: string | null }> {
  if (!meta.registration_endpoint) {
    throw new Error(
      "Provider exposes no dynamic registration endpoint — set static client creds in env."
    );
  }
  const res = await fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: "OpenCraft",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none", // public client; PKCE secures the exchange
    }),
  });
  if (!res.ok) {
    throw new Error(`Dynamic client registration failed (${res.status})`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const clientId = data.client_id;
  if (typeof clientId !== "string") {
    throw new Error("Registration response missing client_id");
  }
  return {
    clientId,
    clientSecret:
      typeof data.client_secret === "string" ? data.client_secret : null,
  };
}

/** PKCE pair: a high-entropy verifier and its S256 challenge. */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/** Opaque anti-CSRF state token. */
export function randomState(): string {
  return randomBytes(16).toString("base64url");
}

export function buildAuthUrl(params: {
  meta: AuthServerMetadata;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  resource: string;
  scope?: string;
}): string {
  const url = new URL(params.meta.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // RFC 8707 — bind the issued token to this MCP server (required by the MCP spec).
  url.searchParams.set("resource", params.resource);
  if (params.scope) url.searchParams.set("scope", params.scope);
  return url.toString();
}

function parseTokenResponse(data: Record<string, unknown>): OAuthTokens {
  const accessToken = data.access_token;
  if (typeof accessToken !== "string") {
    throw new Error("Token response missing access_token");
  }
  const expiresIn = data.expires_in;
  return {
    accessToken,
    refreshToken:
      typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresAt:
      typeof expiresIn === "number" ? Date.now() + expiresIn * 1000 : null,
    scope: typeof data.scope === "string" ? data.scope : null,
    // Notion returns workspace_* in the token body; others may return account_*.
    accountId:
      (typeof data.workspace_id === "string" && data.workspace_id) ||
      (typeof data.account_id === "string" && data.account_id) ||
      null,
    accountName:
      (typeof data.workspace_name === "string" && data.workspace_name) ||
      (typeof data.account_name === "string" && data.account_name) ||
      null,
  };
}

export async function exchangeCode(params: {
  meta: AuthServerMetadata;
  clientId: string;
  clientSecret?: string | null;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  resource: string;
}): Promise<OAuthTokens> {
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", params.code);
  form.set("redirect_uri", params.redirectUri);
  form.set("client_id", params.clientId);
  form.set("code_verifier", params.codeVerifier);
  form.set("resource", params.resource);
  if (params.clientSecret) form.set("client_secret", params.clientSecret);

  const res = await fetch(params.meta.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status})`);
  }
  return parseTokenResponse((await res.json()) as Record<string, unknown>);
}

export async function refreshAccessToken(params: {
  meta: AuthServerMetadata;
  clientId: string;
  clientSecret?: string | null;
  refreshToken: string;
  resource: string;
}): Promise<OAuthTokens> {
  const form = new URLSearchParams();
  form.set("grant_type", "refresh_token");
  form.set("refresh_token", params.refreshToken);
  form.set("client_id", params.clientId);
  form.set("resource", params.resource);
  if (params.clientSecret) form.set("client_secret", params.clientSecret);

  const res = await fetch(params.meta.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status})`);
  }
  const tokens = parseTokenResponse((await res.json()) as Record<string, unknown>);
  // Some providers omit a fresh refresh_token on refresh — keep the old one.
  if (!tokens.refreshToken) tokens.refreshToken = params.refreshToken;
  return tokens;
}
