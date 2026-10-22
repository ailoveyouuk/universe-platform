import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext } from "@universe/db";
import { beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { SupplierPortalService } from "../src/supplier-portal/supplier-portal.service";
import { TendersService } from "../src/tenders/tenders.service";

/** The Supplier Portal home lists an invited, open tender for the invited supplier only, and refuses a user without tenders.view. */
describe("Supplier Portal dashboard", () => {
  const suffix = randomUUID().slice(0, 8);
  const portal = new SupplierPortalService();
  const tenders = new TendersService();
  let buyer = "", supplierA = "", supplierB = "", buyerUser = "", userA = "", userB = "", tenderId = "";
  const as = (organizationId: string, id: string, permissions = ["tenders.view", "tenders.bid", "tenders.issue"]): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `sp-${id.slice(0, 6)}@example.com`, forename: "Sup", surname: "Tester",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions,
  });

  beforeAll(async () => {
    buyer = (await createOrganizationWithDefaultRoles({ name: `SP Buyer ${suffix}`, slug: `sp-buy-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    supplierA = (await createOrganizationWithDefaultRoles({ name: `SP Supplier A ${suffix}`, slug: `sp-a-${suffix}`, type: "SUPPLIER" })).id;
    supplierB = (await createOrganizationWithDefaultRoles({ name: `SP Supplier B ${suffix}`, slug: `sp-b-${suffix}`, type: "SUPPLIER" })).id;
    await withPlatformStaffContext(async (tx) => {
      const mk = async (organizationId: string, tag: string) => (await tx.user.create({ data: { organizationId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Portal", status: "ACTIVE" } as never })).id;
      buyerUser = await mk(buyer, "buyer"); userA = await mk(supplierA, "usera"); userB = await mk(supplierB, "userb");
    });
    const closing = new Date(Date.now() + 10 * 86_400_000);
    tenderId = (await tenders.create(as(buyer, buyerUser), { title: `Portal tender ${suffix}`, closingAt: closing.toISOString(), tenderType: "RFQ", currency: "USD" } as never)).id;
    await withPlatformStaffContext(async (tx) => {
      await tx.tender.update({ where: { id: tenderId }, data: { status: "PUBLISHED", isPublished: true, publishedAt: new Date(), closingAt: closing } });
      await tx.tenderInvitation.create({ data: { organizationId: buyer, tenderId, invitedOrganizationId: supplierA } });
    });
  });

  it("shows the invited supplier its invitation, due at the closing time", async () => {
    const d = await portal.dashboard(as(supplierA, userA));
    const inv = d.items.filter((i) => i.kind === "INVITATION");
    expect(inv.length).toBe(1);
    expect(inv[0].path).toBe(`/discover/view?id=${tenderId}`);
    expect(d.totals.waiting).toBeGreaterThanOrEqual(1);
  });
  it("shows another supplier nothing from it", async () => {
    const d = await portal.dashboard(as(supplierB, userB));
    expect(d.items.some((i) => i.kind === "INVITATION")).toBe(false);
  });
  it("refuses a user without tenders.view", async () => {
    await expect(portal.dashboard(as(supplierA, userA, []))).rejects.toThrow();
  });
});
