import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmService } from "../src/crm/crm.service";
import { CrmTagsService } from "../src/crm/crm-tags.service";

/** CRM tags against the real RLS database: create, apply, filter, archive, isolation. */
describe("CRM interactions", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmTagsService();
  const crm = new CrmService({} as never);
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
      await tx.crmRelationshipTag.deleteMany({ where: { organizationId: orgs } });
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

  it("creates a tag once, applies it, shows it on the row and filters by it", async () => {
    const t = await svc.create(u.manager, { name: "  WHO   prequalified " });
    expect(t.name).toBe("WHO prequalified");
    await expect(svc.create(u.manager, { name: "who prequalified" })).rejects.toThrow();
    await expect(svc.create(u.viewer, { name: "x" })).rejects.toThrow();
    await svc.apply(u.manager, relA, t.id);
    await svc.apply(u.manager, relA, t.id);
    const page = await crm.list(u.viewer, { tag: t.id });
    expect(page.total).toBe(1);
    expect(page.items[0].tags.map((x) => x.name)).toEqual(["WHO prequalified"]);
    expect((await svc.list(u.viewer)).find((x) => x.id === t.id)?.count).toBe(1);
    const log = await withPlatformStaffContext((tx) => tx.fieldChangeLog.findMany({ where: { recordId: relA } }));
    expect(log.filter((l) => l.fieldName === "tag added")).toHaveLength(1);
  });

  it("removing keeps history, re-adding restores, archiving hides the tag", async () => {
    const [t] = await svc.list(u.viewer);
    await svc.remove(u.manager, relA, t.id);
    expect((await crm.list(u.viewer, { tag: t.id })).total).toBe(0);
    await svc.apply(u.manager, relA, t.id);
    expect((await crm.list(u.viewer, { tag: t.id })).total).toBe(1);
    const rows = await withPlatformStaffContext((tx) => tx.crmRelationshipTag.findMany({ where: { relationshipId: relA } }));
    expect(rows).toHaveLength(1);
    await svc.update(u.manager, t.id, { archived: true });
    expect(await svc.list(u.viewer)).toHaveLength(0);
    expect((await crm.list(u.viewer, {})).items[0].tags).toEqual([]);
    const back = await svc.create(u.manager, { name: "WHO prequalified" });
    expect(back.id).toBe(t.id);
  });

  it("is private to the organisation", async () => {
    const [t] = await svc.list(u.viewer);
    expect(await svc.list(u.other)).toHaveLength(0);
    await expect(svc.update(u.other, t.id, { name: "x" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.apply(u.other, relB, t.id)).rejects.toBeInstanceOf(NotFoundException);
    void BadRequestException;
  });
});
