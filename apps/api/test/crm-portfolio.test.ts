import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmService } from "../src/crm/crm.service";

/** CRM portfolio against the real RLS database: projects by outcome, contacts, sites, work filter, permissions. */
describe("CRM interactions", () => {
  const suffix = randomUUID().slice(0, 8);
  const crm = new CrmService({} as never);
  let relNone: string; let partnerA: string;
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
      await tx.projectLine.deleteMany({ where: { organizationId: orgs } });
      await tx.project.deleteMany({ where: { organizationId: orgs } });
      await tx.contact.deleteMany({ where: { organizationId: orgs } });
      await tx.manufacturerSite.deleteMany({ where: { partner: { organizationId: orgs } } });
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

  const proj = (status: string, extra: Record<string, unknown> = {}) => ({ organizationId: orgA, referenceNumber: `PF-${status}-${randomUUID().slice(0, 6)}`, title: status, category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status, ...extra });

  beforeAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      partnerA = (await tx.crmRelationship.findUniqueOrThrow({ where: { id: relA } })).partnerId!;
      const none = await tx.partner.create({ data: { organizationId: orgA, name: `Nobody ${suffix}`, normalizedName: `nobody ${suffix}` } });
      relNone = (await tx.crmRelationship.create({ data: { organizationId: orgA, partnerId: none.id, counterpartyKey: `partner:${none.id}` } })).id;
      await tx.project.create({ data: proj("AWARDED", { clientId: partnerA }) });
      await tx.project.create({ data: proj("DECLINED", { clientId: partnerA }) });
      await tx.project.create({ data: proj("CANCELLED", { clientId: partnerA }) });
      await tx.project.create({ data: proj("COMPLETED", { freightForwarderId: partnerA }) });
      const both = await tx.project.create({ data: proj("IN_PROGRESS") });
      // Supplier and manufacturer on two lines of the same project: it still counts once.
      for (let i = 0; i < 2; i++) await tx.projectLine.create({ data: { organizationId: orgA, projectId: both.id, clientProductDescription: `line ${i}`, supplierId: partnerA, manufacturerId: partnerA } });
      await tx.contact.create({ data: { organizationId: orgA, partnerId: partnerA, name: "One" } });
      await tx.contact.create({ data: { organizationId: orgA, partnerId: partnerA, name: "Two" } });
      await tx.manufacturerSite.create({ data: { partnerId: partnerA, siteName: "Plant 1", countryCode: "IN", isPrimary: true } });
      await tx.manufacturerSite.create({ data: { partnerId: partnerA, siteName: "Plant 2", countryCode: "KE" } });
    });
  });

  const pm = (permissions: string[]) => ({ ...u.viewer, permissions, apps: null } as RequestUser);

  const full = () => pm(["crm.view", "projects.view"]);

  it("counts projects by outcome once per stakeholder, and adds contacts and sites", async () => {
    const page = await crm.list(full(), { view: "portfolio", q: `Acme ${suffix}` });
    const row = page.items[0];
    expect(row.portfolio).toEqual({ identified: 0, inProgress: 1, submitted: 0, awarded: 1, completed: 1, unawarded: 1, total: 4 });
    expect(row.contactCount).toBe(2);
    expect(row.siteCount).toBe(2);
    expect(row.siteCountries).toEqual(["IN", "KE"]);
    const d = await crm.detail(full(), relA);
    expect(d.portfolio?.total).toBe(4);
    expect(d.sites?.map((s) => s.siteName)).toEqual(["Plant 1", "Plant 2"]);
  });

  it("filters by the kind of work done, including never worked with", async () => {
    const ids = async (work: string) => (await crm.list(full(), { work })).items.map((i) => i.id);
    expect(await ids("awarded")).toEqual([relA]);
    expect(await ids("in_progress")).toEqual([relA]);
    expect(await ids("unawarded")).toEqual([relA]);
    expect(await ids("submitted")).toEqual([]);
    expect(await ids("none")).toEqual([relNone]);
  });

  it("hides projects from people who cannot see them, and ignores the work filter for them", async () => {
    const blind = pm(["crm.view"]);
    const page = await crm.list(blind, { view: "portfolio", work: "none" });
    expect(page.items.every((i) => i.portfolio === null)).toBe(true);
    expect(page.total).toBe(2);
    expect((await crm.detail(blind, relA)).portfolio).toBeNull();
    const noPm = { ...full(), apps: ["crm"] } as RequestUser;
    const p2 = await crm.list(noPm, { view: "portfolio" });
    expect(p2.items[0].contactCount).toBeNull();
    expect((await crm.detail(noPm, relA)).sites).toBeNull();
  });

  it("is private to the organisation", async () => {
    expect((await crm.list(u.other, { view: "portfolio" })).items.every((i) => i.id === relB)).toBe(true);
  });
});
