import type { Prisma } from "@prisma/client";

/**
 * Keeps a CRM opportunity in step with the real records it is about (2026-10-27, requested by Lewis: every opportunity linked to the issuer, the submitter,
 * the manufacturers, forwarders and any other stakeholder that touched the tender or project).
 *  - Participants: who is involved is worked out from the linked tender (its issuer, the organisation it is tendered for, and, when this organisation issued it, the
 *    bidders) and the linked Project Management project (its client, freight forwarder and each line's manufacturer and supplier), restricted to people who are
 *    already stakeholders in this CRM (nothing is created). Rows from earlier syncs that are no longer true are retired; manually added rows are never touched.
 *  - Stage: only when the opportunity has been set to follow its link (syncWithLinked). Tender bid: draft = Engaged, submitted = Submitted, withdrawn = Withdrawn,
 *    awarded to this organisation = Won, awarded to another bidder = Lost, tender cancelled = Withdrawn. Project: Identified, In progress = Engaged, Submitted,
 *    Awarded and Completed = Won, Unawarded = Lost, Declined and Cancelled = Withdrawn. A closed opportunity is never reopened.
 * Called from the CRM API (on demand and when a link is made) and from the daily CRM job. Idempotent.
 */
export type SyncRole = "ISSUER" | "FUNDER" | "SUBMITTER" | "MANUFACTURER" | "SUPPLIER" | "FREIGHT_FORWARDER" | "CLIENT";
export interface CrmOpportunitySyncResult { opportunities: number; stageChanges: number; participantsAdded: number; participantsRetired: number }

const PROJECT_STAGE: Record<string, string> = { IDENTIFIED: "IDENTIFIED", IN_PROGRESS: "ENGAGED", SUBMITTED: "SUBMITTED", AWARDED: "WON", COMPLETED: "WON", UNAWARDED: "LOST", DECLINED: "WITHDRAWN", CANCELLED: "WITHDRAWN" };
const OPEN = ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Opp = { id: string; organizationId: string; relationshipId: string; stage: string; linkedType: string | null; linkedId: string | null; sourceTenderId: string | null; syncWithLinked: boolean; lostReason: string | null };

