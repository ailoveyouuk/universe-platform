/**
 * Phase 7 — synthetic multi-organisation benchmark data (added 2026-10-09,
 * see product-database-and-map-roadmap.md "Stage 3 — simulated data for
 * testing"). Lewis's call: the Stage 3a/3c anonymized cross-tenant maps
 * are both genuinely working, but every read in @universe/insights-db
 * enforces MINIMUM_COHORT_SIZE (currently 5 — see packages/insights-db/src
 * /query.ts) at read time, and the live platform currently has only ONE
 * consented organisation ("Universe Demo"). No combination of dimensions
 * can ever clear a floor of 5 distinct contributing organisations with
 * just one org's data, so both maps correctly render empty — this script
 * exists purely to make them demoable/testable, not to fix a bug in them.
 *
 * Creates 4 additional, purely synthetic, data-only demo organisations
 * (no sign-in user on any of them — they exist only to contribute
 * anonymized rows, nobody needs to log into them) via the same
 * createOrganizationWithDefaultRoles() path every real org goes through,
 * which also means each one automatically gets a consented
 * DataSharingConsent row (see that function's own doc comment) — no
 * separate consent step needed here.
 *
 * DELIBERATE OVERLAP, not just "more random data": MINIMUM_COHORT_SIZE
 * counts DISTINCT ORGANISATIONS contributing to the SAME grouped
 * combination, so scattering diverse data across 4 new orgs would not, by
 * itself, make any single aggregate clear the floor — five different orgs
 * each shipping a DIFFERENT route/category never overlaps into one
 * five-strong cohort. Instead this script deliberately gives each of the
 * 4 new orgs (on top of what Universe Demo's existing Phase 1/2 seed data
 * already has) at least one line/approval matching each of a small,
 * fixed set of "benchmark" combinations — chosen to reuse combinations
 * Universe Demo's own Phase 1/2 data already has one instance of, so
 * Universe Demo's existing row becomes the cohort's 5th contributor
 * rather than needing to also be re-seeded here:
 *
 *   Logistics (manufactureCountryCode, destinationCountryCode,
 *   transportMode, incoterm, commodityGroup) — exact match required,
 *   since getAggregatedLogisticsRoutes groups on all five dimensions:
 *     - IN -> UG, AIR, DAP, DEVICES   (matches UNV-2026-007)
 *     - CN -> KE, AIR, CPT, EQUIPMENT (matches UNV-2026-008)
 *
 *   Product sourcing (category, manufactureCountryCode) — coarser, only
 *   two dimensions, since getAggregatedProductSourcing groups on just
 *   those:
 *     - Pharmaceuticals, DE (matches Rhein Pharma Produktion GmbH's
 *       Phase 6 APPROVED sourcing rows)
 *     - Medical Devices, CN (matches Guangzhou Sterile Devices Co.'s
 *       Phase 6 APPROVED sourcing rows)
 *
 * Each new org also gets a handful of additional, non-overlapping lines/
 * approvals for texture (realistic-looking, not just the bare minimum to
 * clear the floor) — these won't individually clear MINIMUM_COHORT_SIZE
 * and so won't appear on either map, which is correct, expected behaviour
 * (the same anonymization floor as every other combination on the
 * platform), not a gap to fix.
 *
 * Reuses EXISTING global ProductMaster catalog entries (queried by
 * category prefix at runtime, never hardcoded ids — the catalog is shared
 * across every organisation already) rather than creating new products,
 * since Stage 3c's map only cares about category + manufacture country,
 * not which specific product.
 *
 * Idempotent: organisations are upserted by slug (same as
 * provision-universe-demo.ts); Partners/Projects/ProjectLines/
 * ProductSourceApproval rows are tagged with a `[phase7-benchmark]`
 * marker in a free-text field and skipped on a field-level basis only
 * where Prisma supports a natural upsert key — see each section below for
 * exactly how.
 *
 * This only creates the TENANT-DATABASE rows. It does NOT compute
 * ProjectLineLogisticsMetric (run `npm run backfill:logistics-metrics`
 * from packages/db afterward — covers every organisation, including
 * these) and does NOT write anything into the separate insights
 * database (run `npm run aggregate:logistics` and
 * `npm run aggregate:product-sourcing` from packages/insights-db after
 * that) — see demo-data-build.md's run sequence, extended with this
 * phase, for the full order.
 *
 * Run from the repo root on a machine with a working DATABASE_URL:
 *   cd packages/db
 *   npx tsx scripts/seed-phase7-multi-org-benchmark-data.ts
 */
