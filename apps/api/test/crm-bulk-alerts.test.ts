import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { runCrmAlerts } from "../../../packages/db/src/crm-alerts";
import { CrmService } from "../src/crm/crm.service";
import { CrmCategoryService } from "../src/crm/crm-category.service";

/** CRM list filters, bulk changes and daily alerts against the real RLS database. */
describe("CRM list filters, bulk changes and alerts", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmService({} as never);
  let orgA: string; let orgB: string; let relA: string; let relB: string; let relC: string; let oppId: string;
  const userIds: string[] = [];
  const u: Record<string, RequestUser> = {};

  async function makeUser(orgId: string, tag: string, permissions: string[]): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) => tx.user.create({ data: { organizationId: orgId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Tester", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } }));
    userIds.push(user.id);
    return { id: user.id, organizationId: orgId, homeOrganizationId: orgId, email: user.email, forename: tag, surname: "Tester", organizationName: "x", organizationLogoUrl: null, organizationLogoIconUrl: null,
      organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions, apps: null } as RequestUser;
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Bulk A ${suffix}`, slug: `bulk-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Bulk B ${suffix}`, slug: `bulk-b-${suffix}` })).id;
    u.manager = await makeUser(orgA, "manager", ["crm.view", "crm.manage"]);
    u.viewer = await makeUser(orgA, "viewer", ["crm.view"]);
    u.owner = await makeUser(orgA, "owner", ["crm.view"]);
    await withPlatformStaffContext(async (tx) => {
      const mk = async (org: string, name: string, owner: string | null) => {
        const p = await tx.partner.create({ data: { organizationId: org, name: `${name} ${suffix}`, normalizedName: `${name.toLowerCase()} ${suffix}` } });
        const r = await tx.crmRelationship.create({ data: { organizationId: org, partnerId: p.id, counterpartyKey: `partner:${p.id}`, ownerUserId: owner } });
        return { p, r };
      };
      const a = await mk(orgA, "Acme", u.owner.id); relA = a.r.id;
      const c = await mk(orgA, "Cobalt", u.owner.id); relC = c.r.id;
      relB = (await mk(orgB, "Beta", null)).r.id;
      // Acme: talked to recently, certificate expired. Cobalt: never talked to, certificate fine.
      await tx.crmInteraction.create({ data: { organizationId: orgA, relationshipId: relA, type: "MEETING", occurredAt: new Date(), title: "Recent meeting", createdById: u.manager.id } as never });
      await tx.partnerCertification.create({ data: { organizationId: orgA, partnerId: a.p.id, type: "GDP", status: "CURRENT", expiryDate: new Date(Date.now() - 5 * 86400000) } });
      await tx.partnerCertification.create({ data: { organizationId: orgA, partnerId: c.p.id, type: "GDP", status: "CURRENT", expiryDate: new Date(Date.now() + 400 * 86400000) } });
      oppId = (await tx.crmOpportunity.create({ data: { organizationId: orgA, relationshipId: relC, title: `Late deal ${suffix}`, kind: "TENDER", stage: "ENGAGED", expectedDate: new Date(Date.now() - 10 * 86400000) } as never })).id;
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
      await tx.partnerCertification.deleteMany({ where: { organizationId: orgs } });
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

  it("filters by time since last contact and shows the last interaction", async () => {
    const quiet = await svc.list(u.manager, { quiet: "3" });
    expect(quiet.items.map((r) => r.id)).toEqual([relC]);
    const all = await svc.list(u.manager, {});
    expect(all.items.find((r) => r.id === relA)?.lastInteractionAt).not.toBeNull();
    expect(all.items.find((r) => r.id === relC)?.lastInteractionAt).toBeNull();
  });

  it("filters by certificate state", async () => {
    expect((await svc.list(u.manager, { certs: "expired" })).items.map((r) => r.id)).toEqual([relA]);
    expect((await svc.list(u.manager, { certs: "valid" })).items.map((r) => r.id)).toEqual([relC]);
  });

  it("changes owner and tier for many at once, audited, and leaves other organisations alone", async () => {
    const r = await svc.bulk(u.manager, { ids: [relA, relC, relB], tier: "STRATEGIC", ownerUserId: u.manager.id });
    expect(r.changed).toBe(2);
    const rows = await withPlatformStaffContext((tx) => tx.crmRelationship.findMany({ where: { id: { in: [relA, relB, relC] } }, select: { id: true, tier: true, ownerUserId: true } }));
    expect(rows.find((x) => x.id === relA)).toMatchObject({ tier: "STRATEGIC", ownerUserId: u.manager.id });
    expect(rows.find((x) => x.id === relB)).toMatchObject({ tier: "STANDARD", ownerUserId: null });
    expect(await withPlatformStaffContext((tx) => tx.fieldChangeLog.count({ where: { organizationId: orgA, tableName: "crm_relationships", reason: "Bulk change" } }))).toBeGreaterThanOrEqual(2);
  });

  it("refuses a bulk change by a viewer, an empty one and an oversized one", async () => {
    await expect(svc.bulk(u.viewer, { ids: [relA], tier: "KEY" })).rejects.toThrow();
    await expect(svc.bulk(u.manager, { ids: [], tier: "KEY" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.bulk(u.manager, { ids: Array.from({ length: 201 }, (_, i) => `x${i}`), tier: "KEY" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.bulk(u.manager, { ids: [relA] })).rejects.toBeInstanceOf(BadRequestException);
    void NotFoundException;
  });

  it("alerts the owner once about an expired certificate and a late opportunity", async () => {
    const mine = () => withPlatformStaffContext((tx) => tx.notification.findMany({ where: { organizationId: orgA, kind: { in: ["CRM_CERT_EXPIRING", "CRM_OPPORTUNITY_OVERDUE"] } } }));
    await runCrmAlerts();
    const first = await mine();
    expect(first.map((n) => n.kind).sort()).toEqual(["CRM_CERT_EXPIRING", "CRM_OPPORTUNITY_OVERDUE"]);
    expect(first.every((n) => n.recipientUserId === u.manager.id)).toBe(true);
    await runCrmAlerts();
    expect((await mine()).length).toBe(2);
    expect(first.find((n) => n.kind === "CRM_OPPORTUNITY_OVERDUE")?.subjectId).toBe(oppId);
  });

  it("builds a manufacturer's category profile from its certificates and batches", async () => {
    const cat = new CrmCategoryService();
    await withPlatformStaffContext(async (tx) => {
      const rel = await tx.crmRelationship.findUnique({ where: { id: relA }, select: { partnerId: true } });
      await tx.partnerRole.create({ data: { partnerId: rel!.partnerId!, roleType: "MANUFACTURER" } });
      await tx.partnerCertification.create({ data: { organizationId: orgA, partnerId: rel!.partnerId!, type: "ISO_13485", status: "CURRENT", issuedDate: new Date(Date.now() - 900 * 86400000), expiryDate: new Date(Date.now() - 100 * 86400000), documentId: null } });
    });
    const p = await cat.profile(u.manager, relA);
    expect(p.categories).toContain("MANUFACTURER");
    expect(p.certificates.find((c) => c.type === "ISO_13485")?.state).toBe("expired");
    expect(p.batches).not.toBeNull();
    expect(p.tenders).toBeNull();
    await expect(cat.profile(u.viewer, relB)).rejects.toThrow();
  });
});
