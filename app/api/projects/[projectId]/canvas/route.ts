import { NextRequest } from "next/server";
import {
  json,
  requireUserId,
  optionalUserId,
  handleError,
} from "@/lib/server/api";
import { getCanvasState, saveCanvasState } from "@/lib/db/queries/projects";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await optionalUserId();
    if (!userId) return json(null);
    const { projectId } = await params;
    return json(await getCanvasState(userId, projectId));
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    const { canvasData } = await req.json();
    return json(await saveCanvasState(userId, projectId, canvasData));
  } catch (err) {
    return handleError(err);
  }
}
