import { createHash, randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { prisma, withPlatformStaffContext } from "../src/index";
import { makePdf } from "./_pdf";
import { evaluateHospitality } from "../../../apps/api/src/crm/crm-hospitality-rules";

/**
 * CRM gifts and hospitality demo data for Universe Demo (2026-10-27). Adds, only where missing:
 *   - the organisation's gifts and hospitality policy (thresholds in GBP, a simulated policy PDF kept in the organisation's private container, version, dates);
 *   - about 150 simulated records over the last 12 months across stakeholders the CRM seed made active: gifts, meals, events, travel, donations and sponsorship, given,
 *     received and declined, some involving public officials (mostly client bodies), judged with the same rules the app uses, then decided: most approved by a different
 *     person, a few not approved, and a handful left waiting (with an open action for the approver);
 *   - a simulated receipt or invitation PDF on about a quarter of them.
 * Everything is simulated; no real person or organisation is named. Idempotent (skips stakeholders that already have records, and an existing policy). Needs
 * AZURE_STORAGE_CONNECTION_STRING for the files. DRY_RUN defaults to true and then needs no storage access.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const onlyDate = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);
function rng(seed: string) { let h = createHash("sha256").update(seed).digest().readUInt32LE(0); return () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const chunk = <T,>(a: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const RATE: Record<string, number> = { GBP: 1, USD: 0.79, EUR: 0.86 };

type Cat = "GIFT" | "MEAL" | "HOSPITALITY" | "EVENT" | "TRAVEL" | "DONATION" | "SPONSORSHIP";
const KINDS: { cat: Cat; w: number; min: number; max: number; items: [string, string][] }[] = [
  { cat: "GIFT", w: 28, min: 8, max: 120, items: [["Branded diary and pen set", "Customary gift at the start of the year."], ["Box of tea from the visit", "Courtesy after a site visit."], ["Calendar and notebook", "Annual corporate gift."], ["Small plant for the new office", "Congratulating them on the move."], ["Bottle of wine at the end of the contract", "Thank you at close-out."]] },
  { cat: "MEAL", w: 28, min: 15, max: 220, items: [["Working lunch during the audit", "Meal while reviewing the quality files."], ["Dinner after the framework meeting", "Hosted the delegation after a full day of meetings."], ["Breakfast meeting on the delivery plan", "Planning session that ran over the morning."], ["Team lunch at the supplier visit", "Hosted at the site as part of the visit."]] },
  { cat: "HOSPITALITY", w: 10, min: 60, max: 450, items: [["Reception at the industry forum", "Networking reception for partners and clients."], ["Tea and refreshments for the review meeting", "Hosted a half-day review at our office."]] },
  { cat: "EVENT", w: 12, min: 40, max: 600, items: [["Conference ticket", "Invitation to speak on the supply chain panel."], ["Trade fair entry and workshop", "Attended to meet manufacturers."], ["Sports club corporate event", "Client appreciation event."]] },
  { cat: "TRAVEL", w: 6, min: 150, max: 1400, items: [["Hotel night during the site audit", "Accommodation paid by the host for the audit."], ["Airport transfer for the delegation", "Transfers arranged for visiting delegates."]] },
  { cat: "DONATION", w: 4, min: 100, max: 2500, items: [["Donation to the local clinic fund", "Community support requested by the ministry office."], ["Donation to a disaster appeal", "Employee-led appeal supported by the company."]] },
  { cat: "SPONSORSHIP", w: 3, min: 300, max: 3000, items: [["Sponsorship of a regional logistics workshop", "Co-sponsored an industry training event."]] },
];
const DECLINED_ITEMS: [string, string][] = [["Offered a case of wine", "Declined: above what the policy allows."], ["Offered football tickets", "Declined during an open tender."], ["Offered a watch as a thank-you", "Declined and thanked them politely."], ["Offered paid holiday accommodation", "Declined: not appropriate."]];

async function main() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!dryRun && !conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set.");
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const org = demo.id;
    const blobs = !dryRun ? BlobServiceClient.fromConnectionString(conn!).getContainerClient(`org-${org}`) : null;
    if (blobs) await blobs.createIfNotExists();
    const users = await tx.user.findMany({ where: { organizationId: org, archivedAt: null, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, forename: true } });
    if (users.length < 2) throw new Error("Universe Demo needs at least two active users so an approval can come from a different person.");
    const upload = async (title: string, file: string, lines: string[], uploadedAt: Date) => {
      const pdf = makePdf(title, lines);
      const blobName = `standalone/${randomUUID()}-${file}`;
      await blobs!.getBlockBlobClient(blobName).uploadData(pdf, { blobHTTPHeaders: { blobContentType: "application/pdf" } });
      return (await tx.projectDocument.create({ data: { organizationId: org, projectId: null, type: "EVIDENCE", title: title.slice(0, 250), url: blobs!.getBlockBlobClient(blobName).url, blobName, fileName: file, fileSizeBytes: pdf.length, mimeType: "application/pdf", uploadedById: users[0].id, uploadedAt } })).id;
    };

    // ---- policy
    let policy = await tx.crmGiftPolicy.findUnique({ where: { organizationId: org } });
    console.log(`${dryRun ? "[dry run] would " : ""}${policy ? "keep the existing policy" : "set the gifts and hospitality policy"}`);
    if (!policy && !dryRun) {
      const docId = await upload("Gifts, Hospitality and Anti-Bribery Policy (simulated)", "gifts-hospitality-policy.pdf", ["Version 3.1", "", "1. Purpose", "   To keep every gift, meal, event and donation honest, proportionate and recorded.", "2. Thresholds", "   Gifts over 50 GBP, hospitality over 150 GBP per occasion, or more than 300 GBP", "   a year with one stakeholder need a second person to approve.", "3. Public officials", "   Anything given to or received from a public official needs approval.", "4. Donations and sponsorship", "   Always need approval.", "", "SIMULATED DOCUMENT - generated for demonstration only."], daysAgo(430));
      policy = await tx.crmGiftPolicy.create({ data: { organizationId: org, currency: "GBP", giftThreshold: 50, hospitalityThreshold: 150, annualThreshold: 300, alwaysApprovePublicOfficial: true, policyDocumentId: docId, policyTitle: "Gifts, Hospitality and Anti-Bribery Policy (simulated)", policyVersion: "3.1",
        policyEffectiveFrom: onlyDate(daysAgo(420)), policyReviewDue: onlyDate(new Date(now.getTime() + 120 * DAY)), confirmedAt: daysAgo(420), updatedById: users[0].id } });
    }
    const rules = { currency: "GBP", giftThreshold: 50, hospitalityThreshold: 150, annualThreshold: 300, alwaysApprovePublicOfficial: true };

    // ---- records
    const rels = await tx.crmRelationship.findMany({ where: { organizationId: org, partnerId: { not: null }, ownerUserId: { not: null }, archivedAt: null, status: { in: ["ACTIVE", "DORMANT"] } }, select: { id: true, partnerId: true, ownerUserId: true, tier: true } });
    const have = new Set<string>();
    for (const part of chunk(rels.map((r) => r.id), 1000)) for (const g of await tx.crmHospitalityRecord.groupBy({ by: ["relationshipId"], where: { organizationId: org, relationshipId: { in: part } } })) have.add(g.relationshipId);
    const pids = rels.map((r) => r.partnerId!);
    const roleOf = new Map<string, Set<string>>(); const contacts = new Map<string, { id: string; name: string }[]>(); const names = new Map<string, string>();
    for (const part of chunk(pids, 1000)) {
      for (const x of await tx.partnerRole.findMany({ where: { partnerId: { in: part }, isActive: true }, select: { partnerId: true, roleType: true } })) { const s = roleOf.get(x.partnerId) ?? new Set<string>(); s.add(x.roleType); roleOf.set(x.partnerId, s); }
      for (const c of await tx.contact.findMany({ where: { organizationId: org, partnerId: { in: part } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, partnerId: true } })) contacts.set(c.partnerId, [...(contacts.get(c.partnerId) ?? []), { id: c.id, name: c.name }]);
      for (const p of await tx.partner.findMany({ where: { id: { in: part } }, select: { id: true, name: true } })) names.set(p.id, p.name);
    }
    const pool = rels.filter((r) => !have.has(r.id)).sort((a, b) => createHash("sha256").update(`h:${a.id}`).digest("hex").localeCompare(createHash("sha256").update(`h:${b.id}`).digest("hex")));
    const chosen = pool.filter((r) => r.tier === "STRATEGIC" || r.tier === "KEY").slice(0, 60).concat(pool.filter((r) => r.tier !== "STRATEGIC" && r.tier !== "KEY").slice(0, 70));
    const totalW = KINDS.reduce((a, k) => a + k.w, 0);
    type Rec = Parameters<typeof tx.crmHospitalityRecord.create>[0]["data"];
    const out: { rec: Rec; evidence: string | null; creator: string; ownerId: string }[] = [];
    let pendingMade = 0;
    for (const rel of chosen) {
      const r = rng(`gh:${rel.id}`); const n = rel.tier === "STRATEGIC" ? 3 + Math.floor(r() * 3) : rel.tier === "KEY" ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
      const gov = roleOf.get(rel.partnerId!)?.has("CLIENT") ?? false; const prior: { on: number; v: number }[] = [];
      for (let k = 0; k < n; k++) {
        const declined = r() < 0.1; let roll = r() * totalW; const kind = KINDS.find((x) => (roll -= x.w) < 0) ?? KINDS[0];
        const [desc, why] = declined ? pick(r, DECLINED_ITEMS) : pick(r, kind.items);
        const ccy = pick(r, ["GBP", "GBP", "GBP", "USD", "EUR"]); const gbp = Math.round((kind.min + r() * (kind.max - kind.min)) * 100) / 100;
        const amount = Math.round((gbp / RATE[ccy]) * 100) / 100; const value = Math.round(amount * RATE[ccy] * 100) / 100;
        const ago = Math.floor(8 + r() * 350); const on = onlyDate(daysAgo(ago));
        const official = gov ? r() < 0.4 : r() < 0.04;
        const direction = declined ? "DECLINED" : (kind.cat === "DONATION" || kind.cat === "SPONSORSHIP") ? "GIVEN" : pick(r, ["GIVEN", "RECEIVED", "RECEIVED"]);
        const pr = prior.filter((p) => p.on < ago && p.on > ago - 365).reduce((a, p) => a + p.v, 0);
        const verdict = evaluateHospitality(rules, { direction: direction as never, category: (declined ? "GIFT" : kind.cat) as never, publicOfficial: official, value, priorTwelveMonths: pr });
        if (direction !== "DECLINED") prior.push({ on: ago, v: value });
        const creatorIdx = Math.floor(r() * users.length); const creator = users[creatorIdx].id;
        const others = users.filter((u) => u.id !== creator);
        let status = "RECORDED"; let decidedBy: string | null = null; let decidedAt: Date | null = null; let note: string | null = null;
        if (verdict.requiresApproval) {
          const d = r();
          if (ago < 25 && pendingMade < 14 && d < 0.6) { status = "PENDING_APPROVAL"; pendingMade++; }
          else if (d < 0.86) { status = "APPROVED"; decidedBy = pick(r, others).id; decidedAt = new Date(on.getTime() + (1 + Math.floor(r() * 4)) * DAY); note = pick(r, ["Within the spirit of the policy.", "Proportionate and openly given.", "Approved: modest and documented.", null as unknown as string]); }
          else { status = "REJECTED"; decidedBy = pick(r, others).id; decidedAt = new Date(on.getTime() + 2 * DAY); note = pick(r, ["Too lavish for the occasion.", "Timing too close to a live tender.", "Not appropriate; please return it."]); }
        }
        const person = contacts.get(rel.partnerId!)?.length && r() < 0.6 ? pick(r, contacts.get(rel.partnerId!)!) : null;
        out.push({ creator, ownerId: rel.ownerUserId!, evidence: null, rec: { organizationId: org, relationshipId: rel.id, direction, category: declined ? "GIFT" : kind.cat, occurredOn: on, description: desc.slice(0, 500), businessReason: why, amount, currency: ccy, valueInPolicyCurrency: value, policyCurrency: "GBP",
          contactId: person?.id ?? null, personName: person?.name ?? null, publicOfficial: official, status, approvalReasons: verdict.reasons.length ? JSON.stringify(verdict.reasons) : null, decidedById: decidedBy, decidedAt, decisionNote: note,
          additionalInfo: r() < 0.15 ? "Simulated demo record." : null, createdById: creator, createdAt: on } });
      }
    }
    const byStatus = out.reduce<Record<string, number>>((m, x) => { const s = x.rec.status as string; m[s] = (m[s] ?? 0) + 1; return m; }, {});
    console.log(`${dryRun ? "[dry run] would add" : "adding"} ${out.length} records for ${chosen.length} stakeholders`, byStatus);
    if (dryRun) return;
    const rec: { id: string; relId: string; creator: string; desc: string }[] = [];
    let files = 0;
    for (const x of out) {
      const withFile = x.rec.status !== "RECORDED" ? (x.rec.createdAt as Date).getTime() % 3 === 0 : (x.rec.createdAt as Date).getTime() % 5 === 0;
      const evidence = withFile ? await upload(`${x.rec.category === "GIFT" ? "Gift note" : "Receipt or invitation"} (simulated)`, "receipt.pdf", [`Stakeholder: ${names.get(rels.find((q) => q.id === x.rec.relationshipId)!.partnerId!)}`, `Date: ${(x.rec.occurredOn as Date).toISOString().slice(0, 10)}`, `Item: ${x.rec.description}`, `Amount: ${x.rec.amount} ${x.rec.currency}`, "", "SIMULATED DOCUMENT - generated for demonstration only."], x.rec.createdAt as Date) : null;
      if (evidence) files++;
      const row = await tx.crmHospitalityRecord.create({ data: { ...x.rec, evidenceDocumentId: evidence } });
      rec.push({ id: row.id, relId: row.relationshipId, creator: x.creator, desc: row.description });
    }
    console.log(`stored ${files} simulated evidence files`);
    // open actions for the approvers of the pending ones
    const pending = await tx.crmHospitalityRecord.findMany({ where: { organizationId: org, status: "PENDING_APPROVAL", id: { in: rec.map((x) => x.id) } }, select: { id: true, relationshipId: true, description: true, createdById: true, occurredOn: true } });
    let acts = 0;
    for (const p of pending) {
      const to = users.filter((u) => u.id !== p.createdById);
      const rcpt = to[acts % to.length]; acts++;
      const pname = names.get(rels.find((q) => q.id === p.relationshipId)!.partnerId!) ?? "stakeholder";
      await tx.notification.create({ data: { organizationId: org, recipientUserId: rcpt.id, actorUserId: p.createdById, kind: "CRM_HOSPITALITY_APPROVAL", category: "CRM", title: `Approve a gift or hospitality record with ${pname}`.slice(0, 300), body: "Recorded against the gifts and hospitality policy. Review the reasons and approve or decline.", link: `/compliance?id=${p.id}`, subjectType: "CRM_HOSPITALITY", subjectId: p.id, requiresAction: true, actionStatus: "OPEN", dueDate: new Date(p.occurredOn.getTime() + 10 * DAY) } });
    }
    console.log(`added ${acts} open approval actions`);
  });
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
