"use client";

import { Users } from "lucide-react";

export function SharedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 border-2 border-dashed rounded">
      <div className="flex flex-col items-center text-center max-w-lg space-y-6">
        {/* Icon with gradient background */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative rounded-full bg-card border-2 border-primary/20 p-4">
            <Users className="size-10 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">No shared projects</h2>
          <p className="text-muted-foreground text-sm">
            Projects shared with you by collaborators will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
