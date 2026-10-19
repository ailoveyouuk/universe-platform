import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext } from "@universe/db";
import { beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { OrganisationExportsService } from "../src/data-exports/organisation-exports.service";

/** Own-organisation exports of batches, risks and contacts (2026-10-19): own rows only, audited. */
describe("Own-organisation exports: batches, risks, contacts", () => {
  const suffix = randomUUID().slice(0, 8);
  const service = new OrganisationExportsService();
  let orgA: string;
  let orgB: string;
  const asUser = (organizationId: string): RequestUser => ({
    id: randomUUID(), organizationId, homeOrganizationId: organizationId, email: `x-${suffix}@example.com`, forename: "T", surname: "T", organizationName: "x",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: [],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Ox A ${suffix}`, slug: `ox-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Ox B ${suffix}`, slug: `ox-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      await tx.productBatch.create({ data: { organizationId: orgA, batchNumber: `BATCH-A-${suffix}`, status: "ACTIVE" } });
      await tx.productBatch.create({ data: { organizationId: orgB, batchNumber: `BATCH-B-${suffix}`, status: "ACTIVE" } });
      await tx.riskAssessment.create({ data: { organizationId: orgA, subjectType: "PROJECT", subjectId: randomUUID(), title: `Risk A ${suffix}`, severity: "HIGH", likelihood: "LIKELY", status: "OPEN" } });
    });
  });

  it("exports only the caller's own batches", async () => {
    const a = await service.export(asUser(orgA), "batches", false);
    expect(a.csv).toContain(`BATCH-A-${suffix}`);
    expect(a.csv).not.toContain(`BATCH-B-${suffix}`);
    const b = await service.export(asUser(orgB), "batches", false);
    expect(b.csv).toContain(`BATCH-B-${suffix}`);
    expect(b.csv).not.toContain(`BATCH-A-${suffix}`);
  });

  it("exports the risk register and keeps it private to the organisation", async () => {
    expect((await service.export(asUser(orgA), "risks", false)).csv).toContain(`Risk A ${suffix}`);
    expect((await service.export(asUser(orgB), "risks", false)).csv).not.toContain(`Risk A ${suffix}`);
  });

  it("refuses an unknown export type", async () => {
    await expect(service.export(asUser(orgA), "secrets", false)).rejects.toThrow(/Unknown export/);
  });
});
