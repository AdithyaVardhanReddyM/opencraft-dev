"use client";

import {
  Search,
  RotateCcw,
  Clock,
  Calendar,
  ArrowDownAZ,
  ArrowUpAZ,
  History,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProjectSortOption } from "@/types/project";

interface ProjectFiltersProps {
  sortBy: ProjectSortOption;
  onSortChange: (sort: ProjectSortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ProjectFilters({
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}: ProjectFiltersProps) {
  const hasFilters = searchQuery || sortBy !== "newest";

  const handleReset = () => {
    onSearchChange("");
    onSortChange("newest");
  };

  const sortOptions: {
    value: ProjectSortOption;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "newest",
      label: "Newest Created",
      icon: <Clock className="size-4" />,
    },
    {
      value: "oldest",
      label: "Oldest Created",
      icon: <Calendar className="size-4" />,
    },
    {
      value: "modified",
      label: "Last Modified",
      icon: <History className="size-4" />,
    },
    {
      value: "name-asc",
      label: "Name (A-Z)",
      icon: <ArrowDownAZ className="size-4" />,
    },
    {
      value: "name-desc",
      label: "Name (Z-A)",
      icon: <ArrowUpAZ className="size-4" />,
    },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="group relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 rounded-lg border border-border/60 bg-white pl-9 shadow-sm transition-all duration-200 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-white/70 p-1 shadow-sm backdrop-blur-sm">
        <TooltipProvider delayDuration={0}>
          {sortOptions.map((option) => (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={sortBy === option.value ? "secondary" : "ghost"}
                  size="icon"
                  className={`size-8 transition-all duration-200 ${
                    sortBy === option.value
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-white hover:text-foreground"
                  }`}
                  onClick={() => onSortChange(option.value)}
                >
                  {option.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{option.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {hasFilters && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleReset}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset filters</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );
}
