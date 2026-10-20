import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { PartnerScorecardService } from "../src/quality/partner-scorecard.service";
import { ScorecardSettingsService } from "../src/quality/scorecard-settings.service";

describe("Scorecard settings and partner scorecard", () => {
  const suffix = randomUUID().slice(0, 8);
  const settings = new ScorecardSettingsService();
  const scorecard = new PartnerScorecardService();
  let org: string; let other: string; let partnerId: string;
  const as = (organizationId: string, permissions: string[]): RequestUser => ({
    id: randomUUID(), organizationId, homeOrganizationId: organizationId, email: "s@example.com", forename: "S", surname: "T",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions,
  });

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `S Org ${suffix}`, slug: `s-org-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    other = (await createOrganizationWithDefaultRoles({ name: `S Other ${suffix}`, slug: `s-oth-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    await withTenantContext(org, async (tx) => {
      partnerId = (await tx.partner.create({ data: { organizationId: org, name: `Scored ${suffix}`, normalizedName: `scored ${suffix}`, approvalStatus: "APPROVED" } })).id;
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("starts on the platform defaults and shows who may edit", async () => {
    const s = await settings.get(as(org, ["partners.approve"]));
    expect(s).toMatchObject({ onTimeGood: 95, otifGood: 90, earlyDays: 30, lateDays: 5, isCustom: false, canEdit: true });
    expect((await settings.get(as(org, []))).canEdit).toBe(false);
  });

  it("needs the approve permission, validates, saves, audits, and stays private to the organisation", async () => {
    await expect(settings.update(as(org, []), { otifGood: 85 })).rejects.toThrow(/Missing permission/);
    await expect(settings.update(as(org, ["partners.approve"]), { otifGood: 70 })).rejects.toThrow(/warning level must be lower/);
    const u = as(org, ["partners.approve"]);
    const saved = await settings.update(u, { otifGood: 92, lateDays: 7, reason: "Funder contract" });
    expect(saved).toMatchObject({ otifGood: 92, lateDays: 7, isCustom: true });
    const log = await withTenantContext(org, (tx) => tx.fieldChangeLog.findMany({ where: { tableName: "quality_scorecard_settings" } }));
    expect(log.map((l) => l.fieldName).sort()).toEqual(["lateDays", "otifGood"]);
    expect(log[0].reason).toBe("Funder contract");
    expect((await settings.get(as(other, []))).otifGood).toBe(90);
    expect((await settings.reset(u))).toMatchObject({ otifGood: 90, lateDays: 5 });
  });

  it("builds a scorecard from what exists and says how much data is behind it", async () => {
    const sc = await scorecard.get(as(org, []), partnerId);
    expect(sc.partnerName).toContain("Scored");
    expect(sc.includesComplaints).toBe(false);
    expect(sc.metrics.some((m) => m.key === "complaints_upheld")).toBe(false);
    expect(sc.metrics.find((m) => m.key === "approval")?.score).toBe(100);
    expect(sc.coverage).toBeGreaterThan(0);
    expect(sc.headline.length).toBeLessThanOrEqual(4);
    const withComplaints = await scorecard.get(as(org, ["quality.complaints.view"]), partnerId);
    expect(withComplaints.includesComplaints).toBe(true);
    expect(withComplaints.metrics.some((m) => m.key === "complaints_upheld")).toBe(true);
    await expect(scorecard.get(as(other, []), partnerId)).rejects.toThrow(/not found/i);
  });
});
