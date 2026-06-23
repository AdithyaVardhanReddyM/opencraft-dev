import { NextRequest } from "next/server";
import { json, optionalUserId, handleError } from "@/lib/server/api";
import { getScreenFiles } from "@/lib/db/queries/screens";

export const runtime = "nodejs";

/**
 * GET /api/screens/[screenId]/files — the heavy `files` blob for one screen,
 * fetched on demand for the *selected* screen so the polled screens list can
 * stay lean. Returns null when unauthenticated or not the owner.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const userId = await optionalUserId();
    if (!userId) return json(null);
    const { screenId } = await params;
    return json(await getScreenFiles(userId, screenId));
  } catch (err) {
    return handleError(err);
  }
}
