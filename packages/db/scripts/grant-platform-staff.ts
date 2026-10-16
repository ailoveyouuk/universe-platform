/**
 * Grants (or revokes) platform-staff access for an existing user — the one
 * thing the Admin app deliberately can't bootstrap, because changing a
 * platform role requires already being platform staff.
 *
 *   cd packages/db
 *   npx tsx scripts/grant-platform-staff.ts you@example.com SUPER_ADMIN
 *   npx tsx scripts/grant-platform-staff.ts you@example.com NONE        # revoke
 *
 * Roles: SUPER_ADMIN | SUPPORT | NONE. Runs under withPlatformStaffContext
 * (users is row-level-security protected) and writes a FieldChangeLog entry so
 * the grant is on the audit trail. Needs DATABASE_URL pointing at the target
 * database (same as every other script here).
 */
import { prisma, withPlatformStaffContext } from "../src/index";

const ROLES = ["SUPER_ADMIN", "SUPPORT", "NONE"] as const;

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error(`Usage: npx tsx scripts/grant-platform-staff.ts <email> <${ROLES.join("|")}>`);
  }
  await withPlatformStaffContext(async (tx) => {
    const user = await tx.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No user with email ${email}. Invite them in the Admin app first.`);
    if (user.platformStaffRole === role) {
      console.log(`${email} is already ${role}. Nothing to do.`);
      return;
    }
    await tx.user.update({ where: { id: user.id }, data: { platformStaffRole: role } });
    await tx.fieldChangeLog.create({
      data: {
        organizationId: user.organizationId,
        tableName: "users",
        recordId: user.id,
        fieldName: "platformStaffRole",
        oldValue: user.platformStaffRole,
        newValue: role,
        changedById: null,
        reason: "Set via scripts/grant-platform-staff.ts",
        source: "SYSTEM",
      },
    });
    console.log(`${email}: platformStaffRole ${user.platformStaffRole} -> ${role}`);
  });
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
