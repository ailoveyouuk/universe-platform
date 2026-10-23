import { prisma, withPlatformStaffContext } from "./index";

/** Reminder stages, nearest first. A certificate gets one notification per stage it has reached. */
export const CERT_REMINDER_STAGES = [
  { key: "EXPIRED", maxDays: -1, label: "has expired" },
  { key: "D7", maxDays: 7, label: "expires within 7 days" },
  { key: "D30", maxDays: 30, label: "expires within 30 days" },
  { key: "D90", maxDays: 90, label: "expires within 90 days" },
] as const;

export function certReminderStage(daysLeft: number) {
  return CERT_REMINDER_STAGES.find((s) => daysLeft <= s.maxDays) ?? null;
}

export interface CertReminderResult { checked: number; created: number; skipped: number }

/** Notifies each org's profile managers (org.profile.manage) about expiring or expired certificates, once per stage. */
export async function runCertExpiryReminders(opts: { dryRun?: boolean; now?: Date } = {}): Promise<CertReminderResult> {
  const now = opts.now ?? new Date();
  const horizon = new Date(now.getTime() + 90 * 86400000);
  const res: CertReminderResult = { checked: 0, created: 0, skipped: 0 };
  await withPlatformStaffContext(async (tx: any) => {
    const certs = await tx.organizationCertification.findMany({
      where: { archivedAt: null, expiresOn: { not: null, lte: horizon } },
      select: { id: true, organizationId: true, type: true, title: true, expiresOn: true },
    });
    for (const c of certs) {
      res.checked++;
      const days = Math.floor((c.expiresOn.getTime() - now.getTime()) / 86400000);
      const stage = certReminderStage(days);
      if (!stage) { res.skipped++; continue; }
      const recipients = await tx.user.findMany({
        where: { organizationId: c.organizationId, status: "ACTIVE", userRoles: { some: { role: { rolePermissions: { some: { permission: { key: "org.profile.manage" } } } } } } },
        select: { id: true },
      });
      const subjectId = `${c.id}:${stage.key}`;
      const title = `Certification ${stage.label}: ${c.title || c.type}`;
      for (const r of recipients) {
        const exists = await tx.notification.findFirst({ where: { recipientUserId: r.id, kind: "CERT_EXPIRY", subjectId }, select: { id: true } });
        if (exists) { res.skipped++; continue; }
        if (!opts.dryRun) {
          await tx.notification.create({ data: {
            organizationId: c.organizationId, recipientUserId: r.id, kind: "CERT_EXPIRY", category: "SYSTEM",
            title, body: `Expiry date: ${c.expiresOn.toISOString().slice(0, 10)}. Update or renew it in your organisation profile.`,
            link: `/organizations/detail?id=${c.organizationId}`, subjectType: "OrganizationCertification", subjectId,
          } });
        }
        res.created++;
      }
    }
  });
  return res;
}
