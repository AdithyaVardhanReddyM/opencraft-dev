/**
 * Centralized SWR cache keys (the API URLs). Shared by hooks (to read) and
 * mutations (to revalidate via `mutate(key)`), so they never drift apart.
 */
export const projectsKey = "/api/projects";
export const designSystemsKey = "/api/design-systems";
export const statsKey = "/api/users/stats";
export const metadataKey = "/api/users/metadata";
export const usersEnsureKey = "/api/users/ensure";

export const canvasKey = (projectId: string) =>
  `/api/projects/${projectId}/canvas`;

export const screensKey = (projectId: string) =>
  `/api/screens?projectId=${projectId}`;

export const screenByShapeKey = (shapeId: string) =>
  `/api/screens?shapeId=${shapeId}`;

export const messagesKey = (screenId: string) =>
  `/api/messages?screenId=${screenId}`;

export const screenFilesKey = (screenId: string) =>
  `/api/screens/${screenId}/files`;
