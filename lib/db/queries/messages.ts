import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { messages, projects, screens } from "../schema";
import { toDocs } from "../serialize";
import { ApiError } from "../../server/errors";
import { isUuid } from "../../server/uuid";
import type { MessageDoc } from "../types";

type Role = "user" | "assistant";

async function getScreenRow(screenId: string) {
  if (!isUuid(screenId)) return null;
  const [row] = await db
    .select()
    .from(screens)
    .where(eq(screens.id, screenId))
    .limit(1);
  return row ?? null;
}

async function assertScreenOwner(userId: string, screenId: string) {
  const screen = await getScreenRow(screenId);
  if (!screen) throw new ApiError(404, "Screen not found");
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, screen.projectId))
    .limit(1);
  if (!project || project.userId !== userId) {
    throw new ApiError(403, "Not authorized to access this screen");
  }
}

export interface CreateMessageInput {
  screenId: string;
  role: Role;
  content: string;
  modelId?: string;
  imageIds?: string[];
  reasoningDetails?: unknown;
}

/** Create a message in a screen's thread (ownership-checked). */
export async function createMessage(
  userId: string,
  input: CreateMessageInput
): Promise<string> {
  await assertScreenOwner(userId, input.screenId);
  return insertMessage(input);
}

/** All messages for a screen, oldest first; empty if not found / not owner. */
export async function getMessages(
  userId: string,
  screenId: string,
  limit?: number
): Promise<MessageDoc[]> {
  const screen = await getScreenRow(screenId);
  if (!screen) return [];
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, screen.projectId))
    .limit(1);
  if (!project || project.userId !== userId) return [];

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.screenId, screenId))
    .orderBy(asc(messages.createdAt));

  const limited =
    limit && rows.length > limit ? rows.slice(-limit) : rows;
  return toDocs(limited) as MessageDoc[];
}

/** Delete all messages for a screen (ownership-checked). */
export async function deleteMessagesByScreen(
  userId: string,
  screenId: string
): Promise<{ deletedCount: number }> {
  await assertScreenOwner(userId, screenId);
  const deleted = await db
    .delete(messages)
    .where(eq(messages.screenId, screenId))
    .returning({ id: messages.id });
  return { deletedCount: deleted.length };
}

// ---- Internal (server-to-server; used by the Inngest workflow) -------------

/** Internal: insert a message, no auth (Inngest may pass reasoningDetails). */
export async function internalCreateMessage(
  input: CreateMessageInput
): Promise<string | null> {
  const screen = await getScreenRow(input.screenId);
  if (!screen) throw new ApiError(404, "Screen not found");
  return insertMessage(input);
}

/** Internal: last N messages (default 10), oldest first; [] if screen missing. */
export async function internalGetMessages(
  screenId: string,
  limit = 10
): Promise<MessageDoc[]> {
  const screen = await getScreenRow(screenId);
  if (!screen) return [];
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.screenId, screenId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  rows.reverse(); // chronological (oldest first)
  return toDocs(rows) as MessageDoc[];
}

async function insertMessage(input: CreateMessageInput): Promise<string> {
  const [row] = await db
    .insert(messages)
    .values({
      screenId: input.screenId,
      role: input.role,
      content: input.content,
      modelId: input.modelId ?? null,
      imageIds: input.imageIds ?? null,
      reasoningDetails:
        input.reasoningDetails === undefined ? null : input.reasoningDetails,
      createdAt: Date.now(),
    })
    .returning({ id: messages.id });
  return row.id;
}
