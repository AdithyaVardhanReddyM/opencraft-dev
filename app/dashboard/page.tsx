"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProjectsGrid } from "@/components/dashboard/ProjectsGrid";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { ProjectSortOption } from "@/types/project";

const SORT_PREFERENCE_KEY = "dashboard-sort-preference";

export default function DashboardPage() {
  // Always initialize with default to avoid hydration mismatch
  const [sortBy, setSortBy] = useState<ProjectSortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Load sort preference from sessionStorage after hydration
  useEffect(() => {
    const stored = sessionStorage.getItem(SORT_PREFERENCE_KEY);
    if (stored) {
      setSortBy(stored as ProjectSortOption);
    }
  }, []);

  // Persist sort preference to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(SORT_PREFERENCE_KEY, sortBy);
  }, [sortBy]);

  const handleCreateClick = () => {
    setCreateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-accent">
      <DashboardHeader
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <ProjectsGrid
          sortOption={sortBy}
          searchQuery={searchQuery}
          onCreateProject={handleCreateClick}
        />
      </main>
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