import { prisma, withTenantContext } from "../src/index";
import { createOrganizationWithDefaultRoles } from "../src/organizations";

const TAG = "[phase7-benchmark]";

interface BenchmarkOrg {
  name: string;
  slug: string;
  // A short, distinct manufacturer identity for this org's own benchmark
  // Partners — fictional, *.example.com, same convention as every other
  // demo company name in this build (see demo-data-build.md).
  pharmaManufacturer: { name: string; country: string };
  deviceManufacturer: { name: string; country: string };
}

const BENCHMARK_ORGS: BenchmarkOrg[] = [
  {
    name: "Meridian Health Sourcing",
    slug: "meridian-health-sourcing",
    pharmaManufacturer: { name: "Nordkreuz Pharma Fertigung GmbH", country: "DE" },
    deviceManufacturer: { name: "Pearl River Precision Devices Co.", country: "CN" },
  },
  {
    name: "Delta Procurement Partners",
    slug: "delta-procurement-partners",
    pharmaManufacturer: { name: "Rheinland Arzneimittel Produktion GmbH", country: "DE" },
    deviceManufacturer: { name: "Zhuhai Sterile Instruments Co.", country: "CN" },
  },
  {
    name: "Continental Supply Co",
    slug: "continental-supply-co",
    pharmaManufacturer: { name: "Schwarzwald Pharmazeutika GmbH", country: "DE" },
    deviceManufacturer: { name: "Foshan Clinical Devices Co.", country: "CN" },
  },
  {
    name: "Pacific Rim Medical Trading",
    slug: "pacific-rim-medical-trading",
    pharmaManufacturer: { name: "Bayern Pharma Herstellung GmbH", country: "DE" },
    deviceManufacturer: { name: "Dongguan Medical Instruments Co.", country: "CN" },
  },
];

// The two deliberately-overlapping logistics "benchmark" combinations —
// see the header comment for why these specific values were chosen
// (each matches an existing Universe Demo Phase 1/2 line exactly).
const LOGISTICS_BENCHMARKS = [
  {
    key: "in-ug-air-dap-devices",
    manufactureCountryCode: "IN",
    destinationCountryCode: "UG",
    freightMode: "AIR",
    incoterm: "DAP",
    productCategory: "DEVICES",
    description: "Handheld diagnostic devices — outreach programme replenishment",
  },
  {
    key: "cn-ke-air-cpt-equipment",
    manufactureCountryCode: "CN",
    destinationCountryCode: "KE",
    freightMode: "AIR",
    incoterm: "CPT",
    productCategory: "EQUIPMENT",
    description: "Portable diagnostic/monitoring equipment — regional hospital order",
  },
];

// A handful of additional, non-overlapping lines per org for texture —
// won't individually clear MINIMUM_COHORT_SIZE, by design (see header).
const TEXTURE_ROUTES = [
  { manufactureCountryCode: "CN", destinationCountryCode: "ET", freightMode: "SEA", incoterm: "FOB", productCategory: "CONSUMABLES" },
  { manufactureCountryCode: "IN", destinationCountryCode: "FJ", freightMode: "SEA", incoterm: "CIF", productCategory: "REAGENTS" },
  { manufactureCountryCode: "DE", destinationCountryCode: "ZA", freightMode: "AIR", incoterm: "CIP", productCategory: "PHARMACEUTICALS" },
];

