import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { computeCompleteness } from "../src/product-catalog/product-record";

/** Product record: new fields, version + shared change history, completeness, usage (2026-10-18). Real RLS database. */
describe("Product record, history and usage", () => {
  const suffix = randomUUID().slice(0, 8);
  const service = new ProductCatalogService();
  let orgA: string;
  let productId: string;

  const asUser = (organizationId: string, staff = false): RequestUser => ({
    id: randomUUID(),
    organizationId,
    homeOrganizationId: organizationId,
    email: `pr-${suffix}@example.com`,
    forename: "Pat",
    surname: "Record",
    organizationName: "Org A",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole: staff ? "SUPER_ADMIN" : "NONE",
    permissions: ["projects.edit", "products.approve"],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Pr A ${suffix}`, slug: `pr-a-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const p = await tx.productMaster.create({ data: { name: `Vaccine vial ${suffix}`, category: "Pharmaceuticals.Vaccines", sourceStandard: "TEST", addedByOrganizationId: orgA } });
      productId = p.id;
      const project = await tx.project.create({ data: { organizationId: orgA, referenceNumber: `PR-${suffix}`, title: "Usage project", category: "PROCUREMENT", projectType: "PHARMACEUTICAL" } });
      await tx.projectLine.create({ data: { organizationId: orgA, projectId: project.id, productMasterId: p.id, clientProductDescription: "Line 1" } });
      await tx.projectLine.create({ data: { organizationId: orgA, projectId: project.id, productMasterId: p.id, clientProductDescription: "Line 2" } });
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("staff edit applies new fields, bumps version once and records history", async () => {
    const staff = asUser(orgA, true);
    const res = await service.update(staff, productId, { storageClass: "REFRIGERATED", coldChain: true, shelfLifeMonths: 24, lifecycleStatus: "RESTRICTED", lifecycleReason: "Under review" });
    expect(res.status).toBe("APPLIED");
    const detail = await service.getOne(productId, true);
    expect(detail?.version).toBe(2);
    expect(detail?.storageClass).toBe("REFRIGERATED");
    expect(detail?.coldChain).toBe(true);
    expect(detail?.lifecycleStatus).toBe("RESTRICTED");
    expect(detail?.lifecycleChangedAt).not.toBeNull();
    const history = await service.getHistory(productId, true, asUser(orgA, true));
    expect(history.filter((h) => h.version === 2).map((h) => h.fieldName).sort()).toEqual(["coldChain", "lifecycleReason", "lifecycleStatus", "shelfLifeMonths", "storageClass"]);
    expect(history[0].changedByName).toBe("Pat Record");
  });

  it("an unchanged edit is a no-op and does not bump the version", async () => {
    await service.update(asUser(orgA, true), productId, { storageClass: "REFRIGERATED" });
    expect((await service.getOne(productId, true))?.version).toBe(2);
  });

  it("an empty string clears a text field", async () => {
    await service.update(asUser(orgA, true), productId, { lifecycleReason: "" });
    expect((await service.getOne(productId, true))?.lifecycleReason).toBeNull();
  });

  it("the owning organisation's change goes through an amendment and is applied with history on ratification", async () => {
    const real = await withPlatformStaffContext((tx) =>
      tx.user.create({ data: { organizationId: orgA, email: `real-${suffix}@example.com`, forename: "Pat", surname: "Record", status: "ACTIVE", entraObjectId: `oid-pr-${suffix}` } }),
    );
    const user = { ...asUser(orgA), id: real.id };
    const res = await service.update(user, productId, { brand: "Acme Bio" });
    expect(res.status).toBe("PENDING_AMENDMENT");
    expect((await service.getOne(productId, true))?.brand).toBeNull();
    const amendmentId = (res as { amendmentId: string }).amendmentId;
    await service.ratifyAmendment(user, amendmentId);
    const detail = await service.getOne(productId, true);
    expect(detail?.brand).toBe("Acme Bio");
    expect(detail?.version).toBe(4);
    const history = await service.getHistory(productId, true, asUser(orgA, true));
    expect(history.some((h) => h.fieldName === "brand" && h.source === "AMENDMENT_RATIFIED")).toBe(true);
  });

  it("usage is the caller's own organisation only", async () => {
    const usage = await service.getUsage(asUser(orgA), productId);
    expect(usage.lineCount).toBe(2);
    expect(usage.projectCount).toBe(1);
    const other = (await createOrganizationWithDefaultRoles({ name: `Pr B ${suffix}`, slug: `pr-b-${suffix}` })).id;
    const none = await service.getUsage(asUser(other), productId);
    expect(none.lineCount).toBe(0);
  });

  it("completeness counts INN/strength/dosage form only for medicine categories", () => {
    const base = { hsCode: "1", unspscCode: "1", gtin: "1", standardUnit: "u", canonicalManufacturerPartNumber: "1", expectedQualityDocumentation: "q", storageClass: "AMBIENT", shelfLifeMonths: 12, regulatoryClass: "I", intendedUse: "x", packSize: "10", brand: "b", inn: null, strength: null, dosageForm: null };
    expect(computeCompleteness({ ...base, category: "Laboratory Consumables" }).score).toBe(100);
    const med = computeCompleteness({ ...base, category: "Pharmaceuticals.Vaccines" });
    expect(med.missing).toEqual(["INN", "Strength", "Dosage form"]);
    expect(med.score).toBe(80);
  });
});
