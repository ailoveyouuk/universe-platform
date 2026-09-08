/**
 * Seeds the ONE piece of baseline reference data every environment needs
 * before any organization can be provisioned: the permission catalog
 * (global — what CAN be granted).
 *
 * This script deliberately does NOT create any organization — Universe has
 * no default or "house" tenant. To provision the first (or any later) real
 * organization, call createOrganizationWithDefaultRoles() from
 * ./organizations directly, or use the Admin app once it has an
 * organization-creation page. The API's OrganizationsService calls the same
 * function, so there's exactly one definition of "what a new org gets."
 */
import { prisma } from "./index";

const PERMISSIONS = [
  { key: "projects.view", description: "View projects" },
  { key: "projects.create", description: "Create projects" },
  { key: "projects.edit", description: "Edit project core fields" },
  { key: "projects.delete", description: "Delete projects" },
  { key: "projects.financials.view", description: "View financial fields (margins, prices, payments)" },
  { key: "projects.financials.edit", description: "Edit financial fields" },
  { key: "org.users.manage", description: "Invite/deactivate users within your own organization" },
  { key: "org.roles.manage", description: "Manage roles/permissions within your own organization" },
];

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {},
      create: permission,
    });
  }
  console.log(`Seed complete: ${PERMISSIONS.length} permissions in the catalog. No organization created.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
