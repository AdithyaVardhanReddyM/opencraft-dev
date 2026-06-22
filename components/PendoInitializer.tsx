"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserMetadata } from "@/lib/api/hooks";

export function PendoInitializer() {
  const { user, isSignedIn } = useUser();
  const { data: userData } = useUserMetadata();
  const initializedRef = useRef(false);

  // Initialize Pendo once with anonymous visitor
  useEffect(() => {
    if (!initializedRef.current) {
      pendo.initialize({ visitor: { id: "" } });
      initializedRef.current = true;
    }
  }, []);

  // Identify user when signed in
  useEffect(() => {
    if (!isSignedIn || !user) return;

    pendo.identify({
      visitor: {
        id: user.id,
        clerkId: user.id,
        ...(userData && {
          generationsUsed: userData.generationsUsed,
          generationsLimit: userData.generationsLimit,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        }),
      },
    });
  }, [isSignedIn, user, userData]);

  return null;
}
