"use client";

import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ProjectFilters } from "@/components/dashboard/ProjectFilters";
import { ProjectSortOption } from "@/types/project";

type TabId = "your-projects" | "shared-with-you";

interface DashboardHeaderProps {
  sortBy: ProjectSortOption;
  onSortChange: (sort: ProjectSortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS = [
  { id: "your-projects", label: "Your Projects" },
  { id: "shared-with-you", label: "Shared with You" },
] as const;

export type { TabId };

export function DashboardHeader({
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
}: DashboardHeaderProps) {
  const isYourProjects = activeTab === "your-projects";

  return (
    <>
      {/* ── Sticky App Bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between gap-4 border-b border-border/60">
            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              <Image
                src="/opencraft_full_logo.svg"
                alt="OpenCraft"
                width={140}
                height={36}
                className="h-8 w-auto"
                priority
              />
            </Link>

            {/* Center Tabs */}
            <nav className="absolute left-1/2 hidden -translate-x-1/2 sm:block">
              <div className="flex h-10 items-center gap-1 rounded-full border border-border/70 bg-muted/40 p-1 shadow-sm">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className="relative z-10 rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200"
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="dashboard-active-tab"
                        className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm ring-1 ring-primary/20"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span
                      className={
                        activeTab === tab.id
                          ? "text-primary"
                          : "text-muted-foreground transition-colors hover:text-foreground"
                      }
                    >
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </nav>

            {/* User */}
            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "ring-2 ring-primary/30 hover:ring-primary transition-all",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Contained Hero / Toolbar Panel ───────────────────────── */}
      <div className="container mx-auto px-4 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-[#0072E5]/[0.10] via-white to-[#75D8FC]/[0.16] p-6 sm:p-7">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isYourProjects ? "Projects" : "Shared with You"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isYourProjects
                ? "Manage your ongoing work, track progress, and collaborate."
                : "Projects your teammates have shared with you."}
            </p>
          </motion.div>

          {/* Toolbar */}
          {isYourProjects && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
              className="mt-6"
            >
              <ProjectFilters
                sortBy={sortBy}
                onSortChange={onSortChange}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
              />
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
