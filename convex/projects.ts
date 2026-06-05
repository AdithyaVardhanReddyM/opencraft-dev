import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Query to get all projects for the authenticated user
 * Returns projects ordered by creation date (newest first)
 */
export const getAllProjects = query({
  args: {},
  handler: async (ctx) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Query projects filtered by userId, ordered by creation date descending
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return projects;
  },
});

/**
 * Mutation to create a new project
 * Calculates project number based on existing project count
 */
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate project name length (1-100 characters)
    if (args.name.length < 1 || args.name.length > 100) {
      throw new Error("Project name must be between 1 and 100 characters");
    }

    // Get existing projects count to calculate next project number
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    const projectNumber = existingProjects.length + 1;

    // Insert new project with required fields
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      userId: identity.subject,
      name: args.name,
      description: args.description,
      sketchesData: { shapes: [], selectedIds: [] },
      createdAt: now,
      lastModified: now,
      projectNumber,
    });

    return projectId;
  },
});

/**
 * Mutation to delete a project
 * Verifies ownership before deletion
 */
export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify project exists and user owns the project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== identity.subject) {
      throw new Error("Not authorized to delete this project");
    }

    // Delete the project from database
    await ctx.db.delete(args.projectId);
  },
});

/**
 * Mutation to save canvas state (autosave)
 * Validates authentication and ownership before updating
 */
export const saveCanvasState = mutation({
  args: {
    projectId: v.id("projects"),
    canvasData: v.object({
      viewport: v.object({
        scale: v.number(),
        translate: v.object({ x: v.number(), y: v.number() }),
      }),
      shapes: v.any(), // EntityState<Shape>
      tool: v.string(),
      selected: v.any(), // SelectionMap
      frameCounter: v.number(),
      version: v.string(),
      lastModified: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify project exists and user owns the project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.userId !== identity.subject) {
      throw new Error("Not authorized to update this project");
    }

    // Update canvas state
    await ctx.db.patch(args.projectId, {
      sketchesData: args.canvasData.shapes,
      viewportData: args.canvasData.viewport,
      selectedIds: args.canvasData.selected,
      tool: args.canvasData.tool,
      frameCounter: args.canvasData.frameCounter,
      canvasVersion: args.canvasData.version,
      lastModified: args.canvasData.lastModified,
    });

    return { success: true };
  },
});

/**
 * Query to get canvas state for a project
 * Returns canvas data with viewport, shapes, and metadata
 * Returns null if not authenticated (allows graceful handling during auth loading)
 */
export const getCanvasState = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Check authentication - return null if not authenticated
    // This allows the client to handle auth loading gracefully
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }
    if (project.userId !== identity.subject) {
      return null;
    }

    // Return canvas state if it exists
    if (!project.sketchesData) {
      return null;
    }

    return {
      viewport: project.viewportData || { scale: 1, translate: { x: 0, y: 0 } },
      shapes: project.sketchesData,
      tool: project.tool || "select",
      selected: project.selectedIds || {},
      frameCounter: project.frameCounter || 0,
      version: project.canvasVersion || "1.0.0",
      lastModified: project.lastModified,
    };
  },
});
