import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  projects,
  screens,
  images,
  messages,
  reasoningTokens,
  designSystems,
} from "./schema";
import type { ThemeTokens } from "@/lib/canvas/theme-tokens";

/**
 * Serialized document types — the shape returned by the API and consumed by the
 * frontend (`id` renamed to `_id`). These replace the old generated Doc types.
 *
 * `toDoc` drops `null` columns at runtime (Convex `v.optional` semantics), so
 * nullable columns are modeled as optional `?: T` here (never `T | null`),
 * matching what the frontend actually receives.
 */
type NullToOptional<T> = {
  [K in keyof T as null extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as null extends T[K] ? K : never]?: Exclude<T[K], null>;
};

type AsDoc<T extends { id: string }> = { _id: string } & NullToOptional<
  Omit<T, "id">
>;

export type UserDoc = AsDoc<InferSelectModel<typeof users>>;
export type ProjectDoc = AsDoc<InferSelectModel<typeof projects>>;
export type ScreenDoc = AsDoc<InferSelectModel<typeof screens>>;
export type ImageDoc = AsDoc<InferSelectModel<typeof images>>;
export type MessageDoc = AsDoc<InferSelectModel<typeof messages>>;
export type ReasoningTokenDoc = AsDoc<InferSelectModel<typeof reasoningTokens>>;

/**
 * Custom (user-created) design system. The `tokens`/`previewColors` jsonb columns
 * infer as `unknown`; override them with the concrete shapes the API guarantees.
 */
export type DesignSystemDoc = Omit<
  AsDoc<InferSelectModel<typeof designSystems>>,
  "tokens" | "previewColors"
> & {
  tokens: ThemeTokens;
  previewColors: [string, string, string];
};

/** Canvas state payload (matches the former `getCanvasState` return shape). */
export interface CanvasViewport {
  scale: number;
  translate: { x: number; y: number };
}

export interface CanvasStateData {
  viewport: CanvasViewport;
  shapes: unknown;
  tool: string;
  selected: unknown;
  frameCounter: number;
  version: string;
  lastModified: number;
}

export interface GenerationStats {
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
}
