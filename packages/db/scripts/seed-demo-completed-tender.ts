import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * A fully completed simulated tender owned by Universe Demo (2026-10-22, requested by Lewis): SIM-TND-004, from invitation through sealed bids,
 * opening, evaluation, award, debriefs, a signed contract with milestones and paid invoices, closure, and a frozen performance record, so the
 * demo organisation can see the tender-owner side of the whole lifecycle (its other completed tenders are ones it supplied). Three simulated
 * rivals bid; one fails the licence gate; the best-scoring bid wins. Everything is on the hash-chained timeline, in time order, with the user
 * running the tender being the first active user of the owner. No standstill (as SIM-TND-001). DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const OWNER_NAME = process.env.OWNER_NAME ?? "Universe Demo";
const REF = process.env.TENDER_REF ?? "SIM-TND-004";
const DAY = 86_400_000, HOUR = 3_600_000;
const QTY = [8000, 5000, 1200];
const BIDDERS = [
  { tag: "A", prices: [1.22, 3.05, 23.5], leads: [28, 33, 45], origin: "IN", mfr: "Medisource Labs (simulated)", chair: [90, 85] },
  { tag: "B", prices: [1.38, 3.55, 26.5], leads: [40, 44, 58], origin: "CN", mfr: "Eastgate Pharma (simulated)", chair: [72, 66] },
  { tag: "C", prices: [1.15, 2.95, 22.0], leads: [27, 31, 44], origin: "PK", mfr: "Rapidform Industries (simulated)", chair: [0, 0] },
] as const;
const TEXTS = ["Wholesale distribution licence on file (simulated), valid to 2028.", "Every item meets the stated specification and holds a current registration in the destination country.", "Consolidated sea freight, ambient storage, batch documentation and independent pre-shipment inspection."];

