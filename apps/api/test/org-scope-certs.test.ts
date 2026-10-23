import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupplierDirectoryService } from "../src/supplier-directory/supplier-directory.service";
import { StakeholderRegistryService } from "../src/stakeholder-registry/stakeholder-registry.service";
import { OrgScopeCertsService, certificationStatus } from "../src/organizations/org-scope-certs.service";
import type { RequestUser } from "../src/auth/entra-auth.guard";

const sfx = randomUUID().slice(0, 8);
const deleted: string[] = [];
const blob = {
  getUploadUrl: async (_o: string, blobName: string) => ({ uploadUrl: "https://example.invalid/put", blobName }),
  getBlobInfo: async () => ({ size: 1234, contentType: "application/pdf", etag: "x", scanStatus: "CLEAN" }),
  getDownloadUrl: async (_o: string, b: string) => `https://example.invalid/get/${b}`,
  deleteBlob: async (_o: string, b: string) => { deleted.push(b); },
};
const svc = new OrgScopeCertsService(blob as never);
const dir = new SupplierDirectoryService(new StakeholderRegistryService());
let orgA = "", orgB = "";
const asAdmin = (organizationId: string) =>
  ({ id: randomUUID(), organizationId, permissions: ["org.profile.manage"], platformStaffRole: "NONE", inDemoOrganization: false, forename: "T", surname: "A", email: "t@example.org" }) as unknown as RequestUser;
