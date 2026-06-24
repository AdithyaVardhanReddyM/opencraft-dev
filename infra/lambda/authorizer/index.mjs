// @ts-nocheck
/**
 * AppSync Events Lambda authorizer for the canvas collaboration channels.
 *
 * Auth model: the Next.js app (which already verifies the Clerk session) mints a
 * short-lived HMAC token scoped to a single project after checking membership —
 * see lib/realtime/realtime-token.ts. This function only has to (1) verify that
 * token's signature + expiry and (2) confirm the requested channel matches the
 * project the token was minted for. Clerk verification stays server-side.
 *
 * Token format (compact, JWT-like, no deps): base64url(payload).base64url(sig)
 * where sig = HMAC_SHA256(base64url(payload), SECRET). Payload = { uid, pid, role, exp }.
 * KEEP THIS IN SYNC with signRealtimeToken() in the Next.js app.
 *
 * Channel convention: /{namespace}/{projectId}  e.g. /canvas/3f2a...-uuid
 *
 * AppSync invokes this for EVENT_CONNECT, EVENT_SUBSCRIBE and EVENT_PUBLISH. On
 * EVENT_CONNECT the channel is null (only the token is checked); on subscribe /
 * publish we additionally enforce the channel ↔ token project match.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.APPSYNC_REALTIME_SHARED_SECRET || "";

function b64urlToBuf(s) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Verify + decode the minted token. Returns the payload, or null if invalid. */
function verifyToken(token) {
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

  let payload;
  try {
    payload = JSON.parse(b64urlToBuf(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number") return null;
  if (Math.floor(Date.now() / 1000) >= payload.exp) return null; // expired
  if (typeof payload.pid !== "string" || typeof payload.uid !== "string") {
    return null;
  }
  return payload;
}

export const handler = async (event) => {
  const token = event?.authorizationToken;
  const ctx = event?.requestContext ?? {};
  const operation = ctx.operation;

  const payload = verifyToken(token);
  if (!payload) return { isAuthorized: false };

  // EVENT_CONNECT: channel is NULL — a valid token is sufficient to connect.
  if (operation === "EVENT_CONNECT") {
    return {
      isAuthorized: true,
      // Surfaced to handlers as $ctx.identity.handlerContext if ever needed.
      handlerContext: { userId: payload.uid, projectId: payload.pid, role: payload.role },
      // Re-auth roughly on the token cadence so a revoked/expired token can't
      // ride a long-lived cache. Capped so it never exceeds remaining lifetime.
      ttlOverride: Math.max(0, Math.min(300, payload.exp - Math.floor(Date.now() / 1000))),
    };
  }

  // EVENT_SUBSCRIBE / EVENT_PUBLISH: channel must belong to the token's project.
  // channel looks like "/{namespace}/{projectId}".
  const channel = typeof ctx.channel === "string" ? ctx.channel : "";
  const lastSegment = channel.replace(/\/+$/, "").split("/").pop();
  const authorized = lastSegment === payload.pid;

  return {
    isAuthorized: authorized,
    ...(authorized
      ? { handlerContext: { userId: payload.uid, projectId: payload.pid, role: payload.role } }
      : {}),
  };
};
