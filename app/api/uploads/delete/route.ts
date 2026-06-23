import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import { deleteObjects } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Best-effort delete of S3 objects when a canvas image is removed. Only keys the
 * caller owns (under `uploads/{userId}/`) are deleted, so a forged key can't wipe
 * another user's objects.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { keys } = await req.json().catch(() => ({}));
    if (!Array.isArray(keys)) return json({ ok: true, deleted: 0 });

    const prefix = `uploads/${userId}/`;
    const owned = keys.filter(
      (k: unknown): k is string =>
        typeof k === "string" && k.startsWith(prefix)
    );
    await deleteObjects(owned);
    return json({ ok: true, deleted: owned.length });
  } catch (err) {
    return handleError(err);
  }
}
