import { prisma, withPlatformStaffContext } from "../src/index";

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const org = await tx.organization.findFirst({ where: { name: "Universe Demo" } });
    if (!org) {
      console.log("No Universe Demo org found.");
      return;
    }
    const [partners, roles, certs, products, projects, lines, statusHist, logMetrics, priceHist] = await Promise.all([
      tx.partner.count({ where: { organizationId: org.id } }),
      tx.partnerRole.count({ where: { partner: { organizationId: org.id } } }),
      tx.partnerCertification.count({ where: { organizationId: org.id } }),
      tx.productMaster.count(),
      tx.project.count({ where: { organizationId: org.id } }),
      tx.projectLine.count({ where: { organizationId: org.id } }),
      tx.projectStatusHistory.count({ where: { organizationId: org.id } }),
      tx.projectLineLogisticsMetric.count({ where: { organizationId: org.id } }),
      tx.productPriceHistory.count({ where: { organizationId: org.id } }),
    ]);
    console.log({ partners, roles, certs, productsGlobal: products, projects, lines, statusHist, logMetrics, priceHist });

    const byStatus = await tx.project.groupBy({ by: ["status"], where: { organizationId: org.id }, _count: true });
    console.log("Projects by status:", byStatus);
  });
}

main().finally(() => prisma.$disconnect());
