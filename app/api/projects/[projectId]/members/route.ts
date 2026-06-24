import { NextRequest } from "next/server";
import {
  json,
  requireUserId,
  requireProjectAccess,
  handleError,
  ApiError,
} from "@/lib/server/api";
import { listMembers, removeMember } from "@/lib/db/queries/members";
import { signInviteToken } from "@/lib/server/realtime-token";

export const runtime = "nodejs";

/** List members of a project (any member may view the roster). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    const role = await requireProjectAccess(userId, projectId, "viewer");
    return json({ members: await listMembers(projectId), role });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Create a share link (signed invite token). Owner-only. Body: { role? }.
 * Returns a ready-to-use URL pointing at the canvas with ?invite=<token>.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    await requireProjectAccess(userId, projectId, "owner");

    const body = await req.json().catch(() => ({}));
    const role = body?.role === "viewer" ? "viewer" : "editor";
    const token = signInviteToken({ projectId, role });
    const url = `${req.nextUrl.origin}/dashboard/${projectId}/canvas?invite=${token}`;

    return json({ url, token, role });
  } catch (err) {
    return handleError(err);
  }
}

/** Remove a member. Owner-only. Query: ?userId=<clerkId>. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    await requireProjectAccess(userId, projectId, "owner");

    const target = req.nextUrl.searchParams.get("userId");
    if (!target) throw new ApiError(400, "Missing userId");
    await removeMember(projectId, target);
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
