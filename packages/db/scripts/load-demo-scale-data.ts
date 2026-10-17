import { prisma, withPlatformStaffContext } from "../src/index";
import { generateScaleData, PROFILES } from "./generate-scale-data";

/**
 * Loads the simulated "demo" scale dataset into the live Universe Demo
 * (agreed with Lewis 2026-10-17). SAFE BY DEFAULT:
 *  - DRY_RUN defaults to true: prints what exists and what would be added, writes nothing.
 *  - Refuses to run if simulated data is already present (idempotent) unless FORCE=true.
 *  - Prints row counts before and after.

 * (Non-dry runs also mark existing simulated rows with isSimulated, idempotently.)
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

/**
 * Marks existing simulated rows (idempotent, only touches rows carrying the simulation markers). The migration that
 * added the isSimulated columns also tried this, but row-level security hides tenant rows from a migration login,
 * so users in particular need it done through the platform-staff context.
 */
async function markSimulated() {
  return withPlatformStaffContext(async (tx) => ({
    organisations: (await tx.organization.updateMany({ where: { slug: { startsWith: "sim-" }, isSimulated: false }, data: { isSimulated: true } })).count,
    users: (await tx.user.updateMany({ where: { email: { endsWith: "@sim.example" }, isSimulated: false }, data: { isSimulated: true } })).count,
    usersOfSimulatedOrgs: (await tx.user.updateMany({ where: { organization: { isSimulated: true }, isSimulated: false }, data: { isSimulated: true } })).count,
    products: (await tx.productMaster.updateMany({ where: { sourceStandard: "SIM-SCALE", isSimulated: false }, data: { isSimulated: true } })).count,
  }));
}

/** Read-only inventory of cross-organisation (shared) data and organisations, to decide what counts as simulated. */
async function inventory() {
  return withPlatformStaffContext(async (tx) => ({
    organisations: (await tx.organization.findMany({ select: { name: true, slug: true, isDemo: true, isSimulated: true, status: true, type: true }, where: { isSimulated: false } })).map((o) => `${o.name} [${o.slug}] ${o.type} ${o.status}${o.isDemo ? " DEMO" : ""}`),
    nonSimulatedUsers: await tx.user.count({ where: { isSimulated: false } }),
    productMasterBySource: (await tx.productMaster.groupBy({ by: ["sourceStandard", "isSimulated"], _count: { _all: true } })).map((g) => `${g.sourceStandard ?? "(none)"} simulated=${g.isSimulated}: ${g._count._all}`),
    productMasterByAddingOrg: (await tx.productMaster.groupBy({ by: ["addedByOrganizationId"], _count: { _all: true } })).map((g) => `${g.addedByOrganizationId ?? "(seeded)"}: ${g._count._all}`),
    stakeholderRegistryEntries: await tx.stakeholderRegistryEntry.count(),
    supplierProfilesPublished: await tx.supplierProfile.count({ where: { publishedAt: { not: null } } }),
    supplierLeads: await tx.supplierLead.count(),
    productAttributeDefinitions: await tx.productAttributeDefinition.count(),
    countries: await tx.country.count(),
  }));
}

async function main() {
  const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
  const force = process.env.FORCE === "true";
  const seed = Number(process.env.SEED ?? 1);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LOAD"}; seed ${seed}`);
  console.log("Planned profile (demo):", JSON.stringify(PROFILES.demo));
  if (!dryRun) console.log("Marked simulated rows:", JSON.stringify(await markSimulated()));
  const before = await counts();
  console.log("Before:", JSON.stringify(before, null, 2));
  console.log("Shared-data inventory:", JSON.stringify(await inventory(), null, 2));
  // Organisations are created with upsert, so leftover orgs from an interrupted run are safe to continue over;
  // anything else means data was already loaded.
  const exists = before.simUsers > 0 || before.simProjectsInDemo > 0 || before.simProducts > 0 || before.simPartnersInDemo > 0;
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
