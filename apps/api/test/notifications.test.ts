import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { NotificationsService } from "../src/notifications/notifications.service";
import { ProjectsService } from "../src/projects/projects.service";

/**
 * Notifications and per-user actions (added 2026-10-16), run against the real
 * Row-Level-Security database. Covers: assignment notifies the assignee only,
 * status changes notify leads but not the actor, actions can only go to
 * colleagues in the SAME organisation, and one user can never read or change
 * another user's items.
 */
describe("Notifications & actions", () => {
  const suffix = randomUUID().slice(0, 8);
  const notifications = new NotificationsService();
  // Only addLead / assignAction / update are exercised; none touch exchange rates.
  const projects = new ProjectsService({} as never);

  let orgA: string;
  let orgB: string;
  let projectId: string;
  const userIds: string[] = [];
  const u: Record<string, RequestUser> = {};

  async function makeUser(orgId: string, tag: string): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) =>
      tx.user.create({ data: { organizationId: orgId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Tester", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } }),
    );
    userIds.push(user.id);
    return {
      id: user.id,
      organizationId: orgId,
      homeOrganizationId: orgId,
      email: user.email,
      forename: tag,
      surname: "Tester",
      organizationName: "x",
      organizationLogoUrl: null,
      organizationLogoIconUrl: null,
      organizationPrimaryColor: null,
      organizationSecondaryColor: null,
      organizationWelcomeMessage: null,
      platformStaffRole: "NONE",
      permissions: [],
    };
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Notif A ${suffix}`, slug: `notif-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Notif B ${suffix}`, slug: `notif-b-${suffix}` })).id;
    u.alice = await makeUser(orgA, "alice");
    u.bob = await makeUser(orgA, "bob");
    u.carol = await makeUser(orgA, "carol");
    u.mallory = await makeUser(orgB, "mallory");
    projectId = (
      await withPlatformStaffContext((tx) =>
        tx.project.create({ data: { organizationId: orgA, referenceNumber: `N-${suffix}`, title: "Notif project", category: "PROCUREMENT", projectType: "PHARMACEUTICAL" } }),
      )
    ).id;
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.notification.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.projectLead.deleteMany({ where: { projectId } });
      await tx.projectStatusHistory.deleteMany({ where: { projectId } });
      await tx.project.deleteMany({ where: { id: projectId } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("adding a lead notifies that person only, and the actor is not notified", async () => {
    await projects.addLead(u.alice, projectId, u.bob.id);
    const bobs = await notifications.list(u.bob);
    expect(bobs).toHaveLength(1);
    expect(bobs[0]).toMatchObject({ kind: "PROJECT_ASSIGNED", read: false, requiresAction: false, actorName: "alice Tester" });
    expect(bobs[0].link).toBe(`/projects/detail?id=${projectId}`);
    expect(await notifications.list(u.alice)).toHaveLength(0);
    expect(await notifications.list(u.carol)).toHaveLength(0);
    expect((await notifications.summary(u.bob)).unread).toBe(1);
  });

  it("cannot add a lead from another organisation", async () => {
    await expect(projects.addLead(u.alice, projectId, u.mallory.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await notifications.list(u.mallory)).toHaveLength(0);
  });

  it("a status change notifies the leads but not the person who made it", async () => {
    await projects.addLead(u.alice, projectId, u.alice.id); // alice leads too (no self-notification)
    await projects.update(u.alice, projectId, { status: "IN_PROGRESS" } as never);
    const bobs = await notifications.list(u.bob);
    expect(bobs.some((n) => n.kind === "PROJECT_STATUS_CHANGED")).toBe(true);
    expect((await notifications.list(u.alice)).some((n) => n.kind === "PROJECT_STATUS_CHANGED")).toBe(false);
  });

  it("assigns an action only to a colleague in the same organisation", async () => {
    await projects.assignAction(u.alice, projectId, { assigneeUserId: u.carol.id, title: "Chase supplier quote", dueDate: "2026-12-01" });
    const carols = await notifications.list(u.carol, "actions");
    expect(carols).toHaveLength(1);
    expect(carols[0]).toMatchObject({ kind: "ACTION_ASSIGNED", requiresAction: true, actionStatus: "OPEN", title: "Chase supplier quote" });
    await expect(projects.assignAction(u.alice, projectId, { assigneeUserId: u.mallory.id, title: "Nope" })).rejects.toBeInstanceOf(NotFoundException);
    const sum = await notifications.summary(u.carol);
    expect(sum.openActions).toBe(1);
    expect(sum.nextActions[0].title).toBe("Chase supplier quote");
  });

  it("one user can never read, change or complete another user's items", async () => {
    const carolItem = (await notifications.list(u.carol, "actions"))[0];
    await expect(notifications.markRead(u.bob, carolItem.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(notifications.complete(u.bob, carolItem.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(notifications.markRead(u.mallory, carolItem.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await notifications.list(u.carol, "actions"))[0].actionStatus).toBe("OPEN");
  });

  it("completing an action closes it and tells whoever assigned it; reopen works", async () => {
    const item = (await notifications.list(u.carol, "actions"))[0];
    const done = await notifications.complete(u.carol, item.id);
    expect(done).toMatchObject({ actionStatus: "DONE", read: true });
    expect((await notifications.summary(u.carol)).openActions).toBe(0);
    const alices = await notifications.list(u.alice);
    expect(alices.some((n) => n.kind === "ACTION_COMPLETED" && n.title.includes("Chase supplier quote"))).toBe(true);
    expect((await notifications.reopen(u.carol, item.id)).actionStatus).toBe("OPEN");
  });

  it("mark-all-read clears the unread count", async () => {
    expect((await notifications.summary(u.bob)).unread).toBeGreaterThan(0);
    await notifications.markAllRead(u.bob);
    expect((await notifications.summary(u.bob)).unread).toBe(0);
  });

  it("a self-assigned action is a to-do, already read, and not a notification to oneself", async () => {
    await projects.assignAction(u.carol, projectId, { assigneeUserId: u.carol.id, title: "Remember to review" });
    const mine = (await notifications.list(u.carol, "actions")).find((n) => n.title === "Remember to review");
    expect(mine).toMatchObject({ read: true, requiresAction: true });
  });
});
