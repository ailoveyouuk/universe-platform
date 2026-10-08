import { prisma, withPlatformStaffContext } from "../src/index";

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const org = await tx.organization.findFirst({ where: { name: "Universe Demo" } });
    if (!org) {
      console.log("No Universe Demo org found.");
      return;
    }
    const [
      partners, roles, certs, products, projects, lines, statusHist, logMetrics, priceHist,
      evidenceStandards, evidenceRecords, batches, tempLogs, risks, controlledDocs,
    ] = await Promise.all([
      tx.partner.count({ where: { organizationId: org.id } }),
      tx.partnerRole.count({ where: { partner: { organizationId: org.id } } }),
      tx.partnerCertification.count({ where: { organizationId: org.id } }),
      tx.productMaster.count(),
      tx.project.count({ where: { organizationId: org.id } }),
      tx.projectLine.count({ where: { organizationId: org.id } }),
      tx.projectStatusHistory.count({ where: { organizationId: org.id } }),
      tx.projectLineLogisticsMetric.count({ where: { organizationId: org.id } }),
      tx.productPriceHistory.count({ where: { organizationId: org.id } }),
      tx.evidenceStandardDefinition.count({ where: { organizationId: org.id } }),
      tx.stakeholderEvidenceRecord.count({ where: { organizationId: org.id } }),
      tx.productBatch.count({ where: { organizationId: org.id } }),
      tx.batchTemperatureLog.count({ where: { organizationId: org.id } }),
      tx.riskAssessment.count({ where: { organizationId: org.id } }),
      tx.controlledDocument.count({ where: { organizationId: org.id } }),
    ]);
    console.log({
      partners, roles, certs, productsGlobal: products, projects, lines, statusHist, logMetrics, priceHist,
      evidenceStandards, evidenceRecords, batches, tempLogs, risks, controlledDocs,
    });

    const byStatus = await tx.project.groupBy({ by: ["status"], where: { organizationId: org.id }, _count: true });
    console.log("Projects by status:", byStatus);

    const linesWithBatch = await tx.projectLine.count({ where: { organizationId: org.id, productBatchId: { not: null } } });
    console.log("ProjectLines linked to a ProductBatch:", linesWithBatch);
  });
}

main().finally(() => prisma.$disconnect());
