import { NextRequest } from "next/server";
import { json, requireUserId, handleError } from "@/lib/server/api";
import { getDownloadUrls } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Resolve S3 object keys to presigned GET URLs. Replaces Convex `getImageUrls`;
 * returns a `{ [key]: url | null }` map.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const { keys } = await req.json();
    if (!Array.isArray(keys)) return json({});
    return json(await getDownloadUrls(keys));
  } catch (err) {
    return handleError(err);
  }
}
