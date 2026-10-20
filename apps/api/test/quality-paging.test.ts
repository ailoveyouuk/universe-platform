import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { PartnerPerformanceService } from "../src/quality/partner-performance.service";
import { QaQueueService } from "../src/quality/qa-queue.service";

/** Database-side scorecards and the paged QA queue (2026-10-17, scale work), against the real RLS database. */
describe("Quality: performance scorecards and QA queue paging", () => {
  const suffix = randomUUID().slice(0, 8);
  const performance = new PartnerPerformanceService();
  const queue = new QaQueueService();
  let orgA: string;
  let orgB: string;
  let manufacturerId: string;
  let supplierId: string;

  const asUser = (organizationId: string, permissions: string[]): RequestUser => ({
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
    permissions,
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Qp A ${suffix}`, slug: `qp-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Qp B ${suffix}`, slug: `qp-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const m = await tx.partner.create({ data: { organizationId: orgA, name: `Maker ${suffix}`, normalizedName: `maker ${suffix}`, approvalStatus: "APPROVED" } });
      const s = await tx.partner.create({ data: { organizationId: orgA, name: `Supplier ${suffix}`, normalizedName: `supplier ${suffix}`, approvalStatus: "APPROVED" } });
      manufacturerId = m.id;
      supplierId = s.id;
      await tx.partnerRole.create({ data: { partnerId: m.id, roleType: "MANUFACTURER" } });
      await tx.partnerRole.create({ data: { partnerId: s.id, roleType: "SUPPLIER" } });
      const project = await tx.project.create({
        data: { organizationId: orgA, referenceNumber: `QP-${suffix}`, title: "Scorecard project", category: "PROCUREMENT", projectType: "PHARMACEUTICAL" },
      });
      const d = (iso: string) => new Date(iso);
      const l1 = await tx.projectLine.create({
        data: { organizationId: orgA, projectId: project.id, manufacturerId: m.id, supplierId: s.id, internalOnTime: true, supplierOnTime: true, supplierInFull: true, projectedDeliveryDate: d("2026-01-01"), actualDeliveryDate: d("2026-01-05") },
      });
      await tx.projectLine.create({
        data: { organizationId: orgA, projectId: project.id, manufacturerId: m.id, supplierId: s.id, internalOnTime: false, supplierOnTime: false, supplierInFull: true, projectedDeliveryDate: d("2026-01-01"), actualDeliveryDate: d("2025-12-30") },
      });
      await tx.projectLine.create({ data: { organizationId: orgA, projectId: project.id, manufacturerId: m.id } });
      await tx.supplierEnquiry.create({ data: { organizationId: orgA, projectLineId: l1.id, supplierId: s.id, responseStatus: "DECLINED" } });
      // QA queue: 6 pending partners (3 with a client role, 2 manufacturers, 1 with no role)
      for (let i = 0; i < 6; i++) {
        const p = await tx.partner.create({ data: { organizationId: orgA, name: `Pending ${i} ${suffix}`, normalizedName: `pending ${i} ${suffix}`, approvalStatus: "PENDING" } });
        if (i < 3) await tx.partnerRole.create({ data: { partnerId: p.id, roleType: "CLIENT" } });
        else if (i < 5) await tx.partnerRole.create({ data: { partnerId: p.id, roleType: "MANUFACTURER" } });
      }
      await tx.partner.create({ data: { organizationId: orgB, name: `Other org pending ${suffix}`, normalizedName: `other org pending ${suffix}`, approvalStatus: "PENDING" } });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.supplierEnquiry.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.projectLine.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.project.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.partnerRole.deleteMany({ where: { partner: { organizationId: { in: [orgA, orgB] } } } });
      await tx.partner.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("scorecards: percentages, days late and issues match the line data", async () => {
    const r = await performance.getPerformancePage(asUser(orgA, []), { q: suffix });
    expect(r.total).toBe(2);
    const m = r.items.find((i) => i.partnerId === manufacturerId)!;
    expect(m).toMatchObject({ roleType: "MANUFACTURER", totalLines: 3, onTimeCount: 2, onTimePercent: 100, otifPercent: 100, issueCount: 0, avgDaysLate: 2 });
    const s = r.items.find((i) => i.partnerId === supplierId)!;
    expect(s).toMatchObject({ roleType: "SUPPLIER", totalLines: 2, onTimeCount: 1, onTimePercent: 50, inFullPercent: 100, otifPercent: 50, issueCount: 1, avgDaysLate: 2 });
    // most active first
    expect(r.items[0].partnerId).toBe(manufacturerId);
  });

  // The organisation's working-day window (default 30 early to 5 late) decides on-time: the 4-day-late and 2-day-early lines both count.
  it("scorecards: role filter, paging and tenant isolation", async () => {
    expect((await performance.getPerformancePage(asUser(orgA, []), { roleType: "SUPPLIER", q: suffix })).items.map((i) => i.partnerId)).toEqual([supplierId]);
    expect((await performance.getPerformancePage(asUser(orgA, []), { roleType: "WAREHOUSING" })).total).toBe(0);
    expect((await performance.getPerformancePage(asUser(orgB, []), { q: suffix })).total).toBe(0);
    const p1 = await performance.getPerformancePage(asUser(orgA, []), { q: suffix, pageSize: 5 });
    expect(p1.items).toHaveLength(2);
  });

  it("QA queue: needs the permission", async () => {
    await expect(queue.getQueuePage(asUser(orgA, []), {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("QA queue: category counts, filtering and paging, scoped to the organisation", async () => {
    const qa = asUser(orgA, ["qa.queue.view"]);
    const all = await queue.getQueuePage(qa, { pageSize: 5 });
    expect(all.total).toBe(6);
    expect(all.items).toHaveLength(5);
    expect(all.filteredTotal).toBe(6);
    const count = (key: string) => all.categories.find((c) => c.key === key)?.count;
    expect(count("CLIENT")).toBe(3);
    expect(count("MANUFACTURER")).toBe(2);
    expect(count("OTHER")).toBe(1);
    expect((await queue.getQueuePage(qa, { pageSize: 5, page: 2 })).items).toHaveLength(1);
    const clients = await queue.getQueuePage(qa, { category: "CLIENT" });
    expect(clients.filteredTotal).toBe(3);
    expect(clients.items).toHaveLength(3);
    const other = await queue.getQueuePage(qa, { category: "OTHER" });
    expect(other.items).toHaveLength(1);
    expect((await queue.getQueuePage(asUser(orgB, ["qa.queue.view"]), {})).total).toBe(1);
  });
});
