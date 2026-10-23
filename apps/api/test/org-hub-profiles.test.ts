import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupplierDirectoryService } from "../src/supplier-directory/supplier-directory.service";
import { StakeholderRegistryService } from "../src/stakeholder-registry/stakeholder-registry.service";
import { OrganizationsService } from "../src/organizations/organizations.service";
import type { RequestUser } from "../src/auth/entra-auth.guard";

const sfx = randomUUID().slice(0, 8);
const dir = new SupplierDirectoryService(new StakeholderRegistryService());
const orgs = new OrganizationsService();
let orgA = "", orgB = "";
const asAdmin = (organizationId: string) =>
  ({ id: randomUUID(), organizationId, permissions: ["org.profile.manage"], platformStaffRole: "NONE", inDemoOrganization: false, forename: "T", surname: "A", email: "t@example.org" }) as unknown as RequestUser;
const noPerm = (organizationId: string) => ({ ...asAdmin(organizationId), permissions: [] }) as unknown as RequestUser;

describe("organisation hub profiles (directory and manufacturer)", () => {
  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Hub A ${sfx}`, slug: `hub-a-${sfx}`, type: "MANUFACTURER" } as never)).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Hub B ${sfx}`, slug: `hub-b-${sfx}`, type: "MANUFACTURER" } as never)).id;
  });
  afterAll(async () => {
    for (const id of [orgA, orgB]) {
      await prisma.supplierProfile.deleteMany({ where: { organizationId: id } });
      await prisma.manufacturerProfile.deleteMany({ where: { organizationId: id } });
    }
  });

  it("saves a directory profile as a draft, parses the manufacturers list, and only publishes on request", async () => {
    const admin = asAdmin(orgA);
    const empty = await dir.getOrgProfile(admin, orgA);
    expect(empty.publishedAt).toBeNull();
    const saved = await dir.upsertOrgProfile(admin, orgA, { description: "We supply things", principalManufacturersRepresented: [" Acme ", "", "Beta"], yearsInOperation: 12, warehousingCapability: "MIXED" });
    expect(saved).toMatchObject({ description: "We supply things", principalManufacturersRepresented: ["Acme", "Beta"], yearsInOperation: 12, warehousingCapability: "MIXED", publishedAt: null });
    const live = await dir.setOrgPublished(admin, orgA, true);
    expect(live.publishedAt).not.toBeNull();
    expect((await dir.setOrgPublished(admin, orgA, false)).publishedAt).toBeNull();
  });

  it("refuses publishing before the profile exists, and edits without the permission or for another organisation", async () => {
    await expect(dir.setOrgPublished(asAdmin(orgB), orgB, true)).rejects.toThrow(/Save the profile/);
    await expect(dir.upsertOrgProfile(noPerm(orgA), orgA, { description: "x" })).rejects.toThrow();
    await expect(dir.upsertOrgProfile(asAdmin(orgA), orgB, { description: "x" })).rejects.toThrow();
  });

  it("round-trips a manufacturer profile and keeps it per organisation", async () => {
    const admin = asAdmin(orgA);
    expect(await orgs.getManufacturerProfile(admin, orgA)).toBeNull();
    const saved = await orgs.upsertManufacturerProfile(admin, orgA, { whoPrequalified: true, sraApprovals: ["EMA"], nationalRegistrations: ["KE", "UG"], productionCapacitySummary: "10m units a year" });
    expect(saved).toMatchObject({ whoPrequalified: true, sraApprovals: ["EMA"], nationalRegistrations: ["KE", "UG"], isLocalManufacturer: false });
    expect(await orgs.getManufacturerProfile(asAdmin(orgB), orgB)).toBeNull();
    await expect(orgs.getManufacturerProfile(asAdmin(orgB), orgA)).rejects.toThrow();
  });
});
