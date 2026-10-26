import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Thin areas of Universe Demo (2026-10-26, requested by Lewis, baseline data set). Adds, each only where none exists yet:
 *   - published clarifications (questions and answers shared with all participants) on tenders Universe Demo issued;
 *   - addenda on issued tenders, with acknowledgements from participating organisations;
 *   - evidence logged on active contracts (delivery note, inspection report, payment confirmation), some acknowledged by the supplier;
 *   - supplier replies on performance records, two disputes and the owner's answer to one;
 *   - Universe Demo's own quality complaints and temperature logs linked to active contracts (what the scorecard counts);
 *   - saved network searches for Universe Demo;
 *   - Universe Demo's procurement agent profile (it was registered as a procurement agent with an empty profile).
 * Tender events are appended after each tender's current tail so the hash chain stays unbroken. Nothing is deleted. Evidence rows carry no stored
 * file (the app shows them as logged records). DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
interface Fields { prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null; actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date }
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");

const QA: [string, string][] = [
  ["Can bidders quote for part of the quantity?", "Yes. Each item can be quoted separately and the award can be split between suppliers, as set out in the evaluation criteria."],
  ["Is delivery required to the named port or to the central medical store?", "Delivery is to the central medical store. Quote the price for that delivery point under the incoterm stated in the tender."],
  ["What remaining shelf life is required on delivery?", "At least 75% of the labelled shelf life must remain on delivery, and no less than 18 months for products with a shelf life of 24 months or more."],
  ["Will an equivalent product be accepted in place of the named brand?", "Equivalents are accepted if they meet the specification and the regulatory requirements listed. Include the evidence with your bid."],
  ["Can a bid be submitted in a currency other than the tender currency?", "Prices must be given in the tender currency. Where a supplier's costs are in another currency, state the rate assumed in the pricing notes."],
  ["Is a bid security required?", "No bid security is required for this tender. The performance terms are in the contract conditions."],
];
const ADDENDA: [string, string][] = [
  ["Clarification of packaging requirements", "Outer cartons must carry the lot number and expiry date in a form readable without opening the carton. All other packaging requirements are unchanged."],
  ["Correction to the delivery schedule", "The final delivery window is extended by two weeks. Bidders should reflect this in their lead-time statements."],
  ["Additional document required", "Bidders must include a current certificate of good manufacturing or distribution practice with their bid. This replaces the earlier wording in the compliance section."],
];
const EVIDENCE: { kind: string; title: string; description: string; byIssuer: boolean; ack: boolean }[] = [
  { kind: "DELIVERY_NOTE", title: "Delivery note for the first consignment", description: "Signed on receipt at the central store; quantities agree with the order (simulated).", byIssuer: true, ack: true },
  { kind: "INSPECTION_REPORT", title: "Receiving inspection report", description: "Visual and documentation checks passed; no deviations recorded (simulated).", byIssuer: true, ack: false },
  { kind: "PAYMENT_CONFIRMATION", title: "Payment confirmation for the first invoice", description: "Paid within the agreed terms (simulated).", byIssuer: false, ack: true },
];
const PERF_REPLIES = [
  "Thank you for the record. We note the delivery dates and have already agreed an improved dispatch schedule for the next order.",
  "We accept the record. The one late consignment was held at customs; supporting documents are in our contract file.",
  "Noted, with thanks. We would welcome a short review call to discuss how we can reach the top band next period.",
];
const SEARCHES: { name: string; criteria: Record<string, unknown>; alerts: boolean }[] = [
  { name: "GDP-certified suppliers in East Africa", criteria: { type: "SUPPLIER", country: ["KE", "UG", "TZ"], certType: ["GDP"], certified: true }, alerts: true },
  { name: "WHO-prequalified manufacturers", criteria: { type: "MANUFACTURER", whoPq: true }, alerts: true },
  { name: "Cold chain specialists", criteria: { q: "cold chain", minYears: 5 }, alerts: false },
];

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true, type: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const me = demo.id;

    // ---- per-tender event chains (tails read once, then advanced)
    const chains = new Map<string, { prev: string | null; at: Date }>();
    const event = async (tenderId: string, kind: string, summary: string, cp: string | null, actor: string, details?: unknown) => {
      let ch = chains.get(tenderId);
      if (!ch) {
        const tail = await tx.$queryRaw<{ hash: string | null; createdAt: Date }[]>`SELECT TOP 1 [hash], [createdAt] FROM [dbo].[tender_events] WHERE [tenderId] = ${tenderId} AND [hash] IS NOT NULL ORDER BY [createdAt] DESC, [id] DESC`;
        ch = { prev: tail[0]?.hash ?? null, at: new Date(Math.max(Date.now(), (tail[0]?.createdAt?.getTime() ?? 0) + 1000)) };
        chains.set(tenderId, ch);
      }
      ch.at = new Date(ch.at.getTime() + 1000);
      const row: Fields = { prevHash: ch.prev, id: randomUUID(), tenderId, organizationId: me, counterpartyOrganizationId: cp, actorOrganizationId: actor, actorUserId: null, kind, summary: summary.slice(0, 500), detailsJson: details ? JSON.stringify(details) : null, createdAt: ch.at };
      const hash = eventHash(row);
      await tx.tenderEvent.create({ data: { ...row, hash } });
      ch.prev = hash;
    };
    const act = (label: string, n: number) => console.log(`${dryRun ? "[dry run] would add" : "added"} ${n} ${label}`);

    // ---- 1. clarifications
    const issued = await tx.tender.findMany({ where: { organizationId: me, isSimulated: true, archivedAt: null, status: { in: ["PUBLISHED", "CLOSED", "EVALUATING", "AWARDED", "CONTRACTED"] }, publishedAt: { not: null } }, orderBy: { referenceNumber: "asc" }, select: { id: true, referenceNumber: true, publishedAt: true, closingAt: true } });
    const clarTargets: typeof issued = [];
    for (const t of issued) { if (clarTargets.length >= 8) break; if ((await tx.tenderClarification.count({ where: { tenderId: t.id } })) === 0) clarTargets.push(t); }
    act("tender(s) with clarifications", clarTargets.length);
    if (!dryRun) {
      for (const [i, t] of clarTargets.entries()) {
        const n = 1 + (i % 2);
        for (let k = 0; k < n; k++) {
          const [q, a] = QA[(i * 2 + k) % QA.length];
          const answeredAt = new Date((t.publishedAt?.getTime() ?? Date.now()) + (3 + k * 2) * DAY);
          await tx.tenderClarification.create({ data: { organizationId: me, tenderId: t.id, question: q, answer: a, answeredAt } });
          await event(t.id, "CLARIFICATION_PUBLISHED", "A clarification was published to all participants", null, me);
        }
      }
    }

    // ---- 2. addenda and acknowledgements
    const addTargets: typeof issued = [];
    for (const t of issued) { if (addTargets.length >= 4) break; if ((await tx.tenderAddendum.count({ where: { tenderId: t.id } })) === 0) addTargets.push(t); }
    act("tender(s) with an addendum and acknowledgements", addTargets.length);
    if (!dryRun) {
      for (const [i, t] of addTargets.entries()) {
        const [title, body] = ADDENDA[i % ADDENDA.length];
        const a = await tx.tenderAddendum.create({ data: { organizationId: me, tenderId: t.id, number: 1, title, body, requiresAcknowledgement: true, createdAt: new Date((t.publishedAt?.getTime() ?? Date.now()) + 5 * DAY) } });
        await event(t.id, "ADDENDUM_ISSUED", `Addendum 1 issued: ${title}`, null, me, { number: 1, newClosingAt: null });
        const orgs = [...new Set([...(await tx.tenderParticipation.findMany({ where: { tenderId: t.id }, select: { organizationId: true } })).map((p) => p.organizationId), ...(await tx.tenderBid.findMany({ where: { tenderId: t.id }, select: { organizationId: true } })).map((b) => b.organizationId)])].filter((o) => o !== me);
        for (const [k, o] of orgs.slice(0, 4).entries()) {
          if (k === 3) continue; // leave one organisation not yet acknowledged where there are four or more
          await tx.tenderAddendumAck.create({ data: { organizationId: o, issuerOrganizationId: me, tenderId: t.id, addendumId: a.id, acknowledgedAt: new Date(a.createdAt.getTime() + (1 + k) * DAY) } });
          await event(t.id, "ADDENDUM_ACKNOWLEDGED", "Addendum 1 acknowledged", o, o);
        }
      }
    }

    // ---- 3. contract evidence, 5. quality links (active contracts owned by Universe Demo)
    const contracts = await tx.tenderContract.findMany({ where: { organizationId: me, status: "ACTIVE" }, orderBy: { reference: "asc" }, select: { id: true, reference: true, tenderId: true, awardedOrganizationId: true, startDate: true } });
    const evTargets: typeof contracts = [];
    for (const c of contracts) { if (evTargets.length >= 6) break; if ((await tx.tenderEvidence.count({ where: { contractId: c.id } })) === 0) evTargets.push(c); }
    act("contract(s) with evidence (3 items each)", evTargets.length);
    if (!dryRun) {
      for (const c of evTargets) {
        for (const [k, e] of EVIDENCE.entries()) {
          const recordedBy = e.byIssuer ? me : c.awardedOrganizationId;
          const evidenceDate = new Date(Date.now() - (30 - k * 9) * DAY);
          const ackBy = e.ack ? (e.byIssuer ? c.awardedOrganizationId : me) : null;
          const row = await tx.tenderEvidence.create({ data: { organizationId: me, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId: c.id, kind: e.kind, title: e.title, description: e.description, reference: `${c.reference}-EV${k + 1}`, evidenceDate, recordedByOrganizationId: recordedBy, recordedAt: evidenceDate, ...(ackBy ? { acknowledgedByOrganizationId: ackBy, acknowledgedAt: new Date(evidenceDate.getTime() + DAY) } : {}) } });
          await event(c.tenderId, "EVIDENCE_ADDED", `Evidence logged on contract ${c.reference}: ${e.title}`, c.awardedOrganizationId, recordedBy, { evidenceId: row.id, kind: e.kind, reference: row.reference });
          if (ackBy) await event(c.tenderId, "EVIDENCE_ACKNOWLEDGED", `Evidence acknowledged on contract ${c.reference}: ${e.title}`, c.awardedOrganizationId, ackBy, { evidenceId: row.id });
        }
      }
    }

    const linked = new Set((await tx.tenderContractQualityLink.findMany({ where: { organizationId: me }, select: { contractId: true } })).map((l) => l.contractId));
    const qTargets = contracts.filter((c) => !linked.has(c.id)).slice(0, 5);
    const complaints = await tx.qualityComplaint.findMany({ where: { organizationId: me, archivedAt: null, status: { not: "WITHDRAWN" } }, orderBy: { referenceNumber: "asc" }, select: { id: true }, take: 12 });
    const logs = await tx.batchTemperatureLog.findMany({ where: { organizationId: me, hasExcursion: true }, orderBy: { recordedAt: "desc" }, select: { id: true }, take: 6 });
    act(`contract(s) with quality links (${complaints.length} complaints and ${logs.length} excursion logs available)`, qTargets.length);
    if (!dryRun) {
      for (const [i, c] of qTargets.entries()) {
        for (const x of complaints.slice(i * 2, i * 2 + 2)) await tx.tenderContractQualityLink.create({ data: { organizationId: me, contractId: c.id, kind: "COMPLAINT", refId: x.id } });
        for (const x of logs.slice(i, i + 1)) await tx.tenderContractQualityLink.create({ data: { organizationId: me, contractId: c.id, kind: "TEMPERATURE_LOG", refId: x.id } });
      }
    }

    // ---- 4. performance responses
    const records = await tx.tenderPerformanceRecord.findMany({ where: { organizationId: me, withdrawnAt: null }, orderBy: { closedAt: "desc" }, take: 40 });
    const answeredIds = new Set((await tx.tenderPerformanceResponse.findMany({ where: { recordId: { in: records.map((r) => r.id) } }, select: { recordId: true } })).map((r) => r.recordId));
    const fresh = records.filter((r) => !answeredIds.has(r.id)).slice(0, 10);
    act("performance record(s) with supplier responses (8 replies, 2 disputes, 1 answer)", fresh.length);
    if (!dryRun) {
      for (const [i, r] of fresh.entries()) {
        const base = { organizationId: me, awardedOrganizationId: r.awardedOrganizationId, tenderId: r.tenderId, recordId: r.id };
        const when = new Date(r.closedAt.getTime() + (2 + (i % 4)) * DAY);
        if (i < 8) {
          await tx.tenderPerformanceResponse.create({ data: { ...base, kind: "REPLY", body: PERF_REPLIES[i % PERF_REPLIES.length], byOrganizationId: r.awardedOrganizationId, createdAt: when } });
          await event(r.tenderId, "PERFORMANCE_REPLIED", "Supplier replied to the performance record", r.awardedOrganizationId, r.awardedOrganizationId);
        } else {
          const keys = (JSON.parse(r.measuresJson) as { key: string; weight: number }[]).filter((m) => m.weight > 0).map((m) => m.key);
          const key = keys[0]; if (!key) continue;
          await tx.tenderPerformanceResponse.create({ data: { ...base, kind: "DISPUTE", measureKey: key, body: "We disagree with this measure: the delay was caused by a change to the delivery point requested after the order, which is recorded in our correspondence.", byOrganizationId: r.awardedOrganizationId, createdAt: when } });
          await event(r.tenderId, "PERFORMANCE_DISPUTED", `Supplier disputed a measure on the performance record (${key})`, r.awardedOrganizationId, r.awardedOrganizationId, { measureKey: key });
          if (i === 8) {
            await tx.tenderPerformanceResponse.create({ data: { ...base, kind: "ANSWER", body: "We reviewed the correspondence and agree the delivery point changed. The measure stands as recorded because the revised date was also missed, but we have noted the context.", byOrganizationId: me, createdAt: new Date(when.getTime() + 2 * DAY) } });
            await event(r.tenderId, "PERFORMANCE_ANSWERED", "Tender owner answered the supplier's dispute", r.awardedOrganizationId, me);
          }
        }
      }
    }

    // ---- 6. saved network searches
    const haveSearch = new Set((await tx.networkSavedSearch.findMany({ where: { organizationId: me }, select: { name: true } })).map((s) => s.name));
    const newSearches = SEARCHES.filter((s) => !haveSearch.has(s.name));
    act("saved network searches", newSearches.length);
    if (!dryRun) for (const s of newSearches) await tx.networkSavedSearch.create({ data: { organizationId: me, name: s.name, criteriaJson: JSON.stringify(s.criteria), alertsEnabled: s.alerts } });

    // ---- 7. procurement agent profile
    const hasProfile = (await tx.procurementAgentProfile.count({ where: { organizationId: me } })) > 0;
    act(`procurement agent profile (organisation type ${demo.type})`, hasProfile ? 0 : 1);
    if (!dryRun && !hasProfile) {
      await tx.procurementAgentProfile.create({ data: {
        organizationId: me,
        fundersProgramsOperatedUnder: JSON.stringify(["Global Fund", "Gavi", "FCDO", "UNICEF programmes"]),
        productCategoriesProcured: JSON.stringify(["Pharmaceuticals", "Medical devices", "Laboratory diagnostics", "Vector control", "Nutrition"]),
        clientTypesServed: JSON.stringify(["Ministries of health", "NGOs", "Faith-based networks", "Donor programmes"]),
        accreditations: JSON.stringify(["ISO 9001", "WHO GDP"]),
        logisticsCapability: "MIXED",
        yearsOperatingInRole: 12,
        insuranceCoverSummary: "Goods-in-transit and professional indemnity (simulated)",
        insuranceExpiryDate: new Date(Date.now() + 240 * DAY),
        trackRecordSummary: "More than 400 procurements completed for public health programmes in 40 countries (simulated).",
      } });
    }
  });
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
