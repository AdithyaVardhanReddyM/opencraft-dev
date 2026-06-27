import "server-only";
import { encryptSecret, decryptSecret } from "../server/crypto";

/**
 * Shared bits for the two-leg OAuth redirect flow (start → provider → callback).
 *
 * The transient state lives in ONE encrypted, httpOnly cookie rather than a DB
 * table. Crucially it carries `userId`, captured at `start` where the same-origin
 * session is guaranteed — so the `callback` (reached via a cross-site redirect
 * from the provider) never has to depend on the Clerk session cookie surviving
 * that hop. The cookie is AES-GCM, so its contents can't be read or forged.
 */

export interface FlowState {
  userId: string;
  provider: string;
  state: string; // anti-CSRF, matched against the `state` query param
  codeVerifier: string; // PKCE
  clientId: string;
  clientSecret: string | null;
}

export function cookieName(provider: string): string {
  return `oc_oauth_${provider}`;
}

export function encodeFlowState(s: FlowState): string {
  return encryptSecret(JSON.stringify(s));
}

export function decodeFlowState(raw: string): FlowState | null {
  try {
    return JSON.parse(decryptSecret(raw)) as FlowState;
  } catch {
    return null;
  }
}

export function appUrlFrom(reqUrl: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(reqUrl).origin).replace(
    /\/$/,
    ""
  );
}

/** Must be byte-identical between the authorize request and the token exchange. */
export function redirectUriFor(reqUrl: string, provider: string): string {
  return `${appUrlFrom(reqUrl)}/api/connections/${provider}/callback`;
}

/**
 * A self-closing popup page that notifies the opener (the modal) and closes.
 * Carries NO secrets — only the provider id and a status — so postMessage to the
 * app origin is safe.
 */
export function popupResultHtml(opts: {
  origin: string;
  provider: string;
  status: "connected" | "error";
  message: string;
}): string {
  const { origin, provider, status, message } = opts;
  const safeMsg = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>OpenCraft</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#0b0b0c;color:#e7e7ea;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<div style="text-align:center;max-width:420px;padding:24px">
  <div style="font-size:15px;line-height:1.5">${safeMsg}</div>
  <div style="margin-top:10px;font-size:13px;color:#9a9aa2">You can close this window.</div>
</div>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ source: "opencraft", kind: "connection", provider: ${JSON.stringify(
        provider
      )}, status: ${JSON.stringify(status)} }, ${JSON.stringify(origin)});
    }
  } catch (e) {}
  setTimeout(function () { try { window.close(); } catch (e) {} }, 400);
</script>
</body></html>`;
}

export const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" } as const;
