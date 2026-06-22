import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import { getAllProjects, createProject } from "@/lib/db/queries/projects";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await getAllProjects(userId));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { name, description } = await req.json();
    const id = await createProject(userId, name, description);
    return json({ _id: id });
  } catch (err) {
    return handleError(err);
  }
}
