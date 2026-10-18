import { prisma } from "../src/index";
import { runRegulatoryWatch } from "../src/regulatory-watch/run";

/** Daily regulatory watch entry point (GitHub Actions cron). DRY_RUN=true fetches and counts without writing. Exits 1 if any source failed. */
async function main() {
  const dryRun = process.env.DRY_RUN === "true";
  const sources = process.env.SOURCES ? process.env.SOURCES.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  console.log(`Regulatory watch (${dryRun ? "DRY RUN" : "LIVE"})${sources ? ` sources=${sources.join(",")}` : ""}`);
  const results = await runRegulatoryWatch({ dryRun, sources });
  for (const r of results) console.log(`${r.source}: ${r.status} fetched=${r.fetched} new=${r.newItems} changed=${r.changedItems} matches=${r.newMatches}${r.error ? ` error=${r.error}` : ""}`);
  await prisma.$disconnect();
  if (results.some((r) => r.status === "FAILED")) process.exit(1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
