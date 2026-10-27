import { withPlatformStaffContext } from "./index";

export interface CrmReviewReminderResult { checked: number; created: number; skipped: number }

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
  const res: CrmReviewReminderResult = { checked: 0, created: 0, skipped: 0 };
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
  });
  return res;
}
