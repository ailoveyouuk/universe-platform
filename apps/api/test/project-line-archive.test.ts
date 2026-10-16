import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProjectsService } from "../src/projects/projects.service";

/** Project line archive (added 2026-10-17; replaced a hard delete the same day), against the real RLS database. */
describe("Project line archive", () => {
  const suffix = randomUUID().slice(0, 8);
  const projects = new ProjectsService({} as never);
  let orgA: string;
  let orgB: string;
  let projectId: string;
  let lineId: string;
  let otherLineId: string;

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
    orgA = (await createOrganizationWithDefaultRoles({ name: `Del A ${suffix}`, slug: `del-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Del B ${suffix}`, slug: `del-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      const p = await tx.project.create({
        data: { organizationId: orgA, referenceNumber: `D-${suffix}`, title: "Delete test", category: "PROCUREMENT", projectType: "TENDER" },
      });
      projectId = p.id;
      lineId = (await tx.projectLine.create({ data: { organizationId: orgA, projectId, clientProductDescription: "Line one" } })).id;
      otherLineId = (await tx.projectLine.create({ data: { organizationId: orgA, projectId, clientProductDescription: "Line two" } })).id;
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.projectLine.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.project.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("needs projects.edit", async () => {
    await expect(projects.archiveLine(asUser(orgA, ["projects.view"]), projectId, lineId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("another organisation cannot archive the line", async () => {
    await expect(projects.archiveLine(asUser(orgB, ["projects.edit"]), projectId, lineId)).rejects.toBeInstanceOf(NotFoundException);
    expect(await withPlatformStaffContext((tx) => tx.projectLine.count({ where: { id: lineId } }))).toBe(1);
  });

  it("archives only the requested line, keeps the row, and audits it", async () => {
    const detail = await projects.archiveLine(asUser(orgA, ["projects.edit"]), projectId, lineId);
    expect(detail.lines.map((l) => l.id)).toEqual([otherLineId]);
    const row = await withPlatformStaffContext((tx) => tx.projectLine.findUniqueOrThrow({ where: { id: lineId } }));
    expect(row.archivedAt).not.toBeNull();
    expect(await withPlatformStaffContext((tx) => tx.fieldChangeLog.count({ where: { tableName: "project_lines", recordId: lineId } }))).toBe(1);
  });
});
