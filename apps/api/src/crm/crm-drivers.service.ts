import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { CrmDriverFactor, CrmWinLossDrivers } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

const DAY = 86400000;

/**
 * Why the organisation wins and loses, from what the platform already knows (2026-10-27). For every won or lost opportunity of this organisation it looks at the
 * organisation's own records: contact in the 90 days before it closed, whether it had an owner, repeat business with the same stakeholder, whether it was tied to a tender,
 * and (as they stand today) the stakeholder's approval, certificates, complaints and delivery record. Counts only. Nothing from other organisations and no money.
 */
@Injectable()
export class CrmDriversService {
  async drivers(user: RequestUser): Promise<CrmWinLossDrivers> {
    assertHasPermission(user, "crm.view");
    const org = user.organizationId;
    return withTenantContext(org, async (tx) => {
      const closed = await tx.crmOpportunity.findMany({
        where: { organizationId: org, archivedAt: null, stage: { in: ["WON", "LOST"] } }, take: 20000,
        select: { id: true, relationshipId: true, stage: true, createdAt: true, stageChangedAt: true, ownerUserId: true, sourceTenderId: true, linkedType: true, relationship: { select: { partnerId: true } } },
      });
      const won = closed.filter((o) => o.stage === "WON").length, lost = closed.length - won;
      if (closed.length === 0) return { won, lost, factors: [] };
      const relIds = [...new Set(closed.map((o) => o.relationshipId))];
      const partnerIds = [...new Set(closed.map((o) => o.relationship.partnerId).filter((x): x is string => !!x))];
      const [interactions, partners, certs, complaints, lines] = await Promise.all([
        tx.crmInteraction.findMany({ where: { organizationId: org, relationshipId: { in: relIds }, archivedAt: null }, select: { relationshipId: true, occurredAt: true }, take: 100000 }),
        partnerIds.length ? tx.partner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, approvalStatus: true } }) : [],
        partnerIds.length ? tx.partnerCertification.findMany({ where: { partnerId: { in: partnerIds }, status: "CURRENT" }, select: { partnerId: true, expiryDate: true } }) : [],
        partnerIds.length ? tx.qualityComplaint.findMany({ where: { organizationId: org, partnerId: { in: partnerIds }, status: { not: "WITHDRAWN" } }, select: { partnerId: true } }) : [],
        partnerIds.length ? tx.projectLine.findMany({ where: { archivedAt: null, OR: [{ manufacturerId: { in: partnerIds } }, { supplierId: { in: partnerIds } }] }, select: { manufacturerId: true, supplierId: true, internalOnTime: true, supplierInFull: true }, take: 100000 }) : [],
      ]);
      const touches = new Map<string, number[]>();
      for (const i of interactions) { const a = touches.get(i.relationshipId) ?? []; a.push(i.occurredAt.getTime()); touches.set(i.relationshipId, a); }
      const approved = new Set(partners.filter((p) => p.approvalStatus === "APPROVED").map((p) => p.id));
      const now = Date.now();
      const certState = new Map<string, { any: boolean; expired: boolean }>();
      for (const c of certs) { const s = certState.get(c.partnerId) ?? { any: false, expired: false }; s.any = true; if (c.expiryDate && c.expiryDate.getTime() < now) s.expired = true; certState.set(c.partnerId, s); }
      const complained = new Set(complaints.map((c) => c.partnerId).filter((x): x is string => !!x));
      const deliv = new Map<string, { n: number; ok: number }>();
      for (const l of lines) for (const pid of new Set([l.manufacturerId, l.supplierId])) { if (!pid) continue; const d = deliv.get(pid) ?? { n: 0, ok: 0 }; if (l.internalOnTime !== null || l.supplierInFull !== null) { d.n++; if (l.internalOnTime !== false && l.supplierInFull !== false) d.ok++; } deliv.set(pid, d); }
      const wonBefore = (o: (typeof closed)[number]) => closed.some((x) => x.id !== o.id && x.relationshipId === o.relationshipId && x.stage === "WON" && x.stageChangedAt.getTime() < o.createdAt.getTime());

      type Def = { key: string; label: string; detail: string; basis: "AT_CLOSE" | "TODAY"; href: string | null; test: (o: (typeof closed)[number]) => boolean | null };
      const defs: Def[] = [
        { key: "contact", label: "We were in contact in the 90 days before it closed", detail: "At least one logged interaction with the stakeholder in the three months up to the day the opportunity was won or lost.", basis: "AT_CLOSE", href: "/relationships", test: (o) => (touches.get(o.relationshipId) ?? []).some((t) => t <= o.stageChangedAt.getTime() && t >= o.stageChangedAt.getTime() - 90 * DAY) },
        { key: "owner", label: "Someone owned it", detail: "An owner was named on the opportunity.", basis: "AT_CLOSE", href: "/pipeline?gap=noOwner", test: (o) => !!o.ownerUserId },
        { key: "repeat", label: "Repeat business with the same stakeholder", detail: "We had already won something with this stakeholder before this opportunity began.", basis: "AT_CLOSE", href: "/relationships", test: (o) => wonBefore(o) },
        { key: "tender", label: "Tied to a tender", detail: "Linked to a tender on the platform, so the bid and award were tracked.", basis: "AT_CLOSE", href: "/pipeline?gap=noLink", test: (o) => !!o.sourceTenderId || o.linkedType === "TENDER" },
        { key: "approved", label: "Stakeholder approved", detail: "The stakeholder's approval status is Approved today.", basis: "TODAY", href: "/relationships", test: (o) => (o.relationship.partnerId ? approved.has(o.relationship.partnerId) : null) },
        { key: "certified", label: "Certificates in date", detail: "The stakeholder has current certificates and none has expired.", basis: "TODAY", href: "/compliance", test: (o) => { const pid = o.relationship.partnerId; if (!pid) return null; const s = certState.get(pid); return s ? s.any && !s.expired : null; } },
        { key: "noComplaints", label: "No complaints on record", detail: "No quality complaint has been logged with this stakeholder.", basis: "TODAY", href: "/relationships", test: (o) => (o.relationship.partnerId ? !complained.has(o.relationship.partnerId) : null) },
        { key: "delivers", label: "Reliable delivery record", detail: "At least nine in ten delivered lines on time and in full, across three or more lines.", basis: "TODAY", href: "/relationships", test: (o) => { const d = o.relationship.partnerId ? deliv.get(o.relationship.partnerId) : null; return d && d.n >= 3 ? d.ok / d.n >= 0.9 : null; } },
      ];
      const factors: CrmDriverFactor[] = [];
      for (const d of defs) {
        const w = { won: 0, lost: 0 }, wo = { won: 0, lost: 0 };
        for (const o of closed) { const r = d.test(o); if (r === null) continue; const side = r ? w : wo; if (o.stage === "WON") side.won++; else side.lost++; }
        const nW = w.won + w.lost, nWo = wo.won + wo.lost;
        if (nW + nWo === 0) continue;
        const lift = nW >= 3 && nWo >= 3 ? Math.round((w.won / nW - wo.won / nWo) * 100) : null;
        factors.push({ key: d.key, label: d.label, detail: d.detail, basis: d.basis, with: w, without: wo, lift, href: d.href });
      }
      factors.sort((a, b) => Math.abs(b.lift ?? 0) - Math.abs(a.lift ?? 0));
      return { won, lost, factors };
    });
  }
}
