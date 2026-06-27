import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { oauthConnections } from "../schema";
import {
  encryptSecret,
  encryptNullable,
  decryptSecret,
  decryptNullable,
} from "../../server/crypto";
import { getProvider } from "../../connections/registry";
import { discoverMetadata, refreshAccessToken } from "../../connections/oauth";

/**
 * Persistence for external MCP connections (Notion, Linear, …). Tokens are stored
 * AES-GCM-encrypted and only ever decrypted server-side: for the UI we return
 * status without secrets (listConnections), and for a turn we return live bearer
 * tokens (listConnectionTokensForAgent), refreshing them when near expiry.
 */

export interface UpsertConnectionInput {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
}

/** Connected-provider status for the modal — never includes tokens. */
export interface ConnectionStatus {
  provider: string;
  accountName: string | null;
  connectedAt: number;
}

/** A live bearer token for the agent to open an MCP session with. */
export interface AgentConnection {
  provider: string;
  url: string;
  token: string;
}

/** Create or replace the user's connection for a provider (unique per user+provider). */
export async function upsertConnection(
  userId: string,
  provider: string,
  input: UpsertConnectionInput
): Promise<void> {
  const now = Date.now();
  const encrypted = {
    accessToken: encryptSecret(input.accessToken),
    refreshToken: encryptNullable(input.refreshToken),
    clientSecret: encryptNullable(input.clientSecret),
  };
  await db
    .insert(oauthConnections)
    .values({
      userId,
      provider,
      accessToken: encrypted.accessToken,
      refreshToken: encrypted.refreshToken,
      expiresAt: input.expiresAt ?? null,
      scope: input.scope ?? null,
      accountId: input.accountId ?? null,
      accountName: input.accountName ?? null,
      clientId: input.clientId ?? null,
      clientSecret: encrypted.clientSecret,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [oauthConnections.userId, oauthConnections.provider],
      set: {
        accessToken: encrypted.accessToken,
        refreshToken: encrypted.refreshToken,
        expiresAt: input.expiresAt ?? null,
        scope: input.scope ?? null,
        accountId: input.accountId ?? null,
        accountName: input.accountName ?? null,
        clientId: input.clientId ?? null,
        clientSecret: encrypted.clientSecret,
        updatedAt: now,
      },
    });
}

/** Remove a connection (disconnect). No-op if it isn't the user's. */
export async function deleteConnection(
  userId: string,
  provider: string
): Promise<void> {
  await db
    .delete(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider)
      )
    );
}

/** Status of every connected provider for a user (no secrets). */
export async function listConnections(
  userId: string
): Promise<ConnectionStatus[]> {
  const rows = await db
    .select({
      provider: oauthConnections.provider,
      accountName: oauthConnections.accountName,
      createdAt: oauthConnections.createdAt,
    })
    .from(oauthConnections)
    .where(eq(oauthConnections.userId, userId));
  return rows.map((r) => ({
    provider: r.provider,
    accountName: r.accountName,
    connectedAt: r.createdAt,
  }));
}

// Refresh slightly before the token actually expires to avoid edge-of-expiry 401s.
const REFRESH_SKEW_MS = 60_000;

/**
 * Live bearer tokens for the agent: one per connected provider, refreshed when
 * near expiry. Best-effort per provider — a connection that can't be read/refreshed
 * is dropped rather than failing the whole turn (the agent then runs without it).
 */
export async function listConnectionTokensForAgent(
  userId: string
): Promise<AgentConnection[]> {
  const rows = await db
    .select()
    .from(oauthConnections)
    .where(eq(oauthConnections.userId, userId));

  const out: AgentConnection[] = [];
  for (const row of rows) {
    const cfg = getProvider(row.provider);
    if (!cfg) continue; // provider removed from the registry → ignore stale row
    try {
      let token = decryptSecret(row.accessToken);

      const needsRefresh =
        row.expiresAt != null && row.expiresAt < Date.now() + REFRESH_SKEW_MS;
      const refresh = decryptNullable(row.refreshToken);
      if (needsRefresh && refresh && row.clientId) {
        try {
          const meta = await discoverMetadata(cfg.mcpUrl);
          const next = await refreshAccessToken({
            meta,
            clientId: row.clientId,
            clientSecret: decryptNullable(row.clientSecret),
            refreshToken: refresh,
            resource: cfg.mcpUrl,
          });
          token = next.accessToken;
          await upsertConnection(userId, row.provider, {
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
            expiresAt: next.expiresAt,
            scope: next.scope ?? row.scope,
            accountId: row.accountId,
            accountName: row.accountName,
            clientId: row.clientId,
            clientSecret: decryptNullable(row.clientSecret),
          });
        } catch {
          // Refresh failed — fall back to the stored token; it may still work,
          // and the agent skips it gracefully if the provider rejects it.
        }
      }

      out.push({ provider: row.provider, url: cfg.mcpUrl, token });
    } catch {
      // Undecryptable / malformed row — skip this connection.
    }
  }
  return out;
}
