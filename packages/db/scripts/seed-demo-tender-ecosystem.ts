import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Simulated tender ecosystem (2026-10-24, requested by Lewis): ten more tenders from a spread of simulated issuers, so Discover, Find tenders and
 * "For you" have something real to show, and the issuer views have participants and bids to look at.
 *   SIM-ECO-01..04  open, newly published (RFQ / ITT / RFP / OPEN_TENDER), with eligibility rules and a few expressions of interest
 *   SIM-ECO-05      open with an addendum (extended deadline) and a published clarification
 *   SIM-ECO-06      open, closing in three days
 *   SIM-ECO-07,08   closed, three sealed bids each, waiting for the issuer to open and evaluate
 *   SIM-ECO-09      open FRAMEWORK (24 months, rotation call-offs)
 *   SIM-ECO-10      invited only: Universe Demo and two simulated suppliers
 * Also for Universe Demo: two saved searches, three shortlist entries and tender approval settings with role limits (only where none exist).
 * Everything is simulated, deterministic, on the hash-chained timeline, and idempotent per reference. DRY_RUN defaults to true.
 * Tender documents are not seeded: they need real stored files. Awarded tenders, contracts, call-offs, price reviews and variations already exist
 * from the SIM-TND / SIM-FWK seeds.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000, HOUR = 3600000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const u = (a: number, b: number) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177; x = x ^ (x >>> 16); return ((x >>> 0) % 10000) / 10000; };

