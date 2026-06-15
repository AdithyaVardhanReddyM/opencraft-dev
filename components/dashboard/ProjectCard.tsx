"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Calendar, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/date-utils";
import { Project } from "@/types/project";
import { DeleteProjectDialog } from "@/components/dashboard/DeleteProjectDialog";
import { Id } from "@/convex/_generated/dataModel";

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
  const [isNavigating, setIsNavigating] = useState(false);

  const handleCardClick = () => {
    setIsNavigating(true);
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
        className={`group relative flex flex-col rounded-2xl border border-border/60 bg-white p-2.5 shadow-sm cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 ${
          isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
        onClick={handleCardClick}
      >
        {/* Inner thumbnail panel — no border */}
        <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-gradient-to-br from-[#0072E5]/[0.05] via-white to-[#75D8FC]/[0.10]">
          {project.thumbnail ? (
            <Image
              src={project.thumbnail}
              alt={project.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <>
              {/* Blueprint grid */}
              <div
                className="absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,114,229,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,114,229,0.07) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              {/* Soft glow */}
              <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl transition-all duration-500 group-hover:scale-125 group-hover:bg-primary/15" />
              {/* Logo */}
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <Image
                  src="/opencraft_logo.svg"
                  alt="OpenCraft"
                  width={76}
                  height={76}
                  className="object-contain opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                />
              </div>
            </>
          )}

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2.5 top-2.5 z-20 size-8 bg-white/80 backdrop-blur-sm border border-border/60 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
            onClick={handleDeleteClick}
            aria-label="Delete project"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {/* Footer — no separator */}
        <div className="px-1.5 pb-1 pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                {project.name}
              </h2>
              {isNewProject && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                  New
                </span>
              )}
            </div>
            {isNavigating && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-primary">
                <Loader2 className="size-3.5 animate-spin" />
                Redirecting
              </span>
            )}
          </div>

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
