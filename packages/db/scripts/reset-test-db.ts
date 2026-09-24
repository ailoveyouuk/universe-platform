import { execSync } from "node:child_process";

/**
 * Full reset for the local test database (docker-compose.test.yml, `npm run
 * test:db` from the repo root): push the current Prisma schema, then apply
 * Row-Level Security. Run once before the test suite.
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

console.log("Applying Row-Level Security policies...");
execSync("npx tsx scripts/apply-rls.ts", { cwd, env, stdio: "inherit" });

console.log("Test database ready.");
