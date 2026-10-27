import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmSavedFiltersService } from "../src/crm/crm-saved-filters.service";

/** CRM saved filters against the real RLS database: personal vs shared, whitelist, archive, isolation. */
describe("CRM interactions", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmSavedFiltersService();;
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
      await tx.crmSavedFilter.deleteMany({ where: { organizationId: orgs } });
      await tx.crmTag.deleteMany({ where: { organizationId: orgs } });
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

  it("keeps a personal filter private, and only managers can share", async () => {
    const mine = await svc.create(u.viewer, { view: "RELATIONSHIPS", name: "  My   review list ", filters: { review: "due", owner: "me" } });
    expect(mine).toMatchObject({ name: "My review list", shared: false, mine: true, filters: { review: "due", owner: "me" } });
    await expect(svc.create(u.viewer, { view: "RELATIONSHIPS", name: "My review list", filters: { review: "due" } })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.create(u.viewer, { view: "PORTFOLIO", name: "Team", filters: { work: "none" }, shared: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(await svc.list(u.manager, "RELATIONSHIPS")).toHaveLength(0);
    const team = await svc.create(u.manager, { view: "RELATIONSHIPS", name: "Strategic at risk", filters: { tier: "STRATEGIC", health: "AT_RISK" }, shared: true });
    expect((await svc.list(u.viewer, "RELATIONSHIPS")).map((x) => x.name).sort()).toEqual(["My review list", "Strategic at risk"]);
    expect((await svc.list(u.viewer, "PORTFOLIO"))).toHaveLength(0);
    expect(team.mine).toBe(true);
  });

  it("stores only known filter keys, and needs at least one", async () => {
    const f = await svc.create(u.viewer, { view: "PORTFOLIO", name: "Whitelist", filters: { work: "none", evil: "x", q: "  kenya " } as never });
    expect(f.filters).toEqual({ q: "kenya", work: "none" });
    await expect(svc.create(u.viewer, { view: "PORTFOLIO", name: "Empty", filters: { nope: "x" } as never })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create(u.viewer, { view: "PORTFOLIO", name: "x", filters: {} })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("owners change their own, managers also shared ones, others cannot; archived ones disappear", async () => {
    const [shared] = (await svc.list(u.viewer, "RELATIONSHIPS")).filter((x) => x.shared);
    await expect(svc.update(u.viewer, shared.id, { name: "Hijack" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.update(u.viewer, shared.id, { archived: true })).rejects.toBeInstanceOf(NotFoundException);
    const [mine] = (await svc.list(u.viewer, "RELATIONSHIPS")).filter((x) => x.mine);
    await expect(svc.update(u.viewer, mine.id, { shared: true })).rejects.toBeInstanceOf(BadRequestException);
    await svc.update(u.manager, shared.id, { name: "Strategic at risk (all)" });
    await svc.update(u.viewer, mine.id, { archived: true });
    expect((await svc.list(u.viewer, "RELATIONSHIPS")).map((x) => x.name)).toEqual(["Strategic at risk (all)"]);
    const rows = await withPlatformStaffContext((tx) => tx.crmSavedFilter.findMany({ where: { id: mine.id } }));
    expect(rows[0].archivedAt).not.toBeNull();
  });

  it("is private to the organisation", async () => {
    expect(await svc.list(u.other)).toHaveLength(0);
    const [shared] = (await svc.list(u.manager, "RELATIONSHIPS"));
    await expect(svc.update(u.other, shared.id, { name: "x" })).rejects.toBeInstanceOf(NotFoundException);
    void relB;
  });
});
