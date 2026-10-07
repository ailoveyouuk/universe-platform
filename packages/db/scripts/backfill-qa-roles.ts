/**
 * One-off backfill for the QA/procurement segregation-of-duties work
 * (Lewis, 2026-10-08 — see compliance-standards-gap-analysis.md and
 * authorization.ts's assertHasPermission). DEFAULT_ROLE_TEMPLATE in
 * organizations.ts now gives every NEWLY PROVISIONED organization a
 * "Quality Assurance" and "Responsible Person" role automatically, and
 * grants the new partners.approve/evidence.verify/products.approve/
 * qa.queue.view permissions to Organization Admin — but Unimed's
 * organization already existed before this change, so its roles need
 * the same thing done retroactively. This script:
 *
 *   1. Upserts the four new Permission rows (idempotent — safe even if
 *      `npm run seed` already created them). permissions/role_permissions
 *      are NOT row-level-security-protected tables (see
 *      infra/sql/row-level-security.sql's protected-table list), so these
 *      run as plain prisma calls.
 *   2. Grants all four to Unimed's existing "Organization Admin" role,
 *      so Lewis (or any existing admin) is never locked out of
 *      approving/verifying by this change.
 *   3. Creates "Quality Assurance" and "Responsible Person" roles for
 *      Unimed if they don't already exist, each granted all four
 *      permissions.
 *
 * `roles` IS row-level-security-protected (organizationId filter + block
 * predicates — see row-level-security.sql), so every read/write of
 * prisma.role.* below runs inside withTenantContext(org.id, ...), the
 * same way every other tenant-scoped script in this repo does (see
 * organizations.ts's own use of it).
 *
 * Does NOT assign either new role to any user — that's a deliberate,
 * named decision for Lewis to make himself (who on the team actually
 * does QA sign-off), done afterwards via the Admin app's Users page
 * ("Edit roles" on the relevant user's row).
 *
 * Run with: cd packages/db && npm run backfill:qa-roles
 * (pass an exact org name if more than one organization name contains
 * "Unimed": npm run backfill:qa-roles -- "Exact Org Name")
 */
import { prisma, withTenantContext } from "../src/index";

const QA_PERMISSIONS = [
  { key: "partners.approve", description: "Approve a stakeholder (move Partner.approvalStatus to APPROVED)" },
  { key: "evidence.verify", description: "Verify or reject evidence logged against a stakeholder" },
  { key: "products.approve", description: "Approve or reject a product source (manufacturer/supplier) qualification" },
  { key: "qa.queue.view", description: "View the QA queue — stakeholders, evidence, and product sources awaiting QA review" },
];

async function main() {
  const orgNameFilter = process.argv[2] ?? "Unimed";
  const org = await prisma.organization.findFirst({
    where: { name: { contains: orgNameFilter } },
  });
  if (!org) {
    throw new Error(
      `No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument, e.g.:\n` +
        `  npm run backfill:qa-roles -- "Exact Org Name"`,
    );
  }
  console.log(`Backfilling QA roles/permissions for organization "${org.name}" (${org.id})`);

  const permissions = await Promise.all(
    QA_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description },
        create: p,
      }),
    ),
  );
  console.log(`Permissions ready: ${permissions.map((p) => p.key).join(", ")}`);

  await withTenantContext(org.id, async (tx) => {
    const adminRole = await tx.role.findFirst({
      where: { organizationId: org.id, name: "Organization Admin" },
    });
    if (adminRole) {
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
          update: {},
          create: { roleId: adminRole.id, permissionId: permission.id },
        });
      }
      console.log(`Granted all 4 QA permissions to "Organization Admin" (${adminRole.id}) — no existing admin is locked out.`);
    } else {
      console.warn(`No "Organization Admin" role found for this organization — skipped (nothing to extend).`);
    }

    for (const roleName of ["Quality Assurance", "Responsible Person"]) {
      const role = await tx.role.upsert({
        where: { organizationId_name_appScope: { organizationId: org.id, name: roleName, appScope: "project-management" } },
        update: {},
        create: { organizationId: org.id, name: roleName, appScope: "project-management" },
      });
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
      console.log(`Role "${roleName}" ready (${role.id}), with all 4 QA permissions.`);
    }
  });

  console.log(
    "Done. No user has been assigned either new role yet — do that from the Admin app's Users page " +
      '("Edit roles" on the relevant person\'s row).',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
