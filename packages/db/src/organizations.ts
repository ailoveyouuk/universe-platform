import { prisma, withTenantContext } from "./index";

/**
 * The starter role template every new tenant organization gets on
 * provisioning. Shared by the seed script and the API's
 * OrganizationsService (used from the Admin app) so there's exactly one
 * definition — no organization, including whichever one pilots Universe
 * first, gets special-cased treatment.
 */
export const DEFAULT_ROLE_TEMPLATE: { name: string; appScope: string; permissionKeys: string[] }[] = [
  {
    name: "Organization Admin",
    appScope: "*",
    permissionKeys: [
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.delete",
      "projects.financials.view",
      "projects.financials.edit",
      "org.users.manage",
      "org.roles.manage",
    ],
  },
  {
    name: "Project Manager",
    appScope: "project-management",
    permissionKeys: [
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.financials.view",
      "projects.financials.edit",
    ],
  },
  {
    name: "Read Only",
    appScope: "project-management",
    permissionKeys: ["projects.view"],
  },
];

/**
 * Provisions a new tenant organization with the standard starter roles.
 * This is what Universe's platform-operator team runs (via the Admin app,
 * or directly during early bring-up) to onboard each new organization —
 * every organization goes through this same path, with no default or
 * "house" organization treated differently.
 *
 * The role-creation loop runs inside withTenantContext(org.id, ...) — the
 * `roles` table is RLS-protected (see infra/sql/row-level-security.sql),
 * and unlike EntraAuthGuard's identity lookup (which genuinely has to span
 * every organization, since it doesn't know the caller's org yet), THIS
 * write is for a specific, already-created org's own roles, so it's a
 * normal tenant-scoped operation, not a platform-staff exception. Found the
 * hard way: `prisma.role.upsert` with no session context set silently hits
 * RLS's default-deny BLOCK PREDICATE once RLS is live — confirmed in CI
 * 2026-09-24 running tenant-isolation.test.ts for the first time against a
 * real database.
 */
export async function createOrganizationWithDefaultRoles(params: { name: string; slug: string }) {
  const org = await prisma.organization.upsert({
    where: { slug: params.slug },
    update: {},
    create: { name: params.name, slug: params.slug },
  });

  await withTenantContext(org.id, async (tx) => {
    for (const role of DEFAULT_ROLE_TEMPLATE) {
      const created = await tx.role.upsert({
        where: { organizationId_name_appScope: { organizationId: org.id, name: role.name, appScope: role.appScope } },
        update: {},
        create: { organizationId: org.id, name: role.name, appScope: role.appScope },
      });

      for (const key of role.permissionKeys) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { key } });
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: created.id, permissionId: permission.id } },
          update: {},
          create: { roleId: created.id, permissionId: permission.id },
        });
      }
    }
  });

  return org;
}
