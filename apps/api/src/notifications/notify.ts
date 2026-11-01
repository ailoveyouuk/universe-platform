import type { Prisma } from "@universe/db";
import { EMAIL_EVENT_TYPES } from "@universe/types";

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
  // Defence in depth: only ever notify people who belong to the organisation
  // the event happened in, whatever id a caller passed in.
  const orgIds = [...new Set(items.map((i) => i.organizationId))];
  const members = new Set<string>();
  for (const orgId of orgIds) {
    const ids = [...new Set(items.filter((i) => i.organizationId === orgId).map((i) => i.recipientUserId))];
    const found = await tx.user.findMany({ where: { id: { in: ids }, organizationId: orgId }, select: { id: true } });
    for (const f of found) members.add(`${orgId}|${f.id}`);
  }
  items = items.filter((i) => members.has(`${i.organizationId}|${i.recipientUserId}`));

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
  await queueEmails(tx, rows);
}

/** Queues an email for each address the organisation chose for this type of event (see email-rules). Sent later, when a mail provider is configured. */
async function queueEmails(tx: Prisma.TransactionClient, rows: Prisma.NotificationCreateManyInput[]): Promise<void> {
  const keyOf = (kind: string) => EMAIL_EVENT_TYPES.find((e) => e.kinds.includes(kind))?.key;
  const relevant = rows.map((r) => ({ r, key: keyOf(r.kind) })).filter((x): x is { r: Prisma.NotificationCreateManyInput; key: string } => !!x.key);
  if (!relevant.length) return;
  const recips = await tx.emailRecipient.findMany({ where: { organizationId: { in: [...new Set(relevant.map((x) => x.r.organizationId))] }, eventKey: { in: [...new Set(relevant.map((x) => x.key))] } } });
  if (!recips.length) return;
  const userIds = [...new Set(recips.map((x) => x.userId).filter((x): x is string => !!x))];
  const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds }, status: "ACTIVE" }, select: { id: true, email: true } }) : [];
  const emailOf = new Map(users.map((u) => [u.id, u.email]));
  const seen = new Set<string>();
  const data: Prisma.EmailOutboxCreateManyInput[] = [];
  for (const { r, key } of relevant) {
    for (const rc of recips.filter((x) => x.organizationId === r.organizationId && x.eventKey === key)) {
      const to = (rc.userId ? emailOf.get(rc.userId) : rc.address)?.trim().toLowerCase();
      if (!to) continue;
      const dedupe = `${to}|${r.kind}|${r.subjectId ?? ""}|${r.title}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      data.push({ organizationId: r.organizationId, eventKey: key, toAddress: to, subject: r.title.slice(0, 300), body: (r.body ?? r.title).slice(0, 2000), link: r.link ?? null });
    }
  }
  if (data.length) await tx.emailOutbox.createMany({ data });
}

/** Active users in an organisation holding a permission (e.g. the QA
 * reviewers who hold "products.approve"). Optionally excludes one user. */
export async function usersWithPermission(tx: Prisma.TransactionClient, organizationId: string, permissionKey: string, excludeUserId?: string): Promise<string[]> {
  const rows = await tx.user.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      userRoles: { some: { role: { rolePermissions: { some: { permission: { key: permissionKey } } } } } },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Closes every OPEN action about a record — used when the work the action
 * asked for has been done by someone (a reviewer reviewed the excursion,
 * the risk was closed, the amendment was decided). Optionally limited to
 * one recipient. */
export async function completeActionsFor(tx: Prisma.TransactionClient, organizationId: string, subjectType: string, subjectId: string, recipientUserId?: string): Promise<void> {
  const now = new Date();
  await tx.notification.updateMany({
    where: { organizationId, subjectType, subjectId, requiresAction: true, actionStatus: "OPEN", ...(recipientUserId ? { recipientUserId } : {}) },
    data: { actionStatus: "DONE", completedAt: now, readAt: now },
  });
}

/** Moves the due date of open actions about a record (e.g. a risk's review date changed). */
export async function rescheduleActionsFor(tx: Prisma.TransactionClient, organizationId: string, subjectType: string, subjectId: string, dueDate: Date | null): Promise<void> {
  await tx.notification.updateMany({ where: { organizationId, subjectType, subjectId, requiresAction: true, actionStatus: "OPEN" }, data: { dueDate } });
}
