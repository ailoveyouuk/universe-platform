import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { OrganisationExportsService } from "../src/data-exports/organisation-exports.service";
import { ExportRequestsService } from "../src/product-catalog/export-requests.service";
import { ExportRestrictionsService } from "../src/product-catalog/export-restrictions.service";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductDocumentsService } from "../src/product-catalog/product-documents.service";
import { ProductExportsService } from "../src/product-catalog/product-exports.service";
import { ProductRegistrationsService } from "../src/product-catalog/product-registrations.service";
import { ProductSafetyNoticesService } from "../src/product-catalog/product-safety-notices.service";

/** Export requests (global-admin approval for the shared catalogue) and organisation-own exports (2026-10-18). Real RLS database. */
describe("Data export requests and own-organisation exports", () => {
  const suffix = randomUUID().slice(0, 8);
  const products = new ProductExportsService(new ProductCatalogService(), new ProductRegistrationsService(), new ProductDocumentsService({} as never), new ProductSafetyNoticesService(), new ExportRestrictionsService());
  const requests = new ExportRequestsService(products);
  const own = new OrganisationExportsService();
  let orgA: string; let orgB: string; let admin: string; let requester: string; let colleague: string; let otherOrgUser: string;

  const asUser = (organizationId: string, id: string, staff = false): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `dx-${id}@example.com`, forename: "Data", surname: "Tester", organizationName: organizationId === orgA ? "Org A" : "Org B",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions: ["projects.edit", "products.approve"],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Dx A ${suffix}`, slug: `dx-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Dx B ${suffix}`, slug: `dx-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      admin = (await tx.user.create({ data: { organizationId: orgA, email: `dxadmin-${suffix}@example.com`, forename: "Global", surname: "Admin", status: "ACTIVE", platformStaffRole: "SUPER_ADMIN" } })).id;
      requester = (await tx.user.create({ data: { organizationId: orgB, email: `dxreq-${suffix}@example.com`, forename: "Re", surname: "Quester", status: "ACTIVE" } })).id;
      colleague = (await tx.user.create({ data: { organizationId: orgB, email: `dxcol-${suffix}@example.com`, forename: "Co", surname: "League", status: "ACTIVE" } })).id;
      otherOrgUser = (await tx.user.create({ data: { organizationId: orgA, email: `dxother-${suffix}@example.com`, forename: "Other", surname: "Org", status: "ACTIVE" } })).id;
      await tx.productMaster.create({ data: { name: `Pooled asset ${suffix}`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA } });
    });
    await withTenantContext(orgA, async (tx) => {
      await tx.partner.create({ data: { organizationId: orgA, name: `Own stakeholder ${suffix}`, normalizedName: `own stakeholder ${suffix}` } });
      await tx.project.create({ data: { organizationId: orgA, referenceNumber: `DX-${suffix}`, title: "Own project", category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status: "IN_PROGRESS" } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  let requestId: string;

  it("an organisation asks, with a reason; global admins are notified; other organisations cannot see it; admins cannot request", async () => {
    const created = await requests.create(asUser(orgB, requester), { scope: "CATALOGUE", reason: "Benchmarking our own range against the market", filters: { q: suffix } });
    requestId = created.id;
    expect(created.status).toBe("PENDING");
    expect(created.canDownload).toBe(false);
    const note = await withTenantContext(orgA, (tx) => tx.notification.findMany({ where: { recipientUserId: admin, kind: "DATA_EXPORT_REQUEST", subjectId: requestId } }));
    expect(note).toHaveLength(1);
    expect((await requests.list(asUser(orgB, colleague))).some((r) => r.id === requestId)).toBe(true);
    expect((await requests.list(asUser(orgA, otherOrgUser))).some((r) => r.id === requestId)).toBe(false);
    expect((await requests.list(asUser(orgA, admin, true))).some((r) => r.id === requestId)).toBe(true);
    await expect(requests.create(asUser(orgA, admin, true), { scope: "CATALOGUE", reason: "I can just export it directly" })).rejects.toThrow(/directly/i);
  });

  it("only a global admin decides; a rejection needs a reason; a decision is final", async () => {
    await expect(requests.decide(asUser(orgB, requester), requestId, { approve: true })).rejects.toThrow(/global admin/i);
    await expect(requests.decide(asUser(orgA, admin, true), requestId, { approve: false })).rejects.toThrow(/reason/i);
    const approved = await requests.decide(asUser(orgA, admin, true), requestId, { approve: true, note: "OK for benchmarking" });
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedUntil).not.toBeNull();
    await expect(requests.decide(asUser(orgA, admin, true), requestId, { approve: false, note: "changed my mind" })).rejects.toThrow(/already/i);
    const told = await withTenantContext(orgB, (tx) => tx.notification.findMany({ where: { recipientUserId: requester, kind: "DATA_EXPORT_DECISION", subjectId: requestId } }));
    expect(told).toHaveLength(1);
  });

  it("only the requester downloads, once, and the file holds the wider data with contributors anonymised", async () => {
    await expect(requests.download(asUser(orgB, colleague), requestId)).rejects.toThrow(/only the person/i);
    const file = await requests.download(asUser(orgB, requester), requestId);
    expect(file.csv).toContain(`Pooled asset ${suffix}`);
    expect(file.csv).toContain("A Universe member");
    expect(file.csv).not.toContain(`Dx A ${suffix}`);
    await expect(requests.download(asUser(orgB, requester), requestId)).rejects.toThrow(/not approved|already/i);
    const row = (await requests.list(asUser(orgB, requester))).find((r) => r.id === requestId);
    expect(row?.status).toBe("DOWNLOADED");
    expect(row?.rowCount).toBeGreaterThanOrEqual(1);
  });

  it("an approval that is left unused expires, and a rejected request cannot be downloaded", async () => {
    const r2 = await requests.create(asUser(orgB, requester), { scope: "REGISTRATIONS", reason: "Checking registrations coverage for a tender" });
    await requests.decide(asUser(orgA, admin, true), r2.id, { approve: true });
    await withPlatformStaffContext((tx) => tx.dataExportRequest.update({ where: { id: r2.id }, data: { approvedUntil: new Date(Date.now() - 1000) } }));
    expect((await requests.list(asUser(orgB, requester))).find((r) => r.id === r2.id)?.status).toBe("EXPIRED");
    await expect(requests.download(asUser(orgB, requester), r2.id)).rejects.toThrow(/expired|not approved/i);
    const r3 = await requests.create(asUser(orgB, requester), { scope: "CATALOGUE", reason: "Another reason that is long enough" });
    await requests.decide(asUser(orgA, admin, true), r3.id, { approve: false, note: "Not needed" });
    await expect(requests.download(asUser(orgB, requester), r3.id)).rejects.toThrow(/not approved/i);
  });

  it("own-organisation exports hold only that organisation's records and no money columns", async () => {
    const partners = await own.export(asUser(orgA, otherOrgUser), "partners", false);
    expect(partners.csv).toContain(`Own stakeholder ${suffix}`);
    expect((await own.export(asUser(orgB, requester), "partners", false)).csv).not.toContain(`Own stakeholder ${suffix}`);
    const projects = await own.export(asUser(orgA, otherOrgUser), "projects", false);
    expect(projects.csv).toContain(`DX-${suffix}`);
    expect(projects.csv.split("\r\n")[0]).not.toMatch(/cost|price|margin|insured/i);
    expect((await own.export(asUser(orgB, requester), "projects", false)).csv).not.toContain(`DX-${suffix}`);
    await expect(own.export(asUser(orgA, otherOrgUser), "users", false)).rejects.toThrow(/unknown/i);
    const audit = await withTenantContext(orgA, (tx) => tx.fieldChangeLog.findMany({ where: { tableName: "data_exports", recordId: "partners" } }));
    expect(audit.length).toBeGreaterThanOrEqual(1);
  });
});
