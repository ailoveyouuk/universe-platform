import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmInteractionsService } from "../src/crm/crm-interactions.service";
import { NotificationsService } from "../src/notifications/notifications.service";

/** CRM interactions against the real RLS database: confidential visibility, follow-ups as actions, audit trail, organisation isolation. */
describe("CRM interactions", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmInteractionsService();
  const notifications = new NotificationsService();
  let orgA: string; let orgB: string; let relA: string; let relB: string;
  const userIds: string[] = [];
  const u: Record<string, RequestUser> = {};

  async function makeUser(orgId: string, tag: string, permissions: string[]): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) => tx.user.create({ data: { organizationId: orgId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Tester", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } }));
    userIds.push(user.id);
    return { id: user.id, organizationId: orgId, homeOrganizationId: orgId, email: user.email, forename: tag, surname: "Tester", organizationName: "x", organizationLogoUrl: null, organizationLogoIconUrl: null,
      organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions, apps: null } as RequestUser;
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Crm A ${suffix}`, slug: `crm-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Crm B ${suffix}`, slug: `crm-b-${suffix}` })).id;
    u.manager = await makeUser(orgA, "manager", ["crm.view", "crm.manage"]);
    u.viewer = await makeUser(orgA, "viewer", ["crm.view"]);
    u.owner = await makeUser(orgA, "owner", ["crm.view"]);
    u.other = await makeUser(orgB, "other", ["crm.view", "crm.manage"]);
    await withPlatformStaffContext(async (tx) => {
      const pa = await tx.partner.create({ data: { organizationId: orgA, name: `Acme ${suffix}`, normalizedName: `acme ${suffix}` } });
      const pb = await tx.partner.create({ data: { organizationId: orgB, name: `Beta ${suffix}`, normalizedName: `beta ${suffix}` } });
      relA = (await tx.crmRelationship.create({ data: { organizationId: orgA, partnerId: pa.id, counterpartyKey: `partner:${pa.id}`, ownerUserId: u.owner.id } })).id;
      relB = (await tx.crmRelationship.create({ data: { organizationId: orgB, partnerId: pb.id, counterpartyKey: `partner:${pb.id}` } })).id;
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: [orgA, orgB] };
      await tx.notification.deleteMany({ where: { organizationId: orgs } });
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmInteraction.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationship.deleteMany({ where: { organizationId: orgs } });
      await tx.partner.deleteMany({ where: { organizationId: orgs } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: orgs } } });
      await tx.role.deleteMany({ where: { organizationId: orgs } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: orgs } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  const today = () => new Date().toISOString().slice(0, 10);

  it("logs an interaction, audits it, and lists it", async () => {
    const i = await svc.create(u.manager, relA, { type: "MEETING", occurredAt: today(), title: "Quarterly review", summary: "Went well", participantUserIds: [u.viewer.id] });
    expect(i.participants.map((p) => p.name)).toEqual(["viewer Tester"]);
    const page = await svc.list(u.viewer, relA, {});
    expect(page.items.map((x) => x.title)).toContain("Quarterly review");
    const log = await prisma.fieldChangeLog.count({ where: { organizationId: orgA, tableName: "crm_interactions", recordId: i.id } });
    expect(log).toBeGreaterThan(0);
  });

  it("needs crm.manage to log, and rejects future dates and strangers as participants", async () => {
    await expect(svc.create(u.viewer, relA, { type: "CALL", occurredAt: today(), title: "x" })).rejects.toThrow();
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    await expect(svc.create(u.manager, relA, { type: "CALL", occurredAt: future, title: "x" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create(u.manager, relA, { type: "CALL", occurredAt: today(), title: "x", participantUserIds: [u.other.id] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("hides a confidential interaction from others but shows it to its author, the owner and managers", async () => {
    await svc.create(u.manager, relA, { type: "DECISION", occurredAt: today(), title: "Secret decision", confidential: true });
    const titles = async (user: RequestUser) => (await svc.list(user, relA, {})).items.map((x) => x.title);
    expect(await titles(u.viewer)).not.toContain("Secret decision");
    expect(await titles(u.owner)).toContain("Secret decision");
    expect(await titles(u.manager)).toContain("Secret decision");
  });

  it("a follow-up becomes an action for the assignee", async () => {
    await svc.create(u.manager, relA, { type: "CALL", occurredAt: today(), title: "Chase certificate", followUp: { assigneeUserId: u.viewer.id, dueDate: "2026-12-01", note: "Ask for the renewed ISO certificate" } });
    const mine = await notifications.list(u.viewer, "actions");
    expect(mine.some((n) => n.kind === "CRM_FOLLOW_UP" && n.requiresAction && n.link === `/relationships?id=${relA}`)).toBe(true);
    expect((await svc.myFollowUps(u.viewer)).length).toBeGreaterThan(0);
  });

  it("archives rather than deletes, and another organisation sees nothing", async () => {
    const i = await svc.create(u.manager, relA, { type: "OTHER", occurredAt: today(), title: "To archive" });
    await svc.update(u.manager, i.id, { archived: true });
    expect((await svc.list(u.manager, relA, {})).items.map((x) => x.id)).not.toContain(i.id);
    expect(await prisma.crmInteraction.count({ where: { id: i.id } })).toBe(1);
    await expect(svc.list(u.other, relA, {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.create(u.other, relA, { type: "CALL", occurredAt: today(), title: "x" })).rejects.toBeInstanceOf(NotFoundException);
    expect((await svc.list(u.other, relB, {})).total).toBe(0);
  });
});
