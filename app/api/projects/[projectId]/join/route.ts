import { NextRequest } from "next/server";
import { json, requireUserId, handleError, ApiError } from "@/lib/server/api";
import { addMember, getProjectRole } from "@/lib/db/queries/members";
import { verifyInviteToken } from "@/lib/server/realtime-token";

export const runtime = "nodejs";

/**
 * Redeem a share-link invite token to become a member of the project. Body:
 * { token }. The token carries the projectId + role and is signed by the server.
 * Idempotent: re-joining (or the owner opening their own link) is a no-op.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    const { token } = await req.json().catch(() => ({}));

    const invite = verifyInviteToken(token);
    if (!invite || invite.projectId !== projectId) {
      throw new ApiError(400, "Invalid or expired invite");
    }

    // Owners (and existing members) don't need a downgrade; only add when the
    // user has no access yet.
    const existing = await getProjectRole(userId, projectId);
    if (!existing) {
      await addMember(projectId, userId, invite.role);
      return json({ success: true, role: invite.role });
    }
    return json({ success: true, role: existing });
  } catch (err) {
    return handleError(err);
  }
}
