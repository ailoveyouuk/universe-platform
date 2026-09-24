import { execSync } from "node:child_process";

/**
 * Pushes the current Prisma schema to the local test database
 * (docker-compose.test.yml, `npm run test:db` from the repo root). Run
 * once before the test suite.
 *
 * Only the schema — NOT Row-Level Security. RLS DDL (CREATE FUNCTION /
 * CREATE SECURITY POLICY) can't go through Prisma's $executeRawUnsafe: SQL
 * Server requires those statements to be the only one in their batch, and
 * Prisma's SQL Server driver routes every raw query through
 * sp_executesql in a way that violates that rule even when the batch is
 * textually alone (confirmed in CI 2026-09-24 — "Incorrect syntax near
 * the keyword 'FUNCTION'" — this is a known Prisma/SQL Server limitation,
 * not a mistake in the SQL). RLS is applied separately via sqlcmd instead
 * — see scripts/test-db.mjs (local) and .github/workflows/ci.yml (CI),
 * both of which run sqlcmd inside the already-running SQL Server
 * container rather than through this script.
 *
 * Uses `prisma db push` rather than `prisma migrate deploy` because there is
 * no committed migration history yet (packages/db/prisma has no
 * migrations/ directory — the schema is still moving fast enough that
 * starting one now would just mean squashing it later; see
 * backend-launch-checklist.md, Phase A). Switch this to `migrate deploy`
 * once a real migration history exists.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL is not set — see docker-compose.test.yml / npm run test:db");
}
const env = { ...process.env, DATABASE_URL: url };
const cwd = `${__dirname}/..`;

console.log("Resetting test database schema (prisma db push)...");
execSync("npx prisma db push --skip-generate --accept-data-loss --schema=prisma/schema.prisma", {
  cwd,
  env,
  stdio: "inherit",
});

console.log("Schema pushed. Row-Level Security is applied separately — see scripts/test-db.mjs / ci.yml.");
