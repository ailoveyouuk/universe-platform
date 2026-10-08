/**
 * Removes a single stray User row (and its UserRole links) by email — added
 * 2026-10-08 to clean up lewis.m@unimedps.com, which got created as a
 * second Organization Admin under "Universe Demo" before the demo's
 * sign-in email was switched to lewis@eduparcs.onmicrosoft.com. Left as a
 * leftover row it would be invisible on the dashboard but would still show
 * up in any Team/Users admin screen — defeating the point of a
 * Unimed-free demo org.
 *
 * Generic by email, not hardcoded, so it's reusable for the same situation
 * later. DRY-RUN BY DEFAULT.
 *
 * Usage (from packages/db):
 *   npx tsx scripts/remove-stray-user.ts "lewis.m@unimedps.com"             # dry run
 *   npx tsx scripts/remove-stray-user.ts "lewis.m@unimedps.com" --execute   # actually deletes
 */
import { prisma, withPlatformStaffContext } from "../src/index";

const emailArg = process.argv[2];
const EXECUTE = process.argv.includes("--execute");

if (!emailArg) {
  throw new Error('Usage: npx tsx scripts/remove-stray-user.ts "<exact email>" [--execute]');
}

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: emailArg } });
    if (!user) {
      console.log(`No user found with email "${emailArg}" — nothing to do.`);
      return;
    }
    console.log(`Target: ${user.email} (${user.id}), org ${user.organizationId} — ${EXECUTE ? "EXECUTING DELETE" : "DRY RUN (pass --execute to delete)"}`);

    const userRoleCount = await tx.userRole.count({ where: { userId: user.id } });
    console.log(`  ${EXECUTE ? "would delete" : "would delete"} ${userRoleCount} UserRole link(s)`.replace("would delete would delete", "would delete"));

    if (EXECUTE) {
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
      console.log(`Deleted user ${user.email} and its role links.`);
    } else {
      console.log(`Dry run only — re-run with --execute to actually delete ${user.email}.`);
    }
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
