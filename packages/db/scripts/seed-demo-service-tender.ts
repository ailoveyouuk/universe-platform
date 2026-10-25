import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * A simulated SERVICES tender, SIM-SVC-001 (2026-10-25, requested by Lewis): a competitive RFQ for three standard services (an embedded adviser by
 * the day, an annual maintenance contract by the month, pre-shipment inspections by the unit) issued by Andean Care Alliance 106, two simulated
 * competing bidders who have SUBMITTED sealed bids, and a complete DRAFT bid for Universe Demo. It exists so the service tender line, the service
 * bid screen, matching and award can be shown and checked. Derived from seed-demo-competitive-tender.ts. DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000, HOUR = 3600000;
const REF = process.env.TENDER_REF || "SIM-SVC-001";
const OFFSET = Number(process.env.PRODUCT_OFFSET || 0);           // picks different products for further tenders
const TITLE = process.env.TENDER_TITLE || "Programme support and equipment services (simulated RFQ)";
const ISSUER_NAME = process.env.ISSUER_NAME || "Andean Care Alliance 106";   // "Universe Demo" makes the demo organisation the issuer, so Lewis can run the whole issuer side in the app
const SINGLE_EVALUATOR = (process.env.SINGLE_EVALUATOR ?? "false") === "true"; // allow one evaluator (chair only), for walkthroughs
const DEMO_FRESH = (process.env.DEMO_FRESH ?? "false") === "true";           // Universe Demo is only invited: no interest, no bid (to try registering interest live)
const SUBMIT_DEMO = (process.env.SUBMIT_DEMO ?? "false") === "true";           // also submit Universe Demo's bid
const QTY = [120, 12, 40];
// the three standard services on the tender: catalogue code, kind of service, pricing basis, unit label
const SERVICES = [
  { code: "SVC-TA-ADVISER", category: "TECHNICAL_ASSISTANCE", basis: "PER_DAY", unit: "day", name: "Embedded technical adviser" },
  { code: "SVC-EQM-CONTRACT", category: "EQUIPMENT_MAINTENANCE", basis: "PER_MONTH", unit: "month", name: "Annual maintenance contract for cold chain equipment" },
  { code: "SVC-TST-PSI", category: "TESTING_INSPECTION", basis: "PER_UNIT", unit: "inspection", name: "Pre-shipment inspection" },
] as const;
// profile tag (read by the evaluation seed from the bid notes), unit prices per line, lead times, origin, manufacturer
const COMPETITORS = [
  { tag: "A", prices: [455, 3900, 310], leads: [14, 30, 7], origin: "KE", mfr: "" },
  { tag: "B", prices: [520, 3500, 285], leads: [21, 45, 10], origin: "KE", mfr: "" },
  { tag: "C", prices: [440, 4100, 330], leads: [10, 28, 6], origin: "KE", mfr: "" },
] as const;
const UD = { tag: "UD", prices: [480, 3650, 295], leads: [18, 35, 8], origin: "GB", mfr: "" };
const TEXTS = [
  "Registered and in good standing (simulated). Two comparable assignments completed for national programmes in the last three years.",
  "Named experts with relevant experience, a supervised work plan and monthly progress reports against agreed milestones.",
  "Start within the stated mobilisation time, a single account manager and a documented quality check on every deliverable.",
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
    const issuer = await tx.organization.findFirst({ where: { name: ISSUER_NAME, OR: [{ isSimulated: true }, { isDemo: true }] }, select: { id: true, name: true } });
    if (!demo || !issuer) throw new Error("Universe Demo or Andean Care Alliance 106 not found.");
    const rivals = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, id: { not: issuer.id }, type: { in: ["SUPPLIER", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 3, select: { id: true, name: true } });
    const demoIssues = issuer.id === demo.id;
    if (rivals.length < 3) throw new Error("Need three simulated supplier organisations.");
    const existing = await tx.tender.findFirst({ where: { organizationId: issuer.id, referenceNumber: REF }, select: { id: true } });
    if (existing) { console.log(`${REF} already exists (${existing.id}); nothing to do.`); return; }
    console.log(`Issuer ${issuer.name}; bidders: ${demoIssues ? "" : "Universe Demo (draft), "}${(demoIssues ? rivals : rivals.slice(0, 2)).map((r, i) => `${r.name} (${COMPETITORS[i].tag})`).join(", ")}.`);
    if (dryRun) { console.log(`DRY RUN: would create ${REF} with 3 invitations, 2 submitted competing bids and a draft bid for Universe Demo.`); return; }

    const now = new Date();
    const pub = new Date(now.getTime() - DAY);
    const t = await tx.tender.create({ data: {
      organizationId: issuer.id, referenceNumber: REF, title: TITLE,
      summary: "Simulated competitive request for quotation for three standard services (an embedded adviser, a maintenance contract and pre-shipment inspections) delivered in Kenya. Several organisations have bid.",
      tenderType: "RFQ", visibility: "INVITED_ONLY", visibleToAll: false, isPublished: true, status: "PUBLISHED", publishedAt: pub,
      deliveryCountryCodes: "KE", currency: "USD", incoterm: "DAP", clientName: "Simulated client",
      clarificationDeadline: new Date(now.getTime() + 2 * DAY), closingAt: new Date(now.getTime() + (DEMO_FRESH ? 20 : 5) * DAY), evaluationDueAt: new Date(now.getTime() + (DEMO_FRESH ? 27 : 12) * DAY), awardDueAt: new Date(now.getTime() + (DEMO_FRESH ? 33 : 18) * DAY),
      bidValidityDays: 90, timeZone: "Europe/London", isSimulated: true,
      standstillEnabled: false, requireIntegrityPledge: true, requireExclusionDeclaration: true,
      ...(SINGLE_EVALUATOR ? { allowSingleEvaluator: true, singleEvaluatorReason: "Below the organisation's financial threshold (simulated)." } : {}),
    } });
    for (let i = 0; i < 3; i++) await tx.tenderLine.create({ data: { organizationId: issuer.id, tenderId: t.id, lineNumber: i + 1, description: SERVICES[i].name, quantity: QTY[i], unit: SERVICES[i].unit, destinationCountryCode: "KE", coldChainRequired: false, serviceCategory: SERVICES[i].category, servicePricingBasis: SERVICES[i].basis, serviceCode: SERVICES[i].code } });
    const crit = [
      { title: "Evidence of registration and relevant experience", kind: "GATE", weight: null, isMandatory: true, responseFormat: "EITHER", metric: "MANUAL", description: "State your registration number and give two comparable assignments, or upload a copy." },
      { title: "Technical approach and staffing", kind: "SCORED", weight: 30, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Explain how you will deliver each service, who will do it and how quality is checked." },
      { title: "Mobilisation plan and quality assurance", kind: "SCORED", weight: 20, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Describe how soon you can start, reporting arrangements and quality control." },
      { title: "Price", kind: "SCORED", weight: 50, isMandatory: true, responseFormat: "TEXT", metric: "PRICE", description: "Scored automatically from the prices you enter." },
    ];
    const criteria: { id: string; kind: string; metric: string }[] = [];
    for (let i = 0; i < crit.length; i++) criteria.push(await tx.tenderCriterion.create({ data: { organizationId: issuer.id, tenderId: t.id, sortOrder: i, ...crit[i], weight: crit[i].weight as never } }));
    const lines = await tx.tenderLine.findMany({ where: { tenderId: t.id }, orderBy: { lineNumber: "asc" }, select: { id: true } });
    const manual = criteria.filter((c) => c.metric === "MANUAL");

    type Ev = { at: Date; kind: string; summary: string; org: string; cp: string | null; actor: string; details?: unknown };
    const events: Ev[] = [{ at: new Date(pub.getTime() - 26 * HOUR), kind: "CREATED", summary: `Draft ${REF} created`, org: issuer.id, cp: null, actor: issuer.id }];
    const bidders = [...(demoIssues ? [] : [{ id: demo.id, ...UD }]), ...(demoIssues ? rivals : rivals.slice(0, 2)).map((r, i) => ({ id: r.id, ...COMPETITORS[i] }))];
    bidders.forEach((b, i) => events.push({ at: new Date(pub.getTime() - 25 * HOUR + i * 60000), kind: "INVITED", summary: "An organisation was invited", org: issuer.id, cp: b.id, actor: issuer.id }));
    events.push({ at: pub, kind: "PUBLISHED", summary: `Published ${REF}`, org: issuer.id, cp: null, actor: issuer.id, details: { simulated: true, title: t.title } });
    bidders.filter((b) => !(DEMO_FRESH && b.tag === "UD")).forEach((b, i) => events.push({ at: new Date(pub.getTime() + (2 + i) * HOUR), kind: "INTEREST_EXPRESSED", summary: "An organisation expressed interest", org: issuer.id, cp: b.id, actor: b.id, details: { integrityPledge: true, exclusionDeclared: true, exclusionGrounds: [] } }));

    for (const b of bidders) {
      const optedInAt = new Date(pub.getTime() + 3 * HOUR);
      await tx.tenderInvitation.create({ data: { organizationId: issuer.id, tenderId: t.id, invitedOrganizationId: b.id } });
      if (DEMO_FRESH && b.tag === "UD") continue;
      await tx.tenderParticipation.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, tenderId: t.id, status: "INTERESTED", optedInAt, integrityPledgeAt: optedInAt, exclusionDeclaredAt: optedInAt, exclusionNoGrounds: true } });
      const submitted = b.tag !== "UD" || SUBMIT_DEMO;
      const total = r2(b.prices.reduce((s, p, i) => s + p * QTY[i], 0));
      const submittedAt = new Date(pub.getTime() + (10 + bidders.indexOf(b) * 4) * HOUR);
      const bid = await tx.tenderBid.create({ data: {
        organizationId: b.id, issuerOrganizationId: issuer.id, tenderId: t.id, status: submitted ? "SUBMITTED" : "DRAFT", bidCurrency: "USD", validityConfirmed: true, validityDays: 90,
        notes: `SIM-PROFILE:${b.tag}`, ...(submitted ? { fxRate: 1, fxRateDate: submittedAt, totalBidCurrency: total, totalTenderCurrency: total, submittedAt } : {}),
      } });
      for (let i = 0; i < 3; i++) await tx.tenderBidLine.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: t.id, tenderLineId: lines[i].id, noBid: false, unitPrice: b.prices[i], leadTimeDays: b.leads[i], remarks: `Rate per ${SERVICES[i].unit}, all expenses included.` } });
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
