import type { Prisma } from "@universe/db";

/** Input for one notification — see Notification in schema.prisma. */
export interface NewNotification {
  organizationId: string;
  recipientUserId: string;
  actorUserId?: string | null;
  kind: string;
  category?: string;
  title: string;
  body?: string | null;
  link?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  requiresAction?: boolean;
  dueDate?: Date | null;
}

/**
 * Writes notifications INSIDE the caller's transaction, so a notification
 * exists if and only if the event that caused it committed. Never notifies
 * the actor about their own action (except explicit self-assigned actions,
 * which arrive already read). De-duplicates recipients per call.
 */
export async function createNotifications(tx: Prisma.TransactionClient, items: NewNotification[]): Promise<void> {
  const seen = new Set<string>();
  const rows: Prisma.NotificationCreateManyInput[] = [];
  for (const n of items) {
    const key = `${n.recipientUserId}|${n.kind}|${n.subjectId ?? ""}|${n.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const self = !!n.actorUserId && n.actorUserId === n.recipientUserId;
    // Self-directed informational events are noise; a self-assigned action
    // is still a legitimate to-do, just already "seen".
    if (self && !n.requiresAction) continue;
    rows.push({
      organizationId: n.organizationId,
      recipientUserId: n.recipientUserId,
      actorUserId: n.actorUserId ?? null,
      kind: n.kind,
      category: n.category ?? "PROJECT",
      title: n.title.slice(0, 300),
      body: n.body ? n.body.slice(0, 1000) : null,
      link: n.link ?? null,
      subjectType: n.subjectType ?? null,
      subjectId: n.subjectId ?? null,
      requiresAction: !!n.requiresAction,
      actionStatus: n.requiresAction ? "OPEN" : null,
      dueDate: n.dueDate ?? null,
      readAt: self ? new Date() : null,
    });
  }
  if (rows.length) await tx.notification.createMany({ data: rows });
}
