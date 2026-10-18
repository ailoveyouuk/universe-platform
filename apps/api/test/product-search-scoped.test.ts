import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";

/** Scoped project-line search: shared catalogue plus this organisation's own approvals, tagged and private per organisation (2026-10-18). */
describe("Scoped product search", () => {
  const suffix = randomUUID().slice(0, 8);
  const catalogue = new ProductCatalogService();
  let orgA: string;
  let orgB: string;
  let approvedId: string;
  let plainId: string;

  const asUser = (organizationId: string): RequestUser => ({
    id: randomUUID(), organizationId, homeOrganizationId: organizationId, email: `ss-${suffix}@example.com`, forename: "S", surname: "S",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null,
    organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions: ["projects.edit"],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Ss A ${suffix}`, slug: `ss-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Ss B ${suffix}`, slug: `ss-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      approvedId = (await tx.productMaster.create({ data: { name: `Zorbex alpha ${suffix}`, category: "Consumables", sourceStandard: "TEST", addedByOrganizationId: orgA } })).id;
      plainId = (await tx.productMaster.create({ data: { name: `Zorbex beta ${suffix}`, category: "Consumables", sourceStandard: "TEST", addedByOrganizationId: orgA } })).id;
    });
    await withTenantContext(orgA, async (tx) => {
      const m = await tx.partner.create({ data: { organizationId: orgA, name: `Maker ${suffix}`, normalizedName: `maker ${suffix}` } });
      await tx.productSourceApproval.create({ data: { organizationId: orgA, productMasterId: approvedId, manufacturerId: m.id, status: "APPROVED", approvedAt: new Date() } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("ALL lists the approved product first, tagged with its approved source; others are untagged", async () => {
    const r = await catalogue.searchScoped(asUser(orgA), `Zorbex`, undefined, "ALL");
    expect(r.map((x) => x.id)).toEqual([approvedId, plainId]);
    expect(r[0].orgApproval).toBe("APPROVED");
    expect(r[0].approvedSources[0].manufacturerName).toBe(`Maker ${suffix}`);
    expect(r[1].orgApproval).toBeNull();
  });

  it("APPROVED shows only approved products; CATALOGUE shows everything", async () => {
    expect((await catalogue.searchScoped(asUser(orgA), `Zorbex`, undefined, "APPROVED")).map((x) => x.id)).toEqual([approvedId]);
    expect((await catalogue.searchScoped(asUser(orgA), `Zorbex`, undefined, "CATALOGUE")).map((x) => x.id).sort()).toEqual([approvedId, plainId].sort());
  });

  it("another organisation sees the product from the catalogue but never the approval", async () => {
    const r = await catalogue.searchScoped(asUser(orgB), `Zorbex`, undefined, "ALL");
    expect(r.every((x) => x.orgApproval === null && x.approvedSources.length === 0)).toBe(true);
    expect(await catalogue.searchScoped(asUser(orgB), `Zorbex`, undefined, "APPROVED")).toHaveLength(0);
  });
});
