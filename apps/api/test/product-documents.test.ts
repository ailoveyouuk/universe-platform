import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductDocumentsService } from "../src/product-catalog/product-documents.service";

/** Controlled product documents: privacy, four-eyes approval, supersession, archive-not-delete, upload limits (2026-10-18). Real RLS database. */
describe("Product documents", () => {
  const suffix = randomUUID().slice(0, 8);
  const service = new ProductDocumentsService({} as never);
  let orgA: string; let orgB: string; let uploader: string; let approver: string; let userB: string; let productId: string;

  const asUser = (organizationId: string, id: string, permissions = ["projects.edit", "products.approve"]): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `pd-${id}@example.com`, forename: "Doc", surname: "Tester", organizationName: "Org",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions,
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Pd A ${suffix}`, slug: `pd-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Pd B ${suffix}`, slug: `pd-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      uploader = (await tx.user.create({ data: { organizationId: orgA, email: `pdu-${suffix}@example.com`, forename: "Up", surname: "Loader" } })).id;
      approver = (await tx.user.create({ data: { organizationId: orgA, email: `pda-${suffix}@example.com`, forename: "Ap", surname: "Prover" } })).id;
      userB = (await tx.user.create({ data: { organizationId: orgB, email: `pdb-${suffix}@example.com`, forename: "Other", surname: "Org" } })).id;
      productId = (await tx.productMaster.create({ data: { name: `Doc product ${suffix}`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA } })).id;
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("rejects disallowed file types and oversize uploads before any URL is issued", async () => {
    await expect(service.requestUpload(asUser(orgA, uploader), productId, { fileName: "x.exe", contentType: "application/x-msdownload", fileSizeBytes: 100 })).rejects.toThrow(/not allowed/);
    await expect(service.requestUpload(asUser(orgA, uploader), productId, { fileName: "x.pdf", contentType: "application/pdf", fileSizeBytes: 26 * 1024 * 1024 })).rejects.toThrow(/25 MB/);
  });

  it("creates a draft, enforces four-eyes approval, and supersedes the previous version", async () => {
    const v1 = await service.create(asUser(orgA, uploader), productId, { docType: "CERTIFICATE", title: "CE certificate", version: "1.0", expiryDate: "2030-01-01" });
    expect(v1.status).toBe("DRAFT");
    await expect(service.approve(asUser(orgA, uploader), v1.id)).rejects.toThrow(/uploaded it/);
    expect((await service.approve(asUser(orgA, approver), v1.id)).status).toBe("APPROVED");
    const v2 = await service.create(asUser(orgA, uploader), productId, { docType: "CERTIFICATE", title: "CE certificate", version: "2.0", supersedesId: v1.id });
    await service.approve(asUser(orgA, approver), v2.id);
    const all = await service.list(asUser(orgA, uploader), productId);
    expect(all.find((d) => d.id === v1.id)?.status).toBe("SUPERSEDED");
    expect(all.find((d) => d.id === v2.id)?.status).toBe("APPROVED");
  });

  it("is private to the organisation and needs QA permission to approve", async () => {
    expect(await service.list(asUser(orgB, userB), productId)).toHaveLength(0);
    const d = await service.create(asUser(orgA, uploader), productId, { docType: "SDS", title: "SDS" });
    await expect(service.approve(asUser(orgA, approver, ["projects.edit"]), d.id)).rejects.toThrow();
  });

  it("archives rather than deleting, keeping the row retrievable", async () => {
    const d = await service.create(asUser(orgA, uploader), productId, { docType: "OTHER", title: "To retire" });
    await service.archive(asUser(orgA, uploader), d.id, "Obsolete");
    expect((await service.list(asUser(orgA, uploader), productId)).some((x) => x.id === d.id)).toBe(false);
    expect((await service.list(asUser(orgA, uploader), productId, true)).find((x) => x.id === d.id)?.archived).toBe(true);
  });
});
