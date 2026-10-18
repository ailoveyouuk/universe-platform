import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext } from "@universe/db";
import { beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProjectsService } from "../src/projects/projects.service";
import { deliveryCountryColumns } from "../src/projects/delivery-countries";

/** Dashboard "Delivery countries" tile: per-country counts and the five most recent/active projects (2026-10-18). */
describe("Project country overview", () => {
  const suffix = randomUUID().slice(0, 8);
  const projects = new ProjectsService({} as never);
  let orgA: string;
  let orgB: string;
  const asUser = (organizationId: string): RequestUser => ({
    id: randomUUID(), organizationId, homeOrganizationId: organizationId, email: `x-${suffix}@example.com`, forename: "T", surname: "T", organizationName: "x",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: [],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Co A ${suffix}`, slug: `co-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Co B ${suffix}`, slug: `co-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const make = (org: string, n: string, status: string, codes: string[], extra: Record<string, unknown> = {}) =>
        tx.project.create({ data: { organizationId: org, referenceNumber: `CO-${suffix}-${n}`, title: `Country project ${n}`, category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status, ...deliveryCountryColumns(codes), ...extra } });
      // Seven Kenyan projects (two finished), one shared Kenya+Ghana project, one archived, one other-organisation.
      for (let i = 0; i < 5; i++) await make(orgA, `ke${i}`, "IN_PROGRESS", ["KE"]);
      await make(orgA, "ke-done1", "COMPLETED", ["KE"]);
      await make(orgA, "ke-done2", "COMPLETED", ["KE"]);
      await make(orgA, "multi", "IDENTIFIED", ["GH", "KE"]);
      await make(orgA, "archived", "IN_PROGRESS", ["GH"], { isArchived: true });
      await make(orgB, "other", "IN_PROGRESS", ["KE"]);
    });
  });

  it("counts every destination, puts live projects first and caps each country at five", async () => {
    const rows = await projects.countryOverview(asUser(orgA));
    const ke = rows.find((r) => r.countryCode === "KE");
    const gh = rows.find((r) => r.countryCode === "GH");
    expect(ke?.projectCount).toBe(8);
    expect(ke?.liveCount).toBe(6);
    expect(ke?.projects).toHaveLength(5);
    expect(ke?.projects.every((p) => p.status !== "COMPLETED")).toBe(true);
    expect(gh?.projectCount).toBe(1); // the multi-country project; the archived one is excluded
    expect(gh?.projects[0]?.referenceNumber).toBe(`CO-${suffix}-multi`);
  });

  it("never includes another organisation's projects", async () => {
    const rows = await projects.countryOverview(asUser(orgA));
    const all = rows.flatMap((r) => r.projects.map((p) => p.referenceNumber));
    expect(all).not.toContain(`CO-${suffix}-other`);
    const b = await projects.countryOverview(asUser(orgB));
    expect(b.find((r) => r.countryCode === "KE")?.projectCount).toBe(1);
  });
});
