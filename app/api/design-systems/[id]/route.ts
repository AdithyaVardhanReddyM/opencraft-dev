import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import {
  updateDesignSystem,
  deleteDesignSystem,
} from "@/lib/db/queries/designSystems";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { name, tokens, previewColors } = await req.json();
    await updateDesignSystem(userId, id, { name, tokens, previewColors });
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await deleteDesignSystem(userId, id);
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
