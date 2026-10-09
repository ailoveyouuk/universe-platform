/**
 * One-off backfill for the 2026-10-09 admin-role review (Lewis — see
 * claude/app-completeness-audit.md and claude/admin-roles-and-permissions.md).
 * DEFAULT_ROLE_TEMPLATE in organizations.ts now gives any NEWLY
 * PROVISIONED organization a "Finance" role (view/report only — see that
 * role's own doc comment there for why it deliberately has no edit
 * permission, unlike Project Manager which keeps projects.financials.edit)
 * — but an organization provisioned before this change has no such role
 * at all, so this creates it retroactively.
 *
 * Does NOT assign the new Finance role to any user — that's Lewis's own
 * call (who on the team handles financial reporting/oversight), done
 * afterwards via the Admin app's Users page ("Edit roles").
 *
 * `roles` is row-level-security-protected, so every read/write below runs
 * inside withTenantContext(org.id, ...), same as backfill-qa-roles.ts.
 *
 * Run with: cd packages/db && npx tsx scripts/backfill-finance-role.ts
 * (pass an exact org name if more than one organization name contains
 * "Universe": npx tsx scripts/backfill-finance-role.ts "Exact Org Name")
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
        `  npx tsx scripts/backfill-finance-role.ts "Exact Org Name"`,
    );
  }
  console.log(`Backfilling Finance role for organization "${org.name}" (${org.id})`);

  await withTenantContext(org.id, async (tx) => {
    const financePermissionKeys = ["projects.view", "projects.financials.view"];
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

    // In case this organization previously got the old, pre-revision
    // Finance role (with financials.edit) via an earlier run of this
    // script's predecessor — remove that permission if present, so no
    // org is left with an edit-capable Finance role after the revision.
    const financialsEdit = await tx.permission.findUnique({ where: { key: "projects.financials.edit" } });
    if (financialsEdit) {
      await tx.rolePermission.deleteMany({ where: { roleId: financeRole.id, permissionId: financialsEdit.id } });
    }

    console.log(`Role "Finance" ready (${financeRole.id}), with projects.view/financials.view only — no edit permission.`);
  });

  console.log(
    "Done. No user has been assigned the Finance role yet — do that from the Admin app's Users page " +
      '("Edit roles" on the relevant person\'s row).',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
