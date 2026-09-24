import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Applies infra/sql/row-level-security.sql to whatever DATABASE_URL points
 * at. Splits on standalone `GO` batch separators — only sqlcmd/SSMS
 * understand `GO`, a raw driver connection (which is what PrismaClient uses
 * under $executeRawUnsafe) does not, so each batch has to be sent
 * separately.
 *
 * Used by the local test harness (packages/db/scripts/reset-test-db.ts,
 * npm run test:db) and can also be run directly against a real Azure SQL
 * database — see backend-launch-checklist.md, Phase B7 ("Apply the
 * Row-Level Security policies written in Phase A"):
 *
 *   DATABASE_URL="<connection string>" npx tsx scripts/apply-rls.ts
 *   (run from packages/db)
 */
async function main() {
  const sqlPath = join(__dirname, "../../../infra/sql/row-level-security.sql");
  const script = readFileSync(sqlPath, "utf8");
  const batches = script
    .split(/^\s*GO\s*$/im)
    .map((b) => b.trim())
    .filter(Boolean);

  const prisma = new PrismaClient();
  try {
    for (const batch of batches) {
      await prisma.$executeRawUnsafe(batch);
    }
    console.log(`Applied row-level-security.sql: ${batches.length} batch(es).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
