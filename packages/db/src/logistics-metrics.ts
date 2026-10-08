/**
 * Supply-chain CO2 / distance / efficiency calculation engine — added
 * 2026-10-08 per Lewis's request to start measuring manufacture-to-
 * delivery distance, CO2, and a per-line efficiency score. See
 * supply-chain-co2-efficiency.md (project docs) for the full writeup,
 * including the open questions this methodology is explicitly flagged
 * against (no real route data, country-centroid-only distance, weight
 * estimation fallback).
 *
 * Shared between apps/api (LogisticsMetricsService, computes on line
 * save) and packages/insights-db (the cross-tenant aggregate ETL re-
 * derives nothing — it reads the already-computed ProjectLineLogisticsMetric
 * row — but re-exports these constants for reference/display purposes).
 *
 * METHODOLOGY (version 2026.10-v1 — bump METHODOLOGY_VERSION on any
 * change to the constants/algorithm below, so historical rows computed
 * under an old version stay identifiable):
 *
 * 1. DISTANCE: great-circle ("as the crow flies") distance between the
 *    manufacture country's and destination country's centroid
 *    coordinates, multiplied by a mode-specific CIRCUITY_MULTIPLIER to
 *    approximate how much longer real routes are than a straight line
 *    (ships follow shipping lanes/canals, trucks/rail follow roads and
 *    terrain, flights are closest to great-circle). This is an
 *    ACKNOWLEDGED APPROXIMATION — the GLEC Framework's own guidance notes
 *    that a "modelled"/"primary" calculation uses actual route distances,
 *    which this platform does not have (no port/airport/lane data, only
 *    country-level locations). Flagged to Lewis as a real limitation.
 *
 * 2. CO2: GLEC-Framework-aligned (aligned with ISO 14083) emission
 *    factors, expressed in kg CO2e per tonne-km, applied as
 *    distanceKm * (weightTonnes) * factor. The factors below are
 *    representative average figures for each of this platform's three
 *    tracked modes (AIR | SEA | LAND) — not a specific vessel/aircraft/
 *    vehicle calculation, which the platform has no data to support.
 *
 * 3. WEIGHT: ProjectLine.weightKg when entered; otherwise a commodity-
 *    category default (WEIGHT_ESTIMATE_DEFAULTS_KG) is substituted and
 *    the metric row is flagged weightEstimated: true, so an estimate is
 *    never silently presented as measured.
 *
 * 4. EFFICIENCY SCORE (1-10, Lewis's explicitly delegated judgment call —
 *    there is no external standard for this part): driven primarily by
 *    the CO2 INTENSITY of the mode used (air freight is roughly 65x more
 *    carbon-intensive per tonne-km than sea freight, which dwarfs any
 *    other factor), log-scaled between the lowest and highest factor in
 *    CO2_FACTOR_KG_PER_TONNE_KM so the three modes spread sensibly across
 *    the 1-10 range, with a small +/-0.5 adjustment for unusually short or
 *    long distances (encourages/reflects regional sourcing). This
 *    deliberately rewards choosing sea/rail/road over air wherever
 *    feasible, which is the actual lever procurement/logistics decisions
 *    can pull — see the doc for the worked numbers and for why this is a
 *    reasonable, defensible choice rather than an arbitrary one.
 */

export const METHODOLOGY_VERSION = "2026.10-v1";

export type TransportMode = "AIR" | "SEA" | "LAND";

/** Multiplies great-circle distance to approximate real routing. */
export const CIRCUITY_MULTIPLIER: Record<TransportMode, number> = {
  AIR: 1.1, // flight paths track close to great-circle
  SEA: 1.25, // shipping lanes/canal routing adds meaningfully over open-ocean great-circle
  LAND: 1.35, // road/rail follow infrastructure and terrain, least direct of the three
};

/**
 * kg CO2e per tonne-km — representative average figures aligned with the
 * GLEC Framework v3.2 (ISO 14083-aligned default factors). AIR is a
 * blended freighter/belly-cargo average; SEA a deep-sea container
 * average; LAND a general heavy-goods-vehicle average (the schema does
 * not distinguish road from rail within "LAND" — see the doc's open
 * questions).
 */
export const CO2_FACTOR_KG_PER_TONNE_KM: Record<TransportMode, number> = {
  AIR: 0.8,
  SEA: 0.012,
  LAND: 0.09,
};

/**
 * Fallback cargo weight (kg) per ProjectLine.productCategory, used only
 * when a line has no weightKg entered. Rough, order-of-magnitude
 * placeholders pending real data — flagged in the doc as worth revisiting
 * once enough real weightKg entries exist to calibrate against.
 */
export const WEIGHT_ESTIMATE_DEFAULTS_KG: Record<string, number> = {
  CONSUMABLES: 50,
  DEVICES: 25,
  REAGENTS: 15,
  EQUIPMENT: 250,
  PHARMACEUTICALS: 10,
  LABORATORY: 20,
};
const DEFAULT_WEIGHT_FALLBACK_KG = 30; // used if productCategory itself is unset/unrecognized

