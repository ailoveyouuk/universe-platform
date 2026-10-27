import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmNetworkService } from "../src/crm/crm-network.service";

/** Universe network: adding a published organisation, the identity gate and the five-organisation floor, against the real database. */
describe("CRM Universe network", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmNetworkService();
  const orgIds: string[] = []; const userIds: string[] = []; const entryIds: string[] = [];
  let me: RequestUser; let pub: string; let hidden: string; let manyEntry: string; let fewEntry: string;

  beforeAll(async () => {
    const a = await createOrganizationWithDefaultRoles({ name: `Net A ${suffix}`, slug: `net-a-${suffix}` }); orgIds.push(a.id);
    const user = await withPlatformStaffContext((tx) => tx.user.create({ data: { organizationId: a.id, email: `net-${suffix}@example.com`, forename: "Net", surname: "Tester", status: "ACTIVE", entraObjectId: `oid-net-${suffix}` } }));
    userIds.push(user.id);
    me = { id: user.id, organizationId: a.id, homeOrganizationId: a.id, email: user.email, forename: "Net", surname: "Tester", organizationName: "x", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions: ["crm.view", "crm.manage"], apps: null } as RequestUser;
    await withPlatformStaffContext(async (tx) => {
      const mk = async (name: string, published: boolean) => {
        const o = await tx.organization.create({ data: { name, slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${suffix}`, type: "SUPPLIER" } }); orgIds.push(o.id);
        await tx.supplierProfile.create({ data: { organizationId: o.id, publishedAt: published ? new Date() : null, description: "Simulated" } });
        return o.id;
      };
      pub = await mk(`Publicco ${suffix}`, true); hidden = await mk(`Hiddenco ${suffix}`, false);
      const entry = async (name: string, holders: number) => {
        const e = await tx.stakeholderRegistryEntry.create({ data: { legalName: name, normalizedName: name.toLowerCase(), stakeholderTypes: JSON.stringify(["SUPPLIER"]), isSimulated: false, ...(name.startsWith("Many") ? { linkedOrganizationId: pub } : {}) } }); entryIds.push(e.id);
        for (let i = 0; i < holders; i++) {
          const o = await tx.organization.create({ data: { name: `Holder ${name} ${i} ${suffix}`, slug: `h-${name.slice(0, 4)}-${i}-${suffix}`.toLowerCase().replace(/\W+/g, "-"), type: "PROCUREMENT_SERVICE_AGENT" } }); orgIds.push(o.id);
          const p = await tx.partner.create({ data: { organizationId: o.id, name, normalizedName: name.toLowerCase(), registryEntryId: e.id, roles: { create: [{ roleType: "SUPPLIER" }] } } });
          void p;
        }
        return e.id;
      };
      manyEntry = await entry(`Many ${suffix}`, 6); fewEntry = await entry(`Few ${suffix}`, 2);
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: orgIds };
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationship.deleteMany({ where: { organizationId: orgs } });
      await tx.partnerRole.deleteMany({ where: { partner: { organizationId: orgs } } });
      await tx.partner.deleteMany({ where: { organizationId: orgs } });
      await tx.stakeholderRegistryEntry.deleteMany({ where: { OR: [{ id: { in: entryIds } }, { linkedOrganizationId: { in: orgIds } }] } });
      await tx.supplierProfile.deleteMany({ where: { organizationId: orgs } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: orgs } } });
      await tx.role.deleteMany({ where: { organizationId: orgs } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: orgs } });
    });
  });

  it("finds only organisations that published a profile", async () => {
    expect((await svc.searchOrganisations(me, `Publicco ${suffix}`)).map((o) => o.organizationId)).toEqual([pub]);
    expect(await svc.searchOrganisations(me, `Hiddenco ${suffix}`)).toEqual([]);
  });

  it("adds a published organisation once and refuses an unpublished one", async () => {
    const r1 = await svc.addFromOrganisation(me, pub);
    expect(r1.created).toBe(true);
    const r2 = await svc.addFromOrganisation(me, pub);
    expect(r2).toEqual({ relationshipId: r1.relationshipId, created: false });
    await expect(svc.addFromOrganisation(me, hidden)).rejects.toBeInstanceOf(NotFoundException);
    const found = await svc.searchOrganisations(me, `Publicco ${suffix}`);
    expect(found[0].trackedRelationshipId).toBe(r1.relationshipId);
  });

  it("shows anonymous counts at or above the floor, and identity for a published profile", async () => {
    const r = await svc.addFromOrganisation(me, pub);
    // Point my partner at the entry others hold, linked to the published organisation.
    await withPlatformStaffContext(async (tx) => { const rel = await tx.crmRelationship.findUnique({ where: { id: r.relationshipId } }); await tx.partner.update({ where: { id: rel!.partnerId! }, data: { registryEntryId: manyEntry } }); });
    const panel = await svc.panel(me, r.relationshipId);
    expect(panel.otherOrganisations).toBe(6);
    expect(panel.belowFloor).toBe(false);
    expect(panel.identityPublic).toBe(true);
    expect(panel.organization?.name).toContain("Publicco");
  });

  it("hides the figure below the floor and withholds identity when unpublished", async () => {
    const r = await withPlatformStaffContext(async (tx) => {
      const p = await tx.partner.create({ data: { organizationId: me.organizationId, name: `Fewer ${suffix}`, normalizedName: `fewer ${suffix}`, registryEntryId: fewEntry } });
      return tx.crmRelationship.create({ data: { organizationId: me.organizationId, partnerId: p.id, counterpartyKey: `partner:${p.id}` } });
    });
    const panel = await svc.panel(me, r.id);
    expect(panel.linked).toBe(true);
    expect(panel.otherOrganisations).toBeNull();
    expect(panel.belowFloor).toBe(true);
    expect(panel.identityPublic).toBe(false);
    expect(panel.organization).toBeNull();
    void prisma;
  });
});
