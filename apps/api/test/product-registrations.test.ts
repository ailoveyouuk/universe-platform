import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductRegistrationsService, computeCompliance, effectiveStatus } from "../src/product-catalog/product-registrations.service";

/** Regulatory registrations: shared facts, private per-organisation verification, compliance, audit (2026-10-18). Real RLS database. */
describe("Product regulatory registrations", () => {
  const suffix = randomUUID().slice(0, 8);
  const regs = new ProductRegistrationsService();
  const catalogue = new ProductCatalogService();
  let orgA: string;
  let orgB: string;
  let userA: string;
  let userB: string;
  let productId: string;

  const asUser = (organizationId: string, id: string, staff = false, permissions = ["projects.edit", "products.approve"]): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `rg-${id}@example.com`, forename: "Reg", surname: "Tester",
    organizationName: organizationId === orgA ? "Org A" : "Org B", organizationLogoUrl: null, organizationLogoIconUrl: null,
    organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions,
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Rg A ${suffix}`, slug: `rg-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Rg B ${suffix}`, slug: `rg-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userA = (await tx.user.create({ data: { organizationId: orgA, email: `rga-${suffix}@example.com`, forename: "Reg", surname: "A" } })).id;
      userB = (await tx.user.create({ data: { organizationId: orgB, email: `rgb-${suffix}@example.com`, forename: "Reg", surname: "B" } })).id;
      productId = (await tx.productMaster.create({ data: { name: `Test device ${suffix}`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA } })).id;
    });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it("effectiveStatus reads an ACTIVE registration with a past expiry as EXPIRED", () => {
    expect(effectiveStatus("ACTIVE", new Date(Date.now() - 86400000))).toBe("EXPIRED");
    expect(effectiveStatus("ACTIVE", new Date(Date.now() + 86400000 * 400))).toBe("ACTIVE");
    expect(effectiveStatus("SUSPENDED", null)).toBe("SUSPENDED");
  });

  it("compliance: none -> warning; healthy -> OK; expiring -> warning; suspended or recalled -> blocked", () => {
    const far = new Date(Date.now() + 86400000 * 500);
    expect(computeCompliance("ACTIVE", []).status).toBe("WARNING");
    expect(computeCompliance("ACTIVE", [{ status: "ACTIVE", expiryDate: far, authority: "FDA", referenceNumber: "K1" }]).status).toBe("OK");
    expect(computeCompliance("ACTIVE", [{ status: "ACTIVE", expiryDate: new Date(Date.now() + 86400000 * 30), authority: "FDA", referenceNumber: "K1" }]).status).toBe("WARNING");
    expect(computeCompliance("ACTIVE", [{ status: "SUSPENDED", expiryDate: far, authority: "FDA", referenceNumber: "K1" }]).status).toBe("BLOCKED");
    expect(computeCompliance("RECALLED", [{ status: "ACTIVE", expiryDate: far, authority: "FDA", referenceNumber: "K1" }]).status).toBe("BLOCKED");
  });

  it("adds a registration, audits it, and shows it to another organisation", async () => {
    const created = await regs.create(asUser(orgA, userA), productId, { authority: "EU_MDR", referenceNumber: `MDR-${suffix}`, expiryDate: new Date(Date.now() + 86400000 * 700).toISOString().slice(0, 10) });
    expect(created.status).toBe("ACTIVE");
    const seenByB = await regs.list(asUser(orgB, userB), productId);
    expect(seenByB.map((r) => r.referenceNumber)).toContain(`MDR-${suffix}`);
    const history = await catalogue.getHistory(productId, true);
    expect(history.some((h) => h.fieldName === "registration added")).toBe(true);
    expect((await catalogue.getOne(productId, true))?.compliance.status).toBe("OK");
  });

  it("verification is private to the verifying organisation, and needs QA permission", async () => {
    const [reg] = await regs.list(asUser(orgA, userA), productId);
    await expect(regs.verify(asUser(orgA, userA, false, ["projects.edit"]), reg.id, { outcome: "VERIFIED" })).rejects.toThrow();
    await expect(regs.verify(asUser(orgA, userA), reg.id, { outcome: "ISSUE_FOUND" })).rejects.toThrow(/note/i);
    await regs.verify(asUser(orgA, userA), reg.id, { outcome: "VERIFIED", jurisdiction: "United Kingdom" });
    expect((await regs.list(asUser(orgA, userA), productId))[0].myVerification?.outcome).toBe("VERIFIED");
    expect((await regs.list(asUser(orgB, userB), productId))[0].myVerification).toBeNull();
  });

  it("only staff or the contributor can edit; retiring archives rather than deleting", async () => {
    const [reg] = await regs.list(asUser(orgA, userA), productId);
    await expect(regs.update(asUser(orgB, userB), reg.id, { notes: "x" })).rejects.toThrow();
    await regs.update(asUser(orgA, userA), reg.id, { status: "SUSPENDED" });
    expect((await catalogue.getOne(productId, true))?.compliance.status).toBe("BLOCKED");
    await regs.update(asUser(orgA, userA, true), reg.id, { isArchived: true });
    expect(await regs.list(asUser(orgA, userA), productId)).toHaveLength(0);
    const all = await regs.list(asUser(orgA, userA), productId, true);
    expect(all).toHaveLength(1);
    expect(all[0].isArchived).toBe(true);
  });
});
