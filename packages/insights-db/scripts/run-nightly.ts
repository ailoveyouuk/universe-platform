/**
 * Nightly aggregation (2026-10-25): prices, logistics, sourcing, freight and services, each reading only what changed since ITS last successful run.
 * The pipelines append rows, so the last-run time is kept in aggregation_runs (infra/sql/insights-aggregation-runs.sql) and only moved forward after a
 * pipeline succeeds. With no record yet, a pipeline is not run: it records "now" as its starting point (so nothing already loaded by hand is counted again),
 * unless NIGHTLY_SINCE (an ISO date-time) is given. One failing pipeline does not stop the others; the job fails at the end if any failed.
 *   cd packages/insights-db && npm run aggregate:nightly
 */
import { insightsPrisma } from "../src/index";
import { runAggregationPipeline, runLogisticsAggregationPipeline, runProductSourcingAggregationPipeline, runFreightCostAggregationPipeline, runServicePriceAggregationPipeline } from "../src/aggregate-etl";

const PIPELINES: { name: string; run: (since: Date) => Promise<{ organizationsProcessed: number; rowsWritten: number }> }[] = [
  { name: "prices", run: runAggregationPipeline },
  { name: "logistics", run: runLogisticsAggregationPipeline },
  { name: "sourcing", run: runProductSourcingAggregationPipeline },
  { name: "freight", run: runFreightCostAggregationPipeline },
  { name: "services", run: runServicePriceAggregationPipeline },
];

async function main() {
  const override = process.env.NIGHTLY_SINCE ? new Date(process.env.NIGHTLY_SINCE) : null;
  if (override && Number.isNaN(override.getTime())) throw new Error("NIGHTLY_SINCE is not a valid date-time.");
  let failed = 0;
  for (const p of PIPELINES) {
    const startedAt = new Date();
    try {
      const last = await insightsPrisma.aggregationRun.findUnique({ where: { pipeline: p.name } });
      const since = last?.lastRunAt ?? override;
      if (!since) console.log(`aggregate:nightly ${p.name}: first run, starting point recorded (nothing read).`);
      else {
        const r = await p.run(since);
        console.log(`aggregate:nightly ${p.name}: since ${since.toISOString()}, ${r.organizationsProcessed} orgs processed, ${r.rowsWritten} rows written.`);
      }
      await insightsPrisma.aggregationRun.upsert({ where: { pipeline: p.name }, create: { pipeline: p.name, lastRunAt: startedAt }, update: { lastRunAt: startedAt, updatedAt: new Date() } });
    } catch (e) {
      failed += 1;
      console.error(`aggregate:nightly ${p.name} FAILED (its starting point is unchanged, so the next run covers the gap):`, e);
    }
  }
  process.exit(failed ? 1 : 0);
}
main();
