import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { projects, projectMembers } from "../schema";
import { ApiError } from "../../server/errors";
import { isUuid } from "../../server/uuid";
import type { ProjectRole } from "../../server/realtime-token";

/** Numeric rank for role comparisons (higher = more privileged). */
export const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  createdAt: number;
}

/**
 * Effective role of `userId` on `projectId`, or null if no access.
 * The project's `userId` column is always treated as `owner`, whether or not a
 * matching project_members row exists.
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  if (!isUuid(projectId)) return null;
  const [project] = await db
    .select({ ownerId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;
  if (project.ownerId === userId) return "owner";

  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);
  return member?.role ?? null;
}

/** All members of a project (excludes the implicit owner unless a row exists). */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  if (!isUuid(projectId)) return [];
  const rows = await db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
    })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  return rows as ProjectMember[];
}

/** Add or update a member's role (idempotent on (projectId, userId)). */
export async function addMember(
  projectId: string,
  userId: string,
  role: Exclude<ProjectRole, "owner">
): Promise<void> {
  if (!isUuid(projectId)) throw new ApiError(404, "Project not found");
  await db
    .insert(projectMembers)
    .values({ projectId, userId, role, createdAt: Date.now() })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role },
    });
}

export async function removeMember(
  projectId: string,
  userId: string
): Promise<void> {
  if (!isUuid(projectId)) return;
  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    );
}
