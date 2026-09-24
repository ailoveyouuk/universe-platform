#!/usr/bin/env node
/**
 * One command to run the full local test suite against a real SQL Server:
 *   npm run test:db
 *
 * 1. Starts docker-compose.test.yml (Azure SQL Edge) and waits for health.
 * 2. Creates a dedicated `universe_test` database (the container's default
 *    "master" database is left alone — this container is throwaway either
 *    way, but a named database makes connection strings/logs less confusing).
 * 3. Pushes the current Prisma schema + applies Row-Level Security
 *    (packages/db/scripts/reset-test-db.ts).
 * 4. Runs the packages/db and apps/api test suites in order.
 * 5. Tears the container down, always — even on failure — and exits with
 *    the first non-zero status seen.
 *
 * Requires Docker Desktop (or another local Docker) running. Not part of
 * `npm run build`/CI's normal path — see .github/workflows/ci.yml for the
 * CI equivalent, which uses the same docker-compose file as a GitHub
 * Actions service alternative... actually runs its own service container
 * (see that file) so this script and CI share the same schema-push +
 * apply-rls step but not the same container orchestration.
 */
import { execSync } from "node:child_process";

const COMPOSE = ["docker", "compose", "-f", "docker-compose.test.yml"];
const SA_PASSWORD = "UniverseTest!2026";
// Prisma's sqlserver connection string is JDBC-style key=value pairs, not
// URL-encoded — the password is taken literally, so it's inlined as-is
// (safe here since it contains no ";" or "=").
const TEST_DATABASE_URL = `sqlserver://localhost:14330;database=universe_test;user=sa;password=${SA_PASSWORD};encrypt=true;trustServerCertificate=true`;

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

let exitCode = 0;
try {
  run(`${COMPOSE.join(" ")} up -d --wait`);

  run(
    `${COMPOSE.join(" ")} exec -T test-sql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" ` +
      `-Q "IF DB_ID('universe_test') IS NULL CREATE DATABASE universe_test"`,
  );

  const testEnv = { ...process.env, TEST_DATABASE_URL };

  run("npm run test:db:reset --workspace=@universe/db", { env: testEnv });
  run("npm run test --workspace=@universe/db", { env: testEnv });
  run("npm run test --workspace=@universe/api", { env: testEnv });

  console.log("\nAll test suites passed.");
} catch (err) {
  exitCode = 1;
  console.error("\nTest run failed:", err.message);
} finally {
  try {
    run(`${COMPOSE.join(" ")} down -v`);
  } catch {
    // Best-effort teardown — don't let a docker-compose down failure mask
    // the real test result above.
  }
}

process.exit(exitCode);
