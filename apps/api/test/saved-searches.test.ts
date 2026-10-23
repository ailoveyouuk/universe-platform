import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { matchesNetworkCriteria, type NetworkSubject } from "../src/supplier-directory/network-criteria";
import { NetworkSearchesService } from "../src/supplier-directory/network-searches.service";
import { matchesSavedSearch } from "../src/tenders/eligibility";
import type { RequestUser } from "../src/auth/entra-auth.guard";

const sfx = randomUUID().slice(0, 8);
const org: NetworkSubject = {
  name: "Acme Pharma", type: "MANUFACTURER", description: "Antimalarial tablets", principalManufacturers: null,
  scope: ["pharma-antimalarials"], countryCodes: ["KE", "UG"], certificationTypes: ["GMP", "ISO_9001"],
  whoPrequalified: true, localManufacturer: false, yearsInOperation: 12, warehousing: "OWN",
};

describe("saved supplier search matching", () => {
  it("applies the same semantics as the filters: any-of scope and country, all-of certifications", () => {
    expect(matchesNetworkCriteria({ scope: ["pharma-antibiotics", "pharma-antimalarials"] }, org)).toBe(true);
    expect(matchesNetworkCriteria({ scope: ["pharma-antibiotics"] }, org)).toBe(false);
    expect(matchesNetworkCriteria({ country: ["tz", "ke"] }, org)).toBe(true);
    expect(matchesNetworkCriteria({ country: ["TZ"] }, org)).toBe(false);
    expect(matchesNetworkCriteria({ certType: ["GMP", "ISO_9001"] }, org)).toBe(true);
    expect(matchesNetworkCriteria({ certType: ["GMP", "GDP"] }, org)).toBe(false);
    expect(matchesNetworkCriteria({ q: "antimalarial" }, org)).toBe(true);
    expect(matchesNetworkCriteria({ q: "syringe" }, org)).toBe(false);
    expect(matchesNetworkCriteria({ whoPq: true, minYears: 10, type: "MANUFACTURER" }, org)).toBe(true);
    expect(matchesNetworkCriteria({ localMfr: true }, org)).toBe(false);
    expect(matchesNetworkCriteria({ minYears: 20 }, org)).toBe(false);
    expect(matchesNetworkCriteria({ certified: true }, { ...org, certificationTypes: [] })).toBe(false);
  });
});

describe("saved tender search matching", () => {
  const t = { title: "Artemether tablets", summary: null, tenderType: "RFQ", deliveryCountryCodes: ",KE,", categories: ["Pharmaceuticals"], issuerName: "Ministry of Health Kenya", currency: "USD", scopeSubs: ["pharma-antimalarials"] };
  it("matches on issuer, currency and declared scope as well as the original filters", () => {
    expect(matchesSavedSearch({ issuer: "ministry of health" }, t)).toBe(true);
    expect(matchesSavedSearch({ issuer: "UNICEF" }, t)).toBe(false);
    expect(matchesSavedSearch({ currency: "usd" }, t)).toBe(true);
    expect(matchesSavedSearch({ currency: "EUR" }, t)).toBe(false);
    expect(matchesSavedSearch({ scopeMatch: true }, t, new Set(["pharma-antimalarials"]))).toBe(true);
    expect(matchesSavedSearch({ scopeMatch: true }, t, new Set(["pharma-antibiotics"]))).toBe(false);
    expect(matchesSavedSearch({ scopeMatch: true }, t)).toBe(false);
    expect(matchesSavedSearch({ countries: ["KE"], keyword: "artemether", currency: "USD" }, t)).toBe(true);
  });
});

describe("saved supplier searches", () => {
  const svc = new NetworkSearchesService();
  let orgA = "", orgB = "";
  const user = (organizationId: string, permissions = ["tenders.view"]) => ({ id: randomUUID(), organizationId, permissions, platformStaffRole: "NONE", inDemoOrganization: false, forename: "T", surname: "A", email: "t@example.org" }) as unknown as RequestUser;
  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Search A ${sfx}`, slug: `search-a-${sfx}`, type: "SUPPLIER" } as never)).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Search B ${sfx}`, slug: `search-b-${sfx}`, type: "SUPPLIER" } as never)).id;
  });
  afterAll(async () => {
    for (const id of [orgA, orgB]) await withPlatformStaffContext((tx: any) => tx.networkSavedSearch.deleteMany({ where: { organizationId: id } }));
  });

  it("saves, lists, toggles alerts and deletes, keeps organisations apart, and refuses an empty search", async () => {
    const a = user(orgA);
    await expect(svc.save(a, { name: "Nothing" } as never)).rejects.toThrow(/at least one filter/);
    const { id } = await svc.save(a, { name: "Kenyan antimalarials", country: ["ke"], scope: ["pharma-antimalarials"], certType: ["GMP"] } as never);
    const rows = await svc.list(a);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Kenyan antimalarials", alertsEnabled: true, criteria: { country: ["KE"], scope: ["pharma-antimalarials"], certType: ["GMP"] } });
    expect(await svc.list(user(orgB))).toEqual([]);
    expect((await svc.update(user(orgB), id, { alertsEnabled: false })).updated).toBe(false);
    expect((await svc.update(a, id, { alertsEnabled: false, name: "Renamed" })).updated).toBe(true);
    expect((await svc.list(a))[0]).toMatchObject({ name: "Renamed", alertsEnabled: false });
    await svc.remove(user(orgB), id);
    expect(await svc.list(a)).toHaveLength(1);
    await svc.remove(a, id);
    expect(await svc.list(a)).toEqual([]);
    await expect(svc.list(user(orgA, []))).rejects.toThrow();
  });
});

describe("certification expiry reminder stages", () => {
  it("picks the nearest stage reached", async () => {
    const { certReminderStage } = await import("../../../packages/db/src/cert-expiry");
    expect(certReminderStage(200)).toBeNull();
    expect(certReminderStage(90)?.key).toBe("D90");
    expect(certReminderStage(31)?.key).toBe("D90");
    expect(certReminderStage(30)?.key).toBe("D30");
    expect(certReminderStage(7)?.key).toBe("D7");
    expect(certReminderStage(0)?.key).toBe("D7");
    expect(certReminderStage(-1)?.key).toBe("EXPIRED");
  });
});
