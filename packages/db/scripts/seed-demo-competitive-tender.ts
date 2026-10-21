import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * A second simulated tender, SIM-TND-002 (2026-10-21, requested by Lewis): a competitive RFQ issued by Andean Care Alliance 106 with standstill
 * switched on, three simulated competing bidders who have already SUBMITTED sealed bids (one of which will fail the licence gate), and a complete
 * DRAFT bid for Universe Demo, priced to rank second. Everything is on the hash-chained timeline. Nothing is opened or evaluated here; the demo
 * organisation submits its own bid, then time is advanced and evaluation seeded with the existing scripts. DRY_RUN defaults to true. Idempotent.
 * Note: simulated bidders are not demo organisations, so these invitations are seeded directly (the app would not let a demo issuer invite them).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000, HOUR = 3600000;
const REF = process.env.TENDER_REF || "SIM-TND-002";
const OFFSET = Number(process.env.PRODUCT_OFFSET || 0);           // picks different products for further tenders
const TITLE = process.env.TENDER_TITLE || "Supply of antimalarial and diagnostic supplies (simulated RFQ)";
const SINGLE_EVALUATOR = (process.env.SINGLE_EVALUATOR ?? "false") === "true"; // allow one evaluator (chair only), for walkthroughs
const SUBMIT_DEMO = (process.env.SUBMIT_DEMO ?? "false") === "true";           // also submit Universe Demo's bid
const QTY = [9000, 6000, 1500];
// profile tag (read by the evaluation seed from the bid notes), unit prices per line, lead times, origin, manufacturer
const COMPETITORS = [
  { tag: "A", prices: [1.2, 3.1, 24.0], leads: [30, 35, 49], origin: "IN", mfr: "Medisource Labs (simulated)" },
  { tag: "B", prices: [1.4, 3.6, 27.0], leads: [42, 45, 60], origin: "CN", mfr: "Eastgate Pharma (simulated)" },
  { tag: "C", prices: [1.15, 3.0, 22.0], leads: [28, 32, 45], origin: "PK", mfr: "Rapidform Industries (simulated)" },
] as const;
const UD = { tag: "UD", prices: [1.28, 3.25, 25.5], leads: [33, 38, 52], origin: "TR", mfr: "Anadolu Medical (simulated)" };
const TEXTS = [
  "Wholesale distribution licence on file (simulated), issued by the national medicines regulator, valid to 2028.",
  "Every item meets the stated specification and holds a current registration in the destination country; certificates of analysis accompany each batch.",
  "Consolidated sea freight, ambient storage throughout, batch documentation and independent pre-shipment inspection.",
];