export interface Centroid {
  lat: number;
  lng: number;
}

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineDistanceKm(a: Centroid, b: Centroid): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_KM * c;
}

/** Resolves the weight (kg) to use for a line, and whether it was estimated. */
export function resolveWeightKg(
  weightKg: number | null | undefined,
  productCategory: string | null | undefined,
): { weightKgUsed: number; weightEstimated: boolean } {
  if (weightKg != null && weightKg > 0) {
    return { weightKgUsed: weightKg, weightEstimated: false };
  }
  const fallback = productCategory
    ? (WEIGHT_ESTIMATE_DEFAULTS_KG[productCategory] ?? DEFAULT_WEIGHT_FALLBACK_KG)
    : DEFAULT_WEIGHT_FALLBACK_KG;
  return { weightKgUsed: fallback, weightEstimated: true };
}

export interface LogisticsCalculationInput {
  manufactureCentroid: Centroid | null;
  destinationCentroid: Centroid | null;
  transportMode: TransportMode | null;
  weightKg: number | null | undefined;
  productCategory: string | null | undefined;
  goodsCollectedDate: Date | null | undefined;
  goodsDeliveredToClientDate: Date | null | undefined;
}

export interface LogisticsCalculationResult {
  distanceKm: number;
  co2FactorKgPerTonneKm: number;
  co2TotalKg: number;
  weightKgUsed: number;
  weightEstimated: boolean;
  durationDays: number | null;
  efficiencyScore: number;
  scoreBand: "RED" | "AMBER" | "YELLOW" | "GREEN";
  methodologyVersion: string;
}

/** Returns null when there isn't enough data to compute (no centroid for
 * one or both countries, or no transport mode) — the caller should skip
 * writing/should delete any existing metric row rather than guess. */
export function computeLogisticsMetric(input: LogisticsCalculationInput): LogisticsCalculationResult | null {
  const { manufactureCentroid, destinationCentroid, transportMode } = input;
  if (!manufactureCentroid || !destinationCentroid || !transportMode) return null;

  const greatCircleKm = haversineDistanceKm(manufactureCentroid, destinationCentroid);
  const distanceKm = greatCircleKm * CIRCUITY_MULTIPLIER[transportMode];

  const { weightKgUsed, weightEstimated } = resolveWeightKg(input.weightKg, input.productCategory);
  const co2FactorKgPerTonneKm = CO2_FACTOR_KG_PER_TONNE_KM[transportMode];
  const co2TotalKg = distanceKm * (weightKgUsed / 1000) * co2FactorKgPerTonneKm;

  let durationDays: number | null = null;
  if (input.goodsCollectedDate && input.goodsDeliveredToClientDate) {
    const ms = input.goodsDeliveredToClientDate.getTime() - input.goodsCollectedDate.getTime();
    durationDays = Math.round(ms / (1000 * 60 * 60 * 24));
  }

  const { efficiencyScore, scoreBand } = scoreLine(co2FactorKgPerTonneKm, distanceKm);

  return {
    distanceKm,
    co2FactorKgPerTonneKm,
    co2TotalKg,
    weightKgUsed,
    weightEstimated,
    durationDays,
    efficiencyScore,
    scoreBand,
    methodologyVersion: METHODOLOGY_VERSION,
  };
}

/**
 * 1 (worst) - 10 (best). See the module doc comment's point 4 for the
 * reasoning. Log-scaled against the full factor range so SEA ~= 10,
 * LAND ~= 6, AIR ~= 1, then nudged +/-0.5 for very short/long distances.
 */
export function scoreLine(
  co2FactorKgPerTonneKm: number,
  distanceKm: number,
): { efficiencyScore: number; scoreBand: "RED" | "AMBER" | "YELLOW" | "GREEN" } {
  const factors = Object.values(CO2_FACTOR_KG_PER_TONNE_KM);
  const minFactor = Math.min(...factors);
  const maxFactor = Math.max(...factors);
  const logRange = Math.log(maxFactor) - Math.log(minFactor);

  let raw =
    logRange === 0
      ? 10
      : 10 - 9 * ((Math.log(co2FactorKgPerTonneKm) - Math.log(minFactor)) / logRange);

  if (distanceKm < 2000) raw += 0.5; // regional sourcing nudge
  if (distanceKm > 10000) raw -= 0.5; // long-haul nudge

  const efficiencyScore = Math.max(1, Math.min(10, Math.round(raw)));

  let scoreBand: "RED" | "AMBER" | "YELLOW" | "GREEN";
  if (efficiencyScore <= 3) scoreBand = "RED";
  else if (efficiencyScore <= 5) scoreBand = "AMBER";
  else if (efficiencyScore <= 7) scoreBand = "YELLOW";
  else scoreBand = "GREEN";

  return { efficiencyScore, scoreBand };
}