const noPerm = (organizationId: string) => ({ ...asAdmin(organizationId), permissions: [] }) as unknown as RequestUser;
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe("organisation scope of supply and certifications", () => {
  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Scope A ${sfx}`, slug: `scope-a-${sfx}`, type: "SUPPLIER" } as never)).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Scope B ${sfx}`, slug: `scope-b-${sfx}`, type: "SUPPLIER" } as never)).id;
  });
  afterAll(async () => {
    for (const id of [orgA, orgB]) {
      await withPlatformStaffContext((tx: any) => tx.supplierProfile.deleteMany({ where: { organizationId: id } }));
      await withPlatformStaffContext((tx: any) => tx.organizationScope.deleteMany({ where: { organizationId: id } }));
      await withPlatformStaffContext((tx: any) => tx.organizationCertification.deleteMany({ where: { organizationId: id } }));
    }
  });

  it("derives certification status from the expiry date", () => {
    expect(certificationStatus(null).status).toBe("NO_EXPIRY");
    expect(certificationStatus(new Date(inDays(-2))).status).toBe("EXPIRED");
    expect(certificationStatus(new Date(inDays(30))).status).toBe("EXPIRING");
    expect(certificationStatus(new Date(inDays(400))).status).toBe("VALID");
  });

  it("sets, changes and re-activates declared scope, rejects unknown ids, and keeps orgs apart", async () => {
    const admin = asAdmin(orgA);
    expect((await svc.getScope(admin, orgA)).declared).toEqual([]);
    expect((await svc.setScope(admin, orgA, ["pharma-antimalarials", "pharma-antibiotics"])).declared.sort()).toEqual(["pharma-antibiotics", "pharma-antimalarials"]);
    expect((await svc.setScope(admin, orgA, ["pharma-antimalarials"])).declared).toEqual(["pharma-antimalarials"]);
    expect((await svc.setScope(admin, orgA, ["pharma-antimalarials", "pharma-antibiotics"])).declared).toHaveLength(2);
    await expect(svc.setScope(admin, orgA, ["not-a-category"])).rejects.toThrow(/Unknown scope/);
    expect((await svc.getScope(asAdmin(orgB), orgB)).declared).toEqual([]);
    await expect(svc.getScope(asAdmin(orgB), orgA)).rejects.toThrow();
    await expect(svc.setScope(noPerm(orgA), orgA, [])).rejects.toThrow();
  });

  it("adds, edits and archives certifications, with a derived status and an audit trail", async () => {
    const admin = asAdmin(orgA);
    const c = await svc.addCertification(admin, orgA, { type: "ISO_13485", reference: "ABC123", issuingBody: "BSI", expiresOn: inDays(30) } as never);
    expect(c).toMatchObject({ type: "ISO_13485", status: "EXPIRING" });
    const u = await svc.updateCertification(admin, orgA, c.id, { type: "ISO_13485", reference: "ABC123", expiresOn: inDays(500) } as never);
    expect(u.status).toBe("VALID");
    await expect(svc.addCertification(admin, orgA, { type: "GMP", issuedOn: inDays(10), expiresOn: inDays(5) } as never)).rejects.toThrow(/before the issue/);
    await expect(svc.updateCertification(asAdmin(orgB), orgB, c.id, { type: "GMP" } as never)).rejects.toThrow();
    expect(await svc.listCertifications(asAdmin(orgB), orgB)).toEqual([]);
    await svc.archiveCertification(admin, orgA, c.id);
    expect(await svc.listCertifications(admin, orgA)).toEqual([]);
    const log = await withPlatformStaffContext((tx: any) => tx.fieldChangeLog.count({ where: { tableName: "organization_certifications", recordId: c.id } }));
    expect(log).toBeGreaterThanOrEqual(3);
  });

  it("shows another organisation's card only once it has published, never with certificate numbers, and offers Edit only to those who may", async () => {
    await svc.setScope(asAdmin(orgA), orgA, ["pharma-antimalarials"]);
    await svc.addCertification(asAdmin(orgA), orgA, { type: "GMP", reference: "SECRET-1", expiresOn: inDays(200) } as never);
    const hidden = await svc.getCard(asAdmin(orgB), orgA);
    expect(hidden).toMatchObject({ name: `Scope A ${sfx}`, detailVisible: false, canEdit: false, scope: [], certifications: [] });
    await withPlatformStaffContext((tx: any) => tx.supplierProfile.create({ data: { organizationId: orgA, description: "Hello", publishedAt: new Date() } }));
    const shown = await svc.getCard(asAdmin(orgB), orgA);
    expect(shown).toMatchObject({ detailVisible: true, canEdit: false, description: "Hello", scope: ["pharma-antimalarials"] });
    expect(shown.certifications).toHaveLength(1);
    expect(JSON.stringify(shown)).not.toContain("SECRET-1");
    expect((await svc.getCard(asAdmin(orgA), orgA)).canEdit).toBe(true);
    expect((await svc.getCard(noPerm(orgA), orgA)).canEdit).toBe(false);
    await expect(svc.getCard(asAdmin(orgA), randomUUID())).rejects.toThrow(/not found/);
  });

  it("finds only published organisations in the network directory, filtered by scope, certification and type", async () => {
    const me = asAdmin(orgB);
    const byScope = await dir.network(me, { scope: "pharma-antimalarials,pharma-antibiotics", q: sfx });
    expect(byScope.organizations.map((o) => o.id)).toEqual([orgA]);
    expect(byScope.organizations[0]).toMatchObject({ scope: ["pharma-antimalarials"], certificationTypes: ["GMP"] });
    expect(byScope.stats).toMatchObject({ suppliers: 1, categories: 1, certified: 1 });
    expect(byScope.facets.certifications).toEqual([{ key: "GMP", count: 1 }]);
    expect((await dir.network(me, { q: sfx, certified: true })).total).toBe(1);
    expect((await dir.network(me, { q: sfx, minYears: 10 })).total).toBe(0);
    expect((await dir.network(me, { q: sfx, whoPq: true })).total).toBe(0);
    expect((await dir.network(me, { q: sfx, sort: "years", offset: 5 })).organizations).toEqual([]);
    expect((await dir.network(me, { q: sfx, scope: "ppe-gloves" })).total).toBe(0);
    expect((await dir.network(me, { q: sfx, certType: "GMP" })).total).toBe(1);
    expect((await dir.network(me, { q: sfx, certType: "ISO_13485" })).total).toBe(0);
    expect((await dir.network(me, { q: sfx, type: "MANUFACTURER" })).total).toBe(0);
    await withPlatformStaffContext((tx: any) => tx.supplierProfile.create({ data: { organizationId: orgB } }));
    expect((await dir.network(me, { q: sfx })).organizations.map((o) => o.id)).toEqual([orgA]);
  });

  it("attaches, replaces and removes a certificate file, keeping it to the owning organisation", async () => {
    const admin = asAdmin(orgA);
    const c = await svc.addCertification(admin, orgA, { type: "ISO_9001", reference: "DOC-1" } as never);
    await expect(svc.requestDocumentUpload(admin, orgA, c.id, { fileName: "x.exe", contentType: "application/octet-stream", fileSizeBytes: 10 })).rejects.toThrow(/can be a/);
    await expect(svc.requestDocumentUpload(admin, orgA, c.id, { fileName: "x.pdf", contentType: "application/pdf", fileSizeBytes: 11 * 1024 * 1024 })).rejects.toThrow(/10 MB/);
    await expect(svc.requestDocumentUpload(asAdmin(orgB), orgB, c.id, { fileName: "x.pdf", contentType: "application/pdf", fileSizeBytes: 10 })).rejects.toThrow();
    const up = await svc.requestDocumentUpload(admin, orgA, c.id, { fileName: "cert one.pdf", contentType: "application/pdf", fileSizeBytes: 100 });
    expect(up.blobName.startsWith(`org-certs/${c.id}/`)).toBe(true);
    await expect(svc.confirmDocument(admin, orgA, c.id, { blobName: "org-certs/other/x.pdf", fileName: "x.pdf" })).rejects.toThrow(/does not belong/);
    expect((await svc.confirmDocument(admin, orgA, c.id, { blobName: up.blobName, fileName: "cert one.pdf" })).documentFileName).toBe("cert one.pdf");
    expect((await svc.documentDownload(admin, orgA, c.id)).downloadUrl).toContain(up.blobName);
    const up2 = await svc.requestDocumentUpload(admin, orgA, c.id, { fileName: "cert two.pdf", contentType: "application/pdf", fileSizeBytes: 100 });
    await svc.confirmDocument(admin, orgA, c.id, { blobName: up2.blobName, fileName: "cert two.pdf" });
    expect(deleted).toContain(up.blobName);
    expect((await svc.removeDocument(admin, orgA, c.id)).documentFileName).toBeNull();
    expect(deleted).toContain(up2.blobName);
    await expect(svc.documentDownload(admin, orgA, c.id)).rejects.toThrow(/No file/);
  });
});
