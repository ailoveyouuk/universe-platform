import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { PartnersService } from "../src/partners/partners.service";

/** Partners server-side paging / overview / options (2026-10-17, scale work), against the real RLS database. */
describe("Partners paging", () => {
  const suffix = randomUUID().slice(0, 8);
  const service = new PartnersService({} as never, {} as never);
  let orgA: string;
  let orgB: string;

  const asUser = (organizationId: string): RequestUser => ({
    id: randomUUID(),
    organizationId,
    homeOrganizationId: organizationId,
    email: `x-${suffix}@example.com`,
    forename: "T",
    surname: "T",
    organizationName: "x",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole: "NONE",
    permissions: ["partners.view"],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Pg A ${suffix}`, slug: `pg-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Pg B ${suffix}`, slug: `pg-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      for (let i = 0; i < 12; i++) {
        const p = await tx.partner.create({
          data: {
            organizationId: orgA,
            name: `Alpha ${String(i).padStart(2, "0")} ${suffix}`,
            normalizedName: `alpha ${i} ${suffix}`,
            countryCode: i % 2 ? "KE" : "UG",
            approvalStatus: i < 4 ? "APPROVED" : "PENDING",
            isArchived: i === 11,
          },
        });
        await tx.partnerRole.create({ data: { partnerId: p.id, roleType: i % 3 === 0 ? "MANUFACTURER" : "CLIENT" } });
      }
      await tx.partner.create({ data: { organizationId: orgB, name: `Alpha other ${suffix}`, normalizedName: `alpha other ${suffix}` } });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.partnerRole.deleteMany({ where: { partner: { organizationId: { in: [orgA, orgB] } } } });
      await tx.partner.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("pages, excludes archived and other tenants, and reports the total", async () => {
    const r = await service.findPage(asUser(orgA), { page: 1, pageSize: 5, q: suffix, sort: "name", dir: "asc" });
    expect(r.total).toBe(11);
    expect(r.items).toHaveLength(5);
    expect(r.items[0].name).toContain("Alpha 00");
    const r3 = await service.findPage(asUser(orgA), { page: 3, pageSize: 5, q: suffix, sort: "name", dir: "asc" });
    expect(r3.items).toHaveLength(1);
  });

  it("filters by role, approval and country", async () => {
    const mfg = await service.findPage(asUser(orgA), { q: suffix, roleType: "MANUFACTURER" });
    expect(mfg.total).toBe(4); // i = 0,3,6,9
    const approved = await service.findPage(asUser(orgA), { q: suffix, approval: "APPROVED" });
    expect(approved.total).toBe(4);
    const ke = await service.findPage(asUser(orgA), { q: suffix, country: "KE" });
    expect(ke.items.every((i) => i.countryCode === "KE")).toBe(true);
  });

  it("overview counts roles and approvals without loading the list", async () => {
    const o = await service.overview(asUser(orgA));
    expect(o.counts.byRole.MANUFACTURER).toBe(4);
    expect(o.counts.approved).toBe(4);
    expect(o.recent.CLIENT.length).toBeLessThanOrEqual(5);
  });
});
