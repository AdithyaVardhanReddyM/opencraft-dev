"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";

/**
 * Top-left logo that doubles as the project menu — replaces the old back button.
 * Offers "Back to dashboard" and "Create new project" (the latter opens the
 * shared create dialog and routes straight into the new project's canvas).
 */
export function CanvasMenu() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Project menu"
            className="h-10 gap-1.5 px-1 text-muted-foreground hover:bg-transparent hover:text-foreground transition-colors duration-200"
          >
            <Image
              src="/opencraft_logo.svg"
              alt="OpenCraft"
              width={22}
              height={22}
              className="size-[22px]"
            />
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-56">
          <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Back to dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create new project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(projectId) =>
          router.push(`/dashboard/${projectId}/canvas`)
        }
      />
    </>
  );
}
