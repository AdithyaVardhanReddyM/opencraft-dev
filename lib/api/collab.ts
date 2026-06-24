"use client";
import { postJson, del } from "./fetcher";

/**
 * Client helpers for the collaboration endpoints (membership + realtime auth).
 * Kept separate from mutations.ts since these don't participate in the SWR
 * project/screen caches.
 */

export type ProjectRole = "viewer" | "editor" | "owner";

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  createdAt: number;
}

export interface RealtimeAuth {
  token: string;
  expiresAt: number; // unix seconds
  role: ProjectRole;
  channel: string;
  realtimeUrl: string;
  httpDns: string;
}

/** Error carrying the HTTP status, so callers can distinguish 503 (not
 *  configured → give up) from 404/403 (access still propagating → retry). */
export class RealtimeTokenError extends Error {
  constructor(public status: number) {
    super(`realtime-token ${status}`);
    this.name = "RealtimeTokenError";
  }
}

/** Mint a realtime channel token (also returns endpoint config). */
export function getRealtimeToken(projectId: string): Promise<RealtimeAuth> {
  // jsonFetcher-style GET, but typed; reuse fetch directly to keep it simple.
  return fetch(`/api/projects/${projectId}/realtime-token`).then(async (r) => {
    if (!r.ok) throw new RealtimeTokenError(r.status);
    return r.json() as Promise<RealtimeAuth>;
  });
}

export function listProjectMembers(
  projectId: string
): Promise<{ members: ProjectMember[]; role: ProjectRole }> {
  return fetch(`/api/projects/${projectId}/members`).then(async (r) => {
    if (!r.ok) throw new Error(`members ${r.status}`);
    return r.json();
  });
}

export function createInviteLink(
  projectId: string,
  role: Exclude<ProjectRole, "owner"> = "editor"
): Promise<{ url: string; token: string; role: ProjectRole }> {
  return postJson(`/api/projects/${projectId}/members`, { role });
}

export function removeProjectMember(
  projectId: string,
  userId: string
): Promise<{ success: boolean }> {
  return del(`/api/projects/${projectId}/members?userId=${encodeURIComponent(userId)}`);
}

export function joinProject(
  projectId: string,
  token: string
): Promise<{ success: boolean; role: ProjectRole }> {
  return postJson(`/api/projects/${projectId}/join`, { token });
}
