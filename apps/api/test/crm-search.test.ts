import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmService } from "../src/crm/crm.service";
import { CrmSearchService } from "../src/crm/crm-search.service";
import { CrmExportService } from "../src/crm/crm-export.service";
import { CrmOpportunitiesService } from "../src/crm/crm-opportunities.service";

/** CRM-wide keyword search, broader list search and per-kind counts against the real RLS database. */
describe("CRM search", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmService({} as never);
  const search = new CrmSearchService();
  const exporter = new CrmExportService(svc);
  const opps = new CrmOpportunitiesService();
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
      await tx.crmOpportunity.deleteMany({ where: { organizationId: orgs } });
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
    expect(group(await search.search(u.manager, `Zephyr Kenya`), "stakeholders").hits.map((h) => h.id)).toEqual([relA]); // a country by name, stored as a code
    expect((await svc.list(u.manager, { q: "Harbour Kenya" })).items.length).toBe(1);
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

  it("exports the chosen view as CSV for managers only, audited, and counts the view for the tiles", async () => {
    const f = await exporter.export(u.manager, "relationships", { role: "MANUFACTURER" });
    expect(f.rowCount).toBe(1);
    expect(f.csv).toContain(`Zephyr Labs ${suffix}`);
    expect(f.csv).not.toContain("Harbour Fund");
    expect(f.csv).not.toContain("Zephyr Rivals"); // other organisation
    const c = await exporter.export(u.manager, "contacts", {});
    expect(c.csv).toContain("Quillfeather");
    await expect(exporter.export(u.viewer, "relationships", {})).rejects.toThrow();
    await expect(exporter.export(u.manager, "nonsense", {})).rejects.toThrow();
    const counts = await svc.counts(u.manager, { role: "FUNDER_DONOR" });
    expect(counts.total).toBe(1);
    expect((await svc.counts(u.manager, {})).total).toBe(2);
  });

  it("the pipeline view converts into one currency and groups by stage, month and kind", async () => {
    await withPlatformStaffContext((tx) => tx.crmOpportunity.createMany({ data: [
      { organizationId: orgA, relationshipId: relA, title: `Deal one ${suffix}`, kind: "TENDER", stage: "ENGAGED", expectedValue: 1000, currency: "GBP", expectedDate: new Date(Date.now() + 40 * 86400000) },
      { organizationId: orgA, relationshipId: relA, title: `Deal two ${suffix}`, kind: "TENDER", stage: "WON", expectedValue: 500, currency: "GBP" },
      { organizationId: orgA, relationshipId: relA, title: `Deal three ${suffix}`, kind: "SOURCING", stage: "LOST", expectedValue: 200, currency: "GBP", lostReason: "price" },
    ] as never }));
    const v = await opps.pipelineView(u.manager, "GBP");
    expect(v.currency).toBe("GBP");
    expect(v.stages.find((s) => s.stage === "ENGAGED")).toMatchObject({ count: 1, value: 1000 });
    expect(v.openValue).toBe(1000);
    expect(v.wonValue).toBe(500);
    expect(v.winRate).toBe(50);
    expect(v.kinds[0]).toMatchObject({ key: "MANUFACTURER", count: 1, value: 1000 });
    expect(v.months.reduce((n, m) => n + m.count, 0) + v.overdue.count + v.noDate.count).toBe(1);
  });
});
