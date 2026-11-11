import { randomUUID } from "node:crypto";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadDemoView } from "../src/auth/demo-access";
import { EntraAuthGuard, type RequestUser } from "../src/auth/entra-auth.guard";
import { clearCache } from "../src/common/ttl-cache";

/**
 * Demo Access (2026-11-02): a person with the switch on is moved into the demo organisation, gets view permissions only, and cannot change
 * anything; the organisation header is ignored; platform staff are never affected.
 */
describe("EntraAuthGuard — Demo Access", () => {
  const suffix = randomUUID().slice(0, 8);
  let realOrgId: string;
  let createdDemoOrgId: string | null = null;
  const orgIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const real = await createOrganizationWithDefaultRoles({ name: `Demo Access Real ${suffix}`, slug: `demo-access-real-${suffix}` });
    realOrgId = real.id;
    orgIds.push(real.id);
    clearCache();
    if (!(await loadDemoView()).org) {
      // No "Universe Demo" in this database yet: make one for the test and remove it afterwards.
      const demo = await createOrganizationWithDefaultRoles({ name: "Universe Demo", slug: `universe-demo-${suffix}` });
      await withPlatformStaffContext((tx) => tx.organization.update({ where: { id: demo.id }, data: { isDemo: true } }));
      createdDemoOrgId = demo.id;
      orgIds.push(demo.id);
      clearCache();
    }
  });

  afterEach(async () => {
    delete process.env.LOCAL_DEV_EMAIL;
    if (userIds.length) {
      await withPlatformStaffContext((tx) => tx.user.deleteMany({ where: { id: { in: userIds } } }));
      userIds.length = 0;
    }
  });

  afterAll(async () => {
    for (const id of orgIds) {
      await withPlatformStaffContext((tx) => tx.rolePermission.deleteMany({ where: { role: { organizationId: id } } }));
      await withPlatformStaffContext((tx) => tx.role.deleteMany({ where: { organizationId: id } }));
      await withPlatformStaffContext((tx) => tx.dataSharingConsent.deleteMany({ where: { organizationId: id } }));
      await prisma.organization.delete({ where: { id } });
    }
    clearCache();
    await prisma.$disconnect();
  });

  function ctx(req: Record<string, unknown>) {
    return { switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}), getNext: () => ({}) }) } as unknown as ExecutionContext;
  }

  async function seed(opts: { demoAccess: boolean; platformStaffRole?: string }) {
    const email = `demo-access-${randomUUID().slice(0, 8)}@example.com`;
    const user = await withPlatformStaffContext((tx) =>
      tx.user.create({ data: { organizationId: realOrgId, email, forename: "Demo", surname: "Viewer", status: "INVITED", demoAccess: opts.demoAccess, platformStaffRole: opts.platformStaffRole ?? "NONE" } }),
    );
    userIds.push(user.id);
    process.env.LOCAL_DEV_EMAIL = email;
    return user;
  }

  // The local-dev fallback always links the identity "local-dev"; clear it between users.
  const request = (method: string, path: string, extra: Record<string, string> = {}) => ({ method, path, headers: { authorization: "Bearer test-token", ...extra } }) as { method: string; path: string; headers: Record<string, string>; user?: RequestUser };

  it("moves a Demo Access person into the demo organisation with view permissions only", async () => {
    await seed({ demoAccess: true });
    const view = await loadDemoView();
    const req = request("GET", "/projects", { "x-universe-organization": realOrgId });
    expect(await new EntraAuthGuard().canActivate(ctx(req))).toBe(true);
    expect(req.user?.demoAccess).toBe(true);
    expect(req.user?.organizationId).toBe(view.org!.id);
    expect(req.user?.homeOrganizationId).toBe(realOrgId);
    expect(req.user?.inDemoOrganization).toBe(true);
    expect(req.user?.isDemoUser).toBe(true);
    // Every app except Admin, which is for its named owner only.
    expect(req.user?.apps).toEqual(["project-management", "product-database", "tender-issuance", "insights", "crm"]);
    expect(req.user!.permissions.length).toBeGreaterThan(0);
    expect(req.user!.permissions.every((p) => p.endsWith(".view"))).toBe(true);
    expect(req.user!.permissions).not.toContain("org.users.manage");
  });

  it("refuses any change before it reaches a service", async () => {
    await seed({ demoAccess: true });
    for (const [m, p] of [["POST", "/projects"], ["PATCH", "/users/abc"], ["PUT", "/crm/x"], ["DELETE", "/projects/abc"]]) {
      await expect(new EntraAuthGuard().canActivate(ctx(request(m, p)))).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it("still lets them change their own colour theme", async () => {
    await seed({ demoAccess: true });
    expect(await new EntraAuthGuard().canActivate(ctx(request("PATCH", "/me/preferences")))).toBe(true);
  });

  it("does nothing to an ordinary person or to platform staff", async () => {
    await seed({ demoAccess: false });
    const plain = request("POST", "/projects");
    expect(await new EntraAuthGuard().canActivate(ctx(plain))).toBe(true);
    expect(plain.user?.demoAccess).toBe(false);
    expect(plain.user?.organizationId).toBe(realOrgId);
  });

  it("ignores the switch on a platform staff account", async () => {
    await seed({ demoAccess: true, platformStaffRole: "SUPPORT" });
    const req = request("POST", "/projects");
    expect(await new EntraAuthGuard().canActivate(ctx(req))).toBe(true);
    expect(req.user?.demoAccess).toBe(false);
    expect(req.user?.organizationId).toBe(realOrgId);
  });
});
