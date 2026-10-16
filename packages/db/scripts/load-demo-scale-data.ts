import { prisma, withPlatformStaffContext } from "../src/index";
import { generateScaleData, PROFILES } from "./generate-scale-data";

/**
 * Loads the simulated "demo" scale dataset into the live Universe Demo
 * (agreed with Lewis 2026-10-17). SAFE BY DEFAULT:
 *  - DRY_RUN defaults to true: prints what exists and what would be added, writes nothing.
 *  - Refuses to run if simulated data is already present (idempotent) unless FORCE=true.
 *  - Prints row counts before and after.
 * Usage: DATABASE_URL=... DRY_RUN=false SEED=1 tsx scripts/load-demo-scale-data.ts
 */
async function counts() {
  return withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findMany({ where: { isDemo: true }, select: { id: true, name: true } });
    if (demo.length !== 1) throw new Error(`Expected exactly one demo organisation (isDemo=true), found ${demo.length}`);
    const orgId = demo[0].id;
    const simOrgs = await tx.organization.count({ where: { slug: { startsWith: "sim-" } } });
    const simUsers = await tx.user.count({ where: { email: { endsWith: "@sim.example" } } });
    return {
      demoOrganization: demo[0].name,
      demoOrgId: orgId,
      simOrganisations: simOrgs,
      simUsers,
      simProducts: await tx.productMaster.count({ where: { sourceStandard: "SIM-SCALE" } }),
      simPartnersInDemo: await tx.partner.count({ where: { organizationId: orgId, normalizedName: { startsWith: "simscale" } } }),
      simProjectsInDemo: await tx.project.count({ where: { organizationId: orgId, referenceNumber: { startsWith: "SIM-" } } }),
      demoProjectLines: await tx.projectLine.count({ where: { organizationId: orgId } }),
      demoLogisticsMetrics: await tx.projectLineLogisticsMetric.count({ where: { organizationId: orgId } }),
      demoSourceApprovals: await tx.productSourceApproval.count({ where: { organizationId: orgId } }),
      demoRisks: await tx.riskAssessment.count({ where: { organizationId: orgId } }),
      demoBatches: await tx.productBatch.count({ where: { organizationId: orgId } }),
    };
  });
}

async function main() {
  const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
  const force = process.env.FORCE === "true";
  const seed = Number(process.env.SEED ?? 1);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LOAD"}; seed ${seed}`);
  console.log("Planned profile (demo):", JSON.stringify(PROFILES.demo));
  const before = await counts();
  console.log("Before:", JSON.stringify(before, null, 2));
  const exists = before.simOrganisations > 0 || before.simProjectsInDemo > 0 || before.simProducts > 0;
  if (exists && !force) {
    console.log("Simulated data is already present - nothing to do (set FORCE=true only after clearing it).");
    return;
  }
  if (dryRun) {
    console.log("Dry run complete. Re-run with DRY_RUN=false to load.");
    return;
  }
  await generateScaleData("demo", seed);
  const after = await counts();
  console.log("After:", JSON.stringify(after, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
