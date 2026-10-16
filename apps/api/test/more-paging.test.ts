import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductBatchesService } from "../src/batches/product-batches.service";
import { LogisticsInsightsService } from "../src/logistics-insights/logistics-insights.service";
import { ProductSourceApprovalsService } from "../src/quality/product-source-approvals.service";
import { RiskAssessmentsService } from "../src/risk-assessments/risk-assessments.service";

/** Paging for sourcing approvals, logistics lines, risks and batches (2026-10-17, scale work), against the real RLS database. */
describe("List paging: approvals, logistics, risks, batches", () => {
  const suffix = randomUUID().slice(0, 8);
  const approvals = new ProductSourceApprovalsService();
  const logistics = new LogisticsInsightsService();
  const risks = new (RiskAssessmentsService as unknown as new () => RiskAssessmentsService)();
  const batches = new (ProductBatchesService as unknown as new (...a: unknown[]) => ProductBatchesService)({} as never);
  let orgA: string;
  let orgB: string;
  let productId: string;

  const asUser = (organizationId: string): RequestUser => ({
    id: randomUUID(),
    organizationId,
    homeOrganizationId: organizationId,
    email: `x-${suffix}@example.com`,
    forename: "T",
    surname: "T",
    organizationName: "x",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole: "NONE",
    permissions: [],
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Mp A ${suffix}`, slug: `mp-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Mp B ${suffix}`, slug: `mp-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const product = await tx.productMaster.create({ data: { name: `Syringe ${suffix}`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA } });
      productId = product.id;
      const good = await tx.partner.create({ data: { organizationId: orgA, name: `Good Maker ${suffix}`, normalizedName: `good maker ${suffix}`, approvalStatus: "APPROVED" } });
      const pending = await tx.partner.create({ data: { organizationId: orgA, name: `Pending Maker ${suffix}`, normalizedName: `pending maker ${suffix}`, approvalStatus: "PENDING" } });
      const past = new Date(Date.now() - 30 * 86400000);
      await tx.productSourceApproval.create({ data: { organizationId: orgA, productMasterId: product.id, manufacturerId: good.id, status: "APPROVED" } });
      await tx.productSourceApproval.create({ data: { organizationId: orgA, productMasterId: product.id, manufacturerId: pending.id, status: "APPROVED" } });
      await tx.productSourceApproval.create({ data: { organizationId: orgA, productMasterId: product.id, manufacturerId: good.id, status: "APPROVED", nextReviewDue: past } });
      await tx.productSourceApproval.create({ data: { organizationId: orgA, productMasterId: product.id, manufacturerId: good.id, status: "PENDING" } });

      const project = await tx.project.create({ data: { organizationId: orgA, referenceNumber: `MP-${suffix}`, title: "Logistics project", category: "PROCUREMENT", projectType: "PHARMACEUTICAL" } });
      for (let i = 0; i < 7; i++) {
        const line = await tx.projectLine.create({ data: { organizationId: orgA, projectId: project.id, clientProductDescription: `Line ${i}` } });
        await tx.projectLineLogisticsMetric.create({
          data: { organizationId: orgA, projectId: project.id, projectLineId: line.id, transportMode: i < 4 ? "SEA" : "AIR", distanceKm: 1000, co2FactorKgPerTonneKm: 0.01, co2TotalKg: 10 * (i + 1), efficiencyScore: i < 4 ? 8 : 2, scoreBand: i < 4 ? "GREEN" : "RED" },
        });
      }

      const sev = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "HIGH", "LOW"];
      for (let i = 0; i < sev.length; i++) {
        await tx.riskAssessment.create({
          data: {
            organizationId: orgA,
            subjectType: "PROJECT",
            subjectId: project.id,
            title: `Risk ${i} ${suffix}`,
            severity: sev[i],
            likelihood: "POSSIBLE",
            status: i === 5 ? "CLOSED" : "OPEN",
            reviewDate: i === 4 ? null : new Date(Date.now() + (i - 1.5) * 86400000),
          },
        });
      }

      for (let i = 0; i < 9; i++) {
        await tx.productBatch.create({ data: { organizationId: orgA, productMasterId: product.id, batchNumber: `MPB-${suffix}-${i}`, status: i < 6 ? "ACTIVE" : "QUARANTINED" } });
      }
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: [orgA, orgB] };
      await tx.productBatch.deleteMany({ where: { organizationId: orgs } });
      await tx.riskAssessment.deleteMany({ where: { organizationId: orgs } });
      await tx.projectLineLogisticsMetric.deleteMany({ where: { organizationId: orgs } });
      await tx.projectLine.deleteMany({ where: { organizationId: orgs } });
      await tx.project.deleteMany({ where: { organizationId: orgs } });
      await tx.productSourceApproval.deleteMany({ where: { organizationId: orgs } });
      await tx.partner.deleteMany({ where: { organizationId: orgs } });
      await tx.productMaster.deleteMany({ where: { sourceStandard: "TEST", addedByOrganizationId: orgA } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: orgs } } });
      await tx.role.deleteMany({ where: { organizationId: orgs } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: orgs } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("sourcing approvals: dashboard counts and the WARNING filter match the qualification rule", async () => {
    const d = await approvals.getDashboard(asUser(orgA));
    expect(d).toMatchObject({ totalProducts: 4, qualifiedCount: 1, warningCount: 2, pendingCount: 1, rejectedCount: 0 });
    expect(d.needsAttention).toHaveLength(2);
    const warn = await approvals.findPage(asUser(orgA), { status: "WARNING" });
    expect(warn.total).toBe(2);
    expect(warn.items.every((i) => i.status === "APPROVED" && !i.isQualified)).toBe(true);
    expect((await approvals.findPage(asUser(orgA), { status: "APPROVED", pageSize: 5 })).total).toBe(3);
    expect((await approvals.findPage(asUser(orgA), { q: "Pending Maker" })).total).toBe(1);
    expect((await approvals.findPage(asUser(orgB), {})).total).toBe(0);
    expect(await approvals.findAll(asUser(orgA), undefined, productId)).toHaveLength(4);
  });

  it("logistics lines: paged, with totals over the whole filtered set", async () => {
    const all = await logistics.getOrgLinesPage(asUser(orgA), {}, { page: 1, pageSize: 5 });
    expect(all.total).toBe(7);
    expect(all.items).toHaveLength(5);
    expect(all.totals.count).toBe(7);
    expect(all.totals.totalCo2Kg).toBe(10 + 20 + 30 + 40 + 50 + 60 + 70);
    expect(all.totals.totalDistanceKm).toBe(7000);
    expect(all.totals.avgScore).toBeCloseTo((8 * 4 + 2 * 3) / 7, 5);
    const air = await logistics.getOrgLinesPage(asUser(orgA), { transportMode: "AIR" }, { page: 1, pageSize: 5 });
    expect(air.total).toBe(3);
    expect(air.totals.count).toBe(3);
    expect((await logistics.getOrgLinesPage(asUser(orgB), {}, {})).total).toBe(0);
  });

  it("risk register: counts, filters, severity rank sort across pages, undated last", async () => {
    const u = asUser(orgA);
    expect(await risks.counts(u)).toEqual({ total: 6, open: 5, highOrCritical: 3, overdue: 2 });
    const bySeverity = await risks.listPage(u, { q: suffix, sort: "severity", dir: "desc", pageSize: 5 });
    expect(bySeverity.total).toBe(6);
    expect(bySeverity.items.map((r) => r.severity)).toEqual(["CRITICAL", "HIGH", "HIGH", "MEDIUM", "LOW"]);
    expect((await risks.listPage(u, { q: suffix, sort: "severity", dir: "desc", pageSize: 5, page: 2 })).items.map((r) => r.severity)).toEqual(["LOW"]);
    expect((await risks.listPage(u, { q: suffix, sort: "severity", dir: "asc", pageSize: 5 })).items[0].severity).toBe("LOW");
    const byReview = await risks.listPage(u, { q: suffix, sort: "review", dir: "asc", pageSize: 5, page: 2 });
    expect(byReview.items.map((r) => r.reviewDate)).toEqual([null]); // the one undated risk is last
    expect((await risks.listPage(u, { q: suffix, status: "CLOSED" })).total).toBe(1);
    expect((await risks.listPage(u, { q: "MP-" + suffix })).total).toBe(6); // matches via the project reference
    expect((await risks.listPage(u, { q: suffix })).items[0].subjectName).toContain(`MP-${suffix}`);
    expect((await risks.listPage(asUser(orgB), {})).total).toBe(0);
  });

  it("batches: paged search", async () => {
    const u = asUser(orgA);
    const p1 = await batches.searchPage(u, { batchNumber: `MPB-${suffix}` } as never, { page: 1, pageSize: 5 });
    expect(p1.total).toBe(9);
    expect(p1.items).toHaveLength(5);
    expect((await batches.searchPage(u, { batchNumber: `MPB-${suffix}` } as never, { page: 2, pageSize: 5 })).items).toHaveLength(4);
    expect((await batches.searchPage(u, { batchNumber: `MPB-${suffix}`, status: "QUARANTINED" } as never, {})).total).toBe(3);
    expect((await batches.searchPage(asUser(orgB), {} as never, {})).total).toBe(0);
  });
});
