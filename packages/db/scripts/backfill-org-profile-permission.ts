/**
 * One-off backfill for the 2026-10-14 OrganizationCountryPresence wiring
 * (Lewis — see backend-frontend-wiring-audit.md's dead-schema findings).
 * organizations.ts now gives any NEWLY PROVISIONED organization's admin
 * role (whichever one it has, depending on Organization.type — see
 * ROLE_GRANTS below) org.profile.manage — but an organization provisioned
 * before this change has none of that on its existing roles, so this
 * grants it retroactively. Same shape as
 * backfill-partner-financials-permissions.ts; see that script's own doc
 * comment for the general pattern.
 *
 * `roles`/`role_permissions` are row-level-security-protected, so every
 * read/write below runs inside withTenantContext(org.id, ...).
 *
 * Run with: cd packages/db && npx tsx scripts/backfill-org-profile-permission.ts
 * (pass an exact org name if more than one organization name contains
 * "Universe Demo": npx tsx scripts/backfill-org-profile-permission.ts "Exact Org Name")
 */
import { prisma, withTenantContext } from "../src/index";

const PERMISSION = { key: "org.profile.manage", description: "Manage your own organization's profile fields (e.g. countries of operation)" };

// Whichever of these admin-type roles actually exists for the target org
// gets the permission — mirrors organizations.ts's DEFAULT_ROLE_TEMPLATE /
// DEFAULT_SUPPLIER_ROLE_TEMPLATE / DEFAULT_MANUFACTURER_ROLE_TEMPLATE /
// DEFAULT_FUNDER_DONOR_ROLE_TEMPLATE exactly. DEFAULT_DATA_INSIGHTS_ROLE_
// TEMPLATE's "Insights Viewer" is deliberately NOT here — that template
// doesn't even grant org.users.manage/org.roles.manage, so it doesn't get
// org.profile.manage either (see organizations.ts's doc comment on that
// template for why it stays minimal).
const ROLE_NAMES = ["Organization Admin", "Supplier Admin", "Manufacturer Admin", "Funder Viewer"];

async function main() {
  const orgNameFilter = process.argv[2] ?? "Universe Demo";
  const org = await prisma.organization.findFirst({
    where: { name: { contains: orgNameFilter } },
  });
  if (!org) {
    throw new Error(
      `No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument, e.g.:\n` +
        `  npx tsx scripts/backfill-org-profile-permission.ts "Exact Org Name"`,
    );
  }
  console.log(`Backfilling org.profile.manage for organization "${org.name}" (${org.id})`);

  const permission = await prisma.permission.upsert({
    where: { key: PERMISSION.key },
    update: { description: PERMISSION.description },
    create: PERMISSION,
  });
  console.log(`Permission ready: ${permission.key}`);

  await withTenantContext(org.id, async (tx) => {
    for (const roleName of ROLE_NAMES) {
      const role = await tx.role.findFirst({ where: { organizationId: org.id, name: roleName } });
      if (!role) {
        console.warn(`No "${roleName}" role found for this organization — skipped (nothing to extend).`);
        continue;
      }
      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      console.log(`Granted org.profile.manage to "${roleName}" (${role.id}).`);
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
