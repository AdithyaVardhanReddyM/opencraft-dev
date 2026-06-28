import { requireUserId, json, handleError } from "@/lib/server/api";
import { listConnections } from "@/lib/db/queries/connections";
import { PROVIDERS } from "@/lib/connections/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → the signed-in user's connection status for every registry provider.
 * Returns presentation-safe fields only (no tokens). The modal renders Connect /
 * Disconnect from `connected`.
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const connected = await listConnections(userId);
    const byProvider = new Map(connected.map((c) => [c.provider, c]));
    const connections = Object.values(PROVIDERS).map((p) => {
      const c = byProvider.get(p.id);
      return {
        provider: p.id,
        label: p.label,
        authMode: p.authMode ?? "oauth",
        connected: Boolean(c),
        accountName: c?.accountName ?? null,
        connectedAt: c?.connectedAt ?? null,
      };
    });
    return json({ connections });
  } catch (err) {
    return handleError(err);
  }
}
