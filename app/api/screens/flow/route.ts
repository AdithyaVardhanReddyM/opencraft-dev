import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import { createFlowScreen } from "@/lib/db/queries/screens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { shapeId, projectId, parentScreenId } = await req.json();
    const id = await createFlowScreen(
      userId,
      shapeId,
      projectId,
      parentScreenId
    );
    return json({ _id: id });
  } catch (err) {
    return handleError(err);
  }
}
