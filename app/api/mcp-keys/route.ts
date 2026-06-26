import { NextRequest } from "next/server";
import { requireUserId, json, handleError } from "@/lib/server/api";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/db/queries/apiKeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manage MCP API keys for the signed-in user. These keys let external agents
 * authenticate to the MCP server (Authorization: Bearer oc_…) as this user.
 *
 *   GET    → list keys (metadata only; never the secret)
 *   POST   → mint a key { name } → returns the plaintext key ONCE
 *   DELETE → revoke a key { id }
 */

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await listApiKeys(userId));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const created = await createApiKey(userId, body.name ?? "");
    // `key` is shown exactly once — the caller must store it now.
    return json(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = body.id ?? req.nextUrl.searchParams.get("id") ?? "";
    if (!id) return json({ error: "id is required" }, { status: 400 });
    await revokeApiKey(userId, id);
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
