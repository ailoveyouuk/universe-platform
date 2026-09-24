import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";
import { createOrganizationWithDefaultRoles } from "../src/organizations";

/**
 * Proves the database-layer half of tenant isolation
 * (infra/sql/row-level-security.sql) actually holds, run against a real
 * SQL Server instance (docker-compose.test.yml) — not asserted against
 * application code alone, since the whole point of RLS is that it holds
 * even if the application code is wrong.
 *
 * See backend-launch-checklist.md, Phase A, "Write automated tests proving
 * tenant isolation... hold."
 */
describe("tenant isolation (Azure SQL Row-Level Security)", () => {
  const suffix = randomUUID().slice(0, 8);
  let orgA: { id: string };
  let orgB: { id: string };
  let projectA: { id: string };
  let projectB: { id: string };

  beforeAll(async () => {
    orgA = await createOrganizationWithDefaultRoles({
      name: `RLS Test Org A ${suffix}`,
      slug: `rls-test-org-a-${suffix}`,
    });
    orgB = await createOrganizationWithDefaultRoles({
      name: `RLS Test Org B ${suffix}`,
      slug: `rls-test-org-b-${suffix}`,
    });

    projectA = await withTenantContext(orgA.id, (tx) =>
      tx.project.create({
        data: {
          organizationId: orgA.id,
          referenceNumber: `A-${suffix}`,
          title: "Org A project",
          category: "PROCUREMENT",
          projectType: "NON_PHARMACEUTICAL",
        },
      }),
    );
    projectB = await withTenantContext(orgB.id, (tx) =>
      tx.project.create({
        data: {
          organizationId: orgB.id,
          referenceNumber: `B-${suffix}`,
          title: "Org B project",
          category: "PROCUREMENT",
          projectType: "NON_PHARMACEUTICAL",
        },
      }),
    );
  });

  afterAll(async () => {
    const orgIds = [orgA.id, orgB.id];
    // FK order matters (SQL Server, no cascading deletes anywhere in this
    // schema — see schema.prisma header comment): role_permissions before
    // roles, roles/projects before organizations. createOrganizationWithDefaultRoles
    // creates roles AND a DataSharingConsent row for every org it provisions
    // (2026-09-24 — see organizations.ts), so this cleanup has to undo both,
    // not just the projects this test created directly.
    await withPlatformStaffContext((tx) =>
      tx.project.deleteMany({ where: { id: { in: [projectA.id, projectB.id] } } }),
    );
    await withPlatformStaffContext((tx) =>
      tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: orgIds } } } }),
    );
    await withPlatformStaffContext((tx) => tx.role.deleteMany({ where: { organizationId: { in: orgIds } } }));
    await prisma.dataSharingConsent.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it("a connection with no session context set sees zero rows (default-deny)", async () => {
    const count = await prisma.project.count({ where: { id: { in: [projectA.id, projectB.id] } } });
    expect(count).toBe(0);
  });

  it("org A's session context sees org A's project, and never org B's", async () => {
    const seen = await withTenantContext(orgA.id, (tx) =>
      tx.project.findMany({ where: { id: { in: [projectA.id, projectB.id] } } }),
    );
    expect(seen.map((p) => p.id)).toEqual([projectA.id]);
  });

  it("org B's session context sees org B's project, and never org A's", async () => {
    const seen = await withTenantContext(orgB.id, (tx) =>
      tx.project.findMany({ where: { id: { in: [projectA.id, projectB.id] } } }),
    );
    expect(seen.map((p) => p.id)).toEqual([projectB.id]);
  });

  it("org A's session context cannot write a row into org B (BLOCK PREDICATE)", async () => {
    await expect(
      withTenantContext(orgA.id, (tx) =>
        tx.project.create({
          data: {
            organizationId: orgB.id,
            referenceNumber: `HACK-${suffix}`,
            title: "should be blocked by RLS",
            category: "PROCUREMENT",
            projectType: "NON_PHARMACEUTICAL",
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("org A's session context cannot re-point an existing row at org B (BLOCK PREDICATE on UPDATE)", async () => {
    await expect(
      withTenantContext(orgA.id, (tx) =>
        tx.project.update({ where: { id: projectA.id }, data: { organizationId: orgB.id } }),
      ),
    ).rejects.toThrow();

    // Confirm it genuinely didn't move, not just that the promise rejected.
    const stillOrgA = await withTenantContext(orgA.id, (tx) =>
      tx.project.findUniqueOrThrow({ where: { id: projectA.id } }),
    );
    expect(stillOrgA.organizationId).toBe(orgA.id);
  });

  it("the platform-staff context sees rows across both organizations", async () => {
    const seen = await withPlatformStaffContext((tx) =>
      tx.project.findMany({ where: { id: { in: [projectA.id, projectB.id] } } }),
    );
    expect(seen.map((p) => p.id).sort()).toEqual([projectA.id, projectB.id].sort());
  });

  it("the global Role templates (organizationId IS NULL) remain visible with no session context", async () => {
    // createOrganizationWithDefaultRoles creates per-org roles, not global
    // templates, so this proves the NULL-organizationId branch of the RLS
    // predicate directly rather than relying on seed data existing.
    const template = await withPlatformStaffContext((tx) =>
      tx.role.create({
        data: { organizationId: null, name: `Global Template ${suffix}`, appScope: "*" },
      }),
    );
    try {
      const seenWithNoContext = await prisma.role.findUnique({ where: { id: template.id } });
      expect(seenWithNoContext?.id).toBe(template.id);
    } finally {
      await withPlatformStaffContext((tx) => tx.role.delete({ where: { id: template.id } }));
    }
  });
});