async function findOrCreatePartner(organizationId: string, name: string, countryCode: string, roleType: string) {
  const normalizedName = name.toLowerCase().replace(/[^\w\s]/g, "").trim();
  return withTenantContext(organizationId, async (tx) => {
    let partner = await tx.partner.findFirst({ where: { organizationId, normalizedName } });
    if (!partner) {
      partner = await tx.partner.create({
        data: { organizationId, name, normalizedName, countryCode, approvalStatus: "APPROVED" },
      });
    }
    await tx.partnerRole.upsert({
      where: { partnerId_roleType: { partnerId: partner.id, roleType } },
      update: {},
      create: { partnerId: partner.id, roleType },
    });
    return partner;
  });
}

async function ensureProject(organizationId: string, referenceNumber: string, title: string, deliveryCountryCode: string, freightMode: string, incoterm: string) {
  return withTenantContext(organizationId, async (tx) => {
    const existing = await tx.project.findFirst({ where: { organizationId, referenceNumber } });
    if (existing) return existing;
    return tx.project.create({
      data: {
        organizationId,
        referenceNumber,
        title,
        category: "PROCUREMENT",
        projectType: "NON_PHARMACEUTICAL",
        deliveryCountryCode,
        status: "AWARDED",
        incoterm,
        freightMode,
        projectNotes: TAG,
      },
    });
  });
}

async function pickCatalogProducts(categoryPrefix: string, take: number) {
  return prisma.productMaster.findMany({
    where: { category: { startsWith: categoryPrefix }, isArchived: false },
    select: { id: true, category: true },
    take,
  });
}

