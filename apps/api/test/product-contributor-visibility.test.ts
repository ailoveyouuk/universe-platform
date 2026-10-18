import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ANONYMOUS_CONTRIBUTOR } from "../src/product-catalog/attribution";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductRegistrationsService } from "../src/product-catalog/product-registrations.service";
import { productTarget } from "../src/product-catalog/product-target";

/** Pooled-database rule: contributions are searchable by all but anonymous unless the organisation shares its identity (2026-10-18). */
describe("Contributor visibility", () => {
  const suffix = randomUUID().slice(0, 8);
  const catalogue = new ProductCatalogService();
  const regs = new ProductRegistrationsService();
  let quiet: string; // anonymous organisation (default)
  let open: string; // shares identity
  let viewer: string;
  let quietProduct: string;
  let openProduct: string;
  let overrideProduct: string;

  const asUser = (organizationId: string, staff = false): RequestUser => ({
    id: randomUUID(), organizationId, homeOrganizationId: organizationId, email: `cv-${suffix}@example.com`, forename: "C", surname: "V",
    organizationName: "X", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null,
    organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions: ["projects.edit", "products.approve"],
  });

  beforeAll(async () => {
    quiet = (await createOrganizationWithDefaultRoles({ name: `Quiet ${suffix}`, slug: `cvq-${suffix}` })).id;
    open = (await createOrganizationWithDefaultRoles({ name: `Open ${suffix}`, slug: `cvo-${suffix}` })).id;
    viewer = (await createOrganizationWithDefaultRoles({ name: `Viewer ${suffix}`, slug: `cvv-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      await tx.organization.update({ where: { id: open }, data: { shareIdentityWithUniverse: true } });
      quietProduct = (await tx.productMaster.create({ data: { name: `Vizzo quiet ${suffix}`, category: "Consumables", sourceStandard: "TEST", addedByOrganizationId: quiet } })).id;
      openProduct = (await tx.productMaster.create({ data: { name: `Vizzo open ${suffix}`, category: "Consumables", sourceStandard: "TEST", addedByOrganizationId: open } })).id;
      overrideProduct = (await tx.productMaster.create({ data: { name: `Vizzo shown ${suffix}`, category: "Consumables", sourceStandard: "TEST", addedByOrganizationId: quiet, attributionOverride: true } })).id;
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("others find every contribution, but only identifiable contributors are named", async () => {
    const r = await catalogue.search(`Vizzo`, undefined, false, asUser(viewer));
    const by = new Map(r.map((x) => [x.id, x]));
    expect(by.get(quietProduct)?.addedByOrganizationName).toBe(ANONYMOUS_CONTRIBUTOR);
    expect(by.get(quietProduct)?.addedByOrganizationId).toBeNull();
    expect(by.get(quietProduct)?.contributorAnonymised).toBe(true);
    expect(by.get(openProduct)?.addedByOrganizationName).toBe(`Open ${suffix}`);
    expect(by.get(overrideProduct)?.addedByOrganizationName).toBe(`Quiet ${suffix}`);
  });

  it("the contributor and platform staff always see the real name", async () => {
    expect((await catalogue.getOne(quietProduct, false, asUser(quiet)))?.addedByOrganizationName).toBe(`Quiet ${suffix}`);
    expect((await catalogue.getOne(quietProduct, false, asUser(viewer, true)))?.addedByOrganizationName).toBe(`Quiet ${suffix}`);
    expect((await catalogue.getOne(quietProduct, false, asUser(viewer)))?.addedByOrganizationName).toBe(ANONYMOUS_CONTRIBUTOR);
  });

  it("registrations and history do not reveal an anonymous contributor either", async () => {
    await regs.create(asUser(quiet), productTarget(quietProduct), { authority: "NATIONAL", referenceNumber: `N-${suffix}` });
    const seen = await regs.list(asUser(viewer), productTarget(quietProduct));
    expect(seen[0].contributedByOrganizationName).toBe(ANONYMOUS_CONTRIBUTOR);
    const history = await catalogue.getHistory(quietProduct, false, asUser(viewer));
    expect(history.every((h) => h.changedByOrganizationName !== `Quiet ${suffix}`)).toBe(true);
    expect(history.every((h) => h.changedByName === null || h.changedByOrganizationName === null)).toBe(true);
  });
});
