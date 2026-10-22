import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ExportRestrictionsService } from "../src/product-catalog/export-restrictions.service";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductDocumentsService } from "../src/product-catalog/product-documents.service";
import { ProductExportsService, csvCell, csvRow } from "../src/product-catalog/product-exports.service";
import { ProductRegistrationsService } from "../src/product-catalog/product-registrations.service";
import { ProductSafetyNoticesService } from "../src/product-catalog/product-safety-notices.service";
import { productTarget } from "../src/product-catalog/product-target";

/** Product Database exports: spreadsheet-safe CSV, visibility rules, private verification, audit trail, dossier (2026-10-18). Real RLS database. */
describe("Product exports", () => {
  const suffix = randomUUID().slice(0, 8);
  const regs = new ProductRegistrationsService();
  const exportsSvc = new ProductExportsService(new ProductCatalogService(), regs, new ProductDocumentsService({} as never), new ProductSafetyNoticesService(), new ExportRestrictionsService());
  let orgA: string; let orgB: string; let userA: string; let userB: string; let productId: string; let simulatedId: string;

  const asUser = (organizationId: string, id: string): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `ex-${id}@example.com`, forename: "Export", surname: "Tester", organizationName: organizationId === orgA ? "Org A" : "Org B",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["projects.edit", "products.approve"],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Ex A ${suffix}`, slug: `ex-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Ex B ${suffix}`, slug: `ex-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userA = (await tx.user.create({ data: { organizationId: orgA, email: `exa-${suffix}@example.com`, forename: "Ex", surname: "A", status: "ACTIVE" } })).id;
      userB = (await tx.user.create({ data: { organizationId: orgB, email: `exb-${suffix}@example.com`, forename: "Ex", surname: "B", status: "ACTIVE" } })).id;
      productId = (await tx.productMaster.create({ data: { name: `=Export device ${suffix}`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA, gtin: "05012345678900" } })).id;
      simulatedId = (await tx.productMaster.create({ data: { name: `Export simulated ${suffix}`, category: "Medical Devices", sourceStandard: "TEST", isSimulated: true } })).id;
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("makes cells spreadsheet-safe: quotes, commas, newlines and formula prefixes", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-12.5")).toBe("-12.5");
    expect(csvCell(null)).toBe("");
    expect(csvRow(["a", 2, null, "b,c"])).toBe('a,2,,"b,c"');
  });

  it("exports only what the organisation itself contributed unless the caller is a global admin; hides simulated rows; anonymises; audits", async () => {
    const byA = await exportsSvc.catalogueCsv(asUser(orgA, userA), { q: suffix });
    expect(byA.rowCount).toBe(1);
    expect(byA.csv.startsWith("\ufeff")).toBe(true);
    expect(byA.csv).toContain(`'=Export device ${suffix}`);
    expect(byA.csv).toContain(`Ex A ${suffix}`);
    expect(byA.csv).not.toContain("Export simulated");
    // Organisation B did not add this product, so its own-contribution export is empty.
    const byB = await exportsSvc.catalogueCsv(asUser(orgB, userB), { q: suffix });
    expect(byB.rowCount).toBe(0);
    expect(byB.csv).not.toContain(`Export device ${suffix}`);
    // The whole-catalogue path (global admin, or an approved request) still anonymises the contributor for a non-contributor.
    const wide = await exportsSvc.catalogueCsv(asUser(orgB, userB), { q: suffix }, true);
    expect(wide.csv).toContain("A Universe member");
    expect(wide.csv).not.toContain(`Ex A ${suffix}`);
    const audit = await withTenantContext(orgA, (tx) => tx.fieldChangeLog.findMany({ where: { organizationId: orgA, tableName: "data_exports" } }));
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0].changedById).toBe(userA);
    expect(audit[0].newValue).toContain("Own contributions: 1 rows");
  });

  it("exports registrations with only the caller's own verification, own contributions by default, and expired reads as EXPIRED", async () => {
    const reg = await regs.create(asUser(orgA, userA), productTarget(productId), { authority: "EU_MDR", referenceNumber: `EXP-${suffix}`, expiryDate: "2020-01-01" });
    await regs.verify(asUser(orgA, userA), reg.id, { outcome: "VERIFIED", jurisdiction: "EU" });
    const a = await exportsSvc.registrationsCsv(asUser(orgA, userA), {});
    const rowA = a.csv.split("\r\n").find((l) => l.includes(`EXP-${suffix}`)) ?? "";
    expect(rowA).toContain("EXPIRED");
    expect(rowA).toContain(",VERIFIED,EU,");
    const bOwn = await exportsSvc.registrationsCsv(asUser(orgB, userB), {});
    expect(bOwn.csv).not.toContain(`EXP-${suffix}`);
    const bWide = await exportsSvc.registrationsCsv(asUser(orgB, userB), {}, true);
    const rowB = bWide.csv.split("\r\n").find((l) => l.includes(`EXP-${suffix}`)) ?? "";
    expect(rowB).toContain("EXPIRED");
    expect(rowB).not.toContain(",VERIFIED,EU,");
    expect((await exportsSvc.registrationsCsv(asUser(orgA, userA), { status: "EXPIRED" })).csv).toContain(`EXP-${suffix}`);
    expect((await exportsSvc.registrationsCsv(asUser(orgA, userA), { status: "ACTIVE" })).csv).not.toContain(`EXP-${suffix}`);
  });

  it("builds a dossier from the caller's view, refuses simulated products outside the demo, and audits it", async () => {
    const dossier = await exportsSvc.dossier(asUser(orgA, userA), productId);
    expect(dossier.product.id).toBe(productId);
    expect(dossier.generatedFor).toBe("Org A");
    expect(dossier.registrations.some((r) => r.referenceNumber === `EXP-${suffix}`)).toBe(true);
    expect(dossier.registrations[0].myVerification?.outcome).toBe("VERIFIED");
    const other = await exportsSvc.dossier(asUser(orgB, userB), productId);
    expect(other.registrations[0].myVerification).toBeNull();
    await expect(exportsSvc.dossier(asUser(orgA, userA), simulatedId)).rejects.toThrow(/not found/i);
    const audit = await withTenantContext(orgA, (tx) => tx.fieldChangeLog.findMany({ where: { tableName: "data_exports", recordId: productId } }));
    expect(audit).toHaveLength(1);
  });
  it("shows another organisation nothing identifiable beyond the product and manufacturer (Lewis's condition for leaving the dossier open)", async () => {
    const other = await exportsSvc.dossier(asUser(orgB, userB), productId);
    const text = JSON.stringify({ ...other, generatedFor: undefined });
    expect(text).not.toContain("Org A");            // the contributing organisation's name
    expect(text).not.toContain(`Ex A ${suffix}`);   // its registered name
    expect(text).not.toContain(`exa-${suffix}`);    // its user's email
    expect(other.documents).toHaveLength(0);         // controlled documents are private to the organisation that holds them
    expect(other.registrations.every((r) => r.myVerification === null)).toBe(true);
    expect(other.history.every((h) => h.changedByName === null && h.changedByOrganizationName !== "Org A")).toBe(true);
  });
});
