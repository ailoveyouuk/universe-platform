import { prisma, computeLogisticsMetric, type TransportMode } from "@universe/db";
import { insightsPrisma } from "./index";

/**
 * Seeds SIMULATED anonymised benchmark rows (2026-10-17, Lewis: the demo must show CO2 / distance / logistics, pricing
 * and sourcing benchmarking). Every row is written with isSimulated = true, so it is visible only to requests running
 * inside a demo organisation (see the read-side gating in query.ts) and never reaches a real organisation.
 *
 * Each (group) gets several distinct synthetic source hashes so the MINIMUM_COHORT_SIZE floor is met exactly as it
 * would be for real data - the cohort rule itself is not bypassed. The hashes are random strings, not derived from any
 * organisation. Idempotent per table and per group: only groups that have no simulated rows yet are added (2026-10-24: a top-up for the nine catalogue groups and eight commodity groups added that day); nothing is deleted.
 */
// A table counts as already seeded once it holds this many simulated rows (earlier test rows were flagged simulated too, so "any row" is not enough).
const SEEDED_THRESHOLD = 1000;
const day = 86400000;
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const chunks = <T>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const monthStart = (monthsAgo: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 1));
};

const CATEGORIES = [
  "Laboratory Consumables", "Diagnostics", "Medical Devices", "Pharmaceuticals", "Personal Protective Equipment", "Cold Chain", "Reagents", "Surgical Supplies", "Wound Care", "Imaging",
  // Added 2026-10-24 (same names as the catalogue groups in supplier-scope.ts; "Logistics and Services" is a service group with no products).
  "Reproductive Health", "Nutrition", "Vector Control", "Water, Sanitation and Hygiene", "Immunisation", "Kits and Emergency Supplies", "Shelter and Household Items", "Field and Military Medical",
];
const ORIGINS = ["IN", "CN", "DE", "GB", "FR", "BE", "NL", "TR", "ZA", "KE", "VN", "BD", "PK"];
const DESTINATIONS = ["KE", "UG", "TZ", "NG", "GH", "ZA", "ET", "MZ", "ZM", "BD", "PK", "IN"];
const INCOTERMS = ["EXW", "FCA", "CIF", "DAP", "DDP"];
const BASE_PRICE: Record<string, number> = { "Laboratory Consumables": 6, Diagnostics: 28, "Medical Devices": 85, Pharmaceuticals: 4, "Personal Protective Equipment": 9, "Cold Chain": 140, Reagents: 55, "Surgical Supplies": 22, "Wound Care": 7, Imaging: 320,
  "Reproductive Health": 0.4, Nutrition: 1.8, "Vector Control": 3.2, "Water, Sanitation and Hygiene": 2.5, Immunisation: 1.6, "Kits and Emergency Supplies": 180, "Shelter and Household Items": 14, "Field and Military Medical": 650 };

