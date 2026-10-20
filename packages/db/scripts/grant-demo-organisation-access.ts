import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Lets one named user switch into the demo organisations (2026-10-20, requested by Lewis). The user must exist, be ACTIVE and have a demo
 * organisation as their home; only demo organisations can be granted (the API re-checks both on every request). USER_EMAIL selects the user.
 * Adds missing grants, never removes any. DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const EMAIL = (process.env.USER_EMAIL ?? "lewis@eduparcs.onmicrosoft.com").trim().toLowerCase();

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const user = await tx.user.findFirst({ where: { email: EMAIL }, select: { id: true, email: true, status: true, organizationId: true, platformStaffRole: true, organization: { select: { name: true, isDemo: true } } } });
    if (!user) throw new Error(`No user with email ${EMAIL}.`);
    if (user.status !== "ACTIVE") throw new Error(`${EMAIL} is ${user.status}, not ACTIVE.`);
    if (!user.organization.isDemo) throw new Error(`${EMAIL}'s home organisation (${user.organization.name}) is not a demo organisation; refusing.`);
    const targets = await tx.organization.findMany({ where: { isDemo: true, id: { not: user.organizationId }, status: { not: "SUSPENDED" } }, select: { id: true, name: true } });
    const have = new Set((await tx.userOrganizationAccess.findMany({ where: { userId: user.id }, select: { grantedOrganizationId: true } })).map((g) => g.grantedOrganizationId));
    const fresh = targets.filter((t) => !have.has(t.id));
    console.log(`${EMAIL} (home: ${user.organization.name}, staff role: ${user.platformStaffRole}); demo organisations available: ${targets.map((t) => t.name).join(", ") || "none"}; new grants: ${fresh.map((t) => t.name).join(", ") || "none"}.`);
    if (dryRun) { console.log("DRY RUN: nothing written."); return; }
    for (const t of fresh) await tx.userOrganizationAccess.create({ data: { userId: user.id, grantedOrganizationId: t.id, grantedBy: "grant-demo-organisation-access script" } });
    console.log(`Granted ${fresh.length}.`);
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
