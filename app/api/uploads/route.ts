import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import { createUploadUrl } from "@/lib/s3";

export const runtime = "nodejs";

/** Mint a presigned PUT URL. Replaces Convex `generateUploadUrl`. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { contentType } = await req.json().catch(() => ({}));
    const result = await createUploadUrl(
      userId,
      contentType || "application/octet-stream"
    );
    return json(result);
  } catch (err) {
    return handleError(err);
  }
}
