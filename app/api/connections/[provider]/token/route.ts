import { NextRequest } from "next/server";
import { requireUserId, json, handleError } from "@/lib/server/api";
import { upsertConnection } from "@/lib/db/queries/connections";
import { getProvider } from "@/lib/connections/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → store a user-pasted token as a connection, for providers whose hosted MCP
 * server is impractical to reach via OAuth (authMode: "token", e.g. Slack — no DCR,
 * confidential-app-only). The token is encrypted at rest by upsertConnection and
 * later sent as the Bearer to the MCP server, exactly like an OAuth-obtained one —
 * so the agent path is unchanged. OAuth providers reject this endpoint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const userId = await requireUserId();
    const { provider } = await params;
    const cfg = getProvider(provider);
    if (!cfg) return json({ error: "Unknown provider" }, { status: 404 });
    if (cfg.authMode !== "token") {
      return json({ error: "This provider connects via OAuth" }, { status: 400 });
    }
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = (body.token ?? "").trim();
    if (!token) return json({ error: "Token is required" }, { status: 400 });
    if (cfg.tokenPrefix && !token.startsWith(cfg.tokenPrefix)) {
      return json(
        {
          error: `That doesn't look right — expected a token starting with "${cfg.tokenPrefix}".`,
        },
        { status: 400 }
      );
    }
    await upsertConnection(userId, provider, { accessToken: token });
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
