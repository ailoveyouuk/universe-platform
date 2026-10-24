import { prisma } from "../src/index";
import { categoriesForHs } from "../../types/src/category-codes";
import { SCOPE_TAXONOMY, scopeSubsForProduct } from "../../types/src/supplier-scope";

/** Read-only (2026-10-23): checks every product's HS code against the category to HS mapping. Writes nothing. */
async function main() {
  const rows = await prisma.productMaster.findMany({ where: { hsCode: { not: null } }, select: { id: true, name: true, category: true, hsCode: true, isSimulated: true } });
  const odd: string[] = [];
  const bad = new Map<string, number>(); let ok = 0;
  for (const r of rows) {
    const top = r.category.split(".")[0];
    if (categoriesForHs(r.hsCode!).includes(top)) ok++;
    else { if (odd.length < 60) odd.push(`${r.id} | ${top} | ${r.hsCode} | ${r.name}${r.isSimulated ? " (sim)" : ""}`); const k = `${top} | ${r.hsCode} | maps to: ${categoriesForHs(r.hsCode!).join(", ") || "nothing"}`; bad.set(k, (bad.get(k) ?? 0) + 1); }
  }
  console.log(`products with an HS code: ${rows.length}; consistent with their category: ${ok}; not: ${rows.length - ok}`);
  if (rows.length - ok <= 60) for (const o of odd) console.log(`  MISMATCH ${o}`);
  for (const [k, n] of [...bad.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);
}
async function scope() {
  const rows = await prisma.productMaster.findMany({ select: { name: true, category: true, hsCode: true, inn: true, brand: true } });
  const per = new Map<string, { total: number; none: number; subs: Map<string, number>; samples: string[] }>();
  for (const g of SCOPE_TAXONOMY) per.set(g.group, { total: 0, none: 0, subs: new Map(g.subs.map((x) => [x.id, 0])), samples: [] });
  for (const r of rows) {
    const g = per.get(r.category.split(".")[0]); if (!g) continue;
    g.total++;
    const ids = scopeSubsForProduct(r);
    if (ids.length === 0) { g.none++; if (g.samples.length < 4) g.samples.push(`${r.name} [${r.hsCode ?? "no hs"}]`); }
    for (const id of ids) g.subs.set(id, (g.subs.get(id) ?? 0) + 1);
  }
  console.log("\nSCOPE PLACEMENT");
  for (const [group, g] of per) {
    console.log(`${group}: ${g.total} products, unplaced ${g.none} (${g.total ? Math.round((g.none / g.total) * 100) : 0}%)`);
    console.log("   " + [...g.subs.entries()].map(([k, n]) => `${k}=${n}`).join(", "));
    if (g.samples.length) console.log("   unplaced e.g. " + g.samples.join(" | "));
  }
}
main().then(scope).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
