import { Injectable, NotFoundException } from "@nestjs/common";
import { APP_NOTIFICATION_CATEGORIES, APP_ROUTE_PREFIXES, appForNotification, canUseApp, UNIVERSE_APP_KEYS, type NotificationItem, type NotificationSummary } from "@universe/types";
import { withTenantContext, type Prisma } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { createNotifications } from "./notify";

type Row = Prisma.NotificationGetPayload<{ include: { actor: true } }>;

function toItem(n: Row): NotificationItem {
  return {
    id: n.id,
    kind: n.kind as NotificationItem["kind"],
    category: n.category as NotificationItem["category"],
    title: n.title,
    body: n.body,
    link: n.link,
    app: appForNotification(n.category, n.link),
    actorName: n.actor ? `${n.actor.forename} ${n.actor.surname}`.trim() : null,
    requiresAction: n.requiresAction,
    actionStatus: n.requiresAction ? ((n.actionStatus as "OPEN" | "DONE") ?? "OPEN") : null,
    dueDate: n.dueDate ? n.dueDate.toISOString() : null,
    read: !!n.readAt,
    createdAt: n.createdAt.toISOString(),
    completedAt: n.completedAt ? n.completedAt.toISOString() : null,
  };
}

/** Every query here is pinned to the signed-in user (recipientUserId) AND
 * their organisation context — one user can never see another's items. */
@Injectable()
export class NotificationsService {
  /** The person's own items, minus those that belong to an app they have not been given (Admin > Users > Apps). No restriction: everything. */
  private mine(user: RequestUser): Prisma.NotificationWhereInput {
    const base: Prisma.NotificationWhereInput = { recipientUserId: user.id, organizationId: user.organizationId };
    if (!user.apps) return base;
    const prefixes: Prisma.NotificationWhereInput[] = [];
    const cats: string[] = [];
    for (const app of UNIVERSE_APP_KEYS) {
      if (canUseApp(user.apps, app)) continue;
      for (const seg of APP_ROUTE_PREFIXES[app] ?? []) prefixes.push({ link: { startsWith: `/${seg}` } });
      cats.push(...(APP_NOTIFICATION_CATEGORIES[app] ?? []));
    }
    if (!prefixes.length && !cats.length) return base;
    // Written as two positive branches so a null link is never caught in a NOT (SQL treats NOT NULL as unknown and would drop the row).
    return {
      ...base,
      OR: [
        { link: null, ...(cats.length ? { category: { notIn: cats } } : {}) },
        { link: { not: null }, ...(prefixes.length ? { NOT: { OR: prefixes } } : {}) },
      ],
    };
  }

  async list(user: RequestUser, filter: "all" | "unread" | "actions" | "done" = "all", limit = 50): Promise<NotificationItem[]> {
    const where: Prisma.NotificationWhereInput = { ...this.mine(user) };
    if (filter === "unread") where.readAt = null;
    if (filter === "actions") Object.assign(where, { requiresAction: true, actionStatus: "OPEN" });
    if (filter === "done") Object.assign(where, { requiresAction: true, actionStatus: "DONE" });
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.notification.findMany({ where, include: { actor: true }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 200) }),
    );
    return rows.map(toItem);
  }

  async summary(user: RequestUser): Promise<NotificationSummary> {
    const now = new Date();
    const [unread, openActions, overdueActions, next] = await withTenantContext(user.organizationId, (tx) =>
      Promise.all([
        tx.notification.count({ where: { ...this.mine(user), readAt: null } }),
        tx.notification.count({ where: { ...this.mine(user), requiresAction: true, actionStatus: "OPEN" } }),
        tx.notification.count({ where: { ...this.mine(user), requiresAction: true, actionStatus: "OPEN", dueDate: { lt: now } } }),
        tx.notification.findMany({
          where: { ...this.mine(user), requiresAction: true, actionStatus: "OPEN" },
          include: { actor: true },
          take: 100,
        }),
      ]),
    );
    // Overdue first, then soonest due, undated last, newest first within ties.
    const far = Number.MAX_SAFE_INTEGER;
    next.sort((a, b) => (a.dueDate?.getTime() ?? far) - (b.dueDate?.getTime() ?? far) || b.createdAt.getTime() - a.createdAt.getTime());
    return { unread, openActions, overdueActions, nextActions: next.slice(0, 5).map(toItem) };
  }

  private async mutate(user: RequestUser, id: string, data: Prisma.NotificationUpdateManyMutationInput, after?: (tx: Prisma.TransactionClient, n: Row) => Promise<void>) {
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.notification.findFirst({ where: { id, ...this.mine(user) }, include: { actor: true } });
      if (!existing) throw new NotFoundException("Notification not found");
      await tx.notification.updateMany({ where: { id, ...this.mine(user) }, data });
      const updated = await tx.notification.findFirstOrThrow({ where: { id }, include: { actor: true } });
      if (after) await after(tx, existing);
      return toItem(updated);
    });
  }

  markRead(user: RequestUser, id: string) {
    return this.mutate(user, id, { readAt: new Date() });
  }

  async markAllRead(user: RequestUser): Promise<{ ok: true }> {
    await withTenantContext(user.organizationId, (tx) => tx.notification.updateMany({ where: { ...this.mine(user), readAt: null }, data: { readAt: new Date() } }));
    return { ok: true };
  }

  /** Complete an action; also tells whoever assigned it. */
  complete(user: RequestUser, id: string) {
    return this.mutate(user, id, { actionStatus: "DONE", completedAt: new Date(), readAt: new Date() }, async (tx, n) => {
      if (!n.requiresAction) throw new NotFoundException("That item is not an action");
      if (n.actionStatus === "DONE") return;
      if (n.actorUserId && n.actorUserId !== user.id) {
        await createNotifications(tx, [
          {
            organizationId: user.organizationId,
            recipientUserId: n.actorUserId,
            actorUserId: user.id,
            kind: "ACTION_COMPLETED",
            title: `${user.forename} ${user.surname} completed: ${n.title}`,
            link: n.link,
            subjectType: n.subjectType,
            subjectId: n.subjectId,
          },
        ]);
      }
    });
  }

  reopen(user: RequestUser, id: string) {
    return this.mutate(user, id, { actionStatus: "OPEN", completedAt: null });
  }
}