interface Fields { prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null; actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date }
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");
const r2 = (n: number) => Math.round(n * 100) / 100;
const metric = (key: string, label: string, group: string, weight: number, display: string, score: number | null, status: string, detail: string) => ({ key, label, group, weight, display, score, status, detail, benchmark: null, href: null });

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const owner = await tx.organization.findFirst({ where: { name: OWNER_NAME, isDemo: true }, select: { id: true, name: true } });
    if (!owner) throw new Error(`Demo organisation "${OWNER_NAME}" not found.`);
    if (await tx.tender.findFirst({ where: { organizationId: owner.id, referenceNumber: REF }, select: { id: true } })) { console.log(`${REF} already exists; nothing to do.`); return; }
    const user = await tx.user.findFirst({ where: { organizationId: owner.id, status: "ACTIVE" }, orderBy: { email: "asc" }, select: { id: true, forename: true, surname: true } });
    if (!user) throw new Error("The owner has no active user to act as chair.");
    const rivals = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, type: { in: ["SUPPLIER", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], skip: 3, take: 3, select: { id: true, name: true } });
    if (rivals.length < 3) throw new Error("Need three simulated supplier organisations.");
    const products = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 40, select: { id: true, name: true } });
    const chosen = [products[9], products[17], products[30]].filter(Boolean);
    if (chosen.length < 3) throw new Error("Not enough simulated products.");
    console.log(`Owner ${owner.name}, chair ${user.forename} ${user.surname}; bidders ${rivals.map((r, i) => `${r.name} (${BIDDERS[i].tag})`).join(", ")}; winner ${rivals[0].name}.`);
    if (dryRun) { console.log("DRY RUN: nothing written."); return; }

    const now = Date.now();
    const at = (daysAgo: number, hours = 0) => new Date(now - daysAgo * DAY + hours * HOUR);
    const pub = at(80), closing = at(58), opened = at(58, 1), awardedAt = at(44), execAt = at(41), start = at(40), end = at(6), closedAt = at(4);
    const t = await tx.tender.create({ data: {
      organizationId: owner.id, referenceNumber: REF, title: "Supply of paediatric antimalarials and rapid tests (simulated, completed)",
      summary: "A simulated competitive request for quotation, taken through evaluation, award, contract, delivery and closure.",
      tenderType: "RFQ", visibility: "INVITED_ONLY", visibleToAll: false, isPublished: true, status: "CONTRACTED", publishedAt: pub,
      deliveryCountryCodes: "KE", currency: "USD", incoterm: "DAP", clientName: "Simulated client", clarificationDeadline: at(66), closingAt: closing, evaluationDueAt: at(50), awardDueAt: at(45),
      bidValidityDays: 90, timeZone: "Europe/London", isSimulated: true, standstillEnabled: false, requireIntegrityPledge: true, requireExclusionDeclaration: true,
      allowSingleEvaluator: true, singleEvaluatorReason: "Below the organisation's financial threshold (simulated).",
      bidsOpenedAt: opened, evaluationStartedAt: at(55), scoringFinalisedAt: at(46), awardedAt, contractStartDate: start,
    } });
    for (let i = 0; i < 3; i++) await tx.tenderLine.create({ data: { organizationId: owner.id, tenderId: t.id, lineNumber: i + 1, productMasterId: chosen[i].id, description: chosen[i].name, quantity: QTY[i], unit: "pack", destinationCountryCode: "KE", minShelfLifePercent: 75, coldChainRequired: false } });
    const crit = [
      { title: "Valid wholesale or manufacturing licence", kind: "GATE", weight: null, isMandatory: true, responseFormat: "EITHER", metric: "MANUAL", description: "State the licence number and issuing authority, or upload a copy." },
      { title: "Technical compliance with the specification", kind: "SCORED", weight: 30, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Explain how each item meets the stated specification." },
      { title: "Delivery plan and quality assurance", kind: "SCORED", weight: 20, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Describe shipment planning and handling controls." },
      { title: "Price", kind: "SCORED", weight: 50, isMandatory: true, responseFormat: "TEXT", metric: "PRICE", description: "Scored automatically from the prices you enter." },
    ];
    const criteria = [];
    for (let i = 0; i < crit.length; i++) criteria.push(await tx.tenderCriterion.create({ data: { organizationId: owner.id, tenderId: t.id, sortOrder: i, ...crit[i], weight: crit[i].weight as never } }));
    const lines = await tx.tenderLine.findMany({ where: { tenderId: t.id }, orderBy: { lineNumber: "asc" }, select: { id: true } });
    const gate = criteria[0]; const manual = [criteria[1], criteria[2]]; const priceC = criteria[3];

    type Ev = { at: Date; kind: string; summary: string; cp: string | null; actor: string; byUser?: boolean; details?: unknown };
    const ev: Ev[] = [{ at: at(81), kind: "CREATED", summary: `Draft ${REF} created`, cp: null, actor: owner.id, byUser: true }];
    const totals: number[] = [];
    const bidIds: string[] = [];
    for (const [i, r] of rivals.entries()) {
      const b = BIDDERS[i];
      const total = r2(b.prices.reduce((s, p, k) => s + p * QTY[k], 0)); totals.push(total);
      const sub = at(63 - i, 3 * i);
      ev.push({ at: at(80.5, i / 60), kind: "INVITED", summary: "An organisation was invited", cp: r.id, actor: owner.id, byUser: true });
      ev.push({ at: at(79, i), kind: "INTEREST_EXPRESSED", summary: "An organisation expressed interest", cp: r.id, actor: r.id, details: { integrityPledge: true, exclusionDeclared: true, exclusionGrounds: [] } });
      ev.push({ at: sub, kind: "BID_SUBMITTED", summary: "A bid was submitted", cp: r.id, actor: r.id });
      await tx.tenderInvitation.create({ data: { organizationId: owner.id, tenderId: t.id, invitedOrganizationId: r.id } });
      await tx.tenderParticipation.create({ data: { organizationId: r.id, issuerOrganizationId: owner.id, tenderId: t.id, status: "INTERESTED", optedInAt: at(79, i), integrityPledgeAt: at(79, i), exclusionDeclaredAt: at(79, i), exclusionNoGrounds: true } });
      const bid = await tx.tenderBid.create({ data: { organizationId: r.id, issuerOrganizationId: owner.id, tenderId: t.id, status: "SUBMITTED", bidCurrency: "USD", validityConfirmed: true, validityDays: 90, notes: `SIM-PROFILE:${b.tag}`, fxRate: 1, fxRateDate: sub, totalBidCurrency: total, totalTenderCurrency: total, submittedAt: sub } });
      bidIds.push(bid.id);
      for (let k = 0; k < 3; k++) await tx.tenderBidLine.create({ data: { organizationId: r.id, issuerOrganizationId: owner.id, bidId: bid.id, tenderId: t.id, tenderLineId: lines[k].id, noBid: false, unitPrice: b.prices[k], leadTimeDays: b.leads[k], countryOfOrigin: b.origin, manufacturerName: b.mfr, remarks: "Delivered duty paid, ambient." } });
      for (let k = 0; k < 2; k++) await tx.tenderBidResponse.create({ data: { organizationId: r.id, issuerOrganizationId: owner.id, bidId: bid.id, tenderId: t.id, criterionId: manual[k].id, text: TEXTS[k + 1] } });
      await tx.tenderBidResponse.create({ data: { organizationId: r.id, issuerOrganizationId: owner.id, bidId: bid.id, tenderId: t.id, criterionId: gate.id, text: TEXTS[0] } });
    }
    ev.push({ at: pub, kind: "PUBLISHED", summary: `Published ${REF}`, cp: null, actor: owner.id, byUser: true, details: { simulated: true, title: t.title } });
    ev.push({ at: opened, kind: "BIDS_OPENED", summary: "Bids opened", cp: null, actor: owner.id, byUser: true });
    ev.push({ at: at(56), kind: "EVALUATORS_ASSIGNED", summary: "Evaluators assigned (1)", cp: null, actor: owner.id, byUser: true });
    ev.push({ at: at(55.9), kind: "COI_DECLARED", summary: "An evaluator declared no conflict of interest", cp: null, actor: owner.id, byUser: true });
    ev.push({ at: at(55), kind: "EVALUATION_STARTED", summary: "Evaluation started", cp: null, actor: owner.id, byUser: true });
    await tx.tenderEvaluator.create({ data: { organizationId: owner.id, tenderId: t.id, userId: user.id, role: "CHAIR", coiDeclaredAt: at(55.9), coiNoConflict: true, coiBidderIds: "" } });

    // Scoring: C fails the licence gate; A and B are scored. Price scores are relative to the lowest compliant total.
    const best = Math.min(totals[0], totals[1]);
    const rows: { i: number; total: number; passed: boolean; weighted: number; scores: { criterionId: string; title: string; kind: string; weight: number | null; metric: string; score: number | null; passed: boolean | null; comment: string | null }[] }[] = [];
    for (const [i, r] of rivals.entries()) {
      const b = BIDDERS[i]; const passed = b.tag !== "C"; const bidId = bidIds[i];
      await tx.tenderBidGate.create({ data: { organizationId: owner.id, tenderId: t.id, bidId, criterionId: gate.id, passed, notes: passed ? "Licence verified (simulated)." : "Licence expired before the closing date (simulated); not valid.", recordedById: user.id, recordedAt: at(54.9) } });
      const scores: (typeof rows)[number]["scores"] = [{ criterionId: gate.id, title: gate.title, kind: "GATE", weight: null, metric: "MANUAL", score: null, passed, comment: passed ? "Licence verified (simulated)." : "Licence expired before the closing date (simulated); not valid." }];
      let weighted = 0;
      if (passed) {
        for (let k = 0; k < 2; k++) {
          await tx.tenderBidScore.create({ data: { organizationId: owner.id, tenderId: t.id, bidId, criterionId: manual[k].id, evaluatorUserId: user.id, score: b.chair[k], rationale: k === 0 ? "Meets the specification on all lines." : "Credible delivery plan with inspection.", submittedAt: at(52) } });
          await tx.tenderModeratedScore.create({ data: { organizationId: owner.id, tenderId: t.id, bidId, criterionId: manual[k].id, score: b.chair[k], rationale: "Single evaluator's score.", isCalculated: false, recordedById: user.id, recordedAt: at(47) } });
          scores.push({ criterionId: manual[k].id, title: manual[k].title, kind: "SCORED", weight: Number(manual[k].weight), metric: "MANUAL", score: b.chair[k], passed: null, comment: "Single evaluator's score." });
          weighted += b.chair[k] * Number(manual[k].weight) / 100;
        }
        const ps = r2(100 * best / totals[i]);
        await tx.tenderModeratedScore.create({ data: { organizationId: owner.id, tenderId: t.id, bidId, criterionId: priceC.id, score: ps, rationale: "Calculated: lowest compliant price scores 100.", isCalculated: true, recordedById: user.id, recordedAt: at(47) } });
        scores.push({ criterionId: priceC.id, title: priceC.title, kind: "SCORED", weight: 50, metric: "PRICE", score: ps, passed: null, comment: "Calculated: lowest compliant price scores 100." });
        weighted += ps * 0.5;
      }
      rows.push({ i, total: totals[i], passed, weighted: r2(weighted), scores });
    }
    ev.push({ at: at(46), kind: "SCORING_FINALISED", summary: "Scoring finalised", cp: null, actor: owner.id, byUser: true });
    const ranked = rows.filter((x) => x.passed).sort((a, b) => b.weighted - a.weighted);
    const winner = ranked[0]; const winOrg = rivals[winner.i];
    const award = await tx.tenderAward.create({ data: { organizationId: owner.id, tenderId: t.id, bidId: bidIds[winner.i], awardedOrganizationId: winOrg.id, reason: "Highest overall score: strongest technical response and the lowest compliant price.", awardedAt, awardedById: user.id } });
    for (const l of lines) await tx.tenderAwardLine.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, awardId: award.id, tenderLineId: l.id, sharePercent: 100 } });
    for (const x of rows) await tx.tenderDebrief.create({ data: { organizationId: owner.id, tenderId: t.id, bidId: bidIds[x.i], bidderOrganizationId: rivals[x.i].id, outcome: x.i === winner.i ? "AWARDED" : x.passed ? "NOT_AWARDED" : "NOT_COMPLIANT", totalScore: x.passed ? x.weighted : null, rank: x.passed ? ranked.findIndex((y) => y.i === x.i) + 1 : null, bidCount: ranked.length, scoresJson: JSON.stringify(x.scores), releasedAt: awardedAt } });
    ev.push({ at: awardedAt, kind: "AWARD_MADE", summary: "Award made", cp: winOrg.id, actor: owner.id, byUser: true });
    ev.push({ at: new Date(awardedAt.getTime() + 60000), kind: "DEBRIEFS_RELEASED", summary: "Debriefs released to bidders", cp: null, actor: owner.id, byUser: true });

    // Contract: drafted, sent, signed by both parties, executed, delivered in three milestones, three invoices paid on time, closed.
    const value = totals[winner.i];
    const con = await tx.tenderContract.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, awardId: award.id, reference: `CON-${REF}-1`, title: `Contract for ${t.title}`, status: "COMPLETED", currency: "USD", totalValue: value, startDate: start, endDate: end, terms: "Delivery duty paid to Nairobi in three shipments; payment 30 days from invoice (simulated).", sentAt: at(43), executedAt: execAt, closedAt, closeNote: "All deliveries accepted; simulated closure.", createdById: user.id, createdAt: at(43.5) } });
    ev.push({ at: at(43.5), kind: "CONTRACT_CREATED", summary: `Contract ${con.reference} drafted`, cp: winOrg.id, actor: owner.id, byUser: true });
    ev.push({ at: at(43), kind: "CONTRACT_SENT", summary: "Contract sent to the supplier", cp: winOrg.id, actor: owner.id, byUser: true });
    await tx.tenderContractSignatory.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, contractId: con.id, party: "OWNER", signerName: `${user.forename} ${user.surname}`.trim(), signerRole: "Head of Procurement (simulated)", signedOn: at(42), recordedByOrganizationId: owner.id, recordedById: user.id, recordedAt: at(42) } });
    await tx.tenderContractSignatory.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, contractId: con.id, party: "SUPPLIER", signerName: "Simulated Supplier Director", signerRole: "Managing Director (simulated)", signedOn: execAt, recordedByOrganizationId: winOrg.id, recordedAt: execAt } });
    ev.push({ at: at(42), kind: "CONTRACT_SIGNATORY_RECORDED", summary: "Owner signatory recorded", cp: winOrg.id, actor: owner.id, byUser: true });
    ev.push({ at: execAt, kind: "CONTRACT_SIGNATORY_RECORDED", summary: "Supplier signatory recorded", cp: winOrg.id, actor: winOrg.id });
    ev.push({ at: new Date(execAt.getTime() + 60000), kind: "CONTRACT_EXECUTED", summary: `Contract ${con.reference} executed`, cp: winOrg.id, actor: owner.id });
    const ms = [{ title: "First shipment delivered", due: 30, done: 31 }, { title: "Second shipment delivered", due: 20, done: 21 }, { title: "Final shipment delivered and accepted", due: 10, done: 9 }];
    for (const [k, m] of ms.entries()) {
      await tx.tenderContractMilestone.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, contractId: con.id, title: m.title, dueDate: at(m.due), status: "DONE", completedAt: at(m.done), sortOrder: k } });
      ev.push({ at: at(m.done), kind: "MILESTONE_UPDATED", summary: `Milestone done: ${m.title}`, cp: winOrg.id, actor: owner.id, byUser: true });
    }
    const slices = [0.3, 0.3, 0.4];
    for (const [k, sl] of slices.entries()) {
      const inv = at(ms[k].done), due = new Date(inv.getTime() + 30 * DAY), paid = new Date(inv.getTime() + 24 * DAY);
      await tx.tenderContractPayment.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, contractId: con.id, reference: `INV-${REF}-${k + 1}`, description: ms[k].title, amount: r2(value * sl), currency: "USD", invoiceDate: inv, dueDate: due, paidDate: paid, recordedByOrganizationId: winOrg.id, recordedAt: inv } });
      ev.push({ at: paid, kind: "PAYMENT_LOGGED", summary: `Invoice INV-${REF}-${k + 1} paid`, cp: winOrg.id, actor: owner.id, byUser: true });
    }
    ev.push({ at: closedAt, kind: "CONTRACT_CLOSED", summary: `Contract ${con.reference} closed`, cp: winOrg.id, actor: owner.id, byUser: true });
    const measures = [
      metric("on_time", "On-time delivery", "DELIVERY", 20, "100%", 100, "good", "3 of 3 deliveries on time (simulated)."), metric("in_full", "In-full delivery", "DELIVERY", 15, "100%", 100, "good", "3 of 3 deliveries in full (simulated)."),
      metric("otif", "On-time in-full (OTIF)", "DELIVERY", 10, "100%", 100, "good", "Simulated."), metric("milestones", "Contract milestones met", "DELIVERY", 20, "67%", 67, "warning", "2 of 3 milestones done on or before the due date."),
      metric("owner_feedback", "Tender owner's feedback", "DELIVERY", 20, "4.4 of 5", 88, "good", "Average of five ratings given by the tender owner at close."),
      metric("quality", "Quality complaints", "QUALITY", 15, "No complaints", 100, "good", "The tender owner confirmed there were no quality complaints on this contract."), metric("cold_chain", "Cold chain", "QUALITY", 10, "Not measured", null, "neutral", "No temperature logs were linked to this contract."),
    ];
    await tx.tenderPerformanceRecord.create({ data: { organizationId: owner.id, awardedOrganizationId: winOrg.id, tenderId: t.id, contractId: con.id, outcome: "COMPLETED", closedAt, measuresJson: JSON.stringify(measures), overallScore: 90, band: "STRONG", coverage: 90, milestonesTotal: 3, milestonesOnTime: 2, onTimePercent: 100, inFullPercent: 100, otifPercent: 100, feedbackJson: JSON.stringify({ quality: 5, communication: 4, documentation: 4, flexibility: 5, wouldUseAgain: 4, reasons: {}, comment: "Simulated feedback." }), feedbackAverage: 4.4, replyDeadline: new Date(closedAt.getTime() + 14 * DAY), createdById: user.id } });
    ev.push({ at: new Date(closedAt.getTime() + 60000), kind: "PERFORMANCE_RECORDED", summary: "Performance record created", cp: winOrg.id, actor: owner.id, byUser: true });

    ev.sort((a, b) => a.at.getTime() - b.at.getTime());
    let prev: string | null = null;
    for (const e of ev) {
      const row: Fields = { prevHash: prev, id: randomUUID(), tenderId: t.id, organizationId: owner.id, counterpartyOrganizationId: e.cp, actorOrganizationId: e.actor, actorUserId: e.byUser ? user.id : null, kind: e.kind, summary: e.summary, detailsJson: e.details ? JSON.stringify(e.details) : null, createdAt: e.at };
      const hash = eventHash(row);
      await tx.tenderEvent.create({ data: { ...row, hash } });
      prev = hash;
    }
    console.log(`Created ${REF} (${t.id}): winner ${winOrg.name}, contract ${con.reference} ${value}, ${ev.length} chained events.`);
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
