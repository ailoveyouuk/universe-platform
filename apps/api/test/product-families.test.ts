import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductFamiliesService } from "../src/product-catalog/product-families.service";
import { familyTarget, productTarget } from "../src/product-catalog/product-target";
import { ProductRegistrationsService } from "../src/product-catalog/product-registrations.service";

/** Product families (step 3b, 2026-10-18): variants inherit family registrations; staff-only writes; audit. Real RLS database. */
describe("Product families", () => {
  const suffix = randomUUID().slice(0, 8);
  const families = new ProductFamiliesService();
  const regs = new ProductRegistrationsService();
  const catalogue = new ProductCatalogService();
  let org: string;
  let userId: string;
  let p1: string;
  let p2: string;

  const asUser = (staff: boolean): RequestUser => ({
    id: userId, organizationId: org, homeOrganizationId: org, email: `fam-${suffix}@example.com`, forename: "Fam", surname: "Tester",
    organizationName: "Fam Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null,
    organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: staff ? "SUPER_ADMIN" : "NONE",
    permissions: ["projects.edit", "products.approve"],
  });

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `Fam ${suffix}`, slug: `fam-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userId = (await tx.user.create({ data: { organizationId: org, email: `fam-${suffix}@example.com`, forename: "Fam", surname: "T" } })).id;
      p1 = (await tx.productMaster.create({ data: { name: `Paracetamol 500 mg, 20 tablets ${suffix}`, category: "Medicines", sourceStandard: "TEST", addedByOrganizationId: org } })).id;
      p2 = (await tx.productMaster.create({ data: { name: `Paracetamol 500 mg, 100 tablets ${suffix}`, category: "Medicines", sourceStandard: "TEST", addedByOrganizationId: org } })).id;
    });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it("only platform staff can create a family", async () => {
    await expect(families.create(asUser(false), { name: `Fam ${suffix}`, category: "Medicines" })).rejects.toThrow();
  });

  it("variants inherit a family-level registration and the compliance picture", async () => {
    const fam = await families.create(asUser(true), { name: `Paracetamol 500 mg ${suffix}`, category: "Medicines" });
    await families.assign(asUser(true), p1, { familyId: fam.id, variantLabel: "20 tablets" });
    await families.assign(asUser(true), p2, { familyId: fam.id, variantLabel: "100 tablets" });
    expect((await catalogue.getOne(p1, true))?.compliance.status).toBe("WARNING");
    await regs.create(asUser(true), familyTarget(fam.id), { authority: "WHO_PQ", referenceNumber: `PQ-${suffix}`, expiryDate: new Date(Date.now() + 86400000 * 700).toISOString().slice(0, 10) });
    const list = await regs.list(asUser(true), productTarget(p2));
    expect(list.find((r) => r.referenceNumber === `PQ-${suffix}`)?.inherited).toBe(true);
    expect((await catalogue.getOne(p2, true))?.compliance.status).toBe("OK");
    const detail = await families.getOne(asUser(true), fam.id);
    expect(detail.variants).toHaveLength(2);
    expect((await catalogue.getOne(p1, true))?.siblings.map((s) => s.id)).toEqual([p2]);
  });

  it("records changes in the family history", async () => {
    const [fam] = (await families.list(asUser(true), { search: `Paracetamol 500 mg ${suffix}` })).items;
    await families.update(asUser(true), fam.id, { brand: "TestBrand" });
    const h = await families.history(asUser(true), fam.id);
    expect(h.some((r) => r.fieldName === "brand" && r.newValue === "TestBrand")).toBe(true);
  });
});
