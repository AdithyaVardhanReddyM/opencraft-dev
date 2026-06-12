"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* New Project Card Skeleton */}
      <div className="overflow-hidden rounded-xl border-2 border-dashed border-border">
        <div className="aspect-16/10 bg-muted/30 flex items-center justify-center">
          <Skeleton className="size-16 rounded-full" />
        </div>
        <div className="px-4 py-3">
          <Skeleton className="h-5 w-28 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Project Card Skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border/50 bg-card"
        >
          {/* Thumbnail skeleton */}
          <Skeleton className="w-full aspect-16/10 rounded-none" />

          {/* Footer skeleton */}
          <div className="px-4 py-3">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
