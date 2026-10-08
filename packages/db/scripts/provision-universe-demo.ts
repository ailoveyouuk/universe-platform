/**
 * Provisioning script for the "Universe Demo" organization — added
 * 2026-10-08, replacing the "Unimed (Pilot)" org (deleted via
 * wipe-organization.ts) as the account Lewis signs in to day-to-day while
 * comprehensive demo data gets built out. Named "Universe Demo" rather than
 * anything Unimed-branded, since this org exists purely to demonstrate the
 * platform itself (to stakeholders/investors/sector specialists) before any
 * real partner is onboarded — keeping it unbranded avoids implying this
 * demo data represents Unimed specifically. Modeled directly on
 * provision-unimed-pilot.ts — same bootstrap pattern, same
 * createOrganizationWithDefaultRoles() path every real org goes through.
 *
 * Run this AFTER wipe-organization.ts has actually deleted any prior org
 * using either account email (so the unique-email constraint is free for
 * lewis@eduparcs.onmicrosoft.com).
 *
 * Run on a machine that can reach the real Azure SQL database, with
 * DATABASE_URL set to the app connection string:
 *
 *   npx tsx scripts/provision-universe-demo.ts
 *
 * Idempotent: safe to re-run (upserts the org by slug, upserts the user by
 * email, upserts the role assignment).
 */
import { prisma, withTenantContext } from "../src/index";
import { createOrganizationWithDefaultRoles } from "../src/organizations";
import { UserStatus } from "../src/enums";

const DEMO_USER_EMAIL = "lewis@eduparcs.onmicrosoft.com";
const DEMO_USER_FORENAME = "Lewis";
const DEMO_USER_SURNAME = "McKinnon";
const ADMIN_ROLE_NAME = "Organization Admin";

async function main() {
  const org = await createOrganizationWithDefaultRoles({
    name: "Universe Demo",
    slug: "universe-demo",
    type: "PROCUREMENT_SERVICE_AGENT",
  });

  await withTenantContext(org.id, async (tx) => {
    const user = await tx.user.upsert({
      where: { email: DEMO_USER_EMAIL },
      update: { organizationId: org.id, status: UserStatus.INVITED, entraObjectId: null },
      create: {
        organizationId: org.id,
        email: DEMO_USER_EMAIL,
        forename: DEMO_USER_FORENAME,
        surname: DEMO_USER_SURNAME,
        status: UserStatus.INVITED,
      },
    });

    const adminRole = await tx.role.findFirstOrThrow({
      where: { organizationId: org.id, name: ADMIN_ROLE_NAME },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });

    console.log(
      `Provisioned "${org.name}" (${org.id}) with ${DEMO_USER_EMAIL} as ${ADMIN_ROLE_NAME}. ` +
        `Status: ${user.status} — will flip to ACTIVE and re-link entraObjectId on your next sign-in ` +
        `(EntraAuthGuard matches by email, so this just works the same as first sign-in ever did).`,
    );
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
