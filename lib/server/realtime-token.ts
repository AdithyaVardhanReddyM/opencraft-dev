import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived HMAC tokens for the realtime layer. Two uses:
 *
 *  - Realtime channel token: minted after a Clerk + membership check, handed to
 *    the browser, and verified by the AppSync Lambda authorizer
 *    (infra/lambda/authorizer) to authorize a single project's channel.
 *  - Invite token: embedded in a share link; verified server-side by the join
 *    route to add the current user as a member.
 *
 * Format (compact, JWT-like, no deps): base64url(payload).base64url(sig), where
 * sig = HMAC_SHA256(base64url(payload), SECRET).
 *
 * KEEP verifyToken() IN SYNC with infra/lambda/authorizer/index.mjs.
 */

const SECRET = process.env.APPSYNC_REALTIME_SHARED_SECRET || "";

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function requireSecret(): string {
  if (!SECRET) {
    throw new Error("APPSYNC_REALTIME_SHARED_SECRET is not configured");
  }
  return SECRET;
}

function sign(payload: Record<string, unknown>): string {
  const secret = requireSecret();
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(payloadB64).digest());
  return `${payloadB64}.${sig}`;
}

function verify<T = Record<string, unknown>>(token: string): T | null {
  if (!SECRET || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = createHmac("sha256", SECRET).update(payloadB64).digest();
  const got = b64urlToBuf(sigB64);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
    return null;
  }
  let payload: { exp?: number };
  try {
    payload = JSON.parse(b64urlToBuf(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number") return null;
  if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
  return payload as T;
}

export type ProjectRole = "viewer" | "editor" | "owner";

/** Realtime channel token: authorizes one project's AppSync Events channel. */
export function signRealtimeToken(args: {
  userId: string;
  projectId: string;
  role: ProjectRole;
  ttlSeconds?: number;
}): { token: string; expiresAt: number } {
  const exp = Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? 3600); // 1h
  return {
    token: sign({ uid: args.userId, pid: args.projectId, role: args.role, exp }),
    expiresAt: exp,
  };
}

/** Invite token embedded in a share link. */
export function signInviteToken(args: {
  projectId: string;
  role: Exclude<ProjectRole, "owner">;
  ttlSeconds?: number;
}): string {
  const exp = Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? 7 * 86400); // 7d
  return sign({ pid: args.projectId, role: args.role, exp, k: "invite" });
}

export function verifyInviteToken(
  token: string
): { projectId: string; role: Exclude<ProjectRole, "owner"> } | null {
  const p = verify<{ pid?: string; role?: string; k?: string }>(token);
  if (!p || p.k !== "invite" || typeof p.pid !== "string") return null;
  const role = p.role === "viewer" ? "viewer" : "editor";
  return { projectId: p.pid, role };
}
