/**
 * One-off, READ-ONLY diagnostic for the 2026-10-14 migration failure
 * (P3018: "Cannot find the object 'partner_financial_details'...").
 * Uses the same DATABASE_URL / connection the failing `prisma migrate
 * deploy` used, so if this script can't see the table, migrate deploy
 * couldn't either. Prints:
 *   1. Whether the table actually exists (sys.tables)
 *   2. Whether the ORIGINAL migration that created it
 *      (20261003050000_partner_financial_detail) is recorded as having
 *      actually finished
 *   3. The current SQL login's permissions on this table, in case the
 *      table exists but this login can't see/alter it (SQL Server's
 *      error 1088 is deliberately ambiguous between "doesn't exist" and
 *      "no permission")
 *
 * Does NOT modify anything. Safe to run any number of times.
 *
 * Run with: cd packages/db && npx tsx scripts/diagnose-partner-financial-details.ts
 */
import { prisma } from "../src/index";

async function main() {
  console.log("--- 1. Does the table exist at all? ---");
  const tables: any[] = await prisma.$queryRawUnsafe(
    `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'partner_financial_details'`,
  );
  console.log(tables.length ? tables : "NO ROWS — table not visible to this login at all.");

  console.log("\n--- 2. What does _prisma_migrations say about the ORIGINAL create-table migration? ---");
  const migrations: any[] = await prisma.$queryRawUnsafe(
    `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations WHERE migration_name LIKE '%partner_financial%' ORDER BY started_at`,
  );
  console.log(migrations);

  console.log("\n--- 3. What can the CURRENT login (whatever DATABASE_URL points to) do on this table? ---");
  const perms: any[] = await prisma.$queryRawUnsafe(
    `SELECT p.permission_name, p.state_desc
     FROM sys.database_permissions p
     JOIN sys.objects o ON p.major_id = o.object_id
     WHERE o.name = 'partner_financial_details'`,
  );
  console.log(perms.length ? perms : "NO ROWS — either the table doesn't exist, or this login has no explicit grants listed (could be inheriting from a role).");

  console.log("\n--- 4. Current login / user context, for reference ---");
  const whoami: any[] = await prisma.$queryRawUnsafe(`SELECT SUSER_SNAME() AS loginName, USER_NAME() AS dbUserName`);
  console.log(whoami);
}

main()
  .catch((err) => {
    console.error("Query failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
