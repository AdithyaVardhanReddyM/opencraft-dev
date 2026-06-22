import { NextRequest } from "next/server";
import {
  json,
  requireUserId,
  optionalUserId,
  handleError,
} from "@/lib/server/api";
import { getMessages, createMessage } from "@/lib/db/queries/messages";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await optionalUserId();
    if (!userId) return json([]);
    const { searchParams } = new URL(req.url);
    const screenId = searchParams.get("screenId");
    if (!screenId) return json([]);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    return json(await getMessages(userId, screenId, limit));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const id = await createMessage(userId, body);
    return json({ _id: id });
  } catch (err) {
    return handleError(err);
  }
}
