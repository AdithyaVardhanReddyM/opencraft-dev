"use client";

import { useState, useEffect } from "react";
import {
  DashboardHeader,
  type TabId,
} from "@/components/dashboard/DashboardHeader";
import { ProjectsGrid } from "@/components/dashboard/ProjectsGrid";
import { SharedEmptyState } from "@/components/dashboard/SharedEmptyState";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { ProjectSortOption } from "@/types/project";

const SORT_PREFERENCE_KEY = "dashboard-sort-preference";

export default function DashboardPage() {
  // Always initialize with default to avoid hydration mismatch
  const [sortBy, setSortBy] = useState<ProjectSortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("your-projects");

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
    <div className="h-screen overflow-y-auto bg-accent scrollbar-thin">
      <DashboardHeader
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === "your-projects" ? (
          <ProjectsGrid
            sortOption={sortBy}
            searchQuery={searchQuery}
            onCreateProject={handleCreateClick}
          />
        ) : (
          <SharedEmptyState />
        )}
      </main>
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
