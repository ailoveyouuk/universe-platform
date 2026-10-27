import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmService } from "../src/crm/crm.service";
import { CrmSearchService } from "../src/crm/crm-search.service";

/** CRM-wide keyword search, broader list search and per-kind counts against the real RLS database. */
describe("CRM search", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmService({} as never);
  const search = new CrmSearchService();
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
    orgA = (await createOrganizationWithDefaultRoles({ name: `Search A ${suffix}`, slug: `search-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Search B ${suffix}`, slug: `search-b-${suffix}` })).id;
    u.manager = await makeUser(orgA, "manager", ["crm.view", "crm.manage"]);
    u.viewer = await makeUser(orgA, "viewer", ["crm.view"]);
    await withPlatformStaffContext(async (tx) => {
      const mk = async (org: string, name: string, role: string) => {
        const p = await tx.partner.create({ data: { organizationId: org, name: `${name} ${suffix}`, normalizedName: `${name.toLowerCase()} ${suffix}`, countryCode: "KE", roles: { create: [{ roleType: role }] } } });
        const r = await tx.crmRelationship.create({ data: { organizationId: org, partnerId: p.id, counterpartyKey: `partner:${p.id}` } });
        return { p, r };
      };
      const a = await mk(orgA, "Zephyr Labs", "MANUFACTURER"); relA = a.r.id;
      await mk(orgA, "Harbour Fund", "FUNDER_DONOR");
      relB = (await mk(orgB, "Zephyr Rivals", "MANUFACTURER")).r.id;
      await tx.contact.create({ data: { organizationId: orgA, partnerId: a.p.id, name: "Priya Quillfeather", email: `priya-${suffix}@zephyr.example`, title: "Quality lead" } });
      const tag = await tx.crmTag.create({ data: { organizationId: orgA, name: "Cold chain", normalizedName: `cold chain ${suffix}` } });
      await tx.crmRelationshipTag.create({ data: { organizationId: orgA, relationshipId: relA, tagId: tag.id } as never });
      await tx.crmInteraction.create({ data: { organizationId: orgA, relationshipId: relA, type: "MEETING", occurredAt: new Date(), title: `Open audit review ${suffix}`, createdById: u.manager.id } as never });
      await tx.crmInteraction.create({ data: { organizationId: orgA, relationshipId: relA, type: "CALL", occurredAt: new Date(), title: `Secret pricing talk ${suffix}`, confidential: true, createdById: u.manager.id } as never });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: [orgA, orgB] };
      await tx.notification.deleteMany({ where: { organizationId: orgs } });
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmInteraction.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationshipTag.deleteMany({ where: { organizationId: orgs } });
      await tx.crmTag.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationship.deleteMany({ where: { organizationId: orgs } });
      await tx.contact.deleteMany({ where: { organizationId: orgs } });
      await tx.partnerRole.deleteMany({ where: { partner: { organizationId: orgs } } });
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

  const group = (r: Awaited<ReturnType<CrmSearchService["search"]>>, t: string) => r.groups.find((g) => g.type === t)!;

  it("finds a stakeholder by name, by a contact's email, by a tag and by its kind, and only in the caller's organisation", async () => {
    expect(group(await search.search(u.manager, `Zephyr ${suffix}`), "stakeholders").hits.map((h) => h.id)).toEqual([relA]);
    expect(group(await search.search(u.manager, `priya-${suffix}@zephyr`), "contacts").total).toBe(1);
    expect(group(await search.search(u.manager, `cold chain`), "stakeholders").hits.map((h) => h.id)).toContain(relA);
    const funders = group(await search.search(u.manager, `funder ${suffix}`), "stakeholders");
    expect(funders.hits.map((h) => h.title)).toEqual([`Harbour Fund ${suffix}`]);
    expect(group(await search.search(u.manager, `Zephyr Rivals`), "stakeholders").total).toBe(0); // other organisation's record
    expect((await search.search(u.manager, "Zephyr Rivals")).groups.every((g) => g.hits.every((h) => !h.link.includes(relB)))).toBe(true);
  });

  it("needs every word to match, and hides confidential interactions from people who may not see them", async () => {
    expect(group(await search.search(u.manager, `Zephyr nonsenseword`), "stakeholders").total).toBe(0);
    expect(group(await search.search(u.manager, `pricing ${suffix}`), "interactions").total).toBe(1);
    expect(group(await search.search(u.viewer, `pricing ${suffix}`), "interactions").total).toBe(0);
    expect(group(await search.search(u.viewer, `audit review ${suffix}`), "interactions").total).toBe(1);
  });

  it("the stakeholder list search now matches contacts and tags, and the overview counts stakeholders by kind", async () => {
    expect((await svc.list(u.manager, { q: "Quillfeather" })).items.map((r) => r.id)).toEqual([relA]);
    expect((await svc.list(u.manager, { q: "cold chain" })).items.map((r) => r.id)).toEqual([relA]);
    const o = await svc.overview(u.manager);
    expect(o.byCategory.MANUFACTURER).toBe(1);
    expect(o.byCategory.FUNDER_DONOR).toBe(1);
    expect((await svc.list(u.manager, { role: "FUNDER_DONOR" })).items.length).toBe(1);
  });
});
