import type { Prisma } from "@prisma/client";
import { withPlatformStaffContext } from "../tenant-context";
import { matchRestriction, type RestrictionLike } from "./export-restrictions";

const chunk = <T,>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const OPEN_STATUSES = ["IDENTIFIED", "IN_PROGRESS", "SUBMITTED", "AWARDED"];

export interface LiftedRestriction extends RestrictionLike { id: string; restrictingCountryCode: string }
export interface LiftedNotifyResult { projects: number; notifications: number }

/**
 * When an export restriction is lifted (it left the published list, or staff marked a manual entry REMOVED), tells the leads of
 * every open project holding a matching product line that the product may now be sourced again. Cross-tenant by nature, so it
 * runs in a platform-staff context and writes one notification per lead per project (de-duplicated by restriction + project).
 * Advisory only: the match is by generic name, strength and form, as with the project check.
 */
export async function notifyRestrictionLifted(r: LiftedRestriction): Promise<LiftedNotifyResult> {
  return withPlatformStaffContext(async (tx: Prisma.TransactionClient) => {
    const term = r.medicineName.trim();
    if (term.length < 4) return { projects: 0, notifications: 0 };
    const candidates = await tx.productMaster.findMany({
      where: { OR: [{ name: { contains: term } }, { inn: { contains: term } }] },
      select: { id: true, name: true, inn: true, strength: true, dosageForm: true },
      take: 2000,
    });
    const matched = new Map(candidates.filter((p) => matchRestriction(p, r)).map((p) => [p.id, p]));
    if (matched.size === 0) return { projects: 0, notifications: 0 };
    const lines: { projectId: string; productMasterId: string | null }[] = [];
    for (const ids of chunk([...matched.keys()], 500)) {
      lines.push(...await tx.projectLine.findMany({ where: { productMasterId: { in: ids }, archivedAt: null, project: { archivedAt: null, status: { in: OPEN_STATUSES } } }, select: { projectId: true, productMasterId: true } }));
    }
    const byProject = new Map<string, Set<string>>();
    for (const l of lines) if (l.productMasterId) (byProject.get(l.projectId) ?? byProject.set(l.projectId, new Set()).get(l.projectId)!).add(l.productMasterId);
    let notifications = 0;
    for (const ids of chunk([...byProject.keys()], 500)) {
      const projects = await tx.project.findMany({ where: { id: { in: ids } }, select: { id: true, organizationId: true, referenceNumber: true, title: true } });
      const leadRows = await tx.projectLead.findMany({ where: { projectId: { in: ids }, removedAt: null }, select: { projectId: true, userId: true } });
      const rows: Prisma.NotificationCreateManyInput[] = [];
      for (const p of projects) {
        const recipients = new Set(leadRows.filter((l) => l.projectId === p.id).map((l) => l.userId));
        if (recipients.size === 0) continue;
        const names = [...(byProject.get(p.id) ?? [])].map((id) => matched.get(id)?.name).filter((n): n is string => !!n).slice(0, 3).join(", ");
        const users = await tx.user.findMany({ where: { id: { in: [...recipients] }, organizationId: p.organizationId, status: "ACTIVE" }, select: { id: true } });
        for (const u of users) {
          const exists = await tx.notification.count({ where: { recipientUserId: u.id, kind: "EXPORT_RESTRICTION_LIFTED", subjectType: "EXPORT_RESTRICTION", subjectId: `${r.id}|${p.id}` } });
          if (exists) continue;
          rows.push({
            organizationId: p.organizationId, recipientUserId: u.id, kind: "EXPORT_RESTRICTION_LIFTED", category: "LOGISTICS",
            title: `Export restriction lifted: ${r.medicineName}`.slice(0, 300),
            body: `The ${r.restrictingCountryCode} export restriction on ${r.medicineName} no longer applies. ${p.referenceNumber} ${p.title} includes ${names}; sourcing from ${r.restrictingCountryCode} may now be possible. Re-run the project's export check.`.slice(0, 1000),
            link: `/projects/detail?id=${p.id}`, subjectType: "EXPORT_RESTRICTION", subjectId: `${r.id}|${p.id}`,
          });
        }
      }
      if (rows.length) { await tx.notification.createMany({ data: rows }); notifications += rows.length; }
    }
    return { projects: byProject.size, notifications };
  });
}
