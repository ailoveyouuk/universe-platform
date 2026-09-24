import { execFileSync } from "node:child_process";
import { join } from "node:path";

/**
 * Applies infra/sql/row-level-security.sql via `sqlcmd` — NOT via Prisma.
 *
 * SQL Server requires CREATE FUNCTION / CREATE SECURITY POLICY to be the
 * only statement in their batch. Prisma's `$executeRawUnsafe` can't satisfy
 * that for SQL Server: its driver routes every raw query through
 * `sp_executesql` in a way that violates the rule even when the batch is
 * textually alone — confirmed the hard way in CI 2026-09-24 ("Incorrect
 * syntax near the keyword 'FUNCTION'"), then confirmed against Microsoft's
 * own docs that this is a known limitation, not a bug in the SQL itself.
 * `sqlcmd` sends each GO-separated batch exactly as written, which DDL like
 * this actually requires — and it understands `GO` natively, so there's no
 * hand-rolled batch splitting here (an earlier version of this script did
 * its own splitting; that was never the actual problem, just wasted code).
 *
 * This is the PRODUCTION path — for a real Azure SQL database with no
 * container to exec into (backend-launch-checklist.md, Phase B7):
 *
 *   DATABASE_URL="<connection string>" npx tsx scripts/apply-rls.ts
 *   (run from packages/db)
 *
 * Needs `sqlcmd` on PATH (mssql-tools18 — see
 * https://learn.microsoft.com/sql/linux/install-upgrade/setup-tools, or use
 * Azure Cloud Shell, which has it preinstalled). The local/CI test harness
 * does NOT use this script — see scripts/test-db.mjs and
 * .github/workflows/ci.yml, which run sqlcmd inside the already-running
 * SQL Server container instead, since Docker's SQL Server images ship
 * sqlcmd built in and that avoids requiring anyone to install it locally
 * just to run tests.
 */
function parseSqlServerUrl(url: string) {
  const withoutScheme = url.replace(/^sqlserver:\/\//i, "");
  const [hostPort, ...rest] = withoutScheme.split(";");
  const [host, port = "1433"] = hostPort.split(":");
  const params: Record<string, string> = {};
  for (const part of rest) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    params[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return {
    host,
    port,
    database: params.database,
    user: params.user,
    password: params.password,
    encrypt: params.encrypt === "true",
    trustServerCertificate: params.trustServerCertificate === "true",
  };
}

function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  const conn = parseSqlServerUrl(url);
  if (!conn.database || !conn.user || !conn.password) {
    throw new Error(
      `DATABASE_URL is missing database/user/password. Expected the Prisma sqlserver format, e.g. ` +
        `"sqlserver://host:1433;database=name;user=user;password=pass;encrypt=true;trustServerCertificate=true". Got: ${url}`,
    );
  }

  // Both files in order — supplier-directory-rls.sql reuses
  // rls.fn_tenantAccessPredicate for its BLOCK predicates, so
  // row-level-security.sql (which defines that function) must run first.
  const sqlPaths = [
    join(__dirname, "../../../infra/sql/row-level-security.sql"),
    join(__dirname, "../../../infra/sql/supplier-directory-rls.sql"),
  ];

  for (const sqlPath of sqlPaths) {
    const args = ["-S", `${conn.host},${conn.port}`, "-d", conn.database, "-U", conn.user, "-P", conn.password, "-b", "-i", sqlPath];
    if (conn.trustServerCertificate) args.push("-C");
    if (conn.encrypt) args.push("-N");

    try {
      execFileSync("sqlcmd", args, { stdio: "inherit" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(
          "sqlcmd not found on PATH. Install mssql-tools18 " +
            "(https://learn.microsoft.com/sql/linux/install-upgrade/setup-tools) or run this from Azure Cloud Shell.",
        );
      }
      throw err;
    }
    console.log(`Applied ${sqlPath.split("/").pop()} via sqlcmd.`);
  }
}

main();
