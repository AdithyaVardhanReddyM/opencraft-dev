import { NextRequest } from "next/server";
import {
  json,
  requireUserId,
  optionalUserId,
  handleError,
} from "@/lib/server/api";
import {
  getImagesByProject,
  deleteImageByShapeId,
} from "@/lib/db/queries/images";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await optionalUserId();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return json({ error: "Missing projectId" }, { status: 400 });
    }
    if (!userId) return json([]);
    return json(await getImagesByProject(userId, projectId));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const shapeId = searchParams.get("shapeId");
    if (!projectId || !shapeId) {
      return json({ error: "Missing projectId or shapeId" }, { status: 400 });
    }
    await deleteImageByShapeId(userId, projectId, shapeId);
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
