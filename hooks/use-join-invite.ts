"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { mutate } from "swr";
import { joinProject } from "@/lib/api/collab";
import * as keys from "@/lib/api/keys";

/**
 * If the canvas URL carries a share-link token (?invite=…), redeem it so the
 * signed-in user becomes a project member, then strip the param and revalidate
 * the canvas/screens caches (their access just changed). Idempotent + once-only.
 */
export function useJoinInvite(projectId: string) {
  const { isSignedIn } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (!isSignedIn || handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;
    handled.current = true;

    joinProject(projectId, token)
      .then(() => {
        mutate(keys.canvasKey(projectId));
        mutate(keys.screensKey(projectId));
        // Strip the token only after a successful join, so a failed attempt can
        // be retried by refreshing rather than being silently lost.
        params.delete("invite");
        const qs = params.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (qs ? `?${qs}` : "")
        );
      })
      .catch(() => {
        // Allow a later mount/refresh to retry.
        handled.current = false;
      });
  }, [isSignedIn, projectId]);
}
