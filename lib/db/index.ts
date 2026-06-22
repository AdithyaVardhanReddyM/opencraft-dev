import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in your environment");
}

/**
 * Aurora requires TLS. Newer `pg` treats `sslmode=require` in the URL as
 * `verify-full` (full CA verification), which overrides the `ssl` object below
 * and fails with "unable to get local issuer certificate" since we don't pin
 * the RDS CA bundle. Strip the param so our explicit `ssl` setting governs
 * (encrypted, not cert-pinned).
 */
const connectionString = process.env.DATABASE_URL.replace(
  /[?&]sslmode=[^&]*/i,
  ""
);

/**
 * Single shared pg Pool. Cached on globalThis so Next.js HMR (dev) and reused
 * serverless module instances don't open a new pool on every reload — Aurora
 * Serverless v2 starts at 0.5 ACU with a small connection budget, so we keep
 * the pool small and long-lived.
 */
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
