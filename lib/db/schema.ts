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
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("screens_by_shape_id").on(t.shapeId),
    index("screens_by_project_id").on(t.projectId),
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
    content: text("content").notNull(),
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
