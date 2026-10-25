import { insightsPrisma } from "../src/index";

/**
 * Read-only audit (2026-10-25): what is in the anonymised price pool, by origin, so Lewis can see that nothing but simulated demo rows and
 * pre-margin cost rows are there. Changes nothing.
 */
async function main() {
  const [total, simulated, real] = await Promise.all([
    insightsPrisma.aggregatedProductPrice.count(),
    insightsPrisma.aggregatedProductPrice.count({ where: { isSimulated: true } }),
    insightsPrisma.aggregatedProductPrice.count({ where: { isSimulated: false } }),
  ]);
  console.log(`Price rows: ${total} total, ${simulated} simulated demo rows, ${real} real-organisation rows.`);
  if (real > 0) {
    const first = await insightsPrisma.aggregatedProductPrice.findFirst({ where: { isSimulated: false }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    const last = await insightsPrisma.aggregatedProductPrice.findFirst({ where: { isSimulated: false }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const orgs = await insightsPrisma.aggregatedProductPrice.groupBy({ by: ["sourceHash"], where: { isSimulated: false } });
    console.log(`Real rows written between ${first?.createdAt.toISOString()} and ${last?.createdAt.toISOString()} by ${orgs.length} organisation(s).`);
    console.log("Rows written before 2026-10-25 came from the earlier pipeline (ProductPriceHistory), whose figure was not labelled cost or sale: review these before relying on them.");
  } else {
    console.log("No real-organisation price rows exist yet: nothing to review. Every future row comes from the supplier cost price only.");
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
