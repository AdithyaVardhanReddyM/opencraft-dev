import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import {
  AppSyncEventsClient,
  type ConnectionStatus,
  type RealtimeAuthInfo,
} from "./appsync-events-client";

/**
 * A Yjs connection provider over AppSync Events. Carries two payload kinds on
 * one channel, discriminated by `t`:
 *   - "doc": incremental Y.Doc updates (Phase 3 document sync)
 *   - "aw":  awareness updates (presence: cursors / selection)
 *
 * Each message is tagged with the sender's clientID (`s`) so we ignore our own
 * echoes (AppSync delivers published events back to the publisher's own
 * subscription). Remote doc updates are applied with this provider as the Yjs
 * origin so the local update handler doesn't re-broadcast them (no echo loop).
 *
 * Initial document state is NOT exchanged over the channel — it is loaded from
 * the durable snapshot (Aurora) by the caller; Yjs updates are commutative so
 * any live updates that arrive during load merge safely.
 */

type Envelope = { t: "doc" | "aw" | "app"; d: string; s: number };

function u8ToB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

const HEARTBEAT_MS = 10_000;
const OUTDATED_MS = 30_000;

export interface ProviderOptions {
  doc: Y.Doc;
  awareness: Awareness;
  getAuth: () => Promise<RealtimeAuthInfo>;
  onStatus?: (status: ConnectionStatus) => void;
  /** Generic ephemeral app messages (e.g. mirrored chat-stream frames). */
  onAppMessage?: (payload: unknown) => void;
}

export class YjsAppSyncProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private client: AppSyncEventsClient;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private sweep: ReturnType<typeof setInterval> | null = null;
  private knownPeers = new Set<number>();
  private destroyed = false;
  private onAppMessage?: (payload: unknown) => void;

  constructor(opts: ProviderOptions) {
    this.doc = opts.doc;
    this.awareness = opts.awareness;
    this.onAppMessage = opts.onAppMessage;

    this.client = new AppSyncEventsClient({
      getAuth: opts.getAuth,
      onMessage: (e) => this.onMessage(e as Envelope),
      onStatus: (s) => {
        opts.onStatus?.(s);
        if (s === "open") this.onConnected();
      },
    });

    this.doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.onUnload);
    }

    void this.client.connect();
  }

  // ---- outbound -----------------------------------------------------------

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // remote-applied update; don't echo
    this.client.publish({ t: "doc", d: u8ToB64(update), s: this.doc.clientID });
  };

  private onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return; // applied from a remote; don't echo
    const clients = [...changes.added, ...changes.updated, ...changes.removed];
    const update = encodeAwarenessUpdate(this.awareness, clients);
    this.client.publish({ t: "aw", d: u8ToB64(update), s: this.doc.clientID });
  };

  // ---- inbound ------------------------------------------------------------

  private onMessage(env: Envelope) {
    if (!env || env.s === this.doc.clientID) return; // ignore own echo
    if (env.t === "doc") {
      Y.applyUpdate(this.doc, b64ToU8(env.d), this);
    } else if (env.t === "aw") {
      applyAwarenessUpdate(this.awareness, b64ToU8(env.d), this);
      // Learn whether this surfaced a peer we hadn't seen; if so, re-announce
      // ourselves once so the newcomer learns our presence promptly.
      this.maybeReannounce();
    } else if (env.t === "app") {
      try {
        this.onAppMessage?.(JSON.parse(env.d));
      } catch {
        /* malformed app payload */
      }
    }
  }

  /** Publish a generic ephemeral app message (JSON) to the channel. */
  publishApp(payload: unknown) {
    this.client.publish({
      t: "app",
      d: JSON.stringify(payload),
      s: this.doc.clientID,
    });
  }

  private maybeReannounce() {
    let isNew = false;
    for (const id of this.awareness.getStates().keys()) {
      if (id !== this.doc.clientID && !this.knownPeers.has(id)) {
        this.knownPeers.add(id);
        isNew = true;
      }
    }
    if (isNew) {
      // A newcomer just appeared: re-announce presence AND push our full doc
      // state so they converge (pub/sub has no server-side replay).
      this.announce();
      this.broadcastDocState();
    }
  }

  private broadcastDocState() {
    const state = Y.encodeStateAsUpdate(this.doc);
    if (state.length > 2) {
      this.client.publish({ t: "doc", d: u8ToB64(state), s: this.doc.clientID });
    }
  }

  // ---- lifecycle ----------------------------------------------------------

  private onConnected() {
    // Announce presence + push the full doc state so late joiners converge even
    // without a server relay.
    this.announce();
    this.broadcastDocState();

    if (!this.heartbeat) {
      this.heartbeat = setInterval(() => this.announce(), HEARTBEAT_MS);
    }
    if (!this.sweep) {
      this.sweep = setInterval(() => this.sweepOutdated(), OUTDATED_MS / 3);
    }
  }

  /** (Re)broadcast our own awareness state. */
  private announce() {
    const update = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
    this.client.publish({ t: "aw", d: u8ToB64(update), s: this.doc.clientID });
  }

  /** Drop remote cursors whose owner stopped refreshing (crash / closed tab). */
  private sweepOutdated() {
    const now = Date.now();
    const stale: number[] = [];
    this.awareness.meta.forEach((meta, clientId) => {
      if (
        clientId !== this.doc.clientID &&
        now - meta.lastUpdated > OUTDATED_MS
      ) {
        stale.push(clientId);
      }
    });
    if (stale.length) {
      stale.forEach((id) => this.knownPeers.delete(id));
      removeAwarenessStates(this.awareness, stale, "sweep");
    }
  }

  private onUnload = () => {
    // Best-effort: clear our state so peers drop our cursor immediately.
    removeAwarenessStates(this.awareness, [this.doc.clientID], "unload");
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.onUnload);
    }
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.sweep) clearInterval(this.sweep);
    removeAwarenessStates(this.awareness, [this.doc.clientID], "destroy");
    this.client.close();
  }
}
