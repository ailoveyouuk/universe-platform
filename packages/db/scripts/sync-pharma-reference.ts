import { prisma, waitForDatabase } from "../src/index";
import { runPharmaReferenceSync } from "../src/pharma-reference/run";

const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const sources = (process.env.SOURCES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
waitForDatabase("universe", () => prisma.$queryRaw`SELECT 1 AS ok`).then(() => runPharmaReferenceSync({ dryRun, sources })).then((rs) => {
  for (const r of rs) console.log(`${dryRun ? "DRY RUN " : ""}${r.source}: ${r.status} fetched ${r.fetched}, added ${r.added}, changed ${r.changed}, removed ${r.removed}${r.error ? `, error: ${r.error}` : ""}`);
  process.exit(rs.some((r) => r.status === "FAILED") ? 1 : 0);
}).catch((e) => { console.error(e); process.exit(1); });
