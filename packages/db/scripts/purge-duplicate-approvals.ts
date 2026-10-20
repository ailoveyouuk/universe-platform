import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Hard-deletes the duplicate sourcing approvals that `dedupe-demo-approvals` archived (2026-10-20). A row is deleted only if it
 * is archived, belongs to the demo organisation, and an active approval for the same product + manufacturer still exists.
 * Nothing references an approval by foreign key. Dry run by default; run by Lewis, never automatically.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function main() {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  const orgId = demo[0].id;
  const all = await withTenantContext(orgId, (tx) => tx.productSourceApproval.findMany({ where: { organizationId: orgId }, select: { id: true, productMasterId: true, manufacturerId: true, isArchived: true } }));
  const active = new Set(all.filter((a) => !a.isArchived).map((a) => `${a.productMasterId}|${a.manufacturerId}`));
  const archived = all.filter((a) => a.isArchived);
  const twin = archived.filter((a) => active.has(`${a.productMasterId}|${a.manufacturerId}`));
  const orphan = archived.length - twin.length;
  console.log(`Approvals: ${all.length}; active: ${all.length - archived.length}; archived: ${archived.length}; archived with an active twin (safe to delete): ${twin.length}; archived without a twin (left alone): ${orphan}`);
  if (dryRun) { console.log("DRY RUN: nothing deleted."); return; }
  for (const g of chunks(twin.map((a) => a.id), 500)) await withTenantContext(orgId, (tx) => tx.productSourceApproval.deleteMany({ where: { id: { in: g }, isArchived: true } }));
  console.log(`Deleted ${twin.length}.`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
