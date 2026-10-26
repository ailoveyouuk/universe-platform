import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Baseline fixes found by the consistency audit (2026-10-26, agreed by Lewis). Simulated Universe Demo rows only; nothing deleted.
 *   1. Batch status follows the expiry date: ACTIVE and past expiry become EXPIRED; EXPIRED and not past expiry become ACTIVE.
 *      QUARANTINED and WITHDRAWN batches are left alone.
 *   2. Delivered lines get the supplier on-time answer the app would compute: goods collected on or before the supplier's committed date.
 *   3. The test project E2E-PACK-001 (left by the 24 Oct end-to-end walkthrough) is archived, with Lewis's OK (2026-10-26). Archived, not deleted.
 * DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const me = demo.id, now = new Date();

    const batches = await tx.productBatch.findMany({ where: { organizationId: me, status: { in: ["ACTIVE", "EXPIRED"] } }, select: { id: true, status: true, expiryDate: true } });
    const toExpired = batches.filter((b) => b.status === "ACTIVE" && b.expiryDate && b.expiryDate < now).map((b) => b.id);
    const toActive = batches.filter((b) => b.status === "EXPIRED" && (!b.expiryDate || b.expiryDate >= now)).map((b) => b.id);
    console.log(`${dryRun ? "[dry run] would set" : "set"} ${toExpired.length} batches ACTIVE to EXPIRED and ${toActive.length} batches EXPIRED to ACTIVE`);
    if (!dryRun) {
      for (const c of chunks(toExpired, 500)) await tx.productBatch.updateMany({ where: { id: { in: c } }, data: { status: "EXPIRED" } });
      for (const c of chunks(toActive, 500)) await tx.productBatch.updateMany({ where: { id: { in: c } }, data: { status: "ACTIVE" } });
    }

    const lines = await tx.projectLine.findMany({ where: { organizationId: me, actualDeliveryDate: { not: null }, goodsCollectedDate: { not: null }, supplierGad: { not: null } }, select: { id: true, goodsCollectedDate: true, supplierGad: true, supplierOnTime: true } });
    const wrong = lines.filter((l) => l.supplierOnTime !== (l.goodsCollectedDate! <= l.supplierGad!));
    const toTrue = wrong.filter((l) => l.goodsCollectedDate! <= l.supplierGad!).map((l) => l.id);
    const toFalse = wrong.filter((l) => l.goodsCollectedDate! > l.supplierGad!).map((l) => l.id);
    console.log(`${dryRun ? "[dry run] would set" : "set"} supplier on-time to true on ${toTrue.length} lines and to false on ${toFalse.length} lines (of ${lines.length} checked)`);
    if (!dryRun) {
      for (const c of chunks(toTrue, 500)) await tx.projectLine.updateMany({ where: { id: { in: c } }, data: { supplierOnTime: true } });
      for (const c of chunks(toFalse, 500)) await tx.projectLine.updateMany({ where: { id: { in: c } }, data: { supplierOnTime: false } });
    }

    const test = await tx.project.findMany({ where: { organizationId: me, referenceNumber: "E2E-PACK-001", isArchived: false }, select: { id: true } });
    console.log(`${dryRun ? "[dry run] would archive" : "archived"} ${test.length} test project(s) (E2E-PACK-001)`);
    if (!dryRun && test.length) await tx.project.updateMany({ where: { id: { in: test.map((t) => t.id) } }, data: { isArchived: true, archivedAt: new Date() } });
  });
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
