import { prisma } from "../src/index";

/**
 * Corrects anomalies found by audit-demo-catalogue (2026-10-22, agreed with Lewis). Simulated products only; nothing deleted. DRY_RUN defaults to true.
 *  1. Category labels: hand-entered variants (PPE, Consumable(s), Laboratory.*, Equipment.*, "Medical device /IVD") move onto the ten standard groups.
 *  2. Units: lower-case or upper-case variants capitalised the same way as the rest ("each" -> "Each", "BOX" -> "Box").
 *  3. Cold chain required but no storage class: storage class set (frozen for PCR and master mix, otherwise refrigerated).
 *  4. The one GTIN with a wrong check digit is corrected.
 *  5. createdAt: the 30,000 bulk-loaded products all carry the load date, so "Added in last 30 days" counted everything. Spread deterministically over the last 2 years.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const keyword: [RegExp, string][] = [
  [/glove|mask|gown|shield|respirator|shoe cover/i, "Personal Protective Equipment"],
  [/cryovial|pipette|specimen|centrifuge|collection tube|sample/i, "Laboratory Consumables"],
  [/test kit|rapid test|elisa|diagnostic/i, "Diagnostics"],
  [/reagent|culture|stain|buffer|master mix/i, "Reagents"],
  [/swab|bandage|dressing|antiseptic|wound/i, "Wound Care"],
  [/syringe|needle|catheter|infusion|iv /i, "Medical Devices"],
  [/vaccine|tablet|injection|antibiotic|paracetamol|ibuprofen/i, "Pharmaceuticals"],
  [/cold|fridge|freezer|cooler|ice pack/i, "Cold Chain"],
];
const GROUP_MAP: Record<string, string> = {
  "Consumables.Antiseptics": "Wound Care.Antiseptics", "Consumables.IV Therapy": "Medical Devices.IV Therapy", "Consumables.Syringes & Needles": "Medical Devices.Syringes & Needles", "Consumables.Wound Care": "Wound Care",
  "Equipment.Cold Chain": "Cold Chain", "Equipment.Mobility Aids": "Medical Devices.Mobility Aids", "Equipment.Patient Care": "Medical Devices.Patient Care", "Equipment.Respiratory Care": "Medical Devices.Respiratory Care", "Equipment.Sterilization": "Medical Devices.Sterilisation",
  "Laboratory.Reagents": "Reagents", "Laboratory.Sample Collection": "Laboratory Consumables.Sample Collection", "Laboratory.Sample Storage": "Laboratory Consumables.Sample Storage",
  PPE: "Personal Protective Equipment",
};
function newCategory(cat: string, name: string): string | null {
  if (GROUP_MAP[cat]) return GROUP_MAP[cat];
  if (cat === "CONSUMABLES" || cat === "Consumable" || cat === "Medical device /IVD") {
    for (const [re, to] of keyword) if (re.test(name)) return to;
    return "Medical Devices";
  }
  return null;
}
const UNIT_FIX: Record<string, string> = { each: "Each", vial: "Vial", BOX: "Box", kit: "Kit", pair: "Pair", sachet: "Sachet", ampoule: "Ampoule" };
function unitFix(u: string): string | null {
  if (UNIT_FIX[u]) return UNIT_FIX[u];
  if (/^(box|pack) of \d+$/.test(u)) return u[0].toUpperCase() + u.slice(1);
  return null;
}
function gtinFix(g: string): string | null {
  if (!/^\d{8}$|^\d{12,14}$/.test(g)) return null;
  const d = g.split("").map(Number); d.pop();
  let sum = 0; d.slice().reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
  const fixed = g.slice(0, -1) + String((10 - (sum % 10)) % 10);
  return fixed === g ? null : fixed;
}

async function main() {
  const rows = await prisma.productMaster.findMany({ where: { isSimulated: true }, select: { id: true, name: true, category: true, standardUnit: true, gtin: true, coldChain: true, storageClass: true } });
  let nCat = 0, nUnit = 0, nStor = 0, nGtin = 0;
  for (const r of rows) {
    const data: Record<string, string> = {};
    const c = newCategory(r.category, r.name);
    if (c && c !== r.category) { data.category = c; nCat++; console.log(`category: "${r.category}" -> "${c}"  [${r.name}]`); }
    const u = r.standardUnit ? unitFix(r.standardUnit) : null;
    if (u && u !== r.standardUnit) { data.standardUnit = u; nUnit++; }
    if (r.coldChain && !r.storageClass) { data.storageClass = /pcr|master mix/i.test(r.name) ? "FROZEN" : "REFRIGERATED"; nStor++; }
    const g = r.gtin ? gtinFix(r.gtin) : null;
    if (g) { data.gtin = g; nGtin++; console.log(`gtin: ${r.gtin} -> ${g} [${r.name}]`); }
    if (!dryRun && Object.keys(data).length) await prisma.productMaster.update({ where: { id: r.id }, data });
  }
  console.log(`${dryRun ? "DRY RUN " : ""}categories ${nCat}, units ${nUnit}, storage classes ${nStor}, gtins ${nGtin}`);
  const bulk = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*) AS n FROM product_master WHERE isSimulated = 1 AND createdAt >= '2026-10-17' AND createdAt < '2026-10-18'`);
  console.log(`createdAt: ${Number(bulk[0].n)} products on the load day`);
  if (!dryRun) {
    const n = await prisma.$executeRawUnsafe(`UPDATE product_master SET createdAt = DATEADD(day, -(ABS(CHECKSUM(id)) % 730), createdAt) WHERE isSimulated = 1 AND createdAt >= '2026-10-17' AND createdAt < '2026-10-18'`);
    console.log(`createdAt spread on ${n} rows`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
