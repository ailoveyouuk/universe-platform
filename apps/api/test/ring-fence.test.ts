import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { OrganizationsService } from "../src/organizations/organizations.service";
import { UsersService } from "../src/users/users.service";
import { StakeholderRegistryService } from "../src/stakeholder-registry/stakeholder-registry.service";

/** Ring-fence: simulated (scale-test) data never reaches real organisations (2026-10-17). */
describe("Simulated data ring-fence", () => {
  const suffix = randomUUID().slice(0, 8);
  const catalog = new ProductCatalogService();
  const orgs = new OrganizationsService();
  const users = new UsersService();
  const registry = new StakeholderRegistryService();
  let realEntry: string;
  let simEntry: string;
  let realOrg: string;
  let simOrg: string;
  let realProduct: string;
  let simProduct: string;
  let realUser: string;
  let simUser: string;

  const staff = (): RequestUser => ({
    id: randomUUID(),
    organizationId: realOrg,
    homeOrganizationId: realOrg,
    email: `staff-${suffix}@example.com`,
    forename: "S",
    surname: "S",
    organizationName: "x",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole: "SUPER_ADMIN",
    permissions: [],
  });

  beforeAll(async () => {
    realOrg = (await createOrganizationWithDefaultRoles({ name: `RingReal ${suffix}`, slug: `ringreal-${suffix}` })).id;
    simOrg = (await createOrganizationWithDefaultRoles({ name: `RingSim ${suffix}`, slug: `sim-ring-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      await tx.organization.update({ where: { id: simOrg }, data: { isSimulated: true } });
      realProduct = (await tx.productMaster.create({ data: { name: `RingTest real ${suffix}`, category: "Diagnostics" } })).id;
      simProduct = (await tx.productMaster.create({ data: { name: `RingTest sim ${suffix}`, category: "Diagnostics", sourceStandard: "SIM-SCALE", isSimulated: true } })).id;
      realEntry = (await tx.stakeholderRegistryEntry.create({ data: { normalizedName: `ringco${suffix}`, legalName: `RingCo ${suffix}`, stakeholderTypes: '["SUPPLIER"]' } })).id;
      simEntry = (await tx.stakeholderRegistryEntry.create({ data: { normalizedName: `ringsimco${suffix}`, legalName: `RingCo Sim ${suffix}`, stakeholderTypes: '["SUPPLIER"]', isSimulated: true } })).id;
      realUser = (await tx.user.create({ data: { organizationId: realOrg, email: `real-${suffix}@example.com`, forename: "Real", surname: "Ring" } })).id;
      simUser = (await tx.user.create({ data: { organizationId: realOrg, email: `sim-${suffix}@sim.example`, forename: "Sim", surname: "Ring", isSimulated: true } })).id;
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.user.deleteMany({ where: { id: { in: [realUser, simUser] } } });
      await tx.stakeholderRegistryEntry.deleteMany({ where: { id: { in: [realEntry, simEntry] } } });
      await tx.productMaster.deleteMany({ where: { id: { in: [realProduct, simProduct] } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [realOrg, simOrg] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [realOrg, simOrg] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [realOrg, simOrg] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [realOrg, simOrg] } } });
    await prisma.$disconnect();
  });

  it("hides simulated products from search, list and detail outside a demo organisation", async () => {
    const found = await catalog.search(`RingTest`, undefined, false);
    expect(found.map((p) => p.id)).toContain(realProduct);
    expect(found.map((p) => p.id)).not.toContain(simProduct);
    const list = await catalog.list({ q: `RingTest`, showSimulated: false });
    expect(list.items.map((p) => p.id)).toEqual([realProduct]);
    expect(await catalog.getOne(simProduct, false)).toBeNull();
  });

  it("shows simulated products inside a demo organisation", async () => {
    const found = await catalog.search(`RingTest`, undefined, true);
    expect(found.map((p) => p.id).sort()).toEqual([realProduct, simProduct].sort());
    expect((await catalog.getOne(simProduct, true))?.id).toBe(simProduct);
  });

  it("hides simulated organisations and users from Admin unless asked for", async () => {
    const hidden = await orgs.findAll(staff(), false);
    expect(hidden.map((o) => o.id)).toContain(realOrg);
    expect(hidden.map((o) => o.id)).not.toContain(simOrg);
    const shown = await orgs.findAll(staff(), true);
    expect(shown.map((o) => o.id)).toContain(simOrg);

    const page = await users.findPage(staff(), { organizationId: realOrg, pageSize: 100 });
    expect(page.items.map((u) => u.id)).toContain(realUser);
    expect(page.items.map((u) => u.id)).not.toContain(simUser);
    const all = await users.findPage(staff(), { organizationId: realOrg, pageSize: 100, includeSimulated: true });
    expect(all.items.map((u) => u.id)).toContain(simUser);
    expect((await users.counts(staff(), realOrg, false)).total).toBe(1);
    expect((await users.counts(staff(), realOrg, true)).total).toBe(2);
  });

  it("keeps simulated stakeholder-registry entries out of real organisations' searches and matching", async () => {
    const real = await registry.search(undefined, `RingCo`, "name", false);
    expect(real.map((r) => r.id)).toEqual([realEntry]);
    const demo = await registry.search(undefined, `RingCo`, "name", true);
    expect(demo.map((r) => r.id).sort()).toEqual([realEntry, simEntry].sort());
    expect(await registry.getOne(simEntry, false)).toBeNull();
    // A demo-side stakeholder with the same name never merges into a real entry, nor the reverse.
    const demoId = await registry.resolveForPartnerCreate({ name: `RingCo ${suffix}`, roleTypes: ["SUPPLIER"], simulated: true });
    expect(demoId).not.toBe(realEntry);
    await withPlatformStaffContext((tx) => tx.stakeholderRegistryEntry.deleteMany({ where: { id: demoId } }));
  });
});
