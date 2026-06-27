import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

/**
 * Symmetric encryption for secrets we must be able to read back — OAuth
 * access/refresh tokens for external MCP connections (see lib/db/queries/connections.ts).
 *
 * This is deliberately different from api_keys, which store a one-way sha256: we
 * have to hand the *plaintext* token to the agent-service every turn, so the value
 * has to be reversible. AES-256-GCM (authenticated) with a key from `OAUTH_ENC_KEY`.
 *
 * Ciphertext format: `base64(iv).base64(authTag).base64(ciphertext)` — three
 * url-unsafe base64 parts joined by ".". GCM's 16-byte tag detects tampering.
 *
 * Key: 32 raw bytes, supplied as base64 in `OAUTH_ENC_KEY` (generate with
 * `openssl rand -base64 32`). Resolved lazily so importing this module never
 * crashes a build that doesn't touch connections.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.OAUTH_ENC_KEY;
  if (!raw) {
    throw new Error(
      "OAUTH_ENC_KEY is not set — required to encrypt OAuth connection tokens. " +
        "Generate one with `openssl rand -base64 32`."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `OAUTH_ENC_KEY must decode to 32 bytes (got ${key.length}). ` +
        "Generate one with `openssl rand -base64 32`."
    );
  }
  cachedKey = key;
  return key;
}

/** Encrypt a UTF-8 string. Returns the `iv.tag.ct` envelope (safe to store as text). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString(
    "base64"
  )}`;
}

/** Reverse {@link encryptSecret}. Throws if the envelope is malformed or tampered. */
export function decryptSecret(envelope: string): string {
  const parts = envelope.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed ciphertext envelope");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8"
  );
}

/** Encrypt when present; pass through null/undefined. Convenience for nullable cols. */
export function encryptNullable(plaintext: string | null | undefined): string | null {
  return plaintext ? encryptSecret(plaintext) : null;
}

/** Decrypt when present; pass through null/undefined. */
export function decryptNullable(envelope: string | null | undefined): string | null {
  return envelope ? decryptSecret(envelope) : null;
}
