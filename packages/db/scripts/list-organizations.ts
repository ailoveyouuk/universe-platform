/**
 * One-off, READ-ONLY helper — lists every organization's exact name, so a
 * script like backfill-partner-financials-permissions.ts (which filters
 * by `name: { contains: ... }`) can be given the right argument instead
 * of guessed. organizations is NOT row-level-security-protected (global
 * table, no organizationId column on itself), so this runs as a plain
 * prisma call, no session context needed.
 *
 * Run with: cd packages/db && npx tsx scripts/list-organizations.ts
 */
import { prisma } from "../src/index";

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });
  console.log(`${orgs.length} organization(s):`);
  for (const o of orgs) {
    console.log(`  "${o.name}" (${o.type ?? "no type"}) — ${o.id}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
