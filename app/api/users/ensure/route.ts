import { json, requireUserId, handleError } from "@/lib/server/api";
import { getOrCreateUser } from "@/lib/db/queries/users";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await requireUserId();
    return json(await getOrCreateUser(userId));
  } catch (err) {
    return handleError(err);
  }
}
