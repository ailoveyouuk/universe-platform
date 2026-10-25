/**
 * Manual trigger for runFreightCostAggregationPipeline (see src/aggregate-etl.ts). Not yet scheduled, like the other pipelines.
 *   cd packages/insights-db && npm run aggregate:freight
 */
import { runFreightCostAggregationPipeline } from "../src/aggregate-etl";

runFreightCostAggregationPipeline()
  .then((r) => { console.log(`aggregate:freight: ${r.organizationsProcessed} orgs processed, ${r.rowsWritten} rows written.`); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
