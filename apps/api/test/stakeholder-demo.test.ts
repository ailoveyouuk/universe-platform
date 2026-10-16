import { randomUUID } from "node:crypto";
import {
  createOrganizationWithDefaultRoles,
  ensureStakeholderDemoRole,
  prisma,
  STAKEHOLDER_DEMO_PERMISSION_KEYS,
  withPlatformStaffContext,
} from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { assertNotDemoUser } from "../src/common/authorization";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";

/** Demo sandbox: the Stakeholder Demo role and the shared-data write guard (2026-10-17). */
describe("Stakeholder demo", () => {
  const suffix = randomUUID().slice(0, 8);
  let demoOrg: string;
  let realOrg: string;

  const asUser = (organizationId: string, isDemoUser: boolean, platformStaffRole: RequestUser["platformStaffRole"] = "NONE"): RequestUser => ({
    id: randomUUID(),
    organizationId,
    homeOrganizationId: organizationId,
    email: `x-${suffix}@example.com`,
    forename: "T",
    surname: "T",
    organizationName: "x",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole,
    permissions: ["projects.edit", "products.approve"],
    isDemoUser,
  });

  beforeAll(async () => {
    demoOrg = (await createOrganizationWithDefaultRoles({ name: `Demo ${suffix}`, slug: `demo-${suffix}` })).id;
    realOrg = (await createOrganizationWithDefaultRoles({ name: `Real ${suffix}`, slug: `real-${suffix}` })).id;
    await withPlatformStaffContext((tx) => tx.organization.update({ where: { id: demoOrg }, data: { isDemo: true } }));
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [demoOrg, realOrg] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [demoOrg, realOrg] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [demoOrg, realOrg] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [demoOrg, realOrg] } } });
    await prisma.$disconnect();
  });

  it("the Stakeholder Demo role is created once, with administration excluded", async () => {
    const first = await ensureStakeholderDemoRole(demoOrg);
    const second = await ensureStakeholderDemoRole(demoOrg);
    expect(second.id).toBe(first.id);
    const keys = await withPlatformStaffContext((tx) =>
      tx.rolePermission.findMany({ where: { roleId: first.id }, include: { permission: true } }),
    );
    const names = keys.map((k) => k.permission.key).sort();
    expect(names).toEqual([...STAKEHOLDER_DEMO_PERMISSION_KEYS].sort());
    expect(names).not.toContain("org.users.manage");
    expect(names).not.toContain("org.roles.manage");
    expect(names).not.toContain("org.profile.manage");
  });

  it("the role cannot be created outside a demo organisation", async () => {
    await expect(ensureStakeholderDemoRole(realOrg)).rejects.toThrow(/demo organisation/);
  });

  it("assertNotDemoUser blocks demo users and lets everyone else through", () => {
    expect(() => assertNotDemoUser(asUser(demoOrg, true), "X")).toThrow(ForbiddenException);
    expect(() => assertNotDemoUser(asUser(realOrg, false), "X")).not.toThrow();
    expect(() => assertNotDemoUser(asUser(demoOrg, false, "SUPER_ADMIN"), "X")).not.toThrow();
  });

  it("a demo user cannot add to or import into the shared product catalogue", async () => {
    const catalog = new ProductCatalogService({} as never);
    const demo = asUser(demoOrg, true);
    await expect(catalog.create(demo, { name: "Should not exist", category: "Laboratory Consumables" } as never)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(catalog.importBatch(demo, "TEST", [])).rejects.toBeInstanceOf(ForbiddenException);
  });
});
