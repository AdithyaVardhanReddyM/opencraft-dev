"use client";
import useSWR, { type SWRConfiguration } from "swr";
import { jsonFetcher, postJson } from "./fetcher";
import * as keys from "./keys";
import type {
  ProjectDoc,
  ScreenDoc,
  MessageDoc,
  CanvasStateData,
  GenerationStats,
} from "@/lib/db/types";

/**
 * SWR read hooks replacing Convex `useQuery`. Like Convex, `data` is `undefined`
 * while loading; pass a falsy id (or `enabled: false`) to skip, matching the old
 * `"skip"` argument. Mutations elsewhere call `mutate(key)` to revalidate.
 */

export function useProjects(enabled = true) {
  return useSWR<ProjectDoc[]>(
    enabled ? keys.projectsKey : null,
    jsonFetcher
  );
}

export function useCanvasState(projectId?: string) {
  return useSWR<CanvasStateData | null>(
    projectId ? keys.canvasKey(projectId) : null,
    jsonFetcher
  );
}

export function useScreens(
  projectId?: string,
  config?: SWRConfiguration
) {
  return useSWR<ScreenDoc[]>(
    projectId ? keys.screensKey(projectId) : null,
    jsonFetcher,
    config
  );
}

export function useMessages(
  screenId?: string,
  config?: SWRConfiguration
) {
  return useSWR<MessageDoc[]>(
    screenId ? keys.messagesKey(screenId) : null,
    jsonFetcher,
    config
  );
}

export function useGenerationStats() {
  return useSWR<GenerationStats | null>(keys.statsKey, jsonFetcher);
}

export interface UserMetadata {
  generationsUsed: number;
  generationsLimit: number;
  createdAt: number;
  updatedAt: number;
}

export function useUserMetadata() {
  return useSWR<UserMetadata | null>(keys.metadataKey, jsonFetcher);
}

/** Resolve S3 keys -> presigned GET URLs (replaces Convex getImageUrls). */
export function useImageUrls(imageKeys?: string[]) {
  const enabled = !!imageKeys && imageKeys.length > 0;
  return useSWR<Record<string, string | null>>(
    enabled ? ["image-urls", ...imageKeys!] : null,
    () => postJson("/api/uploads/urls", { keys: imageKeys })
  );
}
