import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { SearchService } from "../src/search/search.service";
import { CrmGapsService } from "../src/crm/crm-gaps.service";
import { DataHealthService } from "../src/data-health/data-health.service";
import { CrmDriversService } from "../src/crm/crm-drivers.service";
import { CrmTreeService } from "../src/crm/crm-tree.service";
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

  it("works out each stakeholder's likely-to-land value, and explains why delivery and framework detail are missing", async () => {
    const o = await svc.create(u.manager, { relationshipId: relA, title: "Likelihood check", kind: "TENDER", expectedValue: 2000, currency: "GBP", stage: "SUBMITTED" } as never);
    const lk = await svc.likelihood(u.viewer, "GBP");
    const row = lk.byRel.get(relA);
    expect(row).toBeTruthy();
    expect(row!.openValue).toBeGreaterThanOrEqual(2000);
    expect(row!.likelyValue).toBeGreaterThan(0);
    expect(row!.likelyValue).toBeLessThan(row!.openValue);
    expect(lk.order[0]).toBeDefined();
    expect(lk.byRel.has(relB)).toBe(false); // another organisation's stakeholder never appears
    // Not won, so there is no delivery to show; no tender, so there is no framework to show. Neither asks for project or tender access that the viewer lacks beyond a message.
    const d = await svc.delivery({ ...u.viewer, permissions: ["crm.view", "projects.view"], apps: null } as RequestUser, o.id);
    expect(d.available).toBe(false);
    const noAccess = await svc.delivery(u.viewer, o.id);
    expect(noAccess.reason).toMatch(/cannot view projects/);
    const f = await svc.framework({ ...u.viewer, permissions: ["crm.view", "tenders.view"] } as RequestUser, o.id);
    expect(f.available).toBe(false);
    await expect(svc.delivery({ ...u.other, permissions: [...u.other.permissions, "projects.view"] } as RequestUser, o.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("builds a relationship tree from the organisation's own records only", async () => {
    const tree = new CrmTreeService();
    const t = await tree.tree(u.viewer, relA);
    expect(t.root.relationshipId).toBe(relA);
    expect(t.provenance.length).toBeGreaterThanOrEqual(2);
    expect(t.provenance.map((p) => p.label)).toContain("Relationship started in the CRM");
    expect(t.projectsVisible).toBe(false); // the viewer has no project access
    expect(t.projectConnections).toEqual([]);
    await expect(tree.tree(u.other, relA)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists what is missing from the pipeline and portfolio, with links that fix it", async () => {
    await svc.create(u.manager, { relationshipId: relA, title: "Bare opportunity", kind: "OTHER" });
    const gaps = new CrmGapsService();
    const pipe = await gaps.gaps(u.viewer, "pipeline");
    const noValue = pipe.find((g) => g.key === "noValue");
    expect(noValue?.count).toBeGreaterThanOrEqual(1);
    expect(noValue?.href).toBe("/pipeline?gap=noValue");
    const listed = await svc.list(u.viewer, { gap: "noValue", pageSize: 50 });
    expect(listed.items.some((i) => i.title === "Bare opportunity")).toBe(true);
    expect(listed.items.every((i) => i.expectedValue === null)).toBe(true);
    const port = await gaps.gaps(u.viewer, "portfolio");
    expect(port.every((g) => g.key.startsWith("r"))).toBe(true);
    const other = await gaps.gaps(u.other, "pipeline");
    expect(other.find((g) => g.key === "noValue")?.count ?? 0).toBe(0); // another organisation's records never count
  });

  it("compares won and lost opportunities against what the platform knows, for this organisation only", async () => {
    const a = await svc.create(u.manager, { relationshipId: relA, title: "Drivers won", kind: "TENDER", stage: "WON" } as never);
    const b = await svc.create(u.manager, { relationshipId: relA, title: "Drivers lost", kind: "TENDER", stage: "LOST", lostReason: "Price" } as never);
    expect(a.id).not.toBe(b.id);
    const drivers = new CrmDriversService();
    const d = await drivers.drivers(u.viewer);
    expect(d.won).toBeGreaterThanOrEqual(1);
    expect(d.lost).toBeGreaterThanOrEqual(1);
    const owner = d.factors.find((f) => f.key === "owner");
    expect(owner).toBeTruthy();
    expect(owner!.with.won + owner!.with.lost + owner!.without.won + owner!.without.lost).toBe(d.won + d.lost);
    const other = await drivers.drivers(u.other);
    expect(other.won + other.lost).toBeLessThan(d.won + d.lost); // another organisation's outcomes never count
  });

  it("lists data gaps only for apps the person can use, with sane counts", async () => {
    const health = new DataHealthService();
    const none = await health.sections({ ...u.viewer, permissions: ["crm.view"] } as RequestUser);
    expect(none.find((x) => x.app === "project-management")).toBeUndefined();
    const pm = await health.sections({ ...u.viewer, permissions: ["crm.view", "projects.view"] } as RequestUser, "project-management");
    for (const sec of pm) { expect(sec.app).toBe("project-management"); for (const g of sec.gaps) { expect(g.count).toBeGreaterThan(0); expect(g.count).toBeLessThanOrEqual(g.total); expect(g.href).toMatch(/^\//); } }
  });
});
