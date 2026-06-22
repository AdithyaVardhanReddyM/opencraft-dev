const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guard before querying a uuid column so malformed ids don't 500. */
export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}
