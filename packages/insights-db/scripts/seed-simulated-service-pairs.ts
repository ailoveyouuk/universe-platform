import { SERVICE_CATALOGUE, SERVICE_CATEGORIES } from "@universe/types";
import { insightsPrisma } from "../src/index";

/**
 * Tops up SIMULATED service cost rows (2026-10-26, Lewis: "top up the remaining") for the standard services whose pricing basis is not the first
 * basis of their kind of service. The original simulated set only priced each kind of service on its first basis, so 26 of the 66 catalogue
 * services (23 kind-and-basis pairs) showed "Not enough contributors yet" on the Insights Services rate card.
 *
 * Rows are flagged isSimulated, so they appear only inside demo organisations; they carry no organisation, only random hashes, and the five-
 * organisation floor is met by distinct hashes exactly as for real data. Adds rows only, deletes nothing, and skips a pair that already has
 * simulated rows. DRY_RUN is on unless DRY_RUN=false. Needs a WRITE login to universe-insights (INSIGHTS_DATABASE_URL).
 */
const DRY = process.env.DRY_RUN !== "false";

/** Typical cost price in USD, before any margin, per one unit of the basis (see each service's unit in the catalogue). */
const LEVEL: Record<string, number> = {
  "TECHNICAL_ASSISTANCE|LUMP_SUM": 85000, "ADVISORY|LUMP_SUM": 28000, "SUPPLY_CHAIN_ADVISORY|LUMP_SUM": 42000, "TRAINING|PER_UNIT": 140, "TRAINING|LUMP_SUM": 24000,
  "TESTING_INSPECTION|LUMP_SUM": 6500, "QUALITY_AUDIT|PER_UNIT": 2200, "EQUIPMENT_INSTALLATION|PER_DAY": 520, "EQUIPMENT_MAINTENANCE|PER_MONTH": 380,
  "PROCUREMENT_AGENT|LUMP_SUM": 60000, "WAREHOUSING|PERCENT_OF_GOODS": 3.2, "CUSTOMS_HANDLING|LUMP_SUM": 420, "COLD_CHAIN_SERVICES|PER_MONTH": 14,
  "IT_DATA|PER_DAY": 580, "IT_DATA|LUMP_SUM": 18000, "FINANCIAL_PROFESSIONAL|PERCENT_OF_GOODS": 0.45, "FINANCIAL_PROFESSIONAL|PER_DAY": 950,
  "FIELD_HEALTH_SERVICES|PER_DAY": 65, "WASTE_MANAGEMENT|LUMP_SUM": 3800, "COMMUNICATIONS|PER_DAY": 380, "COMMUNICATIONS|PER_UNIT": 1.2,
  "ADMIN_SUPPORT|PER_UNIT": 22, "ADMIN_SUPPORT|LUMP_SUM": 9500,
};
const REGIONS: [string, number][] = [["AFRO", 1], ["SEARO", 0.8], ["EMRO", 1.05], ["AMRO", 1.2], ["WPRO", 0.95]];

function rng(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const chunks = <T>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const monthStart = (monthsAgo: number) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 1)); };

async function main() {
  const firstBasis = new Map(SERVICE_CATEGORIES.map((c) => [c.code, c.bases[0]]));
  const wanted = [...new Set(SERVICE_CATALOGUE.filter((i) => firstBasis.get(i.category) !== i.basis).map((i) => `${i.category}|${i.basis}`))];
  const unknown = wanted.filter((k) => LEVEL[k] === undefined);
  if (unknown.length) throw new Error(`No level set for: ${unknown.join(", ")}`);
  const r = rng(20261026 + 7);
  const hashes = Array.from({ length: 40 }, () => "v" + Array.from({ length: 15 }, () => Math.floor(r() * 16).toString(16)).join(""));
  const pick = (n: number) => { const s = new Set<string>(); while (s.size < n) s.add(hashes[Math.floor(r() * hashes.length)]!); return [...s]; };
  const rows: any[] = []; const skipped: string[] = [];
  for (const k of wanted) {
    const [category, basis] = k.split("|") as [string, string];
    const have = await insightsPrisma.aggregatedServicePrice.count({ where: { isSimulated: true, serviceCategory: category, pricingBasis: basis } });
    if (have >= 30) { skipped.push(`${k} (${have} rows already)`); continue; }
    const base = LEVEL[k]!; const drift = (r() - 0.35) * 0.008; const pct = basis === "PERCENT_OF_GOODS";
    for (const [region, mult] of REGIONS) for (let mo = 5; mo >= 0; mo--) {
      const level = base * (pct ? 1 + (mult - 1) * 0.3 : mult) * (1 + drift * (5 - mo)) * (0.97 + r() * 0.06);
      for (const sourceHash of pick(5 + Math.floor(r() * 3))) {
        const v = level * (0.92 + r() * 0.16);
        rows.push({ serviceCategory: category, pricingBasis: basis, unitPrice: Math.round(v * 100) / 100, currency: "USD", effectiveMonth: monthStart(mo), deliveryRegion: region, quantity: 1 + Math.floor(r() * 40), sourceHash, isSimulated: true });
      }
    }
  }
  console.log(`${wanted.length} kind-and-basis pairs wanted; ${skipped.length} skipped; ${rows.length} rows to add.`);
  skipped.forEach((s) => console.log("  skipped", s));
  if (DRY) { console.log("DRY RUN: nothing written. Run with dry_run=false to write."); return; }
  for (const c of chunks(rows, 150)) await insightsPrisma.aggregatedServicePrice.createMany({ data: c });
  console.log(`Wrote ${rows.length} simulated rows.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => insightsPrisma.$disconnect());
