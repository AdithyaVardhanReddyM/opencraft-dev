import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/api";
import { getProvider } from "@/lib/connections/registry";
import {
  discoverMetadata,
  registerClient,
  generatePkce,
  randomState,
  buildAuthUrl,
} from "@/lib/connections/oauth";
import {
  cookieName,
  encodeFlowState,
  redirectUriFor,
  appUrlFrom,
  popupResultHtml,
  HTML_HEADERS,
} from "@/lib/connections/flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET (opened in a popup by the modal) → begin OAuth for `provider`. Discovers the
 * provider's auth server, registers a client (DCR) unless static creds are
 * configured, then redirects the popup to the provider's consent screen. The PKCE
 * verifier, anti-CSRF state, client creds, and the owning userId are sealed into a
 * short-lived encrypted httpOnly cookie the callback reads back.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const origin = appUrlFrom(req.url);
  const errorPage = (message: string) =>
    new NextResponse(
      popupResultHtml({ origin, provider, status: "error", message }),
      { status: 200, headers: HTML_HEADERS }
    );

  try {
    const userId = await requireUserId();
    const cfg = getProvider(provider);
    if (!cfg) return errorPage("Unknown connection.");

    const redirectUri = redirectUriFor(req.url, provider);
    const meta = await discoverMetadata(cfg.mcpUrl);

    // Static OAuth app if configured, otherwise dynamic client registration.
    let clientId = cfg.staticClientId ?? "";
    let clientSecret: string | null = cfg.staticClientSecret ?? null;
    if (!clientId) {
      const reg = await registerClient(meta, redirectUri);
      clientId = reg.clientId;
      clientSecret = reg.clientSecret;
    }

    const { verifier, challenge } = generatePkce();
    const state = randomState();
    const authUrl = buildAuthUrl({
      meta,
      clientId,
      redirectUri,
      state,
      codeChallenge: challenge,
      resource: cfg.mcpUrl,
      scope: cfg.scope,
    });

    const res = NextResponse.redirect(authUrl);
    res.cookies.set(
      cookieName(provider),
      encodeFlowState({
        userId,
        provider,
        state,
        codeVerifier: verifier,
        clientId,
        clientSecret,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // sent on the provider's top-level GET redirect back
        path: "/api/connections",
        maxAge: 600,
      }
    );
    return res;
  } catch {
    return errorPage("Couldn't start the connection. Please try again.");
  }
}
