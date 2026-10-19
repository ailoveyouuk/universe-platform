import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProjectsService } from "../src/projects/projects.service";
import { deliveryCountryColumns } from "../src/projects/delivery-countries";

/** Per-line destination within a multi-country project (2026-10-19). */
describe("Project line destination", () => {
  const suffix = randomUUID().slice(0, 8);
  const projects = new ProjectsService({} as never);
  let orgId: string;
  let projectId: string;
  const user = (): RequestUser => ({
    id: randomUUID(), organizationId: orgId, homeOrganizationId: orgId, email: `x-${suffix}@example.com`, forename: "T", surname: "T", organizationName: "x",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["projects.view", "projects.edit", "projects.financials.view"],
  });

  beforeAll(async () => {
    orgId = (await createOrganizationWithDefaultRoles({ name: `Dest ${suffix}`, slug: `dest-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const p = await tx.project.create({ data: { organizationId: orgId, referenceNumber: `DST-${suffix}`, title: "Multi", category: "PROCUREMENT", projectType: "PHARMACEUTICAL", ...deliveryCountryColumns(["KE", "GH"]) } });
      projectId = p.id;
    });
  });

  it("accepts a destination that is one of the project's countries and refuses others", async () => {
    const ok = await projects.addLine(user(), projectId, { clientProductDescription: "A", destinationCountryCode: "gh" });
    expect(ok.lines.find((l) => l.clientProductDescription === "A")?.destinationCountryCode).toBe("GH");
    await expect(projects.addLine(user(), projectId, { clientProductDescription: "B", destinationCountryCode: "US" })).rejects.toThrow(/not one of this project's delivery countries/);
  });

  it("clears a line's destination when the project no longer delivers there", async () => {
    await projects.update(user(), projectId, { deliveryCountryCodes: ["KE"] });
    const detail = await projects.findOne(user(), projectId);
    expect(detail.deliveryCountryCodes).toEqual(["KE"]);
    expect(detail.lines.find((l) => l.clientProductDescription === "A")?.destinationCountryCode).toBeNull();
    const rows = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({ where: { projectId } }));
    expect(rows.every((r) => r.destinationCountryCode === null)).toBe(true);
  });
});