type Stage = "NEW" | "ADDENDUM" | "CLOSING" | "CLOSED" | "FRAMEWORK" | "INVITED";
interface Spec { n: number; group: string; stage: Stage; type: string; title: string; country: string; cur: string; incoterm: string; qty: number[]; productSlot: number; rules: { ruleType: string; ruleValue: string; explanation?: string; isRequired?: boolean }[]; bidders: number; interested: number }
const SPECS: Spec[] = [
  { n: 1, group: "Pharmaceuticals", stage: "NEW", type: "RFQ", title: "Supply of oral rehydration and zinc supplements", country: "KE", cur: "USD", incoterm: "DAP", qty: [40000, 25000, 8000], productSlot: 3, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }], bidders: 0, interested: 2 },
  { n: 2, group: "Diagnostics", stage: "NEW", type: "ITT", title: "Laboratory consumables and rapid diagnostic tests", country: "UG", cur: "USD", incoterm: "CIP", qty: [12000, 6000, 2500], productSlot: 9, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }, { ruleType: "QUALIFICATION", ruleValue: "ISO_13485", explanation: "Diagnostics must come from an ISO 13485 certified manufacturer." }], bidders: 0, interested: 3 },
  { n: 3, group: "Immunisation", stage: "NEW", type: "RFP", title: "Cold-chain vaccines and immunisation supplies", country: "NG", cur: "EUR", incoterm: "DAP", qty: [30000, 15000, 5000], productSlot: 15, rules: [{ ruleType: "QUALIFICATION", ruleValue: "WHO_PQ", explanation: "WHO prequalification is required for vaccines." }, { ruleType: "QUALIFICATION", ruleValue: "WHO_GDP", isRequired: false }], bidders: 0, interested: 1 },
  { n: 4, group: "Reproductive Health", stage: "NEW", type: "OPEN_TENDER", title: "Maternal and reproductive health commodities", country: "ET", cur: "USD", incoterm: "FCA", qty: [20000, 10000, 4000], productSlot: 21, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }, { ruleType: "COUNTRY", ruleValue: "IN,CN,KE,ET,GB,DE", isRequired: false }], bidders: 0, interested: 2 },
  { n: 5, group: "Water, Sanitation and Hygiene", stage: "ADDENDUM", type: "RFQ", title: "Water treatment and WASH supplies for cholera response", country: "MW", cur: "USD", incoterm: "DAP", qty: [50000, 20000, 6000], productSlot: 27, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }], bidders: 0, interested: 3 },
  { n: 6, group: "Vector Control", stage: "CLOSING", type: "RFQ", title: "Insecticide-treated nets and vector control", country: "TZ", cur: "USD", incoterm: "CIF", qty: [90000, 30000, 10000], productSlot: 5, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }], bidders: 0, interested: 3 },
  { n: 7, group: "Pharmaceuticals", stage: "CLOSED", type: "RFQ", title: "Essential antibiotics and analgesics", country: "GH", cur: "USD", incoterm: "DAP", qty: [18000, 12000, 7000], productSlot: 12, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }], bidders: 3, interested: 3 },
  { n: 8, group: "Kits and Emergency Supplies", stage: "CLOSED", type: "ITT", title: "Emergency health kits and field medical supplies", country: "SS", cur: "EUR", incoterm: "DAP", qty: [3000, 1500, 800], productSlot: 18, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }], bidders: 3, interested: 3 },
  { n: 9, group: "Nutrition", stage: "FRAMEWORK", type: "FRAMEWORK", title: "Framework for nutrition and therapeutic feeding supplies", country: "ML", cur: "USD", incoterm: "DAP", qty: [60000, 35000, 12000], productSlot: 24, rules: [{ ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER" }], bidders: 0, interested: 2 },
  { n: 10, group: "Surgical Supplies", stage: "INVITED", type: "RFQ", title: "Invited quotation: sterile surgical consumables", country: "RW", cur: "GBP", incoterm: "DAP", qty: [9000, 4000, 1800], productSlot: 30, rules: [], bidders: 0, interested: 1 },
];

interface Fields { prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null; actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date }
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");
const TEXTS = [
  "Wholesale distribution licence on file (simulated), issued by the national medicines regulator, valid to 2028.",
  "Every item meets the stated specification and holds a current registration in the destination country; certificates of analysis accompany each batch.",
  "Consolidated shipment planning, controlled storage throughout, batch documentation and independent pre-shipment inspection.",
];

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const byType = await Promise.all(["FUNDER", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT"].map((type) => tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, type }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 14, select: { id: true, name: true, type: true } })));
    const issuers: { id: string; name: string; type: string }[] = [];
    for (let i = 0; i < 14; i++) for (const list of byType) if (list[i]) issuers.push(list[i]);   // interleave so issuers differ in type
    const sellers = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, type: { in: ["SUPPLIER", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 60, select: { id: true, name: true } });
    const products = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 60, select: { id: true, name: true } });
    if (issuers.length < 10 || sellers.length < 12 || products.length < 40) throw new Error(`Not enough simulated organisations or products (issuers ${issuers.length}, sellers ${sellers.length}, products ${products.length}).`);
    console.log(`Issuer pool ${issuers.length}, seller pool ${sellers.length}, products ${products.length}.`);

    const now = new Date();
    let created = 0;
    for (const s of SPECS) {
      const ref = `SIM-ECO-${String(s.n).padStart(2, "0")}`;
      const issuer = issuers[(s.n * 3) % Math.min(issuers.length, 30)];
      const existing = await tx.tender.findFirst({ where: { organizationId: issuer.id, referenceNumber: ref }, select: { id: true } });
      if (existing) { console.log(`${ref} exists; skipped.`); continue; }
      const rivals = [0, 1, 2, 3].map((k) => sellers[(s.n * 5 + k * 7) % sellers.length]).filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
      console.log(`${ref} ${s.stage} ${s.type} by ${issuer.name} (${issuer.type}); sellers ${rivals.map((r) => r.name).join(", ")}.`);
      if (dryRun) { created++; continue; }

      const published = s.stage === "NEW" ? 2 * DAY : s.stage === "ADDENDUM" ? 10 * DAY : s.stage === "CLOSING" ? 21 * DAY : s.stage === "CLOSED" ? 35 * DAY : s.stage === "FRAMEWORK" ? 6 * DAY : 4 * DAY;
      const closeIn = s.stage === "NEW" ? 28 * DAY : s.stage === "ADDENDUM" ? 18 * DAY : s.stage === "CLOSING" ? 3 * DAY : s.stage === "CLOSED" ? -4 * DAY : s.stage === "FRAMEWORK" ? 18 * DAY : 9 * DAY;
      const pub = new Date(now.getTime() - published);
      const closing = new Date(now.getTime() + closeIn);
      const invited = s.stage === "INVITED";
      const t = await tx.tender.create({ data: {
        organizationId: issuer.id, referenceNumber: ref, title: `${s.title} (simulated)`,
        summary: `Simulated ${s.type === "OPEN_TENDER" ? "open tender" : s.type === "FRAMEWORK" ? "framework agreement" : s.type} for three product lines delivered to ${s.country}. Part of the demonstration tender ecosystem.`,
        tenderType: s.type, visibility: invited ? "INVITED_ONLY" : "ELIGIBLE_ORGANISATIONS", visibleToAll: !invited, isPublished: true, status: s.stage === "CLOSED" ? "CLOSED" : "PUBLISHED", publishedAt: pub,
        deliveryCountryCodes: `,${s.country},`, currency: s.cur, incoterm: s.incoterm, clientName: issuer.type === "PROCUREMENT_SERVICE_AGENT" ? "Simulated client" : null,
        clarificationDeadline: new Date(closing.getTime() - 7 * DAY), closingAt: closing, evaluationDueAt: new Date(closing.getTime() + 10 * DAY), awardDueAt: new Date(closing.getTime() + 20 * DAY),
        bidValidityDays: 90, timeZone: "Europe/London", isSimulated: true,
        ...(s.stage === "FRAMEWORK" ? { frameworkTermMonths: 24, frameworkCeiling: 400000, frameworkCallOffMethod: "ROTATION", frameworkPriceHoldDays: 90 } : {}),
      } });
      const themed = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false, category: { startsWith: s.group } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 60, select: { id: true, name: true, category: true } });
      const pool = themed.length >= 3 ? themed : products;
      const chosen = [0, 1, 2].map((k) => pool[(s.productSlot * 7 + k * 5) % pool.length]);
      const lines = [];
      for (let i = 0; i < 3; i++) lines.push(await tx.tenderLine.create({ data: { organizationId: issuer.id, tenderId: t.id, lineNumber: i + 1, productMasterId: chosen[i].id, description: chosen[i].name, quantity: s.qty[i], unit: "pack", destinationCountryCode: s.country, minShelfLifePercent: 75, coldChainRequired: s.n === 3 } }));
      const crit = [
        { title: "Valid wholesale or manufacturing licence", kind: "GATE", weight: null, responseFormat: "EITHER", metric: "MANUAL", description: "State the licence number and issuing authority, or upload a copy." },
        { title: "Technical compliance with the specification", kind: "SCORED", weight: 30, responseFormat: "TEXT", metric: "MANUAL", description: "Explain how each item meets the stated specification and registrations." },
        { title: "Delivery plan and quality assurance", kind: "SCORED", weight: 20, responseFormat: "TEXT", metric: "MANUAL", description: "Describe shipment planning, handling controls and batch documentation." },
        { title: "Price", kind: "SCORED", weight: 50, responseFormat: "TEXT", metric: "PRICE", description: "Scored automatically from the prices you enter." },
      ];
      const criteria = [];
      for (let i = 0; i < crit.length; i++) criteria.push(await tx.tenderCriterion.create({ data: { organizationId: issuer.id, tenderId: t.id, sortOrder: i, isMandatory: true, ...crit[i], weight: crit[i].weight as never } }));
      for (const r of s.rules) await tx.tenderEligibilityRule.create({ data: { organizationId: issuer.id, tenderId: t.id, ruleType: r.ruleType, ruleValue: r.ruleValue, explanation: r.explanation ?? null, isRequired: r.isRequired ?? true } });

      type Ev = { at: Date; kind: string; summary: string; cp: string | null; actor: string; details?: unknown };
      const events: Ev[] = [{ at: new Date(pub.getTime() - 20 * HOUR), kind: "CREATED", summary: `Draft ${ref} created`, cp: null, actor: issuer.id }];
      const invitees = invited ? [demo.id, rivals[0].id, rivals[1].id] : [];
      invitees.forEach((id, i) => events.push({ at: new Date(pub.getTime() - 19 * HOUR + i * 60000), kind: "INVITED", summary: "An organisation was invited", cp: id, actor: issuer.id }));
      for (const id of invitees) await tx.tenderInvitation.create({ data: { organizationId: issuer.id, tenderId: t.id, invitedOrganizationId: id } });
      events.push({ at: pub, kind: "PUBLISHED", summary: `Published ${ref}`, cp: null, actor: issuer.id, details: { simulated: true, title: t.title } });

      // expressions of interest (and bids for closed tenders)
      const nParticipants = Math.max(s.interested, s.bidders);
      const participants = invited ? [rivals[0], rivals[1]] : rivals.slice(0, Math.min(nParticipants, rivals.length));
      const manual = criteria.filter((c) => c.metric === "MANUAL");
      for (let p = 0; p < participants.length; p++) {
        const b = participants[p];
        const optedInAt = new Date(pub.getTime() + (3 + p * 5) * HOUR);
        await tx.tenderParticipation.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, tenderId: t.id, status: "INTERESTED", optedInAt, integrityPledgeAt: optedInAt, exclusionDeclaredAt: optedInAt, exclusionNoGrounds: true } });
        events.push({ at: optedInAt, kind: "INTEREST_EXPRESSED", summary: "An organisation expressed interest", cp: b.id, actor: b.id, details: { integrityPledge: true, exclusionDeclared: true, exclusionGrounds: [] } });
        if (p < s.bidders) {
          const base = [1.1, 3.0, 22.0].map((v, i) => v * (1 + (u(s.n, p * 3 + i) - 0.35) * 0.25));
          const prices = base.map(r2);
          const total = r2(prices.reduce((sum, pr, i) => sum + pr * s.qty[i], 0));
          const submittedAt = new Date(pub.getTime() + (24 + p * 30) * HOUR);
          const bid = await tx.tenderBid.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, tenderId: t.id, status: "SUBMITTED", bidCurrency: s.cur, validityConfirmed: true, validityDays: 90, notes: `SIM-PROFILE:${["A", "B", "C"][p]}`, fxRate: 1, fxRateDate: submittedAt, totalBidCurrency: total, totalTenderCurrency: total, submittedAt } });
          for (let i = 0; i < 3; i++) await tx.tenderBidLine.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: t.id, tenderLineId: lines[i].id, noBid: false, unitPrice: prices[i], leadTimeDays: 28 + Math.floor(u(s.n + i, p) * 30), countryOfOrigin: ["IN", "CN", "TR"][p], manufacturerName: `${b.name} works (simulated)`, remarks: "Delivered as per the stated incoterm." } });
          for (let i = 0; i < manual.length; i++) await tx.tenderBidResponse.create({ data: { organizationId: b.id, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: t.id, criterionId: manual[i].id, text: TEXTS[i] } });
          events.push({ at: submittedAt, kind: "BID_SUBMITTED", summary: "A bid was submitted", cp: b.id, actor: b.id });
        }
      }

      // addendum and clarification (ECO-05)
      if (s.stage === "ADDENDUM") {
        const newClose = new Date(closing.getTime());
        const addAt = new Date(now.getTime() - 3 * DAY);
        await tx.tenderAddendum.create({ data: { organizationId: issuer.id, tenderId: t.id, number: 1, title: "Closing date extended by one week", body: "Following requests from several organisations, the closing date has been extended by seven days. All other terms are unchanged.", requiresAcknowledgement: true, newClosingAt: newClose, createdAt: addAt } });
        events.push({ at: addAt, kind: "ADDENDUM_ISSUED", summary: "Addendum 1 issued: closing date extended by one week", cp: null, actor: issuer.id });
        const clAt = new Date(now.getTime() - 4 * DAY);
        await tx.tenderClarification.create({ data: { organizationId: issuer.id, tenderId: t.id, question: "Are chlorine tablets acceptable in place of liquid sodium hypochlorite for line 2?", answer: "Yes, provided the tablets deliver the stated available chlorine per litre and carry the same registration in the destination country.", answeredAt: clAt } });
        events.push({ at: clAt, kind: "CLARIFICATION_PUBLISHED", summary: "A clarification was published", cp: null, actor: issuer.id });
      }

      events.sort((a, b) => a.at.getTime() - b.at.getTime());
      let prev: string | null = null;
      for (const e of events) {
        const row: Fields = { prevHash: prev, id: randomUUID(), tenderId: t.id, organizationId: issuer.id, counterpartyOrganizationId: e.cp, actorOrganizationId: e.actor, actorUserId: null, kind: e.kind, summary: e.summary, detailsJson: e.details ? JSON.stringify(e.details) : null, createdAt: e.at };
        const hash = eventHash(row);
        await tx.tenderEvent.create({ data: { ...row, hash } });
        prev = hash;
      }
      created++;
    }
    console.log(`${dryRun ? "DRY RUN: would create" : "Created"} ${created} tenders.`);

    // ---- Universe Demo conveniences ----
    const savedCount = await tx.tenderSavedSearch.count({ where: { organizationId: demo.id } });
    if (savedCount === 0) {
      console.log("Universe Demo: would add 2 saved searches.");
      if (!dryRun) {
        await tx.tenderSavedSearch.create({ data: { organizationId: demo.id, name: "East Africa health commodities", criteriaJson: JSON.stringify({ categories: [], countries: ["KE", "UG", "TZ", "ET", "RW"], types: ["RFQ", "ITT"], onlyEligible: false, keyword: "" }), alertsEnabled: true } });
        await tx.tenderSavedSearch.create({ data: { organizationId: demo.id, name: "Frameworks and nutrition", criteriaJson: JSON.stringify({ categories: [], countries: [], types: ["FRAMEWORK"], onlyEligible: false, keyword: "nutrition" }), alertsEnabled: true } });
      }
    }
    const shortCount = await tx.tenderShortlist.count({ where: { organizationId: demo.id } });
    if (shortCount === 0) {
      const open = await tx.tender.findMany({ where: { referenceNumber: { startsWith: "SIM-ECO-" }, status: "PUBLISHED" }, orderBy: { referenceNumber: "asc" }, take: 3, select: { id: true, referenceNumber: true } });
      console.log(`Universe Demo: would shortlist ${open.map((o) => o.referenceNumber).join(", ") || "(none yet)"}.`);
      if (!dryRun) for (const o of open) await tx.tenderShortlist.create({ data: { organizationId: demo.id, tenderId: o.id, note: "Simulated shortlist entry." } });
    }
    const settings = await tx.tenderApprovalSettings.findUnique({ where: { organizationId: demo.id } });
    if (!settings) {
      console.log("Universe Demo: would add approval settings (limit 25,000 GBP, 30-day split window).");
      if (!dryRun) await tx.tenderApprovalSettings.create({ data: { organizationId: demo.id, individualLimit: 25000, splitWindowDays: 30, limitCurrency: "GBP", confirmedAt: now } });
    }
    const roleLimits = await tx.tenderApprovalRoleLimit.count({ where: { organizationId: demo.id } });
    if (roleLimits === 0) {
      const roles = await tx.role.findMany({ where: { archivedAt: null, OR: [{ organizationId: demo.id }, { organizationId: null }], name: { in: ["Finance", "Finance Manager", "Procurement Manager", "Administrator", "Admin"] } }, select: { id: true, name: true } });
      console.log(`Universe Demo: would set role limits for ${roles.map((r) => r.name).join(", ") || "(no matching roles)"}.`);
      if (!dryRun) for (const r of roles.slice(0, 3)) await tx.tenderApprovalRoleLimit.create({ data: { organizationId: demo.id, roleId: r.id, limit: /admin/i.test(r.name) ? 250000 : 100000 } });
    }
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
