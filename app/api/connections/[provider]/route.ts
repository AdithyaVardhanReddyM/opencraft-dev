import { requireUserId, json, handleError } from "@/lib/server/api";
import { deleteConnection } from "@/lib/db/queries/connections";
import { getProvider } from "@/lib/connections/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE → disconnect a provider for the signed-in user (removes the stored
 * tokens). The agent simply stops receiving that connection on subsequent turns.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const userId = await requireUserId();
    const { provider } = await params;
    if (!getProvider(provider)) {
      return json({ error: "Unknown provider" }, { status: 404 });
    }
    await deleteConnection(userId, provider);
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
