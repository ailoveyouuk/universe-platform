import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { convertAmount, effectiveLimit } from "../src/tenders/tender-framework";
import { TenderApprovalAuthority } from "../src/tenders/tender-approval-authority";
import { TenderFrameworkService } from "../src/tenders/tender-framework.service";
import { TendersService } from "../src/tenders/tenders.service";
import { TenderPerformanceService } from "../src/tenders/tender-performance.service";

describe("Approval limits by role and currency: rules", () => {
  it("takes the highest limit among held roles, else the default", () => {
    expect(effectiveLimit(25000, [])).toBe(25000);
    expect(effectiveLimit(25000, [5000, 100000, 40000])).toBe(100000);
    expect(effectiveLimit(25000, [5000])).toBe(5000);
  });
  it("converts through the USD table and refuses when a currency is unknown", () => {
    const rates = { GBP: 0.8, EUR: 0.9 };
    expect(convertAmount(100, "GBP", "GBP", rates)).toBe(100);
    expect(convertAmount(80, "GBP", "USD", rates)).toBe(100);
    expect(convertAmount(80, "GBP", "EUR", rates)).toBe(90);
    expect(convertAmount(100, "GBP", "JPY", rates)).toBeNull();
    expect(convertAmount(100, "GBP", "USD", null)).toBeNull();
  });
});

describe("Approval limits by role and currency: settings and authority", () => {
  const suffix = randomUUID().slice(0, 8);
  const authority = new TenderApprovalAuthority();
  const fw = new TenderFrameworkService(new TendersService(), new TenderPerformanceService(new TendersService()), authority);
  let org: string; let buyer: string; let head: string; let plain: string; let buyerRole: string; let headRole: string;
  const as = (id: string): RequestUser => ({
    id, organizationId: org, homeOrganizationId: org, email: `a-${id.slice(0, 6)}@example.com`, forename: "T", surname: "U",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["tenders.view", "tenders.award"],
  });

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `AL ${suffix}`, slug: `al-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    await withPlatformStaffContext(async (tx) => {
      const mk = async (t: string) => (await tx.user.create({ data: { organizationId: org, email: `${t}-${suffix}@example.com`, forename: t, surname: "L", status: "ACTIVE", entraObjectId: randomUUID() } as never })).id;
      buyer = await mk("buyer"); head = await mk("head"); plain = await mk("plain");
      buyerRole = (await tx.role.create({ data: { organizationId: org, name: `Buyer ${suffix}`, appScope: "*" } })).id;
      headRole = (await tx.role.create({ data: { organizationId: org, name: `Head ${suffix}`, appScope: "*" } })).id;
      await tx.userRole.create({ data: { userId: buyer, roleId: buyerRole } });
      await tx.userRole.create({ data: { userId: head, roleId: headRole } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("saves role limits and a currency, then reads each person's own authority", async () => {
    const s = await fw.saveSettings(as(buyer), { individualLimit: 25000, splitWindowDays: 30, limitCurrency: "usd", roleLimits: [{ roleId: buyerRole, limit: 5000 }, { roleId: headRole, limit: 200000 }] });
    expect(s.limitCurrency).toBe("USD");
    expect(s.roleLimits.map((r) => r.limit).sort((a, b) => a - b)).toEqual([5000, 200000]);
    expect(s.availableRoles.some((r) => r.id === buyerRole)).toBe(true);
    const read = (id: string) => withTenantContext(org, (tx) => authority.authorityOf(tx, org, id, "USD"));
    expect((await read(buyer)).limit).toBe(5000);
    expect((await read(head)).limit).toBe(200000);
    expect((await read(plain)).limit).toBe(25000);
    const a = await read(buyer);
    expect(authority.within(a, 4999)).toBe(true);
    expect(authority.within(a, 5001)).toBe(false);
    expect(authority.explain(a, 9000, "USD", "This award")).toMatch(/above your approval limit of 5,000 USD/);
  });

  it("will not read a limit across currencies without a rate, and treats that as outside the limit", async () => {
    const a = await withTenantContext(org, (tx) => authority.authorityOf(tx, org, buyer, "EUR"));
    expect(a.inTenderCurrency).toBeNull();
    expect(authority.within(a, 1)).toBe(false);
    expect(a.rateNote).toMatch(/No exchange rate/);
  });

  it("refuses a role from another organisation and removes limits left out of a later save", async () => {
    await expect(fw.saveSettings(as(buyer), { individualLimit: 1, splitWindowDays: 30, roleLimits: [{ roleId: randomUUID(), limit: 1 }] })).rejects.toThrow(/not found/);
    const s = await fw.saveSettings(as(buyer), { individualLimit: 25000, splitWindowDays: 30, roleLimits: [{ roleId: headRole, limit: 300000 }] });
    expect(s.roleLimits).toHaveLength(1);
    expect(s.limitCurrency).toBeNull();
  });
});
