import { NextRequest } from "next/server";
import { json, requireUserId, requireProjectAccess, handleError } from "@/lib/server/api";
import { signRealtimeToken } from "@/lib/server/realtime-token";

export const runtime = "nodejs";

/**
 * Mint a short-lived token authorizing the caller's AppSync Events channel for
 * one project. Clerk session (cookie) authorizes this call; the returned token
 * authorizes the WebSocket via the Lambda authorizer. Also returns the realtime
 * endpoint config so the browser never needs the (server-only) AppSync env vars.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    const role = await requireProjectAccess(userId, projectId, "viewer");

    const realtimeUrl = process.env.APPSYNC_EVENTS_REALTIME_URL;
    const httpDns = process.env.APPSYNC_EVENTS_HTTP_DNS;
    if (!realtimeUrl || !httpDns) {
      return json({ error: "Realtime is not configured" }, { status: 503 });
    }

    const { token, expiresAt } = signRealtimeToken({ userId, projectId, role });

    return json({
      token,
      expiresAt,
      role,
      channel: `/canvas/${projectId}`,
      realtimeUrl,
      httpDns,
    });
  } catch (err) {
    return handleError(err);
  }
}
