import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Break-glass (2026-10-28): puts a protected administrator back to SUPER_ADMIN and ACTIVE, and clears any archive marks.
 * RELINK=true also clears the linked Microsoft identity and sets the account to INVITED, so the next successful sign-in with that
 * email links the account again (use when the Microsoft identity was recreated). Never deletes anything. Idempotent.
 * USER_EMAIL defaults to the protected address in apps/api/src/users/protected-accounts.ts.
 */
const EMAIL = (process.env.USER_EMAIL ?? "lewis@eduparcs.onmicrosoft.com").trim().toLowerCase();
const relink = process.env.RELINK === "true";

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const u = await tx.user.findFirst({ where: { email: EMAIL }, select: { id: true, email: true, status: true, platformStaffRole: true, entraObjectId: true } });
    if (!u) throw new Error(`No user with email ${EMAIL}.`);
    console.log(`Before: ${u.email} status=${u.status} staffRole=${u.platformStaffRole} linked=${!!u.entraObjectId}`);
    await tx.user.update({
      where: { id: u.id },
      data: { platformStaffRole: "SUPER_ADMIN", archivedAt: null, archivedById: null, archiveReason: null, ...(relink ? { status: "INVITED", entraObjectId: null, firstSignInAt: null } : { status: u.entraObjectId ? "ACTIVE" : "INVITED" }) },
    });
    console.log(relink ? "Restored as SUPER_ADMIN and set to INVITED: sign in with that email to link it again." : "Restored as SUPER_ADMIN.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
