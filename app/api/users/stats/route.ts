import { json, optionalUserId, handleError } from "@/lib/server/api";
import { getGenerationStats } from "@/lib/db/queries/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await optionalUserId();
    if (!userId) return json(null);
    return json(await getGenerationStats(userId));
  } catch (err) {
    return handleError(err);
  }
}
