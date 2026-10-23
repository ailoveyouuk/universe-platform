import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NetworkSearchesService } from "../src/supplier-directory/network-searches.service";
import { runCertExpiryReminders } from "../../../packages/db/src/cert-expiry";

/** In-app alerts end to end, against the real RLS database: supplier-search alerts on publish, and certification expiry reminders. */
describe("alerts", () => {
  const sfx = randomUUID().slice(0, 8);
  const svc = new NetworkSearchesService();
  let searcher = "", otherSearcher = "", publisher = "";
  let userS = "", userO = "";
  const orgs = () => [searcher, otherSearcher, publisher];

  async function userIn(orgId: string, tag: string) {
    return withPlatformStaffContext(async (tx: any) => {
      const u = await tx.user.create({ data: { organizationId: orgId, email: `${tag}-${sfx}@example.com`, forename: tag, surname: "T", status: "ACTIVE", entraObjectId: `oid-${tag}-${sfx}` } });
      const role = await tx.role.findFirst({ where: { organizationId: orgId, rolePermissions: { some: { permission: { key: "org.profile.manage" } } } } });
      if (role) await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
      return u.id as string;
    });
  }
  const notesFor = (userId: string, kind: string) => withPlatformStaffContext((tx: any) => tx.notification.findMany({ where: { recipientUserId: userId, kind } }));

  beforeAll(async () => {
    searcher = (await createOrganizationWithDefaultRoles({ name: `Alert S ${sfx}`, slug: `alert-s-${sfx}`, type: "SUPPLIER" } as never)).id;
    otherSearcher = (await createOrganizationWithDefaultRoles({ name: `Alert O ${sfx}`, slug: `alert-o-${sfx}`, type: "SUPPLIER" } as never)).id;
    publisher = (await createOrganizationWithDefaultRoles({ name: `Alert P ${sfx}`, slug: `alert-p-${sfx}`, type: "SUPPLIER" } as never)).id;
    userS = await userIn(searcher, "s");
    userO = await userIn(otherSearcher, "o");
    await withPlatformStaffContext(async (tx: any) => {
      await tx.networkSavedSearch.create({ data: { organizationId: searcher, name: "KE antimalarials", criteriaJson: JSON.stringify({ country: ["KE"], scope: ["pharma-antimalarials"] }), alertsEnabled: true } });
      await tx.networkSavedSearch.create({ data: { organizationId: otherSearcher, name: "Alerts off", criteriaJson: JSON.stringify({ country: ["KE"] }), alertsEnabled: false } });
      await tx.supplierProfile.create({ data: { organizationId: publisher, description: "Antimalarials", publishedAt: new Date() } });
      await tx.organizationScope.create({ data: { organizationId: publisher, scopeSubId: "pharma-antimalarials" } });
      await tx.country.upsert({ where: { code: "KE" }, update: {}, create: { code: "KE", name: "Kenya", regionCode: "AF" } });
      await tx.organizationCountryPresence.create({ data: { organizationId: publisher, countryCode: "KE" } });
      await tx.organizationCertification.create({ data: { organizationId: searcher, type: "GMP", title: "GMP certificate", expiresOn: new Date(Date.now() + 20 * 86_400_000) } });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx: any) => {
      await tx.notification.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.networkSavedSearch.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.organizationCertification.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.organizationCountryPresence.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.organizationScope.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.supplierProfile.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.userRole.deleteMany({ where: { userId: { in: [userS, userO] } } });
      await tx.user.deleteMany({ where: { id: { in: [userS, userO] } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: orgs() } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: orgs() } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: orgs() } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: orgs() } } });
    await prisma.$disconnect();
  });

  it("tells an organisation with a matching alert-enabled search when a new supplier publishes, and nobody else", async () => {
    await svc.alertOnPublish(publisher);
    const hits = await notesFor(userS, "SUPPLIER_MATCH");
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toContain("KE antimalarials");
    expect(await notesFor(userO, "SUPPLIER_MATCH")).toHaveLength(0);
  });

  it("sends each certification expiry reminder once", async () => {
    const first = await runCertExpiryReminders();
    expect(first.created).toBeGreaterThanOrEqual(1);
    const notes = await notesFor(userS, "CERT_EXPIRY");
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toContain("expires within 30 days");
    await runCertExpiryReminders();
    expect(await notesFor(userS, "CERT_EXPIRY")).toHaveLength(1);
  });
});
