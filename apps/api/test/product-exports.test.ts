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

  it("exports the catalogue with the caller's filters, hides simulated rows outside the demo, anonymises other organisations and audits the export", async () => {
    const byA = await exportsSvc.catalogueCsv(asUser(orgA, userA), { q: suffix });
    expect(byA.rowCount).toBe(1);
    expect(byA.csv.startsWith("﻿")).toBe(true);
    expect(byA.csv).toContain(`'=Export device ${suffix}`);
    expect(byA.csv).toContain(`Ex A ${suffix}`);
    expect(byA.csv).not.toContain("Export simulated");
    const byB = await exportsSvc.catalogueCsv(asUser(orgB, userB), { q: suffix });
    expect(byB.csv).toContain("A Universe member");
    expect(byB.csv).not.toContain(`Ex A ${suffix}`);
    const audit = await withTenantContext(orgA, (tx) => tx.fieldChangeLog.findMany({ where: { organizationId: orgA, tableName: "data_exports" } }));
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0].changedById).toBe(userA);
    expect(audit[0].newValue).toContain("1 rows");
  });

  it("exports registrations with only the caller's own verification, and expired reads as EXPIRED", async () => {
    const reg = await regs.create(asUser(orgA, userA), productTarget(productId), { authority: "EU_MDR", referenceNumber: `EXP-${suffix}`, expiryDate: "2020-01-01" });
    await regs.verify(asUser(orgA, userA), reg.id, { outcome: "VERIFIED", jurisdiction: "EU" });
    const a = await exportsSvc.registrationsCsv(asUser(orgA, userA), {});
    const rowA = a.csv.split("\r\n").find((l) => l.includes(`EXP-${suffix}`)) ?? "";
    expect(rowA).toContain("EXPIRED");
    expect(rowA).toContain(",VERIFIED,EU,");
    const b = await exportsSvc.registrationsCsv(asUser(orgB, userB), {});
    const rowB = b.csv.split("\r\n").find((l) => l.includes(`EXP-${suffix}`)) ?? "";
    expect(rowB).toContain("EXPIRED");
    expect(rowB).not.toContain(",VERIFIED,EU,");
    const onlyExpired = await exportsSvc.registrationsCsv(asUser(orgA, userA), { status: "EXPIRED" });
    expect(onlyExpired.csv).toContain(`EXP-${suffix}`);
    const onlyActive = await exportsSvc.registrationsCsv(asUser(orgA, userA), { status: "ACTIVE" });
    expect(onlyActive.csv).not.toContain(`EXP-${suffix}`);
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
});
