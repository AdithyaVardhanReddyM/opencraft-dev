/**
 * Convert a Drizzle row to the Convex-style document shape the frontend expects:
 * rename the `id` primary key to `_id`, and drop `null` columns so optional
 * fields are *absent* (matching Convex's `v.optional` semantics, where an unset
 * field is undefined rather than null). Frontend truthy checks like
 * `screen.sandboxUrl` / `project.viewportData || {...}` then behave identically.
 */
export function toDoc<T extends { id: string }>(
  row: T
): { _id: string } & Omit<T, "id"> {
  const { id, ...rest } = row;
  const out: Record<string, unknown> = { _id: id };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out as { _id: string } & Omit<T, "id">;
}

export function toDocs<T extends { id: string }>(rows: T[]) {
  return rows.map(toDoc);
}
