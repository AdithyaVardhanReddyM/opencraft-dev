import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// drizzle-kit ignores a discrete `ssl` option when a `url` is supplied, so the
// TLS setting has to live in the URL. Aurora requires TLS but we don't pin the
// RDS CA, so use `sslmode=no-verify` (encrypt, skip cert verification) rather
// than `require` (which newer pg treats as verify-full and then fails).
const base = (process.env.DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/i, "");
const url = `${base}${base.includes("?") ? "&" : "?"}sslmode=no-verify`;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
