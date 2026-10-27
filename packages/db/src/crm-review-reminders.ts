import { withPlatformStaffContext } from "./index";

export interface CrmReviewReminderResult { checked: number; created: number; skipped: number; /** Opportunity reminders written (past their date, or no movement for a long time). */ opportunities?: number }

/** An open opportunity with no stage movement for this long is flagged to its owner. */
export const CRM_STALE_OPPORTUNITY_DAYS = 60;

/** How many days before the review date the owner is first reminded. */
export const CRM_REVIEW_LEAD_DAYS = 14;

/**
 * Reminds each relationship owner that a review is due (from 14 days ahead, and when overdue). One action per relationship per review cycle:
 * the cycle is identified by the review date, so marking it reviewed (which moves the date and closes the action) starts a fresh cycle.
 * Relationships with no owner are not reminded; the Overview already shows how many have no owner.
 */
export async function runCrmReviewReminders(opts: { dryRun?: boolean; now?: Date } = {}): Promise<CrmReviewReminderResult> {
  const now = opts.now ?? new Date();
  const horizon = new Date(now.getTime() + CRM_REVIEW_LEAD_DAYS * 86400000);
  const res: CrmReviewReminderResult = { checked: 0, created: 0, skipped: 0, opportunities: 0 };
  await withPlatformStaffContext(async (tx: any) => {
    const rels = await tx.crmRelationship.findMany({
      where: { archivedAt: null, status: { notIn: ["ENDED", "PROSPECT"] }, nextReviewDue: { not: null, lte: horizon }, ownerUserId: { not: null } },
      select: { id: true, organizationId: true, ownerUserId: true, nextReviewDue: true, partner: { select: { name: true } } },
    });
    for (const r of rels) {
      res.checked++;
      const owner = await tx.user.findFirst({ where: { id: r.ownerUserId, organizationId: r.organizationId, status: "ACTIVE" }, select: { id: true } });
      if (!owner) { res.skipped++; continue; }
      // The review date identifies the cycle: a reminder already sent for this date is not repeated; a new date (after a review) gets a new one.
      const exists = await tx.notification.findFirst({ where: { recipientUserId: owner.id, kind: "CRM_REVIEW_DUE", subjectId: r.id, dueDate: r.nextReviewDue }, select: { id: true } });
      if (exists) { res.skipped++; continue; }
      if (!opts.dryRun) {
        const overdue = r.nextReviewDue.getTime() < now.getTime();
        await tx.notification.create({ data: {
          organizationId: r.organizationId, recipientUserId: owner.id, kind: "CRM_REVIEW_DUE", category: "CRM",
          title: `${overdue ? "Review overdue" : "Review due"}: ${r.partner?.name ?? "relationship"}`,
          body: `Review date: ${r.nextReviewDue.toISOString().slice(0, 10)}. Look over the relationship and mark it as reviewed.`,
          link: `/relationships?id=${r.id}`, subjectType: "CrmRelationshipReview", subjectId: r.id, requiresAction: true, actionStatus: "OPEN", dueDate: r.nextReviewDue,
        } });
      }
      res.created++;
    }
    // Open opportunities that are past their expected date or have not moved for a long time: one reminder to the owner per cycle.
    // The cycle is the expected date (a new date starts a new cycle) or, with no date, the day the stage last changed (a move starts a new one).
    // The owner is the named owner, else the lead of the linked project.
    const stale = new Date(now.getTime() - CRM_STALE_OPPORTUNITY_DAYS * 86400000);
    const opps = await tx.crmOpportunity.findMany({
      where: { archivedAt: null, stage: { in: ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"] }, OR: [{ expectedDate: { lt: now } }, { stageChangedAt: { lt: stale } }] },
      select: { id: true, organizationId: true, title: true, ownerUserId: true, linkedType: true, linkedId: true, expectedDate: true, stageChangedAt: true, relationshipId: true, relationship: { select: { partner: { select: { name: true } } } } }, take: 5000,
    });
    for (const o of opps) {
      let ownerId: string | null = o.ownerUserId;
      if (!ownerId && o.linkedType === "PROJECT" && o.linkedId) ownerId = (await tx.projectLead.findFirst({ where: { projectId: o.linkedId, removedAt: null }, select: { userId: true } }))?.userId ?? null;
      if (!ownerId) continue;
      res.checked++;
      const owner = await tx.user.findFirst({ where: { id: ownerId, organizationId: o.organizationId, status: "ACTIVE" }, select: { id: true } });
      if (!owner) { res.skipped++; continue; }
      const overdue = !!o.expectedDate && o.expectedDate.getTime() < now.getTime();
      const cycle: Date = overdue ? o.expectedDate : o.stageChangedAt;
      const exists = await tx.notification.findFirst({ where: { recipientUserId: owner.id, kind: "CRM_OPPORTUNITY_OVERDUE", subjectId: o.id, dueDate: cycle }, select: { id: true } });
      if (exists) { res.skipped++; continue; }
      if (!opts.dryRun) {
        await tx.notification.create({ data: {
          organizationId: o.organizationId, recipientUserId: owner.id, kind: "CRM_OPPORTUNITY_OVERDUE", category: "CRM",
          title: `${overdue ? "Opportunity past its date" : "Opportunity has not moved"}: ${o.title}`,
          body: overdue ? `With ${o.relationship.partner?.name ?? "a stakeholder"}. Expected ${o.expectedDate.toISOString().slice(0, 10)}. Update the date or move the stage.` : `With ${o.relationship.partner?.name ?? "a stakeholder"}. No change of stage for over ${CRM_STALE_OPPORTUNITY_DAYS} days. Move it on, or close it if it has gone cold.`,
          link: `/relationships?id=${o.relationshipId}&tab=financials`, subjectType: "CrmOpportunity", subjectId: o.id, requiresAction: true, actionStatus: "OPEN", dueDate: cycle,
        } });
      }
      res.created++; res.opportunities = (res.opportunities ?? 0) + 1;
    }
  });
  return res;
}
