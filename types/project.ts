import type { ProjectDoc } from "@/lib/db/types";

// Serialized project document (Aurora/Drizzle).
export type Project = ProjectDoc;

// Project id (uuid string).
export type ProjectId = string;

// Sort options for project filtering
export type ProjectSortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "modified";

// Input interface for creating a new project
export interface CreateProjectInput {
  name: string;
  description?: string;
}

// Filter state interface
export interface ProjectFilters {
  sortBy: ProjectSortOption;
}
