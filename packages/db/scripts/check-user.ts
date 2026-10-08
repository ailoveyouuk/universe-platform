import { prisma, withPlatformStaffContext } from "../src/index";

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const orgs = await tx.organization.findMany({
      select: { id: true, name: true, slug: true, type: true },
    });
    console.log("Organizations:", JSON.stringify(orgs, null, 2));

    const users = await tx.user.findMany({
      select: { id: true, email: true, status: true, entraObjectId: true, organizationId: true, firstSignInAt: true },
    });
    console.log("Users:", JSON.stringify(users, null, 2));
  });
}

main().finally(() => prisma.$disconnect());
