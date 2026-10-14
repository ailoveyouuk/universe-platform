/**
 * One-off backfill for the 2026-10-14 PartnerFinancialDetail wiring
 * (Lewis — see backend-frontend-wiring-audit.md's dead-schema findings).
 * DEFAULT_ROLE_TEMPLATE in organizations.ts now gives any NEWLY
 * PROVISIONED organization's "Organization Admin" and "Finance" roles
 * both partners.financials.view/edit, and "Project Manager" view only —
 * but an organization provisioned before this change has none of that on
 * its existing roles, so this grants it retroactively.
 *
 * Does NOT create a Finance role that doesn't already exist — that's
 * backfill-finance-role.ts's job, run that first for an org that
 * predates the Finance role entirely. This script only extends roles
 * that are already there; a role name it doesn't find is skipped with a
 * warning, not created.
 *
 * `roles`/`role_permissions` are row-level-security-protected
 * (organizationId filter + block predicates), so every read/write below
 * runs inside withTenantContext(org.id, ...), same as
 * backfill-qa-roles.ts/backfill-finance-role.ts.
 *
 * Run with: cd packages/db && npx tsx scripts/backfill-partner-financials-permissions.ts
 * (pass an exact org name if more than one organization name contains
 * "Unimed": npx tsx scripts/backfill-partner-financials-permissions.ts "Exact Org Name")
 */
import { prisma, withTenantContext } from "../src/index";

const PERMISSIONS = [
  { key: "partners.financials.view", description: "View a partner's bank/payment details" },
  { key: "partners.financials.edit", description: "Add or edit a partner's bank/payment details" },
];

// Which existing roles get which of the two permissions — mirrors
// DEFAULT_ROLE_TEMPLATE in organizations.ts exactly, see that file's
// doc comments on each role for the reasoning (Finance edits payment
// details, Project Manager only views them, Organization Admin gets
// both so no admin is locked out).
const ROLE_GRANTS: Record<string, string[]> = {
  "Organization Admin": ["partners.financials.view", "partners.financials.edit"],
  Finance: ["partners.financials.view", "partners.financials.edit"],
  "Project Manager": ["partners.financials.view"],
};

async function main() {
  const orgNameFilter = process.argv[2] ?? "Unimed";
  const org = await prisma.organization.findFirst({
    where: { name: { contains: orgNameFilter } },
  });
  if (!org) {
    throw new Error(
      `No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument, e.g.:\n` +
        `  npx tsx scripts/backfill-partner-financials-permissions.ts "Exact Org Name"`,
    );
  }
  console.log(`Backfilling partner-financials permissions for organization "${org.name}" (${org.id})`);

  const permissions = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description },
        create: p,
      }),
    ),
  );
  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));
  console.log(`Permissions ready: ${permissions.map((p) => p.key).join(", ")}`);

  await withTenantContext(org.id, async (tx) => {
    for (const [roleName, keys] of Object.entries(ROLE_GRANTS)) {
      const role = await tx.role.findFirst({ where: { organizationId: org.id, name: roleName } });
      if (!role) {
        console.warn(`No "${roleName}" role found for this organization — skipped (nothing to extend).`);
        continue;
      }
      for (const key of keys) {
        const permission = permissionByKey.get(key)!;
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
      console.log(`Granted ${keys.join(", ")} to "${roleName}" (${role.id}).`);
    }
  });

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
