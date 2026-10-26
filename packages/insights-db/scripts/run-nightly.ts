/**
 * Nightly aggregation (2026-10-25): prices, logistics, sourcing, freight and services, each reading only what changed since ITS last successful run.
 * The pipelines append rows, so the last-run time is kept in aggregation_runs (infra/sql/insights-aggregation-runs.sql) and only moved forward after a
 * pipeline succeeds. With no record yet, a pipeline is not run: it records "now" as its starting point (so nothing already loaded by hand is counted again),
 * unless NIGHTLY_SINCE (an ISO date-time) is given. One failing pipeline does not stop the others; the job fails at the end if any failed.
 *   cd packages/insights-db && npm run aggregate:nightly
 */
import { prisma } from "@universe/db";
import { insightsPrisma } from "../src/index";
import { runAggregationPipeline, runLogisticsAggregationPipeline, runProductSourcingAggregationPipeline, runFreightCostAggregationPipeline, runServicePriceAggregationPipeline } from "../src/aggregate-etl";

const PIPELINES: { name: string; run: (since: Date) => Promise<{ organizationsProcessed: number; rowsWritten: number }> }[] = [
  { name: "prices", run: runAggregationPipeline },
  { name: "logistics", run: runLogisticsAggregationPipeline },
  { name: "sourcing", run: runProductSourcingAggregationPipeline },
  { name: "freight", run: runFreightCostAggregationPipeline },
  { name: "services", run: runServicePriceAggregationPipeline },
];

/**
 * Waits for both databases to answer (2026-10-26). The serverless SQL databases pause when idle and take up to a minute or two to resume; the
 * first connection after a pause fails with "Can't reach database server", which is what failed the 26 Oct run (all five pipelines inside 25 seconds,
 * then fine an hour later). Trying again for up to ten minutes turns that into a slow start instead of a failed night.
 */
async function waitForDatabases() {
  const probes: [string, () => Promise<unknown>][] = [["universe-insights", () => insightsPrisma.$queryRaw`SELECT 1 AS ok`], ["universe", () => prisma.$queryRaw`SELECT 1 AS ok`]];
  for (const [name, probe] of probes) {
    const deadline = Date.now() + 10 * 60_000;
    for (let attempt = 1; ; attempt++) {
      try { await probe(); if (attempt > 1) console.log(`aggregate:nightly ${name} answered on attempt ${attempt}.`); break; }
      catch (e) {
        if (Date.now() > deadline) throw e;
        console.log(`aggregate:nightly ${name} not answering yet (attempt ${attempt}), waiting 20 seconds.`);
        await new Promise((r) => setTimeout(r, 20_000));
      }
    }
  }
}

async function main() {
  await waitForDatabases();
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
