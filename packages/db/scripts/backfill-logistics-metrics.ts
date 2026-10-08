/**
 * One-off backfill: computes ProjectLineLogisticsMetric for every EXISTING
 * ProjectLine across every organization — added 2026-10-08, see
 * supply-chain-co2-efficiency.md. Going forward, new/edited lines compute
 * this automatically (ProjectsService.recomputeLineLogisticsMetric); this
 * script is only needed once, to cover lines created before the feature
 * existed, and again any time METHODOLOGY_VERSION changes and existing
 * rows should be recalculated under the new methodology.
 *
 * Requires Country.latitude/longitude to already be seeded — run
 * `npm run seed:country-centroids` first (also in packages/db).
 *
 * Safe to re-run: upserts by projectLineId, so a rerun just recomputes
 * (not duplicates) every line's metric. Skips a line if it doesn't yet
 * have the inputs to compute from (no manufacture country, no project
 * delivery country, or no project freight mode) — logs a count rather
 * than erroring, since that's an expected, common state for a lot of
 * existing data, not a bug.
 *
 * Run from the repo root on a machine with a working DATABASE_URL:
 *   cd packages/db
 *   npm run backfill:logistics-metrics
 */
import { prisma, withTenantContext, computeLogisticsMetric, type TransportMode } from "../src/index";

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  const countryCache = new Map<string, { lat: number; lng: number } | null>();

  async function centroidFor(code: string | null): Promise<{ lat: number; lng: number } | null> {
    if (!code) return null;
    if (countryCache.has(code)) return countryCache.get(code) ?? null;
    const country = await prisma.country.findUnique({ where: { code }, select: { latitude: true, longitude: true } });
    const centroid = country?.latitude != null && country?.longitude != null ? { lat: country.latitude, lng: country.longitude } : null;
    countryCache.set(code, centroid);
    return centroid;
  }

  let computed = 0;
  let skipped = 0;

  for (const org of orgs) {
    await withTenantContext(org.id, async (tx) => {
      const lines = await tx.projectLine.findMany({
        include: { project: { select: { deliveryCountryCode: true, freightMode: true, incoterm: true } } },
      });

      for (const line of lines) {
        const mode: TransportMode | null =
          line.project.freightMode === "AIR" || line.project.freightMode === "SEA" || line.project.freightMode === "LAND"
            ? line.project.freightMode
            : null;

        const manufactureCentroid = await centroidFor(line.countryOfManufactureCode);
        const destinationCentroid = await centroidFor(line.project.deliveryCountryCode);

        const result = computeLogisticsMetric({
          manufactureCentroid,
          destinationCentroid,
          transportMode: mode,
          weightKg: line.weightKg != null ? Number(line.weightKg) : null,
          productCategory: line.productCategory,
          goodsCollectedDate: line.goodsCollectedDate,
          goodsDeliveredToClientDate: line.goodsDeliveredToClientDate,
        });

        if (!result) {
          skipped += 1;
          continue;
        }

        const metricData = {
          organizationId: org.id,
          projectId: line.projectId,
          manufactureCountryCode: line.countryOfManufactureCode,
          destinationCountryCode: line.project.deliveryCountryCode,
          transportMode: mode,
          incoterm: line.project.incoterm,
          commodityGroup: line.productCategory,
          weightKgUsed: result.weightKgUsed,
          weightEstimated: result.weightEstimated,
          distanceKm: result.distanceKm,
          co2FactorKgPerTonneKm: result.co2FactorKgPerTonneKm,
          co2TotalKg: result.co2TotalKg,
          durationDays: result.durationDays,
          efficiencyScore: result.efficiencyScore,
          scoreBand: result.scoreBand,
          methodologyVersion: result.methodologyVersion,
        };

        await tx.projectLineLogisticsMetric.upsert({
          where: { projectLineId: line.id },
          create: { projectLineId: line.id, ...metricData },
          update: metricData,
        });
        computed += 1;
      }
    });
  }

  console.log(`Logistics metrics backfill: ${computed} lines computed, ${skipped} skipped (missing manufacture country, delivery country, or freight mode).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