export async function syncOpportunity(tx: Prisma.TransactionClient, opp: Opp, actorUserId: string | null): Promise<{ stageChanged: boolean; added: number; retired: number }> {
  const org = opp.organizationId;
  const wanted = new Map<string, { relationshipId: string; role: SyncRole; source: "TENDER" | "PROJECT" }>();
  const want = (relationshipId: string | undefined, role: SyncRole, source: "TENDER" | "PROJECT") => {
    if (!relationshipId) return;
    // The stakeholder the opportunity is filed under is not listed again as the issuer or client of its own opportunity.
    if (relationshipId === opp.relationshipId && (role === "ISSUER" || role === "CLIENT" || role === "FUNDER")) return;
    wanted.set(`${relationshipId}|${role}`, { relationshipId, role, source });
  };
  const relsByOrg = async (orgIds: string[]) => {
    if (!orgIds.length) return new Map<string, string>();
    const rels = await tx.crmRelationship.findMany({ where: { organizationId: org, archivedAt: null, OR: [{ counterpartyOrganizationId: { in: orgIds } }, { partner: { registryEntry: { is: { linkedOrganizationId: { in: orgIds } } } } }] }, select: { id: true, counterpartyOrganizationId: true, partner: { select: { registryEntry: { select: { linkedOrganizationId: true } } } } } });
    const m = new Map<string, string>(); for (const r of rels) { const o = r.counterpartyOrganizationId ?? r.partner?.registryEntry?.linkedOrganizationId; if (o) m.set(o, r.id); } return m;
  };
  const relsByPartner = async (partnerIds: string[]) => {
    if (!partnerIds.length) return new Map<string, string>();
    const rels = await tx.crmRelationship.findMany({ where: { organizationId: org, archivedAt: null, partnerId: { in: partnerIds } }, select: { id: true, partnerId: true } });
    return new Map(rels.map((r) => [r.partnerId!, r.id]));
  };
  let target: { stage: string; reason?: string } | null = null;

  // Older opportunities were linked to a tender through the general link (linkedType TENDER). They get their people worked out the same way, but never a stage change.
  const legacyTender = !opp.sourceTenderId && opp.linkedType === "TENDER" && opp.linkedId ? opp.linkedId : null;
  const tenderId = opp.sourceTenderId ?? legacyTender;
  if (tenderId) {
    const t = await tx.tender.findFirst({ where: { id: tenderId }, select: { id: true, organizationId: true, status: true, clientName: true } });
    if (t) {
      const byOrg = await relsByOrg([t.organizationId]);
      if (t.organizationId !== org) want(byOrg.get(t.organizationId), "ISSUER", "TENDER");
      if (t.clientName) { const p = await tx.partner.findFirst({ where: { organizationId: org, normalizedName: norm(t.clientName) }, select: { id: true } }); if (p) want((await relsByPartner([p.id])).get(p.id), "CLIENT", "TENDER"); }
      if (t.organizationId === org) {
        const bids = await tx.tenderBid.findMany({ where: { tenderId: t.id, issuerOrganizationId: org, status: "SUBMITTED" }, select: { organizationId: true } });
        const m = await relsByOrg(bids.map((b) => b.organizationId));
        for (const b of bids) want(m.get(b.organizationId), "SUBMITTER", "TENDER");
      } else {
        const bid = await tx.tenderBid.findFirst({ where: { tenderId: t.id, organizationId: org }, select: { status: true } });
        const awards = await tx.tenderAward.findMany({ where: { tenderId: t.id }, select: { awardedOrganizationId: true } });
        if (legacyTender) target = null;
        else if (t.status === "CANCELLED") target = { stage: "WITHDRAWN" };
        else if (bid?.status === "WITHDRAWN") target = { stage: "WITHDRAWN" };
        else if (awards.length && bid && bid.status === "SUBMITTED") target = awards.some((a) => a.awardedOrganizationId === org) ? { stage: "WON" } : { stage: "LOST", reason: "Awarded to another bidder (from the tender)" };
        else if (bid?.status === "SUBMITTED") target = { stage: "SUBMITTED" };
        else if (bid) target = { stage: "ENGAGED" };
      }
    }
  }
  if (opp.linkedType === "PROJECT" && opp.linkedId) {
    const p = await tx.project.findFirst({ where: { id: opp.linkedId, organizationId: org }, select: { id: true, status: true, clientId: true, freightForwarderId: true } });
    if (p) {
      const lines = await tx.projectLine.findMany({ where: { projectId: p.id, archivedAt: null }, select: { manufacturerId: true, supplierId: true }, take: 2000 });
      const ids = new Set<string>(); for (const l of lines) { if (l.manufacturerId) ids.add(l.manufacturerId); if (l.supplierId) ids.add(l.supplierId); } if (p.clientId) ids.add(p.clientId); if (p.freightForwarderId) ids.add(p.freightForwarderId);
      const m = await relsByPartner([...ids]);
      for (const l of lines) { if (l.manufacturerId) want(m.get(l.manufacturerId), "MANUFACTURER", "PROJECT"); if (l.supplierId) want(m.get(l.supplierId), "SUPPLIER", "PROJECT"); }
      if (p.clientId) want(m.get(p.clientId), "CLIENT", "PROJECT");
      if (p.freightForwarderId) want(m.get(p.freightForwarderId), "FREIGHT_FORWARDER", "PROJECT");
      const st = PROJECT_STAGE[p.status];
      if (st && !opp.sourceTenderId) target = st === "LOST" ? { stage: st, reason: "Not awarded (from the tracked project)" } : { stage: st };
      else if (st && (st === "WON" || st === "LOST") && !target) target = { stage: st };
    }
  }

  // participants
  const have = await tx.crmOpportunityParticipant.findMany({ where: { opportunityId: opp.id, source: { in: ["TENDER", "PROJECT"] } } });
  let added = 0, retired = 0;
  for (const w of wanted.values()) {
    const row = have.find((h) => h.relationshipId === w.relationshipId && h.role === w.role);
    if (!row) { await tx.crmOpportunityParticipant.upsert({ where: { opportunityId_relationshipId_role: { opportunityId: opp.id, relationshipId: w.relationshipId, role: w.role } }, create: { organizationId: org, opportunityId: opp.id, relationshipId: w.relationshipId, role: w.role, source: w.source, createdById: actorUserId }, update: { archivedAt: null } }); added++; }
    else if (row.archivedAt) { await tx.crmOpportunityParticipant.update({ where: { id: row.id }, data: { archivedAt: null, source: w.source } }); added++; }
  }
  for (const h of have) if (!h.archivedAt && !wanted.has(`${h.relationshipId}|${h.role}`)) { await tx.crmOpportunityParticipant.update({ where: { id: h.id }, data: { archivedAt: new Date() } }); retired++; }

  // stage
  let stageChanged = false;
  if (opp.syncWithLinked && target && target.stage !== opp.stage && OPEN.includes(opp.stage)) {
    const now = new Date();
    await tx.crmOpportunity.update({ where: { id: opp.id }, data: { stage: target.stage, stageChangedAt: now, ...(target.stage === "LOST" ? { lostReason: target.reason ?? "Lost (from the linked record)" } : {}) } });
    await tx.crmOpportunityEvent.create({ data: { organizationId: org, opportunityId: opp.id, eventType: "STAGE", fromStage: opp.stage, toStage: target.stage, reason: "Followed the linked tender or project", changedById: actorUserId, occurredAt: now } });
    stageChanged = true;
  }
  return { stageChanged, added, retired };
}

/** Syncs every opportunity of one organisation that has a tender or project link (stage only where it follows the link), or just the ones given. */
export async function syncOrganisationOpportunities(tx: Prisma.TransactionClient, organizationId: string, actorUserId: string | null, only?: string[]): Promise<CrmOpportunitySyncResult> {
  const opps = await tx.crmOpportunity.findMany({ where: { organizationId, archivedAt: null, ...(only ? { id: { in: only } } : {}), OR: [{ sourceTenderId: { not: null } }, { linkedType: { in: ["PROJECT", "TENDER"] }, linkedId: { not: null } }] }, select: { id: true, organizationId: true, relationshipId: true, stage: true, linkedType: true, linkedId: true, sourceTenderId: true, syncWithLinked: true, lostReason: true }, take: 5000 });
  const res: CrmOpportunitySyncResult = { opportunities: opps.length, stageChanges: 0, participantsAdded: 0, participantsRetired: 0 };
  for (const o of opps) { const r = await syncOpportunity(tx, o, actorUserId); if (r.stageChanged) res.stageChanges++; res.participantsAdded += r.added; res.participantsRetired += r.retired; }
  return res;
}
