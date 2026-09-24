/**
 * Seeds the baseline reference data every environment needs before any
 * organization can be provisioned: the permission catalog (global — what
 * CAN be granted) and the Region/Country reference tables (global — see
 * seed-data/regions-countries.ts for sourcing/provenance). Both are shared,
 * non-tenant-scoped tables (not in row-level-security.sql's protected-table
 * list), so this runs as plain `prisma` calls with no session context.
 *
 * This script deliberately does NOT create any organization — Universe has
 * no default or "house" tenant. To provision the first (or any later) real
 * organization, call createOrganizationWithDefaultRoles() from
 * ./organizations directly, or use the Admin app once it has an
 * organization-creation page. The API's OrganizationsService calls the same
 * function, so there's exactly one definition of "what a new org gets."
 */
import { prisma } from "./index";
import { COUNTRIES, REGIONS } from "./seed-data/regions-countries";

const PERMISSIONS = [
  { key: "projects.view", description: "View projects" },
  { key: "projects.create", description: "Create projects" },
  { key: "projects.edit", description: "Edit project core fields" },
  { key: "projects.delete", description: "Delete projects" },
  { key: "projects.financials.view", description: "View financial fields (margins, prices, payments)" },
  { key: "projects.financials.edit", description: "Edit financial fields" },
  { key: "org.users.manage", description: "Invite/deactivate users within your own organization" },
  { key: "org.roles.manage", description: "Manage roles/permissions within your own organization" },
  // Supplier/manufacturer marketplace (added 2026-09-24) — see
  // DEFAULT_SUPPLIER_ROLE_TEMPLATE in organizations.ts.
  { key: "supplier.profile.manage", description: "Manage your organization's public supplier profile" },
  { key: "supplier.products.manage", description: "Publish/edit your organization's supplier product catalog" },
  { key: "supplier.leads.view", description: "View buyer interest in your organization's products" },
];

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {},
      create: permission,
    });
  }

  // Regions before countries — Country.regionCode is a real FK to Region.code.
  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name },
      create: region,
    });
  }
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name, regionCode: country.regionCode },
      create: country,
    });
  }

  console.log(
    `Seed complete: ${PERMISSIONS.length} permissions, ${REGIONS.length} regions, ${COUNTRIES.length} countries. No organization created.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
