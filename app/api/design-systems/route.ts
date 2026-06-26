import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import {
  listDesignSystems,
  createDesignSystem,
} from "@/lib/db/queries/designSystems";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    return json(await listDesignSystems(userId));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { name, source, sourceUrl, tokens, previewColors } = await req.json();
    const id = await createDesignSystem(userId, {
      name,
      source,
      sourceUrl,
      tokens,
      previewColors,
    });
    return json({ _id: id });
  } catch (err) {
    return handleError(err);
  }
}
