import { json, requireUserId, handleError } from "@/lib/server/api";
import { deleteProject } from "@/lib/db/queries/projects";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await params;
    await deleteProject(userId, projectId);
    return json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
