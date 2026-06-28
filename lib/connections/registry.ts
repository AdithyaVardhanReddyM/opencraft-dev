import "server-only";

/**
 * The single place an external MCP connection is defined. Adding a new provider
 * ("more coming soon") is one entry here plus a display entry in the modal.
 *
 * Auth is unified MCP-native OAuth (discover → DCR → PKCE → token), so most
 * providers need only an `mcpUrl`. A provider that prefers a *pre-registered*
 * OAuth app can set static client creds via env to skip Dynamic Client
 * Registration — the flow is otherwise identical.
 *
 * Kept server-only: it holds OAuth config and reads env. The frontend has its own
 * presentation metadata (label/icon/blurb) keyed by the same `id`.
 */
export interface ProviderConfig {
  id: string; // registry id, also the route param: "notion" | "linear"
  label: string; // human label (also returned by GET /api/connections)
  mcpUrl: string; // hosted streamable-HTTP MCP endpoint
  /** "oauth" (default) → the popup OAuth flow; "token" → the user pastes a token
   *  (for servers where OAuth is impractical, e.g. Slack's no-DCR confidential app). */
  authMode?: "oauth" | "token";
  /** token mode: light validation hint for the pasted token, e.g. "xoxp-". */
  tokenPrefix?: string;
  /** Static OAuth client (skips DCR) when set via env. */
  staticClientId?: string;
  staticClientSecret?: string;
  /** Optional explicit scope string; omitted → the provider's consent default. */
  scope?: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  notion: {
    id: "notion",
    label: "Notion",
    // Hosted MCP — requires its own OAuth handshake (no pasted integration tokens).
    mcpUrl: "https://mcp.notion.com/mcp",
    staticClientId: process.env.NOTION_CLIENT_ID || undefined,
    staticClientSecret: process.env.NOTION_CLIENT_SECRET || undefined,
  },
  linear: {
    id: "linear",
    label: "Linear",
    // Hosted MCP — supports OAuth 2.1 + DCR and also accepts a Bearer token.
    mcpUrl: "https://mcp.linear.app/mcp",
    staticClientId: process.env.LINEAR_CLIENT_ID || undefined,
    staticClientSecret: process.env.LINEAR_CLIENT_SECRET || undefined,
  },
  slack: {
    id: "slack",
    label: "Slack",
    // Slack's hosted MCP has no DCR and needs a confidential OAuth app, so instead
    // of the OAuth popup we take a pasted user token (xoxp-…) — Slack's MCP server
    // accepts it directly as a Bearer. The modal shows how to get one.
    mcpUrl: "https://mcp.slack.com/mcp",
    authMode: "token",
    tokenPrefix: "xoxp-",
  },
};

export function getProvider(id: string): ProviderConfig | null {
  return PROVIDERS[id] ?? null;
}

export function listProviderIds(): string[] {
  return Object.keys(PROVIDERS);
}
