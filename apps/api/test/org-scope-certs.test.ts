import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OrgScopeCertsService, certificationStatus } from "../src/organizations/org-scope-certs.service";
import type { RequestUser } from "../src/auth/entra-auth.guard";

const sfx = randomUUID().slice(0, 8);
const svc = new OrgScopeCertsService();
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
      await prisma.organizationScope.deleteMany({ where: { organizationId: id } });
      await prisma.organizationCertification.deleteMany({ where: { organizationId: id } });
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
    const log = await prisma.fieldChangeLog.count({ where: { tableName: "organization_certifications", recordId: c.id } });
    expect(log).toBeGreaterThanOrEqual(3);
  });
});
