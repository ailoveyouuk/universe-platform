import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmPlacesService } from "../src/crm/crm-places.service";
import { CrmPrivacyService } from "../src/crm/crm-privacy.service";
import { CrmService, safeUrl } from "../src/crm/crm.service";

/** CRM places, links, primary contact and the project drill-down against the real RLS database. */
describe("CRM places and links", () => {
  const suffix = randomUUID().slice(0, 8);
  const places = new CrmPlacesService();
  const privacy = new CrmPrivacyService();
  const crm = new CrmService({} as never);
  let orgA: string; let orgB: string; let relA: string; let relB: string; let partnerA: string;
  const contactIds: string[] = [];
  const userIds: string[] = [];
  const u: Record<string, RequestUser> = {};

  async function makeUser(orgId: string, tag: string, permissions: string[]): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) => tx.user.create({ data: { organizationId: orgId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Tester", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } }));
    userIds.push(user.id);
    return { id: user.id, organizationId: orgId, homeOrganizationId: orgId, email: user.email, forename: tag, surname: "Tester", organizationName: "x", organizationLogoUrl: null, organizationLogoIconUrl: null,
      organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions, apps: null } as RequestUser;
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Pl A ${suffix}`, slug: `pl-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Pl B ${suffix}`, slug: `pl-b-${suffix}` })).id;
    u.manager = await makeUser(orgA, "manager", ["crm.view", "crm.manage", "projects.view"]);
    u.viewer = await makeUser(orgA, "viewer", ["crm.view"]);
    u.other = await makeUser(orgB, "other", ["crm.view", "crm.manage"]);
    await prisma.country.upsert({ where: { code: "QX" }, update: {}, create: { code: "QX", name: "Testland" } });
    await withPlatformStaffContext(async (tx) => {
      const pa = await tx.partner.create({ data: { organizationId: orgA, name: `Acme ${suffix}`, normalizedName: `acme ${suffix}` } });
      const pb = await tx.partner.create({ data: { organizationId: orgB, name: `Beta ${suffix}`, normalizedName: `beta ${suffix}` } });
      partnerA = pa.id;
      relA = (await tx.crmRelationship.create({ data: { organizationId: orgA, partnerId: pa.id, counterpartyKey: `partner:${pa.id}` } })).id;
      relB = (await tx.crmRelationship.create({ data: { organizationId: orgB, partnerId: pb.id, counterpartyKey: `partner:${pb.id}` } })).id;
      for (const n of ["Ann", "Bob"]) contactIds.push((await tx.contact.create({ data: { organizationId: orgA, partnerId: pa.id, name: n, email: `${n.toLowerCase()}-${suffix}@example.com` } })).id);
      const mk = (status: string, extra: Record<string, unknown> = {}) => ({ organizationId: orgA, referenceNumber: `PL-${status}-${randomUUID().slice(0, 6)}`, title: `Job ${status}`, category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status, ...extra });
      for (let i = 0; i < 3; i++) await tx.project.create({ data: mk("AWARDED", { clientId: pa.id }) });
      await tx.project.create({ data: mk("DECLINED", { clientId: pa.id }) });
      await tx.project.create({ data: mk("COMPLETED", { freightForwarderId: pa.id }) });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: [orgA, orgB] };
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmContactProfile.deleteMany({ where: { organizationId: orgs } });
      await tx.crmLocation.deleteMany({ where: { organizationId: orgs } });
      await tx.crmLink.deleteMany({ where: { organizationId: orgs } });
      await tx.project.deleteMany({ where: { organizationId: orgs } });
      await tx.contact.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationship.deleteMany({ where: { organizationId: orgs } });
      await tx.partner.deleteMany({ where: { organizationId: orgs } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: orgs } } });
      await tx.role.deleteMany({ where: { organizationId: orgs } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: orgs } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.country.deleteMany({ where: { code: "QX" } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("only allows web addresses that are safe to link", () => {
    expect(safeUrl("example.com/x")).toBe("https://example.com/x");
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });

  it("keeps one head office, demoting the old one", async () => {
    const hq1 = await places.saveLocation(u.manager, relA, null, { kind: "HQ", name: "Old HQ", countryCode: "QX" });
    const hq2 = await places.saveLocation(u.manager, relA, null, { kind: "HQ", name: "New HQ", countryCode: "qx" });
    const d = await crm.detail(u.manager, relA);
    expect(d.locations.filter((l) => l.kind === "HQ").map((l) => l.name)).toEqual(["New HQ"]);
    expect(d.locations.find((l) => l.id === hq1.id)?.kind).toBe("OFFICE");
    expect(d.locations[0].id).toBe(hq2.id);
    expect(hq2.countryCode).toBe("QX");
  });

  it("validates, audits and archives rather than deletes", async () => {
    await expect(places.saveLocation(u.manager, relA, null, { name: "Bad", countryCode: "ZZZ" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(places.saveLocation(u.manager, relA, null, { name: "Bad", email: "nope" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(places.saveLocation(u.manager, relA, null, { name: " " })).rejects.toBeInstanceOf(BadRequestException);
    const l = await places.saveLocation(u.manager, relA, null, { kind: "FACTORY", name: "Plant", city: "Town" });
    await places.saveLocation(u.manager, relA, l.id, { city: "City" });
    await places.saveLocation(u.manager, relA, l.id, { archived: true });
    expect((await crm.detail(u.manager, relA)).locations.some((x) => x.id === l.id)).toBe(false);
    const log = await withPlatformStaffContext((tx) => tx.fieldChangeLog.findMany({ where: { organizationId: orgA, tableName: "crm_locations", recordId: l.id } }));
    expect(log.map((x) => x.fieldName).sort()).toEqual(expect.arrayContaining(["created", "city", "archivedAt"]));
    expect(await withPlatformStaffContext((tx) => tx.crmLocation.count({ where: { id: l.id } }))).toBe(1);
  });

  it("needs crm.manage and stays inside the organisation", async () => {
    await expect(places.saveLocation(u.viewer, relA, null, { name: "X" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(places.saveLink(u.viewer, relA, null, { label: "X", url: "https://x.com" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(places.saveLocation(u.other, relA, null, { name: "X" })).rejects.toBeInstanceOf(NotFoundException);
    expect((await crm.detail(u.other, relB)).locations).toEqual([]);
  });

  it("stores only http and https links, groups them, and archives", async () => {
    await expect(places.saveLink(u.manager, relA, null, { kind: "SOCIAL", label: "Bad", url: "javascript:alert(1)" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(places.saveLink(u.manager, relA, null, { kind: "SOCIAL", label: "", url: "https://x.com" })).rejects.toBeInstanceOf(BadRequestException);
    const a = await places.saveLink(u.manager, relA, null, { kind: "PORTAL", label: "Tenders", url: "tenders.example.com" });
    expect(a.url).toBe("https://tenders.example.com/");
    const d1 = await crm.detail(u.manager, relA);
    expect(d1.links.map((l) => l.label)).toContain("Tenders");
    await places.saveLink(u.manager, relA, a.id, { archived: true });
    expect((await crm.detail(u.manager, relA)).links.some((l) => l.id === a.id)).toBe(false);
  });

  it("allows one primary contact, who must be active", async () => {
    const [ann, bob] = contactIds;
    await privacy.updateProfile(u.manager, ann, { isPrimary: true });
    await privacy.updateProfile(u.manager, bob, { isPrimary: true });
    const people = await privacy.people(u.manager, relA);
    expect(people.filter((p) => p.isPrimary).map((p) => p.id)).toEqual([bob]);
    await privacy.updateProfile(u.manager, bob, { status: "LEFT" });
    expect((await privacy.people(u.manager, relA)).some((p) => p.isPrimary)).toBe(false);
    await expect(privacy.updateProfile(u.manager, bob, { isPrimary: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("pages a stakeholder's projects by outcome, part and search, and checks access", async () => {
    const all = await crm.projectsPage(u.manager, relA, {});
    expect(all.total).toBe(5);
    expect(all.counts).toMatchObject({ awarded: 3, unawarded: 1, completed: 1 });
    expect((await crm.projectsPage(u.manager, relA, { bucket: "awarded" })).total).toBe(3);
    expect((await crm.projectsPage(u.manager, relA, { bucket: "unawarded" })).total).toBe(1);
    expect((await crm.projectsPage(u.manager, relA, { part: "freight_forwarder" })).total).toBe(1);
    expect((await crm.projectsPage(u.manager, relA, { part: "supplier" })).total).toBe(0);
    const p = await crm.projectsPage(u.manager, relA, { bucket: "awarded", pageSize: 2, page: 2 });
    expect(p.items).toHaveLength(1); expect(p.total).toBe(3);
    expect((await crm.projectsPage(u.manager, relA, { q: "Job COMPLETED" })).total).toBe(1);
    await expect(crm.projectsPage(u.manager, relA, { bucket: "bogus" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(crm.projectsPage(u.viewer, relA, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(crm.projectsPage(u.other, relA, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it("filters the list and the map by country", async () => {
    await withPlatformStaffContext((tx) => tx.partner.update({ where: { id: partnerA }, data: { countryCode: "QX" } }));
    expect((await crm.list(u.manager, { country: "qx" })).items.map((i) => i.id)).toEqual([relA]);
    const map = await crm.portfolioMap(u.manager, {});
    expect(map.points.find((p) => p.countryCode === "QX")?.count).toBe(1);
    expect((await crm.portfolioMap(u.other, {})).points.some((p) => p.countryCode === "QX")).toBe(false);
  });
});
