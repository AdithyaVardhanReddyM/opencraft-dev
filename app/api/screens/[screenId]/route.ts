import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import { updateScreen, deleteScreen } from "@/lib/db/queries/screens";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { screenId } = await params;
    const body = await req.json();
    return json(await updateScreen(userId, screenId, body));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { screenId } = await params;
    return json(await deleteScreen(userId, screenId));
  } catch (err) {
    return handleError(err);
  }
}
