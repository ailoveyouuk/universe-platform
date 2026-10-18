import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductFamiliesService } from "../src/product-catalog/product-families.service";

/** Creating products as family variants with duplicate refusal (step 3b follow-up, 2026-10-18). Real database. */
describe("Create product as a family variant", () => {
  const suffix = randomUUID().slice(0, 8);
  const catalogue = new ProductCatalogService();
  const families = new ProductFamiliesService();
  let org: string;
  let userId: string;
  let familyId: string;

  const asUser = (staff: boolean): RequestUser => ({
    id: userId, organizationId: org, homeOrganizationId: org, email: `cv-${suffix}@example.com`, forename: "Cv", surname: "Tester",
    organizationName: "Cv Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null,
    organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions: ["projects.edit"],
  });

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `Cv ${suffix}`, slug: `cv-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userId = (await tx.user.create({ data: { organizationId: org, email: `cv-${suffix}@example.com`, forename: "Cv", surname: "T" } })).id;
    });
    familyId = (await families.create(asUser(true), { name: `Ibuprofen tablets ${suffix}`, category: "Medicines", brand: "TestBrand" })).id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("any organisation can add a variant; name is derived, family fields inherited, barcodes stored by level", async () => {
    const p = await catalogue.create(asUser(false), {
      category: "ignored", familyId, variantLabel: "200 mg, 24 tablets", packSize: "24 tablets",
      identifiers: [{ value: `0501${suffix}1`, packagingLevel: "UNIT" }, { value: `0501${suffix}2`, packagingLevel: "OUTER", unitsPerPack: 12 }],
    });
    expect(p.name).toBe(`Ibuprofen tablets ${suffix}, 200 mg, 24 tablets`);
    expect(p.familyId).toBe(familyId);
    const detail = await catalogue.getOne(p.id, true);
    expect(detail?.brand).toBe("TestBrand");
    expect(detail?.category).toBe("Medicines");
    const outer = detail?.identifiers.find((i) => i.packagingLevel === "OUTER");
    expect(outer?.unitsPerPack).toBe(12);
    expect((await catalogue.search(`Ibuprofen tablets ${suffix}`)).map((m) => m.id)).toContain(p.id);
  });

  it("refuses a duplicate variant label or GTIN and names the existing product", async () => {
    await expect(catalogue.create(asUser(false), { category: "x", familyId, variantLabel: "200 mg, 24 tablets" })).rejects.toThrow(/already exists in this family/);
    await expect(catalogue.create(asUser(false), { category: "x", familyId, variantLabel: "400 mg, 24 tablets", identifiers: [{ value: `0501${suffix}1`, packagingLevel: "UNIT" }] })).rejects.toThrow(/GTIN/);
  });

  it("requires a variant label with a family, and a name without one; standalone duplicates are refused", async () => {
    await expect(catalogue.create(asUser(false), { category: "x", familyId })).rejects.toThrow(/variant label/);
    await expect(catalogue.create(asUser(false), { category: "x" })).rejects.toThrow(/name/);
    await catalogue.create(asUser(false), { category: "Consumables", name: `Standalone ${suffix}` });
    await expect(catalogue.create(asUser(false), { category: "Consumables", name: `Standalone ${suffix}` })).rejects.toThrow(/already in the catalogue/);
  });
});
