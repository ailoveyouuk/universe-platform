/**
 * Manual trigger for runProductSourcingAggregationPipeline — see that
 * function's doc comment in src/aggregate-etl.ts. Not yet wired to a
 * scheduler (same "not yet scheduled, run manually" state as the other
 * two pipelines).
 *
 * Run from the repo root on a machine with a working INSIGHTS_DATABASE_URL
 * and DATABASE_URL:
 *   cd packages/insights-db
 *   npm run aggregate:product-sourcing
 */
import { runProductSourcingAggregationPipeline } from "../src/aggregate-etl";

runProductSourcingAggregationPipeline()
  .then((result) => {
    console.log(
      `Product sourcing aggregation: ${result.organizationsProcessed} orgs processed, ${result.rowsWritten} rows written.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
