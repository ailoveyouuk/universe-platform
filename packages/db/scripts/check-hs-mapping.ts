import { prisma } from "../src/index";
import { categoriesForHs } from "../../types/src/category-codes";

/** Read-only (2026-10-23): checks every product's HS code against the category to HS mapping. Writes nothing. */
async function main() {
  const rows = await prisma.productMaster.findMany({ where: { hsCode: { not: null } }, select: { category: true, hsCode: true } });
  const bad = new Map<string, number>(); let ok = 0;
  for (const r of rows) {
    const top = r.category.split(".")[0];
    if (categoriesForHs(r.hsCode!).includes(top)) ok++;
    else { const k = `${top} | ${r.hsCode} | maps to: ${categoriesForHs(r.hsCode!).join(", ") || "nothing"}`; bad.set(k, (bad.get(k) ?? 0) + 1); }
  }
  console.log(`products with an HS code: ${rows.length}; consistent with their category: ${ok}; not: ${rows.length - ok}`);
  for (const [k, n] of [...bad.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
