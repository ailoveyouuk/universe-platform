/**
 * Manual / scheduled trigger for runDailyActivityAggregationPipeline (see src/aggregate-etl.ts).
 *   cd packages/insights-db && npm run aggregate:daily-activity
 */
import { runDailyActivityAggregationPipeline } from "../src/aggregate-etl";

runDailyActivityAggregationPipeline()
  .then((r) => { console.log(`aggregate:daily-activity: ${r.organizationsProcessed} orgs processed, ${r.rowsWritten} rows written.`); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
