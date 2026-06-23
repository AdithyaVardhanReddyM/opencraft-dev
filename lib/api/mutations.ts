"use client";
import { mutate } from "swr";
import { postJson, putJson, patchJson, del } from "./fetcher";
import * as keys from "./keys";
import type { CanvasStateData } from "@/lib/db/types";

/**
 * Mutation functions replacing Convex `useMutation`. Each call revalidates the
 * relevant SWR key(s) so dependent hooks refetch — the request/response stand-in
 * for Convex's automatic live-query updates.
 */

// ---- Users ----------------------------------------------------------------

export function ensureUser() {
  return postJson(keys.usersEnsureKey);
}

export function refreshStats() {
  return mutate(keys.statsKey);
}

// ---- Projects -------------------------------------------------------------

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<string> {
  const res = await postJson<{ _id: string }>(keys.projectsKey, input);
  await mutate(keys.projectsKey);
  return res._id;
}

export async function deleteProject(input: { projectId: string }): Promise<void> {
  await del(`/api/projects/${input.projectId}`);
  await mutate(keys.projectsKey);
}

export function saveCanvasState(input: {
  projectId: string;
  canvasData: CanvasStateData;
}) {
  return putJson(keys.canvasKey(input.projectId), {
    canvasData: input.canvasData,
  });
}

// ---- Screens --------------------------------------------------------------

export async function createScreen(input: {
  shapeId: string;
  projectId: string;
}): Promise<string> {
  const res = await postJson<{ _id: string }>("/api/screens", input);
  await mutate(keys.screensKey(input.projectId));
  return res._id;
}

export async function createFlowScreen(input: {
  shapeId: string;
  projectId: string;
  parentScreenId: string;
}): Promise<string> {
  const res = await postJson<{ _id: string }>("/api/screens/flow", input);
  await mutate(keys.screensKey(input.projectId));
  return res._id;
}

export async function updateScreen(input: {
  screenId: string;
  projectId?: string;
  sandboxUrl?: string;
  files?: unknown;
  title?: string;
  theme?: string;
  route?: string;
}) {
  const { screenId, projectId, ...patch } = input;
  const res = await patchJson(`/api/screens/${screenId}`, patch);
  if (projectId) await mutate(keys.screensKey(projectId));
  return res;
}

export async function deleteScreen(input: {
  screenId: string;
  projectId?: string;
}) {
  const res = await del(`/api/screens/${input.screenId}`);
  if (input.projectId) await mutate(keys.screensKey(input.projectId));
  return res;
}

/** Revalidate the screens list (e.g. after a generation completes). */
export function refreshScreens(projectId: string) {
  return mutate(keys.screensKey(projectId));
}

/**
 * Revalidate one screen's lazily-loaded `files` blob. The screens list no longer
 * carries `files`, so call this after a build completes to refresh the Code tab's
 * content cache for the selected screen.
 */
export function refreshScreenFiles(screenId: string) {
  return mutate(keys.screenFilesKey(screenId));
}

// ---- Messages -------------------------------------------------------------

export async function createMessage(input: {
  screenId: string;
  role: "user" | "assistant";
  content: string;
  modelId?: string;
  imageIds?: string[];
}): Promise<string> {
  const res = await postJson<{ _id: string }>("/api/messages", input);
  await mutate(keys.messagesKey(input.screenId));
  return res._id;
}

export function refreshMessages(screenId: string) {
  return mutate(keys.messagesKey(screenId));
}

// ---- Uploads (S3) ---------------------------------------------------------

export function getUploadUrl(
  contentType: string
): Promise<{ key: string; uploadUrl: string }> {
  return postJson("/api/uploads", { contentType });
}

export function resolveImageUrls(
  imageKeys: string[]
): Promise<Record<string, string | null>> {
  return postJson("/api/uploads/urls", { keys: imageKeys });
}

/** Best-effort delete of S3 objects (e.g. when a canvas image is removed). */
export function deleteUploads(
  keys: string[]
): Promise<{ ok: boolean; deleted: number }> {
  return postJson("/api/uploads/delete", { keys });
}
