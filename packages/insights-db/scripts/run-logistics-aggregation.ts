/**
 * Manual trigger for runLogisticsAggregationPipeline — see that
 * function's doc comment in src/aggregate-etl.ts. Not yet wired to a
 * scheduler (same "not yet scheduled, run manually" state as
 * runAggregationPipeline/scripts/aggregate.ts).
 *
 * Run from the repo root on a machine with a working INSIGHTS_DATABASE_URL
 * and DATABASE_URL:
 *   cd packages/insights-db
 *   npm run aggregate:logistics
 */
import { runLogisticsAggregationPipeline } from "../src/aggregate-etl";

runLogisticsAggregationPipeline()
  .then((result) => {
    console.log(`Logistics aggregation: ${result.organizationsProcessed} orgs processed, ${result.rowsWritten} rows written.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
