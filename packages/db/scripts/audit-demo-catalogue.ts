import { prisma } from "../src/index";

/** Read-only audit of the product catalogue (2026-10-22): category labels, units, codes, dates, duplicates. Writes nothing. */
function gtinValid(g: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(g)) return false;
  const d = g.split("").map(Number); const chk = d.pop()!;
  let sum = 0; d.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === chk;
}
async function main() {
  const rows = await prisma.productMaster.findMany({
    select: { id: true, name: true, category: true, standardUnit: true, hsCode: true, unspscCode: true, gtin: true, isSimulated: true, isArchived: true, createdAt: true, coldChain: true, storageClass: true, shelfLifeMonths: true, lifecycleStatus: true, packSize: true, regulatoryClass: true, controlledSubstance: true, hazardClass: true },
  });
  console.log(`products: ${rows.length} (simulated ${rows.filter((r) => r.isSimulated).length}, archived ${rows.filter((r) => r.isArchived).length})`);
  const top = new Map<string, number>(); const full = new Map<string, number>(); const units = new Map<string, number>();
  const c: Record<string, number> = {}; const bump = (k: string) => { c[k] = (c[k] ?? 0) + 1; };
  const ex: Record<string, string[]> = {};
  const note = (k: string, s: string) => { bump(k); (ex[k] ??= []).length < 4 && ex[k].push(s); };
  const names = new Map<string, number>();
  const days = new Map<string, number>();
  for (const r of rows) {
    const t = r.category.split(".")[0]; top.set(t, (top.get(t) ?? 0) + 1); full.set(r.category, (full.get(r.category) ?? 0) + 1);
    units.set(r.standardUnit ?? "(none)", (units.get(r.standardUnit ?? "(none)") ?? 0) + 1);
    days.set(r.createdAt.toISOString().slice(0, 10), (days.get(r.createdAt.toISOString().slice(0, 10)) ?? 0) + 1);
    if (r.name !== r.name.trim() || /\s{2}/.test(r.name)) note("name: stray whitespace", r.name);
    if (r.category !== r.category.trim() || /\s*\.\s+|\s+\./.test(r.category)) note("category: stray spaces around dot", r.category);
    const nk = r.name.toLowerCase(); names.set(nk, (names.get(nk) ?? 0) + 1);
    if (!r.hsCode) bump("no hs"); else if (!/^\d{4}(\.?\d{2}){0,2}$/.test(r.hsCode.replace(/\s/g, ""))) note("hs: odd format", r.hsCode);
    if (!r.unspscCode) bump("no unspsc"); else if (!/^\d{8}$/.test(r.unspscCode)) note("unspsc: not 8 digits", r.unspscCode);
    if (r.gtin && !gtinValid(r.gtin)) note("gtin: bad check digit/length", r.gtin);
    if (r.coldChain && !r.storageClass) bump("cold chain without storage class");
    if (r.coldChain && r.storageClass && !/cold|fridge|frozen|2|8|refrig|freez/i.test(r.storageClass)) note("cold chain but storage class not cold", `${r.name} / ${r.storageClass}`);
    if (!r.coldChain && r.storageClass && /cold|fridge|frozen|refrig|freez/i.test(r.storageClass)) note("cold storage class but coldChain false", `${r.name} / ${r.storageClass}`);
    if (r.shelfLifeMonths != null && (r.shelfLifeMonths <= 0 || r.shelfLifeMonths > 120)) note("shelf life out of range", `${r.name} ${r.shelfLifeMonths}`);
  }
  for (const [k, n] of names) if (n > 1) note("duplicate name", `${k} x${n}`);
  console.log("\nTOP-LEVEL CATEGORIES", [...top.entries()].sort((a, b) => b[1] - a[1]));
  console.log("\nFULL CATEGORIES (", full.size, ")"); for (const [k, n] of [...full.entries()].sort()) console.log(`  ${n}\t${k}`);
  console.log("\nUNITS", [...units.entries()].sort((a, b) => b[1] - a[1]));
  console.log("\ncreatedAt by day (top 8)", [...days.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8));
  console.log("\nANOMALIES", c); console.log("EXAMPLES", JSON.stringify(ex, null, 1));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
