import { NextRequest } from "next/server";
import {
  json,
  requireUserId,
  optionalUserId,
  handleError,
} from "@/lib/server/api";
import {
  createScreen,
  getScreensByProject,
  getScreenByShapeId,
} from "@/lib/db/queries/screens";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await optionalUserId();
    const { searchParams } = new URL(req.url);
    const shapeId = searchParams.get("shapeId");
    const projectId = searchParams.get("projectId");

    if (shapeId) {
      if (!userId) return json(null);
      return json(await getScreenByShapeId(userId, shapeId));
    }
    if (projectId) {
      if (!userId) return json([]);
      return json(await getScreensByProject(userId, projectId));
    }
    return json({ error: "Missing shapeId or projectId" }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { shapeId, projectId } = await req.json();
    const id = await createScreen(userId, shapeId, projectId);
    return json({ _id: id });
  } catch (err) {
    return handleError(err);
  }
}