export async function seedSimulatedAggregates() {
  const r = rng(20261017);
  const hashes = Array.from({ length: 60 }, () => Array.from({ length: 16 }, () => Math.floor(r() * 16).toString(16)).join(""));
  const pickHashes = (n: number) => {
    const set = new Set<string>();
    while (set.size < n) set.add(hashes[Math.floor(r() * hashes.length)]);
    return [...set];
  };
  const result = { logistics: 0, pricing: 0, sourcing: 0, skipped: [] as string[] };

  const countries = await prisma.country.findMany({ select: { code: true, latitude: true, longitude: true, regionCode: true } });
  const byCode = new Map(countries.map((c) => [c.code, c]));
  const centroid = (code: string) => {
    const c = byCode.get(code);
    return c?.latitude != null && c?.longitude != null ? { lat: c.latitude, lng: c.longitude } : null;
  };

  // --- Logistics / CO2 ---
  // v2 (2026-10-17): v1 spread each route's few contributors over every incoterm x commodity combination, so almost
  // no group reached the cohort floor and the map showed only a handful of routes. Each lane (route + mode + incoterm +
  // commodity group) now gets its own cohort of 6-10 contributors. v2 rows carry the "s2" hash prefix.
  const originPool = ["IN", "CN", "DE", "GB", "FR", "BE", "NL", "TR", "ZA", "KE", "VN", "BD", "PK", "US", "CH", "ID", "TH", "EG", "MA", "IT", "ES", "AE", "SG", "BR", "MX", "JP", "KR", "PL", "RW", "ET"].filter((c) => byCode.has(c));
  const destPool = ["KE", "UG", "TZ", "NG", "GH", "ZA", "ET", "MZ", "ZM", "BD", "PK", "IN", "MW", "ZW", "SN", "CM", "CD", "RW", "SS", "SD", "NP", "MM", "KH", "HT", "YE", "AF", "SL", "LR", "ML", "BF"].filter((c) => byCode.has(c));
  const GROUPS = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"];
  // Eight commodity groups added 2026-10-24; they get their own top-up lanes (below) so the original rows stay as they are.
  const NEW_GROUPS = ["REPRODUCTIVE_HEALTH", "NUTRITION", "VECTOR_CONTROL", "WASH", "IMMUNISATION", "KITS", "SHELTER", "FIELD_MEDICAL"];
  const LANE_INCOTERMS = ["EXW", "FCA", "CIF", "DAP", "DDP", "FOB"];
  const haveLogistics = new Set((await insightsPrisma.aggregatedLogisticsMetric.groupBy({ by: ["commodityGroup"], where: { isSimulated: true, sourceHash: { startsWith: "s2" } } })).map((g) => g.commodityGroup));
  const seededLogistics = (await insightsPrisma.aggregatedLogisticsMetric.count({ where: { isSimulated: true, sourceHash: { startsWith: "s2" } } })) >= SEEDED_THRESHOLD;
  const logisticsGroups = seededLogistics ? NEW_GROUPS.filter((g) => !haveLogistics.has(g)) : [...GROUPS, ...NEW_GROUPS];
  if (logisticsGroups.length === 0) result.skipped.push("logistics");
  else {
    const rows: any[] = [];
    for (const d of destPool) {
      const dest = centroid(d);
      if (!dest) continue;
      // each destination is supplied from ~14 origins
      const start = Math.floor(r() * originPool.length);
      for (let k = 0; k < 14; k++) {
        const o = originPool[(start + k * 2) % originPool.length];
        const orig = centroid(o);
        if (!orig || o === d) continue;
        const near = Math.abs(orig.lat - dest.lat) + Math.abs(orig.lng - dest.lng) < 40;
        const modes: TransportMode[] = near ? ["LAND", "AIR"] : r() < 0.35 ? ["SEA", "AIR"] : ["SEA"];
        for (const mode of modes) {
          const lanes = 1 + Math.floor(r() * 2);
          for (let ln = 0; ln < lanes; ln++) {
            const incoterm = LANE_INCOTERMS[Math.floor(r() * LANE_INCOTERMS.length)];
            const group = logisticsGroups[Math.floor(r() * logisticsGroups.length)];
            const cohort = pickHashes(6 + Math.floor(r() * 5)).map((h) => "s2" + h.slice(2));
            for (const sourceHash of cohort) {
              const perHash = 1 + Math.floor(r() * 3);
              for (let q = 0; q < perHash; q++) {
                const weight = Math.round((20 + r() * 1800) * 10) / 10;
                const collected = new Date(Date.now() - (30 + r() * 300) * day);
                const delivered = new Date(collected.getTime() + (mode === "AIR" ? 4 + r() * 8 : mode === "SEA" ? 24 + r() * 26 : 8 + r() * 12) * day);
                const m = computeLogisticsMetric({ manufactureCentroid: orig, destinationCentroid: dest, transportMode: mode, weightKg: weight, productCategory: group, goodsCollectedDate: collected, goodsDeliveredToClientDate: delivered });
                if (!m) continue;
                rows.push({
                  manufactureCountryCode: o,
                  destinationCountryCode: d,
                  transportMode: mode,
                  incoterm,
                  commodityGroup: group,
                  distanceKm: m.distanceKm,
                  co2FactorKgPerTonneKm: m.co2FactorKgPerTonneKm,
                  co2TotalKg: m.co2TotalKg,
                  durationDays: m.durationDays,
                  efficiencyScore: m.efficiencyScore,
                  scoreBand: m.scoreBand,
                  effectiveMonth: new Date(Date.UTC(delivered.getUTCFullYear(), delivered.getUTCMonth(), 1)),
                  sourceHash,
                  isSimulated: true,
                });
              }
            }
          }
        }
      }
    }
    // SQL Server allows ~2,100 parameters per statement, so keep rows x columns under that.
    for (const c of chunks(rows, 120)) await insightsPrisma.aggregatedLogisticsMetric.createMany({ data: c });
    result.logistics = rows.length;
  }

  // --- Pricing ---
  const pricedCategories = new Set((await insightsPrisma.aggregatedProductPrice.groupBy({ by: ["category"], where: { isSimulated: true } })).map((g) => g.category));
  const seededPricing = (await insightsPrisma.aggregatedProductPrice.count({ where: { isSimulated: true } })) >= SEEDED_THRESHOLD;
  const pricingCategories = seededPricing ? CATEGORIES.filter((c) => !pricedCategories.has(c)) : CATEGORIES;
  if (pricingCategories.length === 0) result.skipped.push("pricing");
  else {
    const rows: any[] = [];
    const destRegions = ["AFRO", "SEARO", "EMRO"];
    const manuRegions = ["SEARO", "WPRO", "EURO", "AFRO"];
    for (const category of pricingCategories) {
      for (const destinationRegion of destRegions) {
        for (const manufactureRegion of manuRegions) {
          const incoterm = INCOTERMS[Math.floor(r() * 3) + 2 > 4 ? 4 : Math.floor(r() * 3) + 2];
          for (let m = 0; m < 6; m++) {
            const base = BASE_PRICE[category] * (0.85 + r() * 0.3) * (manufactureRegion === "EURO" ? 1.35 : manufactureRegion === "AFRO" ? 1.1 : 1) * (1 - m * 0.006);
            for (const sourceHash of pickHashes(5 + Math.floor(r() * 3))) {
              rows.push({
                category,
                unitPrice: Math.round(base * (0.9 + r() * 0.2) * 100) / 100,
                currency: "USD",
                effectiveMonth: monthStart(m),
                manufactureRegion,
                destinationRegion,
                incoterm,
                freightMode: r() < 0.55 ? "SEA" : "AIR",
                quantity: 200 + Math.floor(r() * 9000),
                unitOfSupply: "Each",
                sourceHash,
                isSimulated: true,
              });
            }
          }
        }
      }
    }
    for (const c of chunks(rows, 150)) await insightsPrisma.aggregatedProductPrice.createMany({ data: c });
    result.pricing = rows.length;
  }

  // --- Product sourcing (category x country of manufacture) ---
  const sourcedCategories = new Set((await insightsPrisma.aggregatedProductSourcing.groupBy({ by: ["category"], where: { isSimulated: true } })).map((g) => g.category));
  const seededSourcing = (await insightsPrisma.aggregatedProductSourcing.count({ where: { isSimulated: true } })) >= SEEDED_THRESHOLD;
  const sourcingCategories = seededSourcing ? CATEGORIES.filter((c) => !sourcedCategories.has(c)) : CATEGORIES;
  if (sourcingCategories.length === 0) result.skipped.push("sourcing");
  else {
    const rows: any[] = [];
    for (const category of sourcingCategories) {
      for (const country of ORIGINS) {
        if (r() < 0.2) continue; // not every category is made in every country
        const cohort = pickHashes(5 + Math.floor(r() * 5));
        for (const sourceHash of cohort) {
          const n = 1 + Math.floor(r() * 4);
          for (let i = 0; i < n; i++) rows.push({ category, manufactureCountryCode: country, sourceHash, isSimulated: true });
        }
      }
    }
    for (const c of chunks(rows, 400)) await insightsPrisma.aggregatedProductSourcing.createMany({ data: c });
    result.sourcing = rows.length;
  }
  return result;
}
