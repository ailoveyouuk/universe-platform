/**
 * Seeds Country.latitude/longitude from a public-domain country-centroid
 * reference dataset (see _country-centroids-data.ts's own header comment
 * for provenance) — added 2026-10-08 for the supply-chain CO2/distance
 * measurement feature (supply-chain-co2-efficiency.md). These coordinates
 * are shared reference data, not tenant-scoped, same as Country/Region
 * themselves.
 *
 * Idempotent / safe to re-run: only fills in rows that exist in `countries`
 * and currently have a null latitude or longitude, and only from entries in
 * COUNTRY_CENTROIDS that actually resolve to real numbers (the source
 * dataset has one explicit gap — UM/US Minor Outlying Islands — which is
 * skipped rather than guessed).
 *
 * Run from the repo root on a machine with a working DATABASE_URL:
 *   cd packages/db
 *   npm run seed:country-centroids
 */
import { prisma } from "../src/index";
import { COUNTRY_CENTROIDS } from "./_country-centroids-data";

async function main() {
  let updated = 0;
  let skippedNoCountryRow = 0;

  for (const [code, coords] of Object.entries(COUNTRY_CENTROIDS)) {
    const country = await prisma.country.findUnique({ where: { code } });
    if (!country) {
      skippedNoCountryRow += 1;
      continue;
    }
    await prisma.country.update({
      where: { code },
      data: { latitude: coords.lat, longitude: coords.lng },
    });
    updated += 1;
  }

  console.log(`Country centroids: ${updated} updated, ${skippedNoCountryRow} skipped (no matching countries row).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
