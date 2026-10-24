import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { PartnerScorecardService } from "../src/quality/partner-scorecard.service";

describe("Partner scorecard: quote price, trend and the list scores", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new PartnerScorecardService();
  let org: string; let cheap: string; let dear: string;
  const user = (): RequestUser => ({
    id: randomUUID(), organizationId: org, homeOrganizationId: org, email: `s-${suffix}@example.com`, forename: "T", surname: "U",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["quality.complaints.view"],
  });

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `Sc ${suffix}`, slug: `sc-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const mk = async (n: string) => (await tx.partner.create({ data: { organizationId: org, name: `${n} ${suffix}`, normalizedName: `${n.toLowerCase()} ${suffix}`, approvalStatus: "APPROVED", roles: { create: { roleType: "SUPPLIER", isActive: true } } } })).id;
      cheap = await mk("Cheap"); dear = await mk("Dear");
      const project = await tx.project.create({ data: { organizationId: org, referenceNumber: `SC-${suffix}`, title: "Quotes", category: "PROCUREMENT", projectType: "PHARMACEUTICAL" } });
      const line = await tx.projectLine.create({ data: { organizationId: org, projectId: project.id, clientProductDescription: "Gloves", supplierId: dear } });
      await tx.supplierEnquiry.create({ data: { organizationId: org, projectLineId: line.id, supplierId: cheap, responseStatus: "QUOTED", quotedPrice: 100, quotedCurrency: "GBP" } });
      await tx.supplierEnquiry.create({ data: { organizationId: org, projectLineId: line.id, supplierId: dear, responseStatus: "QUOTED", quotedPrice: 120, quotedCurrency: "GBP" } });
      // A quote in another currency is never compared.
      await tx.supplierEnquiry.create({ data: { organizationId: org, projectLineId: line.id, supplierId: dear, responseStatus: "QUOTED", quotedPrice: 5, quotedCurrency: "USD" } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("scores price against the lowest quote on the same line and currency", async () => {
    const lo = await svc.get(user(), cheap);
    const hi = await svc.get(user(), dear);
    expect(lo.metrics.find((m) => m.key === "quote_price")).toMatchObject({ display: "At the lowest", score: 100 });
    const d = hi.metrics.find((m) => m.key === "quote_price")!;
    expect(d.display).toBe("20% above lowest");
    expect(d.score).toBeLessThan(100);
  });

  it("returns six quarters of trend, oldest first", async () => {
    const sc = await svc.get(user(), dear);
    expect(sc.trend).toHaveLength(6);
    expect(sc.trend[5].period).toMatch(/^\d{4} Q[1-4]$/);
  });

  it("scores several stakeholders at once for the list, tolerating unknown ids", async () => {
    const r = await svc.scores(user(), [cheap, dear, randomUUID()]);
    expect(r).toHaveLength(3);
    expect(r.find((x) => x.partnerId === cheap)?.overallScore).not.toBeNull();
    expect(r[2].overallScore).toBeNull();
  });
});