interface Fields {
  prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null;
  actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date;
}
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");
const r2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    const issuer = await tx.organization.findFirst({ where: { name: "Andean Care Alliance 106", isSimulated: true }, select: { id: true, name: true } });
    if (!demo || !issuer) throw new Error("Universe Demo or Andean Care Alliance 106 not found.");
    const rivals = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, id: { not: issuer.id }, type: { in: ["SUPPLIER", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 3, select: { id: true, name: true } });
    if (rivals.length < 3) throw new Error("Need three simulated supplier/manufacturer organisations.");
    const existing = await tx.tender.findFirst({ where: { organizationId: issuer.id, referenceNumber: REF }, select: { id: true } });
    if (existing) { console.log(`${REF} already exists (${existing.id}); nothing to do.`); return; }
    const products = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 40, select: { id: true, name: true } });
    const chosen = [products[6 + OFFSET], products[22 + OFFSET], products[35 - OFFSET]].filter(Boolean);
    if (chosen.length < 3) throw new Error("Not enough simulated products.");
    console.log(`Issuer ${issuer.name}; bidders: Universe Demo (draft), ${rivals.map((r, i) => `${r.name} (${COMPETITORS[i].tag}${COMPETITORS[i].tag === "C" ? ", will fail the gate" : ""})`).join(", ")}.`);
    if (dryRun) { console.log(`DRY RUN: would create ${REF} with 4 invitations, 3 submitted competing bids and a draft bid for Universe Demo.`); return; }

    const now = new Date();
    const pub = new Date(now.getTime() - DAY);
    const t = await tx.tender.create({ data: {
      organizationId: issuer.id, referenceNumber: REF, title: TITLE,
      summary: "Simulated competitive request for quotation for three items delivered to Nairobi, with a standstill period before contract award. Several organisations have bid.",
      tenderType: "RFQ", visibility: "INVITED_ONLY", visibleToAll: false, isPublished: true, status: "PUBLISHED", publishedAt: pub,
      deliveryCountryCodes: "KE", currency: "USD", incoterm: "DAP", clientName: "Simulated client",
      clarificationDeadline: new Date(now.getTime() + 2 * DAY), closingAt: new Date(now.getTime() + 5 * DAY), evaluationDueAt: new Date(now.getTime() + 12 * DAY), awardDueAt: new Date(now.getTime() + 18 * DAY),
      bidValidityDays: 90, timeZone: "Europe/London", isSimulated: true,
      standstillEnabled: true, standstillWorkingDays: 8, requireIntegrityPledge: true, requireExclusionDeclaration: true,
      ...(SINGLE_EVALUATOR ? { allowSingleEvaluator: true, singleEvaluatorReason: "Below the organisation's financial threshold (simulated)." } : {}),
    } });
    for (let i = 0; i < 3; i++) await tx.tenderLine.create({ data: { organizationId: issuer.id, tenderId: t.id, lineNumber: i + 1, productMasterId: chosen[i].id, description: chosen[i].name, quantity: QTY[i], unit: "pack", destinationCountryCode: "KE", minShelfLifePercent: 75, coldChainRequired: false } });
    const crit = [
      { title: "Valid wholesale or manufacturing licence", kind: "GATE", weight: null, isMandatory: true, responseFormat: "EITHER", metric: "MANUAL", description: "State the licence number and issuing authority, or upload a copy." },
      { title: "Technical compliance with the specification", kind: "SCORED", weight: 30, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Explain how each item meets the stated specification and registrations." },
      { title: "Delivery plan and quality assurance", kind: "SCORED", weight: 20, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Describe shipment planning, handling controls and batch documentation." },
      { title: "Price", kind: "SCORED", weight: 50, isMandatory: true, responseFormat: "TEXT", metric: "PRICE", description: "Scored automatically from the prices you enter." },
    ];
    const criteria: { id: string; kind: string; metric: string }[] = [];
    for (let i = 0; i < crit.length; i++) criteria.push(await tx.tenderCriterion.create({ data: { organizationId: issuer.id, tenderId: t.id, sortOrder: i, ...crit[i], weight: crit[i].weight as never } }));
    const lines = await tx.tenderLine.findMany({ where: { tenderId: t.id }, orderBy: { lineNumber: "asc" }, select: { id: true } });
    const manual = criteria.filter((c) => c.metric === "MANUAL");

    type Ev = { at: Date; kind: string; summary: string; org: string; cp: string | null; actor: string; details?: unknown };
    const events: Ev[] = [{ at: new Date(pub.getTime() - 26 * HOUR), kind: "CREATED", summary: `Draft ${REF} created`, org: issuer.id, cp: null, actor: issuer.id }];
    const bidders = [{ id: demo.id, ...UD }, ...rivals.map((r, i) => ({ id: r.id, ...COMPETITORS[i] }))];
    bidders.forEach((b, i) => events.push({ at: new Date(pub.getTime() - 25 * HOUR + i * 60000), kind: "INVITED", summary: "An organisation was invited", org: issuer.id, cp: b.id, actor: issuer.id }));
    events.push({ at: pub, kind: "PUBLISHED", summary: `Published ${REF}`, org: issuer.id, cp: null, actor: issuer.id, details: { simulated: true, title: t.title } });
    bidders.forEach((b, i) => events.push({ at: new Date(pub.getTime() + (2 + i) * HOUR), kind: "INTEREST_EXPRESSED", summary: "An organisation expressed interest", org: issuer.id, cp: b.id, actor: b.id, details: { integrityPledge: true, exclusionDeclared: true, exclusionGrounds: [] } }));

    for (const b of bidders) {
      const optedInAt = new Date(pub.getTime() + 3 * HOUR);
      await tx.tenderInvitation.create({ data: { organizationId: issuer.id, tenderId: t.id, invitedOrganizationId: b.id } });
      await tx.tenderParticipation.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, tenderId: t.id, status: "INTERESTED", optedInAt, integrityPledgeAt: optedInAt, exclusionDeclaredAt: optedInAt, exclusionNoGrounds: true } });
      const submitted = b.tag !== "UD" || SUBMIT_DEMO;
      const total = r2(b.prices.reduce((s, p, i) => s + p * QTY[i], 0));
      const submittedAt = new Date(pub.getTime() + (10 + bidders.indexOf(b) * 4) * HOUR);
      const bid = await tx.tenderBid.create({ data: {
        organizationId: b.id, issuerOrganizationId: issuer.id, tenderId: t.id, status: submitted ? "SUBMITTED" : "DRAFT", bidCurrency: "USD", validityConfirmed: true, validityDays: 90,
        notes: `SIM-PROFILE:${b.tag}`, ...(submitted ? { fxRate: 1, fxRateDate: submittedAt, totalBidCurrency: total, totalTenderCurrency: total, submittedAt } : {}),
      } });
      for (let i = 0; i < 3; i++) await tx.tenderBidLine.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: t.id, tenderLineId: lines[i].id, noBid: false, unitPrice: b.prices[i], leadTimeDays: b.leads[i], countryOfOrigin: b.origin, manufacturerName: b.mfr, remarks: "Delivered duty paid, ambient." } });
      for (let i = 0; i < manual.length; i++) await tx.tenderBidResponse.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: t.id, criterionId: manual[i].id, text: TEXTS[i] } });
      if (submitted) events.push({ at: submittedAt, kind: "BID_SUBMITTED", summary: "A bid was submitted", org: issuer.id, cp: b.id, actor: b.id });
    }
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    let prev: string | null = null;
    for (const e of events) {
      const row: Fields = { prevHash: prev, id: randomUUID(), tenderId: t.id, organizationId: e.org, counterpartyOrganizationId: e.cp, actorOrganizationId: e.actor, actorUserId: null, kind: e.kind, summary: e.summary, detailsJson: e.details ? JSON.stringify(e.details) : null, createdAt: e.at };
      const hash = eventHash(row);
      await tx.tenderEvent.create({ data: { ...row, hash } });
      prev = hash;
    }
    console.log(`Created ${REF} (${t.id}) with ${events.length} chained events.`);
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
