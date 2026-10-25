/**
 * Manual trigger for runServicePriceAggregationPipeline (see src/aggregate-etl.ts). Not yet scheduled, like the other pipelines.
 *   cd packages/insights-db && npm run aggregate:services
 */
import { runServicePriceAggregationPipeline } from "../src/aggregate-etl";

runServicePriceAggregationPipeline()
  .then((r) => { console.log(`aggregate:services: ${r.organizationsProcessed} orgs processed, ${r.rowsWritten} rows written.`); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
