import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * CRM demo data for Universe Demo (step 7, 2026-10-27, requested by Lewis). The demo baseline is locked, so this only ADDS to stakeholders that have
 * no CRM detail yet; it never changes or deletes anything that already carries any. Each part is skipped where it has already run (idempotent).
 *   - tracks every stakeholder in the CRM (as the app does on first open), then enriches the most-engaged ~260: tier, status, owner, summary, review dates;
 *   - a year of interactions (more for strategic and key), a few with follow-up actions in the owners' bell;
 *   - opportunities across every stage, tender ones tied to the simulated tenders Universe Demo issued;
 *   - tags (rule-based on certificates, region and role), places with a head office plus other offices/factories/warehouses, simulated links
 *     (every address ends in .example, so none can point at a real company), primary contacts and contact profiles, and shared saved filters.
 * Everything is simulated. No web address is real; no real person is named. DRY_RUN defaults to true.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(now.getTime() + n * DAY);

function rng(seed: string) { let h = createHash("sha256").update(seed).digest().readUInt32LE(0); return () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const chunk = <T,>(a: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const addMonths = (d: Date, m: number) => { const n = new Date(d); n.setMonth(n.getMonth() + m); return n; };
const act = (label: string, n: number) => console.log(`${dryRun ? "[dry run] would add" : "added"} ${n} ${label}`);

const CITY: Record<string, string[]> = { GB: ["London", "Manchester"], IN: ["Mumbai", "Hyderabad", "Ahmedabad"], KE: ["Nairobi"], UG: ["Kampala"], TZ: ["Dar es Salaam"], NG: ["Lagos"], ZA: ["Johannesburg"], CH: ["Basel"], DE: ["Frankfurt"], BE: ["Brussels"], DK: ["Copenhagen"], NL: ["Amsterdam"], FR: ["Paris"], US: ["Chicago"], CN: ["Shanghai"], PK: ["Karachi"], BD: ["Dhaka"], ID: ["Jakarta"], VN: ["Hanoi"], AE: ["Dubai"], ET: ["Addis Ababa"], GH: ["Accra"], SN: ["Dakar"], EG: ["Cairo"], MY: ["Kuala Lumpur"], TH: ["Bangkok"], TR: ["Istanbul"], BR: ["Sao Paulo"], MX: ["Mexico City"], JO: ["Amman"], ES: ["Madrid"], IT: ["Milan"], SE: ["Stockholm"], PL: ["Warsaw"] };
const HUBS = ["AE", "KE", "GB", "CH", "IN", "NL", "BE", "ZA", "DK", "DE", "SG", "TH", "US"];
const EAST_AFRICA = ["KE", "UG", "TZ", "RW", "ET", "SS", "BI"];
const STREETS = ["Commerce Road", "Station Approach", "Harbour Way", "Industrial Estate", "Park Lane", "Victoria Street", "Enterprise Avenue", "Riverside Drive"];

const TYPE_TITLES: Record<string, [string, string, string][]> = {
  MEETING: [["Quarterly relationship review", "Reviewed delivery performance, forward demand and any open quality matters.", "Agreed to share the next forecast and to hold the next review on schedule."], ["Account planning meeting", "Walked through the pipeline and the capacity they can commit.", "Capacity confirmed for the coming quarter."]],
  CALL: [["Catch-up call on open orders", "Checked status of in-flight orders and any shipping delays.", "No blockers; they will confirm dispatch dates by email."], ["Call about documentation", "Discussed outstanding certificates and batch paperwork.", "Documents promised within the week."]],
  VIDEO_CALL: [["Video call: new product range", "They presented additions to their range and lead times.", "Samples to be requested for the next tender round."], ["Video call: capacity and lead times", "Reviewed manufacturing slots and cold chain capacity.", "Lead times held; will revisit next month."]],
  SITE_VISIT: [["Site visit and facility walk-through", "Toured the production and storage areas and met the quality team.", "Facility meets expectations; two minor observations to close."], ["Warehouse visit", "Checked storage conditions, temperature mapping and stock rotation.", "Storage satisfactory."]],
  AUDIT: [["Supplier quality audit", "Audited quality system, change control and complaint handling against the agreed checklist.", "One minor finding raised; corrective action due within 60 days."], ["Remote document audit", "Reviewed certificates, batch records and training files.", "No findings."]],
  CORRESPONDENCE: [["Email exchange on pricing", "Agreed to hold prices to the end of the period subject to volume.", "Price hold confirmed in writing."], ["Letter confirming terms", "Exchanged confirmation of terms following the last tender.", "Terms signed off."]],
  DECISION: [["Decision to move to key supplier status", "Reviewed performance records and agreed to increase the share of volume.", "Tier raised and review date reset."], ["Decision to place on watch", "Open quality matters led to closer monitoring for the next two quarters.", "Placed on watch with a review date."]],
  OTHER: [["Conference conversation", "Met at an industry event and exchanged capability information.", "Follow-up arranged."]],
};
const SUMMARIES: Record<string, string> = {
  STRATEGIC: "Strategic partner: a large share of our volume runs through them. Joint planning each quarter and close quality oversight.",
  KEY: "Key supplier or partner with a steady order flow. Reviewed every six months with a named owner.",
  STANDARD: "Regular partner. Managed through the normal ordering and review cycle.",
  WATCH: "Under closer monitoring while open risk items are resolved. Reviewed more often than usual.",
};
const PROSPECT_TEXT = "New prospect identified through the directory. Qualification and introductory contact are under way.";
const TAGS = ["WHO prequalified", "GDP certified", "Cold chain", "Preferred supplier", "Emergency response", "East Africa", "Framework supplier", "Under review", "Strategic account", "ISO 13485"];
const FILTERS: { view: "RELATIONSHIPS" | "PORTFOLIO"; name: string; filters: Record<string, string>; shared: boolean }[] = [
  { view: "RELATIONSHIPS", name: "Strategic and key accounts", filters: { tier: "STRATEGIC" }, shared: true },
  { view: "RELATIONSHIPS", name: "Reviews overdue", filters: { review: "due" }, shared: true },
  { view: "RELATIONSHIPS", name: "At risk", filters: { health: "AT_RISK" }, shared: true },
  { view: "RELATIONSHIPS", name: "My accounts", filters: { owner: "me" }, shared: false },
  { view: "PORTFOLIO", name: "Awarded and under way", filters: { work: "awarded" }, shared: true },
  { view: "PORTFOLIO", name: "Never worked with", filters: { work: "none" }, shared: true },
  { view: "PORTFOLIO", name: "Manufacturers with submitted bids", filters: { role: "MANUFACTURER", work: "submitted" }, shared: false },
];

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const org = demo.id;
    const users = await tx.user.findMany({ where: { organizationId: org, archivedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, forename: true, surname: true } });
    if (!users.length) throw new Error("Universe Demo has no users.");
    const admin = users[0];

    // ---- 1. track every stakeholder (what the app does on first open)
    const partners = await tx.partner.findMany({ where: { organizationId: org }, select: { id: true, name: true, countryCode: true, approvalStatus: true, riskTier: true, website: true } });
    const have = new Set((await tx.crmRelationship.findMany({ where: { organizationId: org, partnerId: { not: null } }, select: { partnerId: true } })).map((r) => r.partnerId!));
    const missing = partners.filter((p) => !have.has(p.id));
    act("stakeholders newly tracked", missing.length);
    if (!dryRun) for (const part of chunk(missing, 200)) await tx.crmRelationship.createMany({ data: part.map((p) => ({ organizationId: org, partnerId: p.id, counterpartyKey: `partner:${p.id}`, status: p.approvalStatus === "APPROVED" ? "ACTIVE" : "PROSPECT", reviewIntervalMonths: 12, nextReviewDue: addMonths(now, 12) })) });
    const rels = await tx.crmRelationship.findMany({ where: { organizationId: org, partnerId: { not: null }, archivedAt: null }, select: { id: true, partnerId: true, tier: true, status: true, summary: true, ownerUserId: true } });
    const relOf = new Map(rels.map((r) => [r.partnerId!, r]));
    const partnerOf = new Map(partners.map((p) => [p.id, p]));

    // ---- 2. who is "engaged": most projects first
    const counts = await tx.$queryRaw<{ pid: string; n: number | bigint }[]>`
      SELECT t.pid AS pid, COUNT(DISTINCT t.id) AS n FROM (
        SELECT p.clientId AS pid, p.id AS id FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND p.clientId IS NOT NULL
        UNION SELECT p.freightForwarderId, p.id FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND p.freightForwarderId IS NOT NULL
        UNION SELECT l.supplierId, p.id FROM project_lines l JOIN projects p ON p.id = l.projectId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND l.archivedAt IS NULL AND l.supplierId IS NOT NULL
        UNION SELECT l.manufacturerId, p.id FROM project_lines l JOIN projects p ON p.id = l.projectId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND l.archivedAt IS NULL AND l.manufacturerId IS NOT NULL
      ) t GROUP BY t.pid`;
    const ranked = counts.map((c) => ({ pid: c.pid, n: Number(c.n) })).filter((c) => relOf.has(c.pid) && partnerOf.get(c.pid)?.approvalStatus === "APPROVED").sort((a, b) => b.n - a.n || a.pid.localeCompare(b.pid));
    const engaged = ranked.slice(0, 260);
    const rest = partners.filter((p) => relOf.has(p.id) && !engaged.some((e) => e.pid === p.id)).sort((a, b) => a.id.localeCompare(b.id));
    const prospects = rest.filter((p) => p.approvalStatus !== "APPROVED").slice(0, 20);
    const targets = [...engaged.map((e) => e.pid), ...prospects.map((p) => p.id)];
    console.log(`engaged ${engaged.length}, prospects ${prospects.length}`);

    // ---- 3. tier, status, owner, summary, review dates (only where untouched)
    const untouched = (pid: string) => { const r = relOf.get(pid)!; return r.tier === "STANDARD" && !r.summary && !r.ownerUserId; };
    let enrich = 0;
    const planned: { pid: string; tier: string; status: string; owner: string; summary: string; last: Date | null; next: Date }[] = [];
    engaged.forEach((e, i) => {
      if (!untouched(e.pid)) return;
      const p = partnerOf.get(e.pid)!; const r = rng(`rel:${e.pid}`);
      let tier = i < 12 ? "STRATEGIC" : i < 60 ? "KEY" : "STANDARD";
      if (p.riskTier === "HIGH" && tier !== "STRATEGIC" && i % 3 === 0) tier = "WATCH";
      let status = relOf.get(e.pid)!.status;
      if (i >= engaged.length - 20) status = "DORMANT"; else if (i >= engaged.length - 26) status = "ON_HOLD"; else if (i >= engaged.length - 30) status = "ENDED";
      const interval = tier === "STRATEGIC" || tier === "WATCH" ? 6 : 12;
      const roll = r();
      const last = roll < 0.12 ? daysAgo(interval * 30 + 20 + Math.floor(r() * 60)) : roll < 0.3 ? daysAgo(interval * 30 - 10 - Math.floor(r() * 20)) : daysAgo(Math.floor(r() * interval * 25));
      planned.push({ pid: e.pid, tier, status, owner: users[i % users.length].id, summary: SUMMARIES[tier], last, next: addMonths(last, interval) });
    });
    prospects.forEach((p, i) => { if (untouched(p.id)) planned.push({ pid: p.id, tier: "STANDARD", status: "PROSPECT", owner: users[i % users.length].id, summary: PROSPECT_TEXT, last: null, next: daysAhead(14 + (i % 40)) }); });
    act("stakeholders enriched (tier, status, owner, summary, review dates)", planned.length);
    if (!dryRun) for (const x of planned) {
      const rel = relOf.get(x.pid)!;
      await tx.crmRelationship.update({ where: { id: rel.id }, data: { tier: x.tier, status: x.status, ownerUserId: x.owner, summary: x.summary, reviewIntervalMonths: x.tier === "STRATEGIC" || x.tier === "WATCH" ? 6 : 12, lastReviewedAt: x.last, nextReviewDue: x.next } });
      enrich++;
    }
    // ---- 3b. repair earlier seed output: an unapproved stakeholder is never strategic or key (they sit on watch); then build the pool the later parts work from
    const seedSummaries = new Set<string>([...Object.values(SUMMARIES), PROSPECT_TEXT]);
    const plannedSet = new Set(planned.map((x) => x.pid));
    const earlier = rels.filter((r) => r.summary && seedSummaries.has(r.summary) && !plannedSet.has(r.partnerId!));
    const demote = earlier.filter((r) => (r.tier === "STRATEGIC" || r.tier === "KEY") && partnerOf.get(r.partnerId!)?.approvalStatus !== "APPROVED");
    act("earlier unapproved strategic/key stakeholders moved to watch", demote.length);
    if (!dryRun) for (const r of demote) await tx.crmRelationship.update({ where: { id: r.id }, data: { tier: "WATCH", summary: SUMMARIES.WATCH, reviewIntervalMonths: 6 } });
    const demoted = new Set(demote.map((r) => r.partnerId!));
    const pool: { pid: string; tier: string; status: string; owner: string; prospect: boolean }[] = [
      ...planned.map((x) => ({ pid: x.pid, tier: x.tier, status: x.status, owner: x.owner, prospect: x.summary === PROSPECT_TEXT })),
      ...earlier.filter((r) => r.ownerUserId).map((r) => ({ pid: r.partnerId!, tier: demoted.has(r.partnerId!) ? "WATCH" : r.tier, status: r.status, owner: r.ownerUserId!, prospect: r.summary === PROSPECT_TEXT })),
    ];
    const tierOf = new Map<string, string>(planned.map((x) => [x.pid, x.tier]));
    const ownerOf = new Map<string, string>(planned.map((x) => [x.pid, x.owner]));
    for (const x of pool) { tierOf.set(x.pid, x.tier); ownerOf.set(x.pid, x.owner); }
    for (const r of rels) { if (!tierOf.has(r.partnerId!)) { tierOf.set(r.partnerId!, r.tier); if (r.ownerUserId) ownerOf.set(r.partnerId!, r.ownerUserId); } }

    // ---- shared look-ups for the parts below
    const contactsByPartner = new Map<string, { id: string; name: string }[]>();
    for (const part of chunk(targets, 1000)) for (const c of await tx.contact.findMany({ where: { organizationId: org, partnerId: { in: part } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, partnerId: true } })) contactsByPartner.set(c.partnerId, [...(contactsByPartner.get(c.partnerId) ?? []), { id: c.id, name: c.name }]);
    const projectsByPartner = new Map<string, { id: string; ref: string; title: string }[]>();
    for (const part of chunk(targets, 500)) {
      const rows = await tx.project.findMany({ where: { organizationId: org, archivedAt: null, OR: [{ clientId: { in: part } }, { freightForwarderId: { in: part } }] }, orderBy: { createdAt: "desc" }, take: 3000, select: { id: true, referenceNumber: true, title: true, clientId: true, freightForwarderId: true } });
      for (const p of rows) for (const pid of [p.clientId, p.freightForwarderId]) if (pid) { const a = projectsByPartner.get(pid) ?? []; if (a.length < 4) a.push({ id: p.id, ref: p.referenceNumber, title: p.title }); projectsByPartner.set(pid, a); }
    }

    // ---- 4. interactions (only for stakeholders with none)
    const withInteractions = new Set<string>();
    for (const part of chunk(pool.map((x) => relOf.get(x.pid)!.id), 1000)) for (const r of await tx.crmInteraction.groupBy({ by: ["relationshipId"], where: { organizationId: org, relationshipId: { in: part } } })) withInteractions.add(r.relationshipId);
    const ints: any[] = []; const followUps: { i: number; assignee: string; due: Date; note: string }[] = [];
    for (const x of pool) {
      const rel = relOf.get(x.pid)!; if (withInteractions.has(rel.id) || x.prospect) continue;
      const r = rng(`int:${x.pid}`); const n = x.tier === "STRATEGIC" ? 10 + Math.floor(r() * 9) : x.tier === "KEY" || x.tier === "WATCH" ? 6 + Math.floor(r() * 5) : 2 + Math.floor(r() * 4);
      const cs = contactsByPartner.get(x.pid) ?? []; const prs = projectsByPartner.get(x.pid) ?? [];
      for (let k = 0; k < n; k++) {
        const type = pick(r, ["MEETING", "CALL", "VIDEO_CALL", "SITE_VISIT", "AUDIT", "CORRESPONDENCE", "CORRESPONDENCE", "CALL", "MEETING", "DECISION", "OTHER"]);
        const [title, summary, outcome] = pick(r, TYPE_TITLES[type]);
        const linked = prs.length && r() < 0.35 ? pick(r, prs) : null;
        const occurred = daysAgo(Math.floor((k + r()) * (360 / n)));
        ints.push({ id: randomUUID(), organizationId: org, relationshipId: rel.id, type, occurredAt: occurred, title, summary, outcome, participantUserIds: JSON.stringify([x.owner]), contactIds: cs.length && r() < 0.7 ? JSON.stringify(cs.slice(0, 1 + Math.floor(r() * 2)).map((c) => c.id)) : null,
          linkedType: linked ? "PROJECT" : null, linkedId: linked?.id ?? null, linkedLabel: linked ? `${linked.ref} · ${linked.title}`.slice(0, 300) : null, confidential: r() < 0.03, createdById: x.owner, createdAt: occurred });
        if (k === 0 && (x.tier === "STRATEGIC" || x.tier === "KEY") && followUps.length < 16) followUps.push({ i: ints.length - 1, assignee: x.owner, due: followUps.length < 4 ? daysAgo(2 + followUps.length * 3) : daysAhead(2 + followUps.length * 2), note: "Confirm the agreed next steps and send the notes." });
      }
    }
    act("interactions", ints.length); act("follow-up actions", followUps.length);
    if (!dryRun) {
      for (const part of chunk(ints, 100)) await tx.crmInteraction.createMany({ data: part });
      const nameOf = (rid: string) => { const p = rels.find((r) => r.id === rid); return p ? partnerOf.get(p.partnerId!)?.name ?? "stakeholder" : "stakeholder"; };
      for (const f of followUps) { const i = ints[f.i]; await tx.notification.create({ data: { organizationId: org, recipientUserId: f.assignee, actorUserId: admin.id, kind: "CRM_FOLLOW_UP", category: "CRM", title: `Follow up with ${nameOf(i.relationshipId)}: ${i.title}`.slice(0, 300), body: f.note, link: `/relationships?id=${i.relationshipId}`, subjectType: "CRM_INTERACTION", subjectId: i.id, requiresAction: true, actionStatus: "OPEN", dueDate: f.due } }); }
    }

    // ---- 5. opportunities (only for stakeholders with none)
    const withOpps = new Set<string>();
    for (const part of chunk(pool.map((x) => relOf.get(x.pid)!.id), 1000)) for (const r of await tx.crmOpportunity.groupBy({ by: ["relationshipId"], where: { organizationId: org, relationshipId: { in: part } } })) withOpps.add(r.relationshipId);
    const tenders = await tx.tender.findMany({ where: { organizationId: org, isSimulated: true, archivedAt: null, referenceNumber: { startsWith: "SIM-" } }, orderBy: { referenceNumber: "asc" }, select: { id: true, referenceNumber: true, title: true, currency: true } });
    const opps: any[] = [];
    const STAGES = ["IDENTIFIED", "QUALIFYING", "ENGAGED", "ENGAGED", "SUBMITTED", "SUBMITTED", "WON", "WON", "LOST", "WITHDRAWN"];
    const LOST = ["Price was above the successful bid.", "Lead time could not meet the delivery window.", "Missing prequalification at the time of evaluation.", "Contract awarded to an incumbent supplier."];
    const cands = pool.filter((x) => (x.tier === "STRATEGIC" || x.tier === "KEY" || x.prospect) && !withOpps.has(relOf.get(x.pid)!.id));
    cands.forEach((x, idx) => {
      const rel = relOf.get(x.pid)!; const p = partnerOf.get(x.pid)!; const r = rng(`opp:${x.pid}`);
      const n = x.tier === "STRATEGIC" ? 3 : x.tier === "KEY" ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const kind = x.prospect ? "QUALIFICATION" : pick(r, ["TENDER", "TENDER", "SOURCING", "FRAMEWORK_CALL_OFF", "QUALIFICATION", "OTHER"]);
        const stage = x.prospect ? pick(r, ["IDENTIFIED", "QUALIFYING"]) : pick(r, STAGES);
        const t = kind === "TENDER" || kind === "FRAMEWORK_CALL_OFF" ? tenders.length ? tenders[(idx * 3 + k) % tenders.length] : null : null;
        const title = kind === "TENDER" ? `Bid support: ${t ? t.title : "upcoming tender"}` : kind === "FRAMEWORK_CALL_OFF" ? `Call-off under ${t ? t.referenceNumber : "framework"}` : kind === "SOURCING" ? `Alternative source for ${pick(r, ["pulse oximeters", "pipette tips", "oral rehydration salts", "cold chain boxes", "surgical masks", "rapid tests"])}` : kind === "QUALIFICATION" ? `Qualify ${p.name} as an approved source` : `Explore partnership with ${p.name}`;
        const open = stage === "IDENTIFIED" || stage === "QUALIFYING" || stage === "ENGAGED" || stage === "SUBMITTED";
        const expectedDate = open ? (r() < 0.2 ? daysAgo(5 + Math.floor(r() * 25)) : r() < 0.4 ? daysAhead(3 + Math.floor(r() * 25)) : daysAhead(30 + Math.floor(r() * 150))) : daysAgo(10 + Math.floor(r() * 150));
        opps.push({ id: randomUUID(), organizationId: org, relationshipId: rel.id, title: title.slice(0, 200), kind, stage, stageChangedAt: daysAgo(Math.floor(r() * 120)), expectedValue: Math.round((20000 + r() * 980000) / 1000) * 1000, currency: t?.currency ?? pick(r, ["USD", "GBP", "EUR"]), expectedDate, ownerUserId: x.owner,
          notes: stage === "LOST" ? null : "Simulated demo opportunity.", lostReason: stage === "LOST" ? pick(r, LOST) : null, linkedType: t ? "TENDER" : null, linkedId: t?.id ?? null, linkedLabel: t ? `${t.referenceNumber} · ${t.title}`.slice(0, 300) : null, createdById: x.owner, createdAt: daysAgo(130 + Math.floor(r() * 120)) });
      }
    });
    act("opportunities", opps.length);
    if (!dryRun) for (const part of chunk(opps, 100)) await tx.crmOpportunity.createMany({ data: part });

    // ---- 6. tags
    const tagRows = await tx.crmTag.findMany({ where: { organizationId: org }, select: { id: true, normalizedName: true } });
    const tagId = new Map(tagRows.map((t) => [t.normalizedName, t.id]));
    const newTags = TAGS.filter((t) => !tagId.has(t.toLowerCase()));
    act("tags", newTags.length);
    if (!dryRun) for (const t of newTags) { const id = randomUUID(); await tx.crmTag.create({ data: { id, organizationId: org, name: t, normalizedName: t.toLowerCase(), createdById: admin.id } }); tagId.set(t.toLowerCase(), id); }
    const certOf = new Map<string, Set<string>>();
    for (const part of chunk(targets, 1000)) for (const c of await tx.partnerCertification.findMany({ where: { organizationId: org, partnerId: { in: part }, status: "CURRENT" }, select: { partnerId: true, type: true }, take: 20000 })) { const s = certOf.get(c.partnerId) ?? new Set<string>(); s.add(c.type); certOf.set(c.partnerId, s); }
    const rolesOf = new Map<string, Set<string>>();
    for (const part of chunk(targets, 1000)) for (const c of await tx.partnerRole.findMany({ where: { partnerId: { in: part }, isActive: true }, select: { partnerId: true, roleType: true } })) { const s = rolesOf.get(c.partnerId) ?? new Set<string>(); s.add(c.roleType); rolesOf.set(c.partnerId, s); }
    const tagLinks: { relationshipId: string; tagName: string }[] = [];
    for (const pid of targets) {
      const rel = relOf.get(pid)!; const certs = [...(certOf.get(pid) ?? [])].join(" "); const roles = rolesOf.get(pid) ?? new Set(); const p = partnerOf.get(pid)!; const tier = tierOf.get(pid) ?? "STANDARD"; const r = rng(`tag:${pid}`);
      const add = (n: string) => tagLinks.push({ relationshipId: rel.id, tagName: n.toLowerCase() });
      if (/WHO_PQ|WHO/i.test(certs)) add("WHO prequalified");
      if (/GDP/i.test(certs)) add("GDP certified");
      if (/13485/.test(certs)) add("ISO 13485");
      if (r() < 0.18) add("Cold chain");
      if (tier === "STRATEGIC" || tier === "KEY") { if (r() < 0.6) add("Preferred supplier"); if (tier === "STRATEGIC") add("Strategic account"); }
      if (p.countryCode && EAST_AFRICA.includes(p.countryCode)) add("East Africa");
      if (r() < 0.12) add("Emergency response");
      if (roles.has("MANUFACTURER") && r() < 0.15) add("Framework supplier");
      if (tier === "WATCH" || r() < 0.03) add("Under review");
    }
    const existingLinks = new Set((await tx.crmRelationshipTag.findMany({ where: { organizationId: org }, select: { relationshipId: true, tagId: true } })).map((l) => `${l.relationshipId}|${l.tagId}`));
    const links = [...new Map(tagLinks.map((l) => [`${l.relationshipId}|${l.tagName}`, l])).values()];
    const toLink = dryRun ? links : links.filter((l) => !existingLinks.has(`${l.relationshipId}|${tagId.get(l.tagName)}`));
    act("tag applications", toLink.length);
    if (!dryRun) for (const part of chunk(toLink, 200)) await tx.crmRelationshipTag.createMany({ data: part.map((l) => ({ relationshipId: l.relationshipId, tagId: tagId.get(l.tagName)!, organizationId: org, addedById: admin.id, addedAt: daysAgo(30) })) });

    // ---- 7. places (HQ plus others) and links, only for stakeholders with none. Every tracked stakeholder gets a head office and a LinkedIn link, so the portfolio map and Sites column are full;
    //         the engaged ones also get other sites, portals and quality pages.
    const everyone = partners.filter((p) => relOf.has(p.id)).map((p) => p.id);
    const engagedSet = new Set(targets);
    const countryCodes = new Set((await tx.country.findMany({ select: { code: true } })).map((c) => c.code));
    const hasLoc = new Set<string>(); const hasLink = new Set<string>();
    for (const part of chunk(everyone.map((t) => relOf.get(t)!.id), 1000)) {
      for (const r of await tx.crmLocation.groupBy({ by: ["relationshipId"], where: { organizationId: org, relationshipId: { in: part } } })) hasLoc.add(r.relationshipId);
      for (const r of await tx.crmLink.groupBy({ by: ["relationshipId"], where: { organizationId: org, relationshipId: { in: part } } })) hasLink.add(r.relationshipId);
    }
    for (const part of chunk(everyone.filter((x) => !rolesOf.has(x)), 1000)) for (const c of await tx.partnerRole.findMany({ where: { partnerId: { in: part }, isActive: true }, select: { partnerId: true, roleType: true } })) { const st = rolesOf.get(c.partnerId) ?? new Set<string>(); st.add(c.roleType); rolesOf.set(c.partnerId, st); }
    const locs: any[] = []; const lnks: any[] = [];
    for (const pid of everyone) {
      const big = engagedSet.has(pid);
      const rel = relOf.get(pid)!; const p = partnerOf.get(pid)!; const r = rng(`loc:${pid}`); const roles = rolesOf.get(pid) ?? new Set();
      const mk = (kind: string, name: string, cc: string | null, i: number) => {
        const city = cc && CITY[cc] ? pick(r, CITY[cc]) : null;
        locs.push({ id: randomUUID(), organizationId: org, relationshipId: rel.id, kind, name: name.slice(0, 150), countryCode: cc, city, address: city ? `${1 + Math.floor(r() * 180)} ${pick(r, STREETS)}, ${city}` : null, phone: `+00 555 01${String(10 + Math.floor(r() * 89))} ${String(1000 + Math.floor(r() * 8999))}`, email: `info@${slug(p.name)}.example`, notes: kind === "HQ" ? "Simulated head office." : "Simulated site.", createdById: admin.id, createdAt: daysAgo(200 - i) });
      };
      if (!hasLoc.has(rel.id) && p.countryCode && countryCodes.has(p.countryCode)) {
        mk("HQ", `${p.name} head office`, p.countryCode, 0);
        const extra = !big ? 0 : (tierOf.get(pid) === "STRATEGIC" ? 3 : tierOf.get(pid) === "KEY" ? 2 : r() < 0.35 ? 1 : 0);
        const used = new Set([p.countryCode]);
        for (let k = 0; k < extra; k++) {
          const cc = pick(r, HUBS.filter((h) => countryCodes.has(h) && !used.has(h)).length ? HUBS.filter((h) => countryCodes.has(h) && !used.has(h)) : [p.countryCode]); used.add(cc);
          const kind = roles.has("MANUFACTURER") && k === 0 ? "FACTORY" : roles.has("FREIGHT_FORWARDER") || roles.has("WAREHOUSING") ? "WAREHOUSE" : pick(r, ["OFFICE", "OFFICE", "WAREHOUSE"]);
          mk(kind, `${p.name} ${kind === "FACTORY" ? "plant" : kind === "WAREHOUSE" ? "warehouse" : "office"} ${CITY[cc]?.[0] ?? cc}`, cc, k + 1);
        }
      }
      if (!hasLink.has(rel.id)) {
        const s = slug(p.name); const base = (kind: string, label: string, url: string) => lnks.push({ id: randomUUID(), organizationId: org, relationshipId: rel.id, kind, label, url, createdById: admin.id, createdAt: daysAgo(150) });
        base("SOCIAL", "LinkedIn (simulated)", `https://linkedin.example/company/${s}`);
        if (big && r() < 0.5) base("SOCIAL", "X (simulated)", `https://x.example/${s}`);
        if (big && (roles.has("MANUFACTURER") || roles.has("SUPPLIER"))) base("PORTAL", "Supplier tender portal (simulated)", `https://tenders.${s}.example/`);
        if (big && r() < 0.45) base("PORTAL", "Business opportunities (simulated)", `https://opportunities.${s}.example/`);
        if (big && (/ISO|GDP|WHO/i.test([...(certOf.get(pid) ?? [])].join(" ")) || r() < 0.2)) base("QUALITY", "Quality and certificates (simulated)", `https://quality.${s}.example/certificates`);
      }
    }
    act("places", locs.length); act("links", lnks.length);
    if (!dryRun) { for (const part of chunk(locs, 100)) await tx.crmLocation.createMany({ data: part }); for (const part of chunk(lnks, 100)) await tx.crmLink.createMany({ data: part }); }

    // ---- 8. contact profiles and one primary contact per stakeholder
    for (const part of chunk(everyone.filter((x) => !engagedSet.has(x)), 1000)) for (const c of await tx.contact.findMany({ where: { organizationId: org, partnerId: { in: part } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, partnerId: true } })) contactsByPartner.set(c.partnerId, [...(contactsByPartner.get(c.partnerId) ?? []), { id: c.id, name: c.name }]);
    const existingProfiles = new Set<string>();
    const allContactIds = [...contactsByPartner.values()].flat().map((c) => c.id);
    for (const part of chunk(allContactIds, 1000)) for (const c of await tx.crmContactProfile.findMany({ where: { organizationId: org, contactId: { in: part } }, select: { contactId: true } })) existingProfiles.add(c.contactId);
    const profiles: any[] = [];
    for (const pid of everyone) {
      const cs = (contactsByPartner.get(pid) ?? []).slice(0, engagedSet.has(pid) ? 3 : 1); const r = rng(`prof:${pid}`); const hasPrimary = cs.some((c) => existingProfiles.has(c.id));
      cs.forEach((c, i) => {
        if (existingProfiles.has(c.id)) return;
        const verified = r() < 0.75 ? daysAgo(Math.floor(r() * 330)) : null;
        profiles.push({ id: randomUUID(), organizationId: org, contactId: c.id, decisionRole: i === 0 ? pick(r, ["DECISION_MAKER", "BUDGET_HOLDER", "OPERATIONAL"]) : pick(r, ["INFLUENCER", "TECHNICAL", "QUALITY", "OPERATIONAL", null as any]), isPrimary: i === 0 && !hasPrimary, lawfulBasis: "LEGITIMATE_INTERESTS", subscriberType: "COMPANY", status: "ACTIVE", lastVerifiedAt: verified, noticeSentAt: verified ? daysAgo(Math.floor(r() * 365)) : null, retentionReviewDue: addMonths(verified ?? now, 24) });
      });
    }
    act("contact profiles (first contact of each is primary)", profiles.length);
    if (!dryRun) for (const part of chunk(profiles, 100)) await tx.crmContactProfile.createMany({ data: part });

    // ---- 9. saved filters (owned by the demo admin)
    const sf = await tx.crmSavedFilter.findMany({ where: { organizationId: org, ownerUserId: admin.id }, select: { view: true, name: true } });
    const newSf = FILTERS.filter((f) => !sf.some((s) => s.view === f.view && s.name === f.name));
    act("saved filters", newSf.length);
    if (!dryRun) for (const f of newSf) await tx.crmSavedFilter.create({ data: { organizationId: org, ownerUserId: admin.id, view: f.view, name: f.name, filters: JSON.stringify(f.filters), shared: f.shared } });
    console.log(dryRun ? "Dry run only; nothing written." : `Done. Enriched ${enrich} stakeholders.`);
  });
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
