import { prisma } from "../src/index";
async function main() {
  const orgs = await prisma.organization.findMany({ select: { name: true, logoUrl: true, primaryColor: true, secondaryColor: true } });
  console.log(orgs);
}
main().finally(() => prisma.$disconnect());
