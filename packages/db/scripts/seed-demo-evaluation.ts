import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Simulates a completed evaluation for the simulated tender SIM-TND-001 (2026-10-21, requested by Lewis). Evaluators act as themselves in the
 * app and must be real users of the issuing organisation, so for this demo two SIMULATED users of the issuer take the roles: one chair and
 * one evaluator. It assigns them, records their no-conflict declarations, starts evaluation, records the gate result, submits both evaluators'
 * scores for the manual criteria, and finalises scoring exactly as the API does (average of evaluators for manual criteria; the calculated
 * price score, 100 for the lowest compliant price), with a hash-chained timeline event for each step. Leaves the tender ready for the issuer to
 * record the award. Refuses a tender that is not simulated or whose bids are not yet open. TENDER_REF defaults to SIM-TND-001. DRY_RUN defaults to
 * true. Idempotent (does nothing once evaluation has started).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const REF = process.env.TENDER_REF ?? "SIM-TND-001";

interface Fields {
  prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null;
  actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date;
}
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const t = await tx.tender.findFirst({ where: { referenceNumber: REF } });
    if (!t) throw new Error(`${REF} not found`);
    if (!t.isSimulated) throw new Error(`${REF} is not a simulated tender; refusing.`);
    if (!t.bidsOpenedAt) throw new Error("Open the bids first (as the issuer, in the app).");
    if (t.evaluationStartedAt) { console.log(`${REF}: evaluation has already started; nothing to do.`); return; }
    const users = await tx.user.findMany({ where: { organizationId: t.organizationId, status: "ACTIVE", isSimulated: true }, orderBy: [{ email: "asc" }], select: { id: true, forename: true, surname: true }, take: 2 });
    if (users.length < 2) throw new Error("The issuing organisation needs two active simulated users to act as evaluators.");
    const [chair, evaluator] = users;
    const bids = await tx.tenderBid.findMany({ where: { tenderId: t.id, status: "SUBMITTED" }, select: { id: true, organizationId: true } });
    const criteria = await tx.tenderCriterion.findMany({ where: { tenderId: t.id }, orderBy: { sortOrder: "asc" } });
    const gates = criteria.filter((c) => c.kind === "GATE");
    const manual = criteria.filter((c) => c.kind === "SCORED" && c.metric === "MANUAL");
    const price = criteria.filter((c) => c.kind === "SCORED" && c.metric === "PRICE");
    console.log(`${REF}: ${bids.length} submitted bid(s); chair ${chair.forename} ${chair.surname}, evaluator ${evaluator.forename} ${evaluator.surname}; ${gates.length} gate(s), ${manual.length} manual and ${price.length} price criterion.`);
    if (bids.length === 0) throw new Error("No submitted bids.");
    if (dryRun) { console.log("DRY RUN: nothing written."); return; }

    // Timeline: continue the chain after its current tail, strictly later than it.
    const tail = await tx.tenderEvent.findFirst({ where: { tenderId: t.id, hash: { not: null } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    let prev = tail?.hash ?? null;
    let clock = Math.max(Date.now(), (tail?.createdAt.getTime() ?? 0) + 1000);
    const emit = async (kind: string, summary: string, actorUserId: string | null) => {
      clock += 1000;
      const row: Fields = { prevHash: prev, id: randomUUID(), tenderId: t.id, organizationId: t.organizationId, counterpartyOrganizationId: null, actorOrganizationId: t.organizationId, actorUserId, kind, summary, detailsJson: null, createdAt: new Date(clock) };
      const hash = eventHash(row);
      await tx.tenderEvent.create({ data: { ...row, hash } });
      prev = hash;
    };
    const at = () => new Date(clock);

    await tx.tenderEvaluator.create({ data: { organizationId: t.organizationId, tenderId: t.id, userId: chair.id, role: "CHAIR" } });
    await tx.tenderEvaluator.create({ data: { organizationId: t.organizationId, tenderId: t.id, userId: evaluator.id, role: "EVALUATOR" } });
    await emit("EVALUATORS_ASSIGNED", "Evaluators assigned (2)", null);
    for (const u of [chair, evaluator]) {
      await tx.tenderEvaluator.updateMany({ where: { tenderId: t.id, userId: u.id }, data: { coiDeclaredAt: at(), coiNoConflict: true, coiBidderIds: "" } });
      await emit("COI_DECLARED", "An evaluator declared no conflict of interest", u.id);
    }
    await tx.tender.update({ where: { id: t.id }, data: { status: "EVALUATING", evaluationStartedAt: at() } });
    await emit("EVALUATION_STARTED", "Evaluation started", null);

    const sets: Record<string, [number, string][]> = { chair: [[82, "Meets the specification on all three lines; registration evidence supplied."], [78, "Credible delivery plan with independent pre-shipment inspection."]], eval: [[80, "Specification met; minor gaps in stability data."], [74, "Sound plan; contingency for delays could be firmer."]] };
    for (const b of bids) {
      for (const g of gates) await tx.tenderBidGate.create({ data: { organizationId: t.organizationId, tenderId: t.id, bidId: b.id, criterionId: g.id, passed: true, notes: "Licence verified (simulated).", recordedById: chair.id, recordedAt: at() } });
      const moderated: { criterionId: string; score: number; rationale: string; isCalculated: boolean }[] = [];
      for (let i = 0; i < manual.length; i++) {
        const a = sets.chair[i % 2], e = sets.eval[i % 2];
        for (const [u, s] of [[chair, a], [evaluator, e]] as const) {
          await tx.tenderBidScore.create({ data: { organizationId: t.organizationId, tenderId: t.id, bidId: b.id, criterionId: manual[i].id, evaluatorUserId: u.id, score: s[0], rationale: s[1], submittedAt: at() } });
        }
        moderated.push({ criterionId: manual[i].id, score: (a[0] + e[0]) / 2, rationale: "Average of the evaluators' scores.", isCalculated: false });
      }
      for (const p of price) moderated.push({ criterionId: p.id, score: 100, rationale: "Calculated: lowest compliant price scores 100.", isCalculated: true });
      for (const m of moderated) await tx.tenderModeratedScore.create({ data: { organizationId: t.organizationId, tenderId: t.id, bidId: b.id, ...m, recordedById: chair.id, recordedAt: at() } });
    }
    await tx.tender.update({ where: { id: t.id }, data: { scoringFinalisedAt: at() } });
    await emit("SCORING_FINALISED", "Scoring finalised", chair.id);
    console.log("Evaluation simulated and scoring finalised; ready for the award.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
