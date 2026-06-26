import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema — the Aurora PostgreSQL port of the former Convex tables.
 *
 * Conventions (chosen to minimize churn vs. the Convex shape):
 * - Primary key `id` is a uuid; it is serialized back to `_id` in API responses
 *   so the frontend keeps using `row._id` unchanged (see lib/db/serialize.ts).
 * - `createdAt` / `updatedAt` / `lastModified` are stored as `bigint` epoch-ms
 *   (mode: "number") to exactly match the app's `new Date(ms)` + numeric-sort
 *   usage. Values stay well under 2^53, so number precision is safe.
 * - `v.any()` JSON blobs -> `jsonb`; string arrays -> `text[]`.
 * - Foreign keys cascade so deleting a project/screen cleans up its children
 *   (Convex did this manually only in deleteScreen; here it is structural).
 */

export const messageRole = pgEnum("message_role", ["user", "assistant"]);

// Collaboration roles, ordered least→most privileged in code (see lib/server/api.ts).
export const projectRole = pgEnum("project_role", ["viewer", "editor", "owner"]);

// User generation tracking.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(), // Clerk user ID (subject)
    generationsUsed: integer("generations_used").notNull().default(0),
    generationsLimit: integer("generations_limit").notNull().default(10),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("users_by_clerk_id").on(t.clerkId)]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(), // Clerk user ID
    name: text("name").notNull(),
    description: text("description"),
    styleGuide: text("style_guide"),
    sketchesData: jsonb("sketches_data"), // EntityState<Shape>
    viewportData: jsonb("viewport_data"), // { scale, translate }
    canvasVersion: text("canvas_version"),
    generatedDesignData: jsonb("generated_design_data"),
    thumbnail: text("thumbnail"),
    moodBoardImages: text("mood_board_images").array(), // S3 keys
    inspirationImages: text("inspiration_images").array(), // S3 keys (max 6)
    lastModified: bigint("last_modified", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    isPublic: boolean("is_public"),
    tags: text("tags").array(),
    projectNumber: integer("project_number").notNull(),
    frameCounter: integer("frame_counter"),
    selectedIds: jsonb("selected_ids"), // SelectionMap
    tool: text("tool"),
  },
  (t) => [index("projects_by_user_id").on(t.userId)]
);

// Collaboration membership: which Clerk users may access a project (besides the
// implicit owner, projects.userId). The owner row may or may not be present —
// access checks treat projects.userId as owner regardless (see requireProjectAccess).
export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Clerk user ID
    role: projectRole("role").notNull().default("editor"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("project_members_unique").on(t.projectId, t.userId),
    index("project_members_by_user_id").on(t.userId),
  ]
);

// Screen shapes for AI-generated web content.
export const screens = pgTable(
  "screens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shapeId: text("shape_id").notNull(), // canvas shape id (nanoid)
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title"),
    sandboxUrl: text("sandbox_url"),
    sandboxId: text("sandbox_id"),
    files: jsonb("files"), // { [path]: string }
    theme: text("theme"),
    // Flow child: shares the parent's sandbox, displays a different route.
    parentScreenId: uuid("parent_screen_id").references(
      (): AnyPgColumn => screens.id,
      { onDelete: "set null" }
    ),
    route: text("route"),
    // Repo-map support for the Strands agent-service (additive; the TS runtime
    // ignores these). file_meta: { [path]: { description, updatedAt, status } }
    // feeds the per-turn repo-map one-liners; recent_edits marks last-turn files.
    fileMeta: jsonb("file_meta"),
    recentEdits: text("recent_edits").array(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("screens_by_shape_id").on(t.shapeId),
    index("screens_by_project_id").on(t.projectId),
  ]
);

// User-created design systems (imported from a URL or pasted CSS, then edited).
// Presets live in code (lib/canvas/theme-utils.ts); these are the per-user,
// DB-backed custom systems. A screen references one by storing this row's uuid in
// `screens.theme` (encoded "<uuid>" / "<uuid>:dark"), resolved preset-vs-custom by
// "is it in THEMES? else look up here" (see isPresetThemeId).
export const designSystemSource = pgEnum("design_system_source", [
  "web",
  "css",
  "manual",
]);

export const designSystems = pgTable(
  "design_systems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(), // Clerk user id, like projects.userId
    name: text("name").notNull(),
    source: designSystemSource("source").notNull().default("manual"),
    sourceUrl: text("source_url"), // set for web imports
    tokens: jsonb("tokens").notNull(), // ThemeTokens: { theme, light, dark }
    previewColors: jsonb("preview_colors").notNull(), // [primary, secondary, accent]
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("design_systems_by_user_id").on(t.userId)]
);

// API keys for the MCP server — let external agents authenticate as a Clerk user
// without a browser session. The plaintext key (prefix "oc_…") is shown ONCE at
// creation and never stored; we keep only its sha256 so a presented token can be
// hashed and matched. Additive table — nothing else references it.
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(), // Clerk user ID this key acts as
    name: text("name").notNull(), // user-facing label
    hashedKey: text("hashed_key").notNull(), // sha256(plaintext)
    prefix: text("prefix").notNull(), // first chars, shown in listings (e.g. "oc_AbC1")
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("api_keys_hashed_key").on(t.hashedKey),
    index("api_keys_by_user_id").on(t.userId),
  ]
);

// Chat messages for screen threads.
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    screenId: uuid("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    // What the USER sees: the agent's full streamed narration (assistant msgs).
    content: text("content").notNull(),
    // Terse 1–3 sentence recap used ONLY when building history/context for the
    // agent (keeps token cost flat); null for user messages / legacy rows.
    summary: text("summary"),
    modelId: text("model_id"),
    imageIds: text("image_ids").array(), // S3 keys
    reasoningDetails: jsonb("reasoning_details"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("messages_by_screen_id").on(t.screenId)]
);

// Durable store for OpenRouter reasoning_details, keyed by tool_call_id.
export const reasoningTokens = pgTable(
  "reasoning_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toolCallId: text("tool_call_id").notNull(),
    details: jsonb("details"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("reasoning_tokens_by_tool_call_id").on(t.toolCallId),
    index("reasoning_tokens_by_created_at").on(t.createdAt),
  ]
);
