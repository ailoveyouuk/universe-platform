import { prisma } from "@universe/db";
import { insightsPrisma, seedSimulatedAggregates } from "../src/index";

/**
 * Seeds simulated anonymised benchmark rows into universe-insights (all flagged isSimulated, visible only inside demo
 * organisations). Needs a WRITE login to universe-insights (INSIGHTS_DATABASE_URL) - the API's own login is read-only
 * by design - plus DATABASE_URL for the country centroids. Adds rows only; a table that already has simulated rows is skipped.
 */
seedSimulatedAggregates()
  .then((r) => console.log("Seeded:", JSON.stringify(r)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await insightsPrisma.$disconnect();
    await prisma.$disconnect();
  });
