/**
 * Join an E2B sandbox base URL with a route path.
 *
 * Flow-child screens share their parent's sandbox (one host) but display a
 * different route of the same app. The base URL stored in Convex / returned by the
 * resume endpoint never includes a path, so the displayed URL is reconstructed by
 * appending the child's route. Roots (no route, or "/") just use the base.
 */
export function joinSandboxUrl(
  base: string | undefined | null,
  route?: string | null
): string | undefined {
  if (!base) return undefined;
  const trimmed = base.replace(/\/+$/, "");
  if (!route || route === "/") return trimmed;
  const path = route.startsWith("/") ? route : `/${route}`;
  return `${trimmed}${path}`;
}
