import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProjectsService } from "../src/projects/projects.service";

/** Read-side redaction of financials (added 2026-10-17), against the real RLS database. */
describe("Project financial redaction", () => {
  const suffix = randomUUID().slice(0, 8);
  const projects = new ProjectsService({} as never);
  let org: string;
  let projectId: string;
  let lineId: string;

  const asUser = (permissions: string[]): RequestUser => ({
    id: randomUUID(),
    organizationId: org,
    homeOrganizationId: org,
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
    org = (await createOrganizationWithDefaultRoles({ name: `Red ${suffix}`, slug: `red-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      projectId = (
        await tx.project.create({
          data: { organizationId: org, referenceNumber: `R-${suffix}`, title: "Redaction test", category: "PROCUREMENT", projectType: "TENDER", freightCost: 1200, freightCurrency: "USD" },
        })
      ).id;
      lineId = (
        await tx.projectLine.create({
          data: { organizationId: org, projectId, clientProductDescription: "Gloves", quantity: 40, supplierUnitPrice: 9.5, supplierPaymentCurrency: "USD", internalInvoiceNumber: "INV-1" },
        })
      ).id;
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: org } });
      await tx.projectLine.deleteMany({ where: { organizationId: org } });
      await tx.project.deleteMany({ where: { organizationId: org } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: org } } });
      await tx.role.deleteMany({ where: { organizationId: org } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: org } });
    });
    await prisma.organization.deleteMany({ where: { id: org } });
    await prisma.$disconnect();
  });

  it("a user with financials.view sees prices", async () => {
    const d = await projects.findOne(asUser(["projects.view", "projects.financials.view"]), projectId);
    expect(d.financialsRedacted).toBe(false);
    expect(Number(d.freightCost)).toBe(1200);
    expect(Number(d.lines[0].supplierUnitPrice)).toBe(9.5);
  });

  it("a user without it gets financials blanked but operational data intact", async () => {
    const d = await projects.findOne(asUser(["projects.view"]), projectId);
    expect(d.financialsRedacted).toBe(true);
    expect(d.freightCost).toBeNull();
    expect(d.freightCurrency).toBeNull();
    const line = d.lines.find((l) => l.id === lineId)!;
    expect(line.supplierUnitPrice).toBeNull();
    expect(line.supplierPaymentCurrency).toBeNull();
    expect(line.internalInvoiceNumber).toBeNull();
    expect(line.quantity).toBe(40);
    expect(line.clientProductDescription).toBe("Gloves");
  });

  it("financial summaries need financials.view", async () => {
    await expect(projects.getFinancialSummary(asUser(["projects.view"]))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(projects.getProjectFinancialSummary(asUser(["projects.view"]), projectId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("editing financial fields needs view as well as edit, so a blanked form cannot write nulls back", async () => {
    await expect(
      projects.updateLine(asUser(["projects.edit", "projects.financials.edit"]), projectId, lineId, { supplierUnitPrice: null } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const after = await withPlatformStaffContext((tx) => tx.projectLine.findUniqueOrThrow({ where: { id: lineId } }));
    expect(Number(after.supplierUnitPrice)).toBe(9.5);
  });
});
