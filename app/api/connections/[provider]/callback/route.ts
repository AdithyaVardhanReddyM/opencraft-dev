import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/connections/registry";
import { discoverMetadata, exchangeCode } from "@/lib/connections/oauth";
import { upsertConnection } from "@/lib/db/queries/connections";
import {
  cookieName,
  decodeFlowState,
  redirectUriFor,
  appUrlFrom,
  popupResultHtml,
  HTML_HEADERS,
} from "@/lib/connections/flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → the provider redirects here after consent. Validate the encrypted flow
 * cookie (owning userId + anti-CSRF state), exchange the code for tokens, persist
 * the encrypted connection, then render a self-closing popup that tells the modal
 * to refresh. The userId comes from the cookie (sealed at `start`), so this leg
 * does not depend on the Clerk session surviving the cross-site redirect.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const origin = appUrlFrom(req.url);
  const fail = (message: string) =>
    new NextResponse(
      popupResultHtml({ origin, provider, status: "error", message }),
      { status: 200, headers: HTML_HEADERS }
    );

  try {
    const cfg = getProvider(provider);
    if (!cfg) return fail("Unknown connection.");

    const url = new URL(req.url);
    const error = url.searchParams.get("error");
    if (error) return fail("Authorization was cancelled.");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return fail("Missing authorization response.");

    const raw = req.cookies.get(cookieName(provider))?.value;
    const flow = raw ? decodeFlowState(raw) : null;
    if (!flow || flow.provider !== provider || flow.state !== state) {
      return fail("Connection state mismatch. Please try connecting again.");
    }

    const meta = await discoverMetadata(cfg.mcpUrl);
    const tokens = await exchangeCode({
      meta,
      clientId: flow.clientId,
      clientSecret: flow.clientSecret,
      code,
      codeVerifier: flow.codeVerifier,
      redirectUri: redirectUriFor(req.url, provider),
      resource: cfg.mcpUrl,
    });

    await upsertConnection(flow.userId, provider, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      accountId: tokens.accountId,
      accountName: tokens.accountName,
      clientId: flow.clientId,
      clientSecret: flow.clientSecret,
    });

    const res = new NextResponse(
      popupResultHtml({
        origin,
        provider,
        status: "connected",
        message: `${cfg.label} connected.`,
      }),
      { status: 200, headers: HTML_HEADERS }
    );
    // Burn the one-time flow cookie.
    res.cookies.set(cookieName(provider), "", {
      maxAge: 0,
      path: "/api/connections",
    });
    return res;
  } catch (err) {
    console.error(`[connections/${provider}/callback] failed:`, err);
    return fail("Couldn't complete the connection. Please try again.");
  }
}
