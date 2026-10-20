import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Archives duplicate sourcing approvals in the demo organisation (2026-10-20). A re-run of the coherence pass read approvals
 * outside tenant context, saw none, and added them again. The earliest approval per product + manufacturer is kept (preferring
 * APPROVED); the rest are archived, never deleted. Dry run by default.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function main() {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  const orgId = demo[0].id;
  const rows = await withTenantContext(orgId, (tx) => tx.productSourceApproval.findMany({ where: { organizationId: orgId, isArchived: false }, select: { id: true, productMasterId: true, manufacturerId: true, status: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }));
  const keep = new Map<string, { id: string; status: string }>();
  const archive: string[] = [];
  for (const r of rows) {
    const k = `${r.productMasterId}|${r.manufacturerId}`;
    const cur = keep.get(k);
    if (!cur) { keep.set(k, { id: r.id, status: r.status }); continue; }
    if (cur.status !== "APPROVED" && r.status === "APPROVED") { archive.push(cur.id); keep.set(k, { id: r.id, status: r.status }); } else archive.push(r.id);
  }
  console.log(`Active approvals: ${rows.length}; distinct pairs: ${keep.size}; duplicates to archive: ${archive.length}`);
  if (!dryRun) {
    for (const g of chunks(archive, 500)) await withTenantContext(orgId, (tx) => tx.productSourceApproval.updateMany({ where: { id: { in: g } }, data: { isArchived: true, archivedAt: new Date() } }));
    console.log("Archived.");
  } else console.log("DRY RUN: nothing written.");
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
