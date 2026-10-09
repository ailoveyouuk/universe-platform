/**
 * One-off backfill for the 2026-10-09 admin-role review (Lewis — see
 * claude/app-completeness-audit.md). DEFAULT_ROLE_TEMPLATE in
 * organizations.ts now renames "Project Manager" to "Procurement" (same
 * permissions, a name that matches what the role is actually for) and
 * adds a new "Finance" role for any NEWLY PROVISIONED organization — but
 * an organization provisioned before this change still has a role
 * literally named "Project Manager" and no "Finance" role at all, so this
 * retrofits both onto an existing organization:
 *
 *   1. Renames that organization's "Project Manager" role (if one exists)
 *      to "Procurement" in place — same role id, same RolePermission
 *      rows, same users already assigned to it, just the name column
 *      changes. Deliberately a rename, not a delete-and-recreate: a
 *      delete would also delete every UserRole row pointing at it.
 *   2. Creates a "Finance" role (projects.view, projects.financials.view,
 *      projects.financials.edit) if it doesn't already exist.
 *
 * Does NOT assign the new Finance role to any user — that's Lewis's own
 * call (who on the team actually handles pricing/payments), done
 * afterwards via the Admin app's Users page ("Edit roles").
 *
 * `roles` is row-level-security-protected, so every read/write below runs
 * inside withTenantContext(org.id, ...), same as backfill-qa-roles.ts.
 *
 * Run with: cd packages/db && npx tsx scripts/backfill-procurement-finance-roles.ts
 * (pass an exact org name if more than one organization name contains
 * "Universe": npx tsx scripts/backfill-procurement-finance-roles.ts "Exact Org Name")
 */
import { prisma, withTenantContext } from "../src/index";

async function main() {
  const orgNameFilter = process.argv[2] ?? "Universe";
  const org = await prisma.organization.findFirst({
    where: { name: { contains: orgNameFilter } },
  });
  if (!org) {
    throw new Error(
      `No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument, e.g.:\n` +
        `  npx tsx scripts/backfill-procurement-finance-roles.ts "Exact Org Name"`,
    );
  }
  console.log(`Backfilling Procurement/Finance roles for organization "${org.name}" (${org.id})`);

  await withTenantContext(org.id, async (tx) => {
    const projectManagerRole = await tx.role.findFirst({
      where: { organizationId: org.id, name: "Project Manager" },
    });
    if (projectManagerRole) {
      await tx.role.update({ where: { id: projectManagerRole.id }, data: { name: "Procurement" } });
      console.log(`Renamed role "Project Manager" -> "Procurement" (${projectManagerRole.id}). Existing user assignments and permissions are unchanged.`);
    } else {
      const alreadyProcurement = await tx.role.findFirst({ where: { organizationId: org.id, name: "Procurement" } });
      if (alreadyProcurement) {
        console.log(`Role "Procurement" already exists (${alreadyProcurement.id}) — nothing to rename.`);
      } else {
        console.warn(`No "Project Manager" role found for this organization — skipped (nothing to rename).`);
      }
    }

    const financePermissionKeys = ["projects.view", "projects.financials.view", "projects.financials.edit"];
    const financePermissions = await Promise.all(
      financePermissionKeys.map((key) => tx.permission.findUniqueOrThrow({ where: { key } })),
    );

    const financeRole = await tx.role.upsert({
      where: { organizationId_name_appScope: { organizationId: org.id, name: "Finance", appScope: "project-management" } },
      update: {},
      create: { organizationId: org.id, name: "Finance", appScope: "project-management" },
    });
    for (const permission of financePermissions) {
      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: financeRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: financeRole.id, permissionId: permission.id },
      });
    }
    console.log(`Role "Finance" ready (${financeRole.id}), with projects.view/financials.view/financials.edit.`);
  });

  console.log(
    "Done. No user has been assigned the new Finance role yet — do that from the Admin app's Users page " +
      '("Edit roles" on the relevant person\'s row).',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
