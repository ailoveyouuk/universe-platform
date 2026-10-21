import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Gives the demo supplier a visible performance band (2026-10-21, requested by Lewis). An aggregate only shows from 3 closed contracts across 2 owners,
 * so this adds two SIMULATED historical contracts, each owned by a different simulated organisation (not a demo organisation), completed and
 * closed with a frozen performance record, next to the record already created on SIM-TND-001. Each historical tender is an archived, unpublished
 * simulated stub (SIM-HIST-n) so it never appears in tender lists. Refuses non-simulated organisations. SUPPLIER_NAME defaults to "Universe Demo".
 * DRY_RUN defaults to true. Idempotent (skips a reference that already exists).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const SUPPLIER_NAME = process.env.SUPPLIER_NAME ?? "Universe Demo";

const metric = (key: string, label: string, group: string, weight: number, display: string, score: number | null, status: string, detail: string) => ({ key, label, group, weight, display, score, status, detail, benchmark: null, href: null });
const HISTORY = [
  { n: 1, months: 14, title: "Historical supply of essential medicines (simulated)", value: 182000, score: 92, band: "STRONG", onTime: 100, inFull: 96, otif: 95, ms: [4, 4], fb: 4.6,
    measures: () => [
      metric("on_time", "On-time delivery", "DELIVERY", 20, "100%", 100, "good", "6 of 6 deliveries on time."), metric("in_full", "In-full delivery", "DELIVERY", 15, "96%", 96, "good", "6 of 6 deliveries in full (simulated history)."),
      metric("otif", "On-time in-full (OTIF)", "DELIVERY", 10, "95%", 95, "good", "Simulated history."), metric("milestones", "Contract milestones met", "DELIVERY", 20, "100%", 100, "good", "4 of 4 milestones done on or before the due date."),
      metric("owner_feedback", "Tender owner's feedback", "DELIVERY", 20, "4.6 of 5", 90, "good", "Average of five ratings given by the tender owner at close."),
      metric("quality", "Quality complaints", "QUALITY", 15, "No complaints", 100, "good", "The tender owner confirmed there were no quality complaints on this contract."),
      metric("cold_chain", "Cold chain", "QUALITY", 10, "0 of 12 logs", 100, "good", "0 temperature excursions across 12 linked logs."),
    ] },
  { n: 2, months: 8, title: "Historical supply of laboratory consumables (simulated)", value: 64500, score: 88, band: "STRONG", onTime: 92, inFull: 100, otif: 92, ms: [3, 3], fb: 4.2,
    measures: () => [
      metric("on_time", "On-time delivery", "DELIVERY", 20, "92%", 92, "warning", "11 of 12 deliveries on time."), metric("in_full", "In-full delivery", "DELIVERY", 15, "100%", 100, "good", "12 of 12 deliveries in full (simulated history)."),
      metric("otif", "On-time in-full (OTIF)", "DELIVERY", 10, "92%", 92, "good", "Simulated history."), metric("milestones", "Contract milestones met", "DELIVERY", 20, "100%", 100, "good", "3 of 3 milestones done on or before the due date."),
      metric("owner_feedback", "Tender owner's feedback", "DELIVERY", 20, "4.2 of 5", 80, "good", "Average of five ratings given by the tender owner at close."),
      metric("quality", "Quality complaints", "QUALITY", 15, "1 upheld of 1", 70, "warning", "1 complaint linked: 1 concluded, 0.5 upheld."), metric("cold_chain", "Cold chain", "QUALITY", 10, "Not measured", null, "neutral", "No temperature logs were linked to this contract."),
    ] },
];

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const supplier = await tx.organization.findFirst({ where: { name: SUPPLIER_NAME } });
    if (!supplier) throw new Error(`Organisation "${SUPPLIER_NAME}" not found.`);
    const existing = await tx.tenderPerformanceRecord.findMany({ where: { awardedOrganizationId: supplier.id }, select: { organizationId: true } });
    const used = new Set([supplier.id, ...existing.map((e) => e.organizationId)]);
    const owners = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, id: { notIn: [...used] } }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 10 });
    console.log(`Supplier ${supplier.name}: ${existing.length} existing record(s) from ${new Set(existing.map((e) => e.organizationId)).size} owner(s). Candidate simulated owners: ${owners.map((o) => o.name).join(", ") || "none"}.`);
    if (owners.length < HISTORY.length) throw new Error(`Need ${HISTORY.length} simulated organisations that are not demo organisations; found ${owners.length}.`);
    if (dryRun) { console.log("DRY RUN: nothing written."); return; }
    for (const [i, h] of HISTORY.entries()) {
      const owner = owners[i];
      const ref = `SIM-HIST-${h.n}`;
      if (await tx.tender.findFirst({ where: { referenceNumber: ref, organizationId: owner.id } }) || await tx.tenderContract.findFirst({ where: { reference: `CON-${ref}-1` } })) { console.log(`${ref}: already exists; skipped.`); continue; }
      const closed = new Date(); closed.setMonth(closed.getMonth() - h.months + 4);
      const started = new Date(closed); started.setMonth(started.getMonth() - 4);
      const tender = await tx.tender.create({ data: { organizationId: owner.id, referenceNumber: ref, title: h.title, status: "CONTRACTED", isPublished: false, isSimulated: true, archivedAt: new Date(), currency: "USD", awardedAt: started, contractStartDate: started } });
      const contract = await tx.tenderContract.create({ data: { organizationId: owner.id, awardedOrganizationId: supplier.id, tenderId: tender.id, awardId: randomUUID(), reference: `CON-${ref}-1`, title: `Contract for ${h.title}`, status: "COMPLETED", currency: "USD", totalValue: h.value, startDate: started, endDate: closed, executedAt: started, closedAt: closed, closeNote: "Simulated historical contract, completed." } });
      for (let m = 0; m < h.ms[0]; m++) await tx.tenderContractMilestone.create({ data: { organizationId: owner.id, awardedOrganizationId: supplier.id, tenderId: tender.id, contractId: contract.id, title: `Delivery ${m + 1}`, status: "DONE", dueDate: new Date(started.getTime() + (m + 1) * 25 * 86_400_000), completedAt: new Date(started.getTime() + (m + 1) * 24 * 86_400_000), sortOrder: m } });
      await tx.tenderPerformanceRecord.create({ data: {
        organizationId: owner.id, awardedOrganizationId: supplier.id, tenderId: tender.id, contractId: contract.id, outcome: "COMPLETED", closedAt: closed, measuresJson: JSON.stringify(h.measures()),
        overallScore: h.score, band: h.band, coverage: 100, milestonesTotal: h.ms[0], milestonesOnTime: h.ms[1], onTimePercent: h.onTime, inFullPercent: h.inFull, otifPercent: h.otif,
        feedbackJson: JSON.stringify({ quality: 5, communication: 4, documentation: 4, flexibility: 5, wouldUseAgain: 5, reasons: {}, comment: "Simulated feedback." }), feedbackAverage: h.fb,
        replyDeadline: new Date(closed.getTime() + 14 * 86_400_000),
      } });
      console.log(`${ref}: owner ${owner.name} -> ${supplier.name}, record ${h.score}/100.`);
    }
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
