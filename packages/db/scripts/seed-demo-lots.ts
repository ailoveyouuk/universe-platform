import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Splits the items of a SIMULATED tender into two lots so lots can be shown and tried (step 7, 2026-10-21). Items in the first half become
 * Lot 1, the rest Lot 2. Only labels change (lot number and title); prices, bids and scores are untouched. Refuses a tender owned by a
 * non-simulated organisation. TENDER_REF defaults to SIM-TND-003. DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const REF = process.env.TENDER_REF ?? "SIM-TND-003";
const TITLES = [process.env.LOT1_TITLE ?? "Essential medicines", process.env.LOT2_TITLE ?? "Consumables and supplies"];

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const t = await tx.tender.findFirst({ where: { referenceNumber: REF } });
    if (!t) throw new Error(`Tender ${REF} not found.`);
    const owner = await tx.organization.findUnique({ where: { id: t.organizationId }, select: { name: true, isSimulated: true } });
    if (!owner?.isSimulated) throw new Error(`Refusing: ${REF} is not owned by a simulated organisation.`);
    const lines = await tx.tenderLine.findMany({ where: { tenderId: t.id }, orderBy: { lineNumber: "asc" } });
    if (lines.length < 2) throw new Error(`${REF} has fewer than two items; nothing to split.`);
    const half = Math.ceil(lines.length / 2);
    for (const [i, l] of lines.entries()) {
      const n = i < half ? 1 : 2;
      console.log(`${dryRun ? "[dry run] " : ""}${REF} item ${l.lineNumber} -> lot ${n} (${TITLES[n - 1]})`);
      if (!dryRun) await tx.tenderLine.update({ where: { id: l.id }, data: { lotNumber: n, lotTitle: TITLES[n - 1] } });
    }
  });
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
