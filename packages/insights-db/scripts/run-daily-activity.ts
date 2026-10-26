/**
 * Manual / scheduled trigger for runDailyActivityAggregationPipeline (see src/aggregate-etl.ts).
 *   cd packages/insights-db && npm run aggregate:daily-activity
 */
import { prisma, waitForDatabase } from "@universe/db";
import { insightsPrisma } from "../src/index";
import { runDailyActivityAggregationPipeline } from "../src/aggregate-etl";

Promise.all([waitForDatabase("universe-insights", () => insightsPrisma.$queryRaw`SELECT 1 AS ok`), waitForDatabase("universe", () => prisma.$queryRaw`SELECT 1 AS ok`)])
  .then(() => runDailyActivityAggregationPipeline())
  .then((r) => { console.log(`aggregate:daily-activity: ${r.organizationsProcessed} orgs processed, ${r.rowsWritten} rows written.`); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
