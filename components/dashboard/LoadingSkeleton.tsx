"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* New Project Card Skeleton */}
      <Card className="overflow-hidden py-0 border-2 border-dashed border-border">
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] p-6">
          <Skeleton className="size-16 rounded-full mb-4" />
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>

      {/* Project Card Skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="overflow-hidden py-0">
          <CardContent className="p-0">
            {/* Thumbnail skeleton with 16:9 aspect ratio */}
            <Skeleton className="w-full aspect-video rounded-b-none" />

            {/* Content skeleton */}
            <div className="px-4 pt-3 pb-4">
              {/* Title */}
              <Skeleton className="h-5 w-3/4 mb-2" />

              {/* Description */}
              <div className="space-y-1.5 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>

              {/* Footer metadata */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
