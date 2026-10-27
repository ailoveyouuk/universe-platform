import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { SearchService } from "../src/search/search.service";
import { CrmOpportunitiesService } from "../src/crm/crm-opportunities.service";

/** CRM opportunities against the real RLS database: stage rules, audit trail, pipeline totals, isolation. */
describe("CRM interactions", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmOpportunitiesService();
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
      await tx.crmOpportunityParticipant.deleteMany({ where: { organizationId: orgs } });
      await tx.crmOpportunityEvent.deleteMany({ where: { organizationId: orgs } });
      await tx.crmOpportunity.deleteMany({ where: { organizationId: orgs } });
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

  it("creates, lists and summarises per stage and currency", async () => {
    const a = await svc.create(u.manager, { relationshipId: relA, title: "Bid for lot 1", kind: "TENDER", expectedValue: 1000, currency: "GBP" });
    await svc.create(u.manager, { relationshipId: relA, title: "Source gloves", kind: "SOURCING", stage: "ENGAGED", expectedValue: 500, currency: "GBP" });
    await svc.create(u.manager, { relationshipId: relA, title: "Euro deal", kind: "OTHER", expectedValue: 200, currency: "EUR" });
    expect(a.stage).toBe("IDENTIFIED");
    const page = await svc.list(u.viewer, { relationshipId: relA });
    expect(page.total).toBe(3);
    const p = await svc.pipeline(u.viewer);
    expect(p.byStage.IDENTIFIED.value).toEqual({ GBP: 1000, EUR: 200 });
    expect(p.byStage.ENGAGED.count).toBe(1);
    expect(p.openCount).toBe(3);
  });

  it("needs a reason to mark lost, audits changes, and viewers cannot change", async () => {
    const [o] = (await svc.list(u.manager, { q: "Bid for" })).items;
    await expect(svc.update(u.manager, o.id, { stage: "LOST" })).rejects.toBeInstanceOf(BadRequestException);
    const lost = await svc.update(u.manager, o.id, { stage: "LOST", lostReason: "Priced out" });
    expect(lost.stage).toBe("LOST");
    const log = await withPlatformStaffContext((tx) => tx.fieldChangeLog.findMany({ where: { recordId: o.id } }));
    expect(log.some((l) => l.fieldName === "stage")).toBe(true);
    await expect(svc.update(u.viewer, o.id, { notes: "x" })).rejects.toThrow();
    await expect(svc.create(u.viewer, { relationshipId: relA, title: "x", kind: "OTHER" })).rejects.toThrow();
  });

  it("archives rather than deletes, and isolates organisations", async () => {
    const [o] = (await svc.list(u.manager, { q: "Euro" })).items;
    await svc.update(u.manager, o.id, { archived: true });
    expect((await svc.list(u.manager, { q: "Euro" })).total).toBe(0);
    expect((await svc.list(u.other, {})).total).toBe(0);
    await expect(svc.update(u.other, o.id, { notes: "x" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.create(u.other, { relationshipId: relA, title: "x", kind: "OTHER" })).rejects.toBeInstanceOf(NotFoundException);
    void relB;
  });

  it("global search finds relationships and opportunities only for people with the CRM app", async () => {
    const search = new SearchService();
    const found = await search.search(u.viewer, `Acme ${suffix}`);
    expect(found.results.some((r) => r.type === "relationship" && r.app === "crm" && r.link === `/relationships?id=${relA}`)).toBe(true);
    const opp = await search.search(u.viewer, "Source gloves");
    expect(opp.results.some((r) => r.type === "opportunity")).toBe(true);
    const noApp = await search.search({ ...u.viewer, apps: ["project-management"] } as RequestUser, `Acme ${suffix}`);
    expect(noApp.results.some((r) => r.type === "relationship")).toBe(false);
    const noPerm = await search.search({ ...u.viewer, permissions: [] } as RequestUser, `Acme ${suffix}`);
    expect(noPerm.results.some((r) => r.type === "relationship")).toBe(false);
    const other = await search.search(u.other, `Acme ${suffix}`);
    expect(other.results.length).toBe(0);
  });
});
