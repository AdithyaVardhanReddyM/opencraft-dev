/** Shared fetch helpers for the client data layer. Throw on non-2xx. */

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** GET + parse JSON. Used as the SWR fetcher. */
export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

async function send<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export const postJson = <T = unknown>(url: string, body?: unknown) =>
  send<T>("POST", url, body ?? {});
export const putJson = <T = unknown>(url: string, body?: unknown) =>
  send<T>("PUT", url, body ?? {});
export const patchJson = <T = unknown>(url: string, body?: unknown) =>
  send<T>("PATCH", url, body ?? {});
export const del = <T = unknown>(url: string) => send<T>("DELETE", url);