async function main() {
  let orgsCreated = 0;
  let linesCreated = 0;
  let approvalsCreated = 0;

  // Pull a few real, existing global catalog products per category once —
  // shared across every benchmark org below (the catalog itself is global,
  // not tenant-scoped).
  const pharmaProducts = await pickCatalogProducts("Pharmaceuticals", 3);
  const deviceProducts = await pickCatalogProducts("Medical Devices", 3);
  if (pharmaProducts.length === 0 || deviceProducts.length === 0) {
    console.warn(
      "No existing ProductMaster rows found under 'Pharmaceuticals'/'Medical Devices' — run seed-phase1-partners-products.ts and seed-phase6-product-depth.ts first. Continuing with whatever was found.",
    );
  }

  for (const bOrg of BENCHMARK_ORGS) {
    const org = await createOrganizationWithDefaultRoles({ name: bOrg.name, slug: bOrg.slug, type: "PROCUREMENT_SERVICE_AGENT" });
    orgsCreated += 1;

    const pharmaManufacturer = await findOrCreatePartner(org.id, bOrg.pharmaManufacturer.name, bOrg.pharmaManufacturer.country, "MANUFACTURER");
    const deviceManufacturer = await findOrCreatePartner(org.id, bOrg.deviceManufacturer.name, bOrg.deviceManufacturer.country, "MANUFACTURER");

    // --- Logistics benchmark lines (deliberately overlapping, see header) ---
    // Project.deliveryCountryCode/freightMode/incoterm are PROJECT-level
    // (moved there 2026-10-03, see schema.prisma's Project model comment),
    // and the two logistics benchmarks below need two different delivery
    // countries/modes/incoterms — so each benchmark gets its OWN project,
    // not two lines sharing one project. This first project is built to
    // match the "IN -> UG, AIR, DAP" benchmark exactly; the second is
    // created inline below for "CN -> KE, AIR, CPT".
    const logisticsProject = await ensureProject(
      org.id,
      `BMK-${bOrg.slug.toUpperCase().replace(/-/g, "")}-001`,
      `${bOrg.name} — benchmark logistics programme`,
      "UG",
      "AIR",
      "DAP",
    );
    for (const benchmark of LOGISTICS_BENCHMARKS) {
      const project = benchmark.key === "in-ug-air-dap-devices"
        ? logisticsProject
        : await ensureProject(
            org.id,
            `BMK-${bOrg.slug.toUpperCase().replace(/-/g, "")}-002`,
            `${bOrg.name} — benchmark equipment programme`,
            benchmark.destinationCountryCode,
            benchmark.freightMode,
            benchmark.incoterm,
          );

      await withTenantContext(org.id, async (tx) => {
        const existingLine = await tx.projectLine.findFirst({
          where: { projectId: project.id, countryOfManufactureCode: benchmark.manufactureCountryCode, productCategory: benchmark.productCategory },
        });
        if (existingLine) return;
        await tx.projectLine.create({
          data: {
            organizationId: org.id,
            projectId: project.id,
            clientProductDescription: `${TAG} ${benchmark.description}`,
            quantity: 1,
            productCategory: benchmark.productCategory,
            weightKg: 180,
            countryOfManufactureCode: benchmark.manufactureCountryCode,
            manufacturerId: benchmark.productCategory === "DEVICES" || benchmark.productCategory === "EQUIPMENT" ? deviceManufacturer.id : pharmaManufacturer.id,
          },
        });
        linesCreated += 1;
      });
    }

    // --- Texture lines (non-overlapping, won't clear the cohort floor) ---
    const textureProject = await ensureProject(
      org.id,
      `BMK-${bOrg.slug.toUpperCase().replace(/-/g, "")}-003`,
      `${bOrg.name} — additional programme lines`,
      "ET",
      "SEA",
      "FOB",
    );
    for (const route of TEXTURE_ROUTES) {
      await withTenantContext(org.id, async (tx) => {
        const existingLine = await tx.projectLine.findFirst({
          where: { projectId: textureProject.id, countryOfManufactureCode: route.manufactureCountryCode, productCategory: route.productCategory },
        });
        if (existingLine) return;
        await tx.projectLine.create({
          data: {
            organizationId: org.id,
            projectId: textureProject.id,
            clientProductDescription: `${TAG} additional benchmark line`,
            quantity: 1,
            productCategory: route.productCategory,
            weightKg: 120,
            countryOfManufactureCode: route.manufactureCountryCode,
          },
        });
        linesCreated += 1;
      });
    }

    // --- Product sourcing benchmark approvals (Stage 3c cohort) ---
    await withTenantContext(org.id, async (tx) => {
      for (const product of pharmaProducts) {
        const existing = await tx.productSourceApproval.findFirst({
          where: { organizationId: org.id, productMasterId: product.id, manufacturerId: pharmaManufacturer.id },
        });
        if (existing) continue;
        await tx.productSourceApproval.create({
          data: {
            organizationId: org.id,
            productMasterId: product.id,
            manufacturerId: pharmaManufacturer.id,
            status: "APPROVED",
            approvedAt: new Date(),
            notes: TAG,
          },
        });
        approvalsCreated += 1;
      }
      for (const product of deviceProducts) {
        const existing = await tx.productSourceApproval.findFirst({
          where: { organizationId: org.id, productMasterId: product.id, manufacturerId: deviceManufacturer.id },
        });
        if (existing) continue;
        await tx.productSourceApproval.create({
          data: {
            organizationId: org.id,
            productMasterId: product.id,
            manufacturerId: deviceManufacturer.id,
            status: "APPROVED",
            approvedAt: new Date(),
            notes: TAG,
          },
        });
        approvalsCreated += 1;
      }
    });

    console.log(`Provisioned "${org.name}" (${org.id}) with benchmark logistics lines and product sourcing approvals.`);
  }

  console.log(
    `Phase 7 benchmark data: ${orgsCreated} organisations processed, ${linesCreated} project lines created, ${approvalsCreated} source approvals created. ` +
      `Next: run 'npm run backfill:logistics-metrics' (packages/db), then 'npm run aggregate:logistics' and 'npm run aggregate:product-sourcing' (packages/insights-db).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
