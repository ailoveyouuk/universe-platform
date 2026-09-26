/**
 * One-off provisioning script for the Unimed pilot (B8 smoke test) —
 * added 2026-09-26. Creates the "Unimed (Pilot)" organization via the same
 * createOrganizationWithDefaultRoles() every real org goes through (see
 * organizations.ts's header comment — no organization gets special-cased
 * treatment), then creates the pre-invited User row for
 * lewis.m@unimedps.com and assigns him the "Organization Admin" role.
 *
 * This is the ADMIN-DRIVEN half of sign-up (see EntraAuthGuard's doc
 * comment): the User row is created here with entraObjectId left null and
 * status INVITED. The row gets linked to a real identity — entraObjectId
 * set, status flipped to ACTIVE — the first time lewis.m@unimedps.com signs
 * in through the CIAM tenant and EntraAuthGuard matches him by email. There
 * is no self-service path; running this script is what makes that sign-in
 * possible at all.
 *
 * Run on a machine that can reach the real Azure SQL database (see
 * infra/README.md / backend-launch-checklist.md — this sandbox cannot),
 * with DATABASE_URL set to the app connection string:
 *
 *   npx.cmd tsx scripts/provision-unimed-pilot.ts
 *
 * Idempotent: safe to re-run (upserts the org, upserts the user by email,
 * upserts the role assignment).
 */
import { prisma, withTenantContext } from "../src/index";
import { createOrganizationWithDefaultRoles } from "../src/organizations";
import { UserStatus } from "../src/enums";

const PILOT_USER_EMAIL = "lewis.m@unimedps.com";
const PILOT_USER_FORENAME = "Lewis";
const PILOT_USER_SURNAME = "McKinnon";
const ADMIN_ROLE_NAME = "Organization Admin";

async function main() {
  const org = await createOrganizationWithDefaultRoles({
    name: "Unimed (Pilot)",
    slug: "unimed-pilot",
    type: "BUYER",
    // No acceptedById — there's no platform-staff user row for this
    // bring-up step to attribute the data-sharing agreement to yet (see
    // organizations.ts's doc comment: optional only for scripts like this
    // one, same as the seed script's own bootstrap path).
  });

  await withTenantContext(org.id, async (tx) => {
    const user = await tx.user.upsert({
      where: { email: PILOT_USER_EMAIL },
      update: {},
      create: {
        organizationId: org.id,
        email: PILOT_USER_EMAIL,
        forename: PILOT_USER_FORENAME,
        surname: PILOT_USER_SURNAME,
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
      `Provisioned "${org.name}" (${org.id}) with ${PILOT_USER_EMAIL} as ${ADMIN_ROLE_NAME}. ` +
        `Status: ${user.status} (will flip to ACTIVE on first real sign-in).`,
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
