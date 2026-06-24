/**
 * Minimal browser client for the AWS AppSync Events WebSocket protocol.
 *
 * Implements just what the collaboration layer needs: connect (with the Lambda
 * auth subprotocol), subscribe to one channel, publish events, handle keep-alive
 * + reconnect with jittered backoff, and refresh the short-lived token across
 * reconnects. No aws-amplify dependency — keeps the client bundle small.
 *
 * Protocol reference:
 * https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html
 */

export interface RealtimeAuthInfo {
  token: string;
  realtimeUrl: string; // wss://…/event/realtime
  httpDns: string; // host field used in the auth subprotocol
  channel: string; // /canvas/{projectId}
  expiresAt: number; // unix seconds
}

export type ConnectionStatus = "connecting" | "open" | "closed";

interface Options {
  /** Fetch a fresh auth/token + endpoints. Called on every (re)connect. */
  getAuth: () => Promise<RealtimeAuthInfo>;
  /** Called with each received event (already JSON-parsed). */
  onMessage: (event: unknown) => void;
  onStatus?: (status: ConnectionStatus) => void;
}

function base64UrlEncode(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function uid(): string {
  return crypto.randomUUID();
}

const MAX_BACKOFF_MS = 15_000;

export class AppSyncEventsClient {
  private opts: Options;
  private ws: WebSocket | null = null;
  private auth: RealtimeAuthInfo | null = null;
  private subId: string | null = null;
  private acked = false;
  private closedByUser = false;
  private retries = 0;
  private kaTimer: ReturnType<typeof setTimeout> | null = null;
  private kaTimeoutMs = 300_000; // overwritten by connection_ack
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private outbox: string[] = []; // pending publishes while not yet subscribed

  constructor(opts: Options) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    this.closedByUser = false;
    await this.open();
  }

  private async open(): Promise<void> {
    this.opts.onStatus?.("connecting");
    let auth: RealtimeAuthInfo;
    try {
      auth = await this.opts.getAuth();
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.auth = auth;

    const header = { host: auth.httpDns, Authorization: auth.token };
    let ws: WebSocket;
    try {
      ws = new WebSocket(auth.realtimeUrl, [
        "aws-appsync-event-ws",
        `header-${base64UrlEncode(header)}`,
      ]);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    this.acked = false;

    ws.onopen = () => ws.send(JSON.stringify({ type: "connection_init" }));
    ws.onmessage = (e) => this.handleMessage(e.data);
    ws.onerror = () => {
      /* close handler drives reconnect */
    };
    ws.onclose = () => {
      this.clearKaTimer();
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.ws = null;
      this.acked = false;
      this.subId = null;
      this.opts.onStatus?.("closed");
      if (!this.closedByUser) this.scheduleReconnect();
    };
  }

  private handleMessage(raw: unknown) {
    if (typeof raw !== "string") return;
    let msg: { type?: string; event?: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "connection_ack": {
        const ms = (msg as { connectionTimeoutMs?: number }).connectionTimeoutMs;
        if (typeof ms === "number") this.kaTimeoutMs = ms;
        this.acked = true;
        this.retries = 0;
        this.subscribe();
        this.scheduleTokenRefresh();
        this.resetKaTimer();
        break;
      }
      case "ka":
        this.resetKaTimer();
        break;
      case "subscribe_success":
        this.opts.onStatus?.("open");
        this.flushOutbox();
        break;
      case "data":
        this.deliver(msg.event);
        break;
      case "subscribe_error":
      case "broadcast_error":
      case "publish_error":
        // Non-fatal at the message level; log for diagnostics.
        console.warn("[appsync-events]", msg);
        break;
    }
  }

  /** A data message's `event` is a stringified JSON value (or array of them). */
  private deliver(event: unknown) {
    const items = Array.isArray(event) ? event : [event];
    for (const it of items) {
      try {
        this.opts.onMessage(typeof it === "string" ? JSON.parse(it) : it);
      } catch {
        /* ignore malformed event */
      }
    }
  }

  private subscribe() {
    if (!this.ws || !this.auth) return;
    this.subId = uid();
    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        id: this.subId,
        channel: this.auth.channel,
        authorization: {
          host: this.auth.httpDns,
          Authorization: this.auth.token,
        },
      })
    );
  }

  /** Publish a single JSON-serializable event to the channel. */
  publish(event: unknown) {
    const frame = JSON.stringify({
      type: "publish",
      id: uid(),
      channel: this.auth?.channel,
      events: [JSON.stringify(event)],
      authorization: { Authorization: this.auth?.token },
    });
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.acked) {
      this.ws.send(frame);
    } else {
      // Drop the stalest if the buffer grows unbounded while offline.
      if (this.outbox.length > 256) this.outbox.shift();
      this.outbox.push(frame);
    }
  }

  private flushOutbox() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    for (const frame of this.outbox.splice(0)) this.ws.send(frame);
  }

  private resetKaTimer() {
    this.clearKaTimer();
    // If no keep-alive within the server's timeout, the connection is stale.
    this.kaTimer = setTimeout(() => this.ws?.close(), this.kaTimeoutMs);
  }
  private clearKaTimer() {
    if (this.kaTimer) clearTimeout(this.kaTimer);
    this.kaTimer = null;
  }

  /** Reconnect ~60s before the token expires to pick up a fresh one. */
  private scheduleTokenRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.auth) return;
    const ms = Math.max(30_000, (this.auth.expiresAt - 60) * 1000 - Date.now());
    this.refreshTimer = setTimeout(() => this.ws?.close(), ms);
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    const base = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.retries);
    const jitter = base * (0.5 + Math.random() * 0.5);
    this.retries++;
    setTimeout(() => {
      if (!this.closedByUser) void this.open();
    }, jitter);
  }

  close() {
    this.closedByUser = true;
    this.clearKaTimer();
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.ws?.close();
    this.ws = null;
  }
}
