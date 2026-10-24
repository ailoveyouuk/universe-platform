import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { TendersService } from "../src/tenders/tenders.service";

/** "A new tender matches your saved search": publishing a tender alerts the right organisations and nobody else (2026-10-24). */
describe("Tender publish alerts", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new TendersService();
  let issuer: string; let issuerUser: string;
  const orgs: Record<string, { id: string; user: string }> = {};

  const asIssuer = (over: Partial<RequestUser> = {}): RequestUser => ({
    id: issuerUser, organizationId: issuer, homeOrganizationId: issuer, email: `iss-${suffix}@example.com`, forename: "Issuer", surname: "T",
    organizationName: "Issuer", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["tenders.view", "tenders.issue"], ...over,
  });
  const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  /** An organisation with one user who can view tenders, and optionally a saved search. */
  const watcher = async (tag: string, criteria: Record<string, unknown> | null, alertsEnabled = true) => {
    const org = await createOrganizationWithDefaultRoles({ name: `PA ${tag} ${suffix}`, slug: `pa-${tag}-${suffix}`, type: "SUPPLIER" });
    const user = await withPlatformStaffContext(async (tx) => {
      const u = await tx.user.create({ data: { organizationId: org.id, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "W", status: "ACTIVE", entraObjectId: `oid-pa-${tag}-${suffix}` } });
      const perm = await tx.permission.upsert({ where: { key: "tenders.view" }, update: {}, create: { key: "tenders.view", description: "Browse tenders" } });
      const role = await tx.role.create({ data: { organizationId: org.id, name: `Viewer ${tag} ${suffix}`, appScope: "*" } });
      await tx.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
      await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
      return u.id;
    });
    if (criteria) await withTenantContext(org.id, (tx) => tx.tenderSavedSearch.create({ data: { organizationId: org.id, name: `Search ${tag}`, criteriaJson: JSON.stringify(criteria), alertsEnabled } }));
    orgs[tag] = { id: org.id, user };
    return orgs[tag];
  };

  const matchesFor = (tag: string, tenderId: string) =>
    withPlatformStaffContext((tx) => tx.notification.findMany({ where: { recipientUserId: orgs[tag].user, kind: "TENDER_MATCH", subjectId: tenderId } }));

  const draft = async (u: RequestUser, over: Record<string, unknown> = {}, country = "KE") => {
    const t = await svc.create(u, { title: `Artemether supply ${suffix}`, closingAt: future(30), tenderType: "RFQ", currency: "USD", deliveryCountryCodes: `,${country},`, ...over } as never);
    await svc.setLines(u, t.id, { lines: [{ description: "Artemether/lumefantrine 20/120 mg", quantity: 1000, unit: "pack", destinationCountryCode: country }] });
    await svc.setCriteria(u, t.id, { criteria: [{ title: "Price", kind: "SCORED", weight: 100 }] });
    await svc.setRules(u, t.id, { rules: [] });
    return t;
  };

  beforeAll(async () => {
    issuer = (await createOrganizationWithDefaultRoles({ name: `PA Issuer ${suffix}`, slug: `pa-iss-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    await withPlatformStaffContext(async (tx) => {
      for (const [code, name] of [["KE", "Kenya"], ["TZ", "Tanzania"]]) await tx.country.upsert({ where: { code }, update: {}, create: { code, name, regionCode: "AF" } }).catch(() => undefined);
      issuerUser = (await tx.user.create({ data: { organizationId: issuer, email: `iss-${suffix}@example.com`, forename: "Issuer", surname: "T", status: "ACTIVE", entraObjectId: `oid-pa-iss-${suffix}` } })).id;
    });
    await watcher("match", { countries: ["KE"], keyword: "artemether" });
    await watcher("wrongcountry", { countries: ["TZ"] });
    await watcher("alertsoff", { countries: ["KE"] }, false);
    await watcher("wrongtype", { types: ["RFP"] });
    await watcher("nosearch", null);
    await watcher("invited", { countries: ["KE"] });
    // The issuer's own search must never alert itself.
    await withTenantContext(issuer, (tx) => tx.tenderSavedSearch.create({ data: { organizationId: issuer, name: "Own", criteriaJson: JSON.stringify({ countries: ["KE"] }), alertsEnabled: true } }));
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("alerts only organisations whose alert-enabled saved search matches, with a link to the tender", async () => {
    const u = asIssuer();
    const t = await draft(u);
    await svc.publish(u, t.id);
    const hit = await matchesFor("match", t.id);
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ organizationId: orgs.match.id, category: "TENDER", title: 'New tender matches "Search match"', link: `/tenders/detail?id=${t.id}` });
    expect(hit[0].body).toContain(t.referenceNumber);
    for (const tag of ["wrongcountry", "alertsoff", "wrongtype", "nosearch"]) expect(await matchesFor(tag, t.id)).toHaveLength(0);
  });

  it("never alerts the issuer's own organisation", async () => {
    const own = await withPlatformStaffContext((tx) => tx.notification.count({ where: { organizationId: issuer, kind: "TENDER_MATCH" } }));
    expect(own).toBe(0);
  });

  it("tells an invited organisation about the invitation, not as a search match", async () => {
    const u = asIssuer();
    const t = await draft(u, { visibility: "INVITED_ONLY" });
    await svc.invite(u, t.id, { organizationIds: [orgs.invited.id] } as never);
    await svc.publish(u, t.id);
    expect(await matchesFor("invited", t.id)).toHaveLength(0);
    const invites = await withPlatformStaffContext((tx) => tx.notification.findMany({ where: { recipientUserId: orgs.invited.user, kind: "TENDER_INVITED", subjectId: t.id } }));
    expect(invites).toHaveLength(1);
  });

  it("does not alert anyone when a demonstration organisation publishes", async () => {
    const u = asIssuer({ inDemoOrganization: true });
    const t = await draft(u);
    await svc.publish(u, t.id);
    for (const tag of ["match", "alertsoff"]) expect(await matchesFor(tag, t.id)).toHaveLength(0);
  });

  it("a tender in another country does not alert a search for Kenya", async () => {
    const u = asIssuer();
    const t = await draft(u, {}, "TZ");
    await svc.publish(u, t.id);
    expect(await matchesFor("match", t.id)).toHaveLength(0);
    expect(await matchesFor("wrongcountry", t.id)).toHaveLength(1);
  });
});
