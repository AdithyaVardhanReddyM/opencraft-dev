import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(),
    description: v.optional(v.string()),
    styleGuide: v.optional(v.string()),
    sketchesData: v.any(), // JSON structure for EntityState<Shape>
    viewportData: v.optional(v.any()), // JSON structure for viewport state (scale, translate)
    canvasVersion: v.optional(v.string()), // Schema version for migrations
    generatedDesignData: v.optional(v.any()), // JSON structure for generated UI components
    thumbnail: v.optional(v.string()), // Base64 or URL for project thumbnail
    moodBoardImages: v.optional(v.array(v.string())), // Array of storage IDs for mood board images
    inspirationImages: v.optional(v.array(v.string())), // Array of storage IDs for inspiration images (max 6)
    lastModified: v.number(), // Timestamp for last modification
    createdAt: v.number(), // Project creation timestamp
    isPublic: v.optional(v.boolean()), // For future sharing features
    tags: v.optional(v.array(v.string())), // For future categorization
    projectNumber: v.number(), // Auto-incrementing project number per user
    // Canvas autosave fields
    frameCounter: v.optional(v.number()), // Frame counter for auto-incrementing frame numbers
    selectedIds: v.optional(v.any()), // Selection state
    tool: v.optional(v.string()), // Current tool
  }).index("by_userId", ["userId"]),
});
