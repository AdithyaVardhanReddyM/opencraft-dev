"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Sparkles, Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/date-utils";
import { getGradientColors } from "@/lib/gradient-utils";
import { Project } from "@/types/project";
import { DeleteProjectDialog } from "@/components/dashboard/DeleteProjectDialog";
import { Id } from "@/convex/_generated/dataModel";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

interface ProjectCardProps {
  project: Project;
  isDeleting?: boolean;
  onOptimisticDelete?: (projectId: Id<"projects">) => void;
}

export function ProjectCard({
  project,
  isDeleting = false,
  onOptimisticDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get gradient colors based on project number
  const gradientColors = useMemo(() => {
    return getGradientColors(project.projectNumber);
  }, [project.projectNumber]);

  const handleCardClick = () => {
    router.push(`/dashboard/${project._id}/canvas`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const isNewProject = project.lastModified === project.createdAt;

  return (
    <>
      <div
        className={`relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-accent cursor-pointer transition-all duration-300 group ${
          isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"
        } ${
          isHovered ? "border-primary shadow-xl shadow-primary/10" : "shadow-sm"
        }`}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-3 right-3 z-20 size-8 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleDeleteClick}
          aria-label="Delete project"
        >
          <Trash2 className="size-3.5" />
        </Button>

        {/* New Badge */}
        {isNewProject && (
          <div className="absolute top-3 left-3 z-20">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20">
              <Sparkles className="size-2.5" />
              New
            </span>
          </div>
        )}

        {/* Thumbnail Area with Dotted Glow */}
        <div className="relative aspect-16/10 overflow-hidden bg-muted/50">
          {project.thumbnail ? (
            <Image
              src={project.thumbnail}
              alt={project.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <>
              {/* Dotted Glow Background with Gradient Colors */}
              <DottedGlowBackground
                className="pointer-events-none"
                opacity={isHovered ? 0.95 : 0.65}
                gap={12}
                radius={1.5}
                color="rgba(120, 120, 120, 0.4)"
                darkColor="rgba(160, 160, 160, 0.3)"
                backgroundOpacity={0}
                speedMin={0.2}
                speedMax={isHovered ? 2 : 0.9}
                speedScale={isHovered ? 1.4 : 0.7}
                useGradient
                gradientColors={gradientColors}
              />

              {/* Logo overlay */}
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="relative">
                  <Image
                    src="/unitset_logo.svg"
                    alt="Unit Set"
                    width={56}
                    height={56}
                    className={`object-contain transition-all duration-300 ${
                      isHovered ? "scale-110 opacity-100" : "opacity-50"
                    }`}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Project Details - Compact Footer */}
        <div className="relative z-10 px-4 py-3">
          {/* Title */}
          <h2 className="font-semibold text-base leading-tight line-clamp-1 text-primary mb-2">
            {project.name}
          </h2>

          {/* Timestamps Row - Spread to corners */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              <span>{formatRelativeTime(project.createdAt)}</span>
            </div>
            {!isNewProject && (
              <div className="flex items-center gap-1.5">
                <Pencil className="size-3" />
                <span>{formatRelativeTime(project.lastModified)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onOptimisticDelete={onOptimisticDelete}
      />
    </>
  );
}
