import { withPlatformStaffContext } from "./index";

export interface CrmAlertResult { certificates: number; opportunities: number; approvals: number }

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Daily CRM alerts to the relationship owner (2026-10-27). Information, not tasks, so they do not need an action:
 *  - a certificate of a tracked stakeholder expires within 60 days, or has expired (one alert each, per certificate and per state);
 *  - an open opportunity has passed its expected date (one alert per opportunity and date; a new date earns a new alert);
 *  - a tracked stakeholder's approval is rejected or suspended (one alert per relationship per 30 days).
 * Relationships with no owner are not alerted (the Overview shows how many have none). Dry run counts without writing.
 */
export async function runCrmAlerts(opts: { dryRun?: boolean; now?: Date } = {}): Promise<CrmAlertResult> {
  const now = opts.now ?? new Date();
  const soon = new Date(now.getTime() + 60 * DAY);
  const res: CrmAlertResult = { certificates: 0, opportunities: 0, approvals: 0 };
  await withPlatformStaffContext(async (tx: any) => {
    const owned = { archivedAt: null, ownerUserId: { not: null }, status: { notIn: ["ENDED"] } };
    const make = async (rows: { organizationId: string; ownerUserId: string; kind: string; title: string; body: string; link: string; subjectType: string; subjectId: string; dueDate?: Date | null }[]) => {
      if (!rows.length || opts.dryRun) return;
      for (let i = 0; i < rows.length; i += 200) await tx.notification.createMany({ data: rows.slice(i, i + 200).map((r) => ({ organizationId: r.organizationId, recipientUserId: r.ownerUserId, kind: r.kind, category: "CRM", title: r.title, body: r.body, link: r.link, subjectType: r.subjectType, subjectId: r.subjectId, dueDate: r.dueDate ?? null, requiresAction: false, actionStatus: null })) });
    };
    const already = async (kind: string, subjectType: string, ids: string[], since?: Date) => {
      const seen = new Set<string>();
      for (let i = 0; i < ids.length; i += 800) for (const n of await tx.notification.findMany({ where: { kind, subjectType, subjectId: { in: ids.slice(i, i + 800) }, ...(since ? { createdAt: { gte: since } } : {}) }, select: { subjectId: true, dueDate: true } })) seen.add(`${n.subjectId}|${n.dueDate ? iso(n.dueDate) : ""}`);
      return seen;
    };

    // ---- certificates
    const rels = await tx.crmRelationship.findMany({ where: { ...owned, partnerId: { not: null }, partner: { certifications: { some: { status: "CURRENT", expiryDate: { not: null, lte: soon } } } } }, select: { id: true, organizationId: true, ownerUserId: true, partnerId: true, partner: { select: { name: true } } } });
    const byPartner = new Map<string, (typeof rels)[number]>(rels.map((r: any) => [r.partnerId, r]));
    const partnerIds = [...byPartner.keys()];
    const certs: any[] = [];
    for (let i = 0; i < partnerIds.length; i += 800) certs.push(...await tx.partnerCertification.findMany({ where: { partnerId: { in: partnerIds.slice(i, i + 800) }, status: "CURRENT", expiryDate: { not: null, lte: soon } }, select: { id: true, partnerId: true, type: true, expiryDate: true } }));
    const expired = certs.filter((c) => c.expiryDate < now), expiring = certs.filter((c) => c.expiryDate >= now);
    const certRows: Parameters<typeof make>[0] = [];
    for (const [list, state] of [[expiring, "CrmCertExpiring"], [expired, "CrmCertExpired"]] as const) {
      const seen = await already("CRM_CERT_EXPIRING", state, list.map((c) => c.id));
      for (const c of list) {
        if (seen.has(`${c.id}|`)) continue;
        const r = byPartner.get(c.partnerId)!;
        const label = String(c.type).replace(/_/g, " ");
        certRows.push({ organizationId: r.organizationId, ownerUserId: r.ownerUserId, kind: "CRM_CERT_EXPIRING", subjectType: state, subjectId: c.id, link: `/relationships?id=${r.id}`,
          title: `${state === "CrmCertExpired" ? "Certificate expired" : "Certificate expiring"}: ${r.partner?.name ?? "stakeholder"}`,
          body: `${label} ${state === "CrmCertExpired" ? "expired" : "expires"} on ${iso(c.expiryDate)}. Ask for the renewed certificate.` });
      }
    }
    res.certificates = certRows.length; await make(certRows);

    // ---- opportunities past their expected date
    const opps = await tx.crmOpportunity.findMany({ where: { archivedAt: null, stage: { notIn: ["WON", "LOST", "WITHDRAWN"] }, expectedDate: { not: null, lt: now }, relationship: owned }, select: { id: true, title: true, expectedDate: true, organizationId: true, relationship: { select: { id: true, ownerUserId: true, partner: { select: { name: true } } } } } });
    const seenOpp = await already("CRM_OPPORTUNITY_OVERDUE", "CrmOpportunity", opps.map((o: any) => o.id));
    const oppRows: Parameters<typeof make>[0] = opps.filter((o: any) => !seenOpp.has(`${o.id}|${iso(o.expectedDate)}`)).map((o: any) => ({ organizationId: o.organizationId, ownerUserId: o.relationship.ownerUserId, kind: "CRM_OPPORTUNITY_OVERDUE", subjectType: "CrmOpportunity", subjectId: o.id, dueDate: o.expectedDate, link: `/pipeline`,
      title: `Opportunity past its date: ${o.title}`, body: `${o.relationship.partner?.name ?? "Stakeholder"}: expected ${iso(o.expectedDate)}. Move it on, change the date, or close it.` }));
    res.opportunities = oppRows.length; await make(oppRows);

    // ---- approval rejected or suspended
    const bad = await tx.crmRelationship.findMany({ where: { ...owned, partner: { approvalStatus: { in: ["REJECTED", "SUSPENDED"] } } }, select: { id: true, organizationId: true, ownerUserId: true, partner: { select: { name: true, approvalStatus: true } } } });
    const seenBad = await already("CRM_HEALTH_AT_RISK", "CrmRelationship", bad.map((r: any) => r.id), new Date(now.getTime() - 30 * DAY));
    const badRows: Parameters<typeof make>[0] = bad.filter((r: any) => !seenBad.has(`${r.id}|`)).map((r: any) => ({ organizationId: r.organizationId, ownerUserId: r.ownerUserId, kind: "CRM_HEALTH_AT_RISK", subjectType: "CrmRelationship", subjectId: r.id, link: `/relationships?id=${r.id}`,
      title: `At risk: ${r.partner?.name ?? "stakeholder"}`, body: `Approval is ${String(r.partner?.approvalStatus).toLowerCase()}. Open the relationship to see what to do.` }));
    res.approvals = badRows.length; await make(badRows);
  });
  return res;
}
