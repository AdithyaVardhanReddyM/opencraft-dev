import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { designSystems } from "../schema";
import { toDoc, toDocs } from "../serialize";
import { ApiError } from "../../server/errors";
import { isUuid } from "../../server/uuid";
import type { DesignSystemDoc } from "../types";
import type { ThemeTokens } from "../../canvas/theme-tokens";

export type DesignSystemSource = "web" | "css" | "manual";

export interface DesignSystemInput {
  name: string;
  source?: DesignSystemSource;
  sourceUrl?: string | null;
  tokens: ThemeTokens;
  previewColors?: [string, string, string];
}

/** Throw 400 unless `tokens` has the { theme, light, dark } object shape. */
function assertTokens(tokens: unknown): asserts tokens is ThemeTokens {
  const t = tokens as ThemeTokens | null;
  if (
    !t ||
    typeof t !== "object" ||
    typeof t.theme !== "object" ||
    typeof t.light !== "object" ||
    typeof t.dark !== "object"
  ) {
    throw new ApiError(400, "Invalid design system tokens");
  }
}

/** Rail swatches [primary, secondary, accent] from the light token set. */
function derivePreviewColors(tokens: ThemeTokens): [string, string, string] {
  const l = tokens.light ?? {};
  return [
    l.primary || l.foreground || "oklch(0.205 0 0)",
    l.secondary || l.muted || "oklch(0.97 0 0)",
    l.accent || l.secondary || "oklch(0.97 0 0)",
  ];
}

/** All design systems owned by the user, newest first. */
export async function listDesignSystems(
  userId: string
): Promise<DesignSystemDoc[]> {
  const rows = await db
    .select()
    .from(designSystems)
    .where(eq(designSystems.userId, userId))
    .orderBy(desc(designSystems.createdAt));
  return toDocs(rows) as DesignSystemDoc[];
}

/** Create a design system; returns the new id. */
export async function createDesignSystem(
  userId: string,
  input: DesignSystemInput
): Promise<string> {
  const name = (input.name ?? "").trim();
  if (name.length < 1 || name.length > 60) {
    throw new ApiError(
      400,
      "Design system name must be between 1 and 60 characters"
    );
  }
  assertTokens(input.tokens);
  const previewColors =
    input.previewColors && input.previewColors.length === 3
      ? input.previewColors
      : derivePreviewColors(input.tokens);

  const now = Date.now();
  const [row] = await db
    .insert(designSystems)
    .values({
      userId,
      name,
      source: input.source ?? "manual",
      sourceUrl: input.sourceUrl ?? null,
      tokens: input.tokens,
      previewColors,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: designSystems.id });
  return row.id;
}

async function requireOwned(userId: string, id: string) {
  if (!isUuid(id)) throw new ApiError(404, "Design system not found");
  const [row] = await db
    .select()
    .from(designSystems)
    .where(eq(designSystems.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "Design system not found");
  if (row.userId !== userId) {
    throw new ApiError(403, "Not authorized to access this design system");
  }
  return row;
}

/** Patch name / tokens / previewColors of an owned design system. */
export async function updateDesignSystem(
  userId: string,
  id: string,
  patch: {
    name?: string;
    tokens?: ThemeTokens;
    previewColors?: [string, string, string];
  }
): Promise<void> {
  await requireOwned(userId, id);
  const set: Partial<typeof designSystems.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 1 || name.length > 60) {
      throw new ApiError(
        400,
        "Design system name must be between 1 and 60 characters"
      );
    }
    set.name = name;
  }
  if (patch.tokens !== undefined) {
    assertTokens(patch.tokens);
    set.tokens = patch.tokens;
    // Keep rail swatches in sync with the edited tokens unless overridden.
    set.previewColors = patch.previewColors ?? derivePreviewColors(patch.tokens);
  } else if (patch.previewColors !== undefined) {
    set.previewColors = patch.previewColors;
  }
  await db.update(designSystems).set(set).where(eq(designSystems.id, id));
}

/** Delete an owned design system. */
export async function deleteDesignSystem(
  userId: string,
  id: string
): Promise<void> {
  await requireOwned(userId, id);
  await db.delete(designSystems).where(eq(designSystems.id, id));
}

/**
 * Server-only fetch by id (no auth) — used by trusted server routes (sandbox
 * theme apply, chat) to resolve a custom design system's tokens before writing
 * globals.css. NEVER expose this via a public API route.
 */
export async function internalGetDesignSystem(
  id: string
): Promise<DesignSystemDoc | null> {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(designSystems)
    .where(eq(designSystems.id, id))
    .limit(1);
  return row ? (toDoc(row) as DesignSystemDoc) : null;
}
