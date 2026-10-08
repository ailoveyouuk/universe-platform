import { insightsPrisma } from "./index";

/**
 * Statistical-disclosure-control floor (2026-09-24 decision — see
 * architecture doc): even fully de-identified, an aggregate built from too
 * few distinct organizations can be reverse-identifiable by anyone who knows
 * the market (e.g. "only 2 orgs buy blood bags in AFRO" narrows a price
 * range to a specific deal). 5 distinct sources is a common default for this
 * kind of disclosure control — revisit once real category cardinality is
 * known, per the note in the original discussion with Lewis.
 */
export const MINIMUM_COHORT_SIZE = 5;

export interface CategoryPricingSummary {
  category: string;
  destinationRegion: string | null;
  manufactureRegion: string | null;
  incoterm: string | null;
  effectiveMonth: Date;
  sourceCount: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  currency: string;
}

/**
 * The only read path the future Insights app should use for pricing —
 * enforces MINIMUM_COHORT_SIZE at query time (HAVING COUNT(DISTINCT
 * sourceHash) >= ...), not just as an assumption baked into the ETL job.
 * Groups by destinationRegion/manufactureRegion/incoterm/currency too,
 * deliberately — collapsing across these would blur exactly the market
 * signal Lewis asked for (e.g. "blood bags landed DDP in Uganda" is a
 * meaningfully different number from the same product FOB elsewhere), and
 * averaging across currencies without conversion would be meaningless
 * (Universe doesn't do FX conversion anywhere yet — a real gap if/when this
 * is built out further).
 */
export async function getAggregatedPricing(category: string): Promise<CategoryPricingSummary[]> {
  const rows = await insightsPrisma.$queryRaw<
    {
      destinationRegion: string | null;
      manufactureRegion: string | null;
      incoterm: string | null;
      effectiveMonth: Date;
      currency: string;
      sourceCount: number;
      minPrice: number;
      maxPrice: number;
      avgPrice: number;
    }[]
  >`
    SELECT
      destinationRegion,
      manufactureRegion,
      incoterm,
      effectiveMonth,
      currency,
      COUNT(DISTINCT sourceHash) AS sourceCount,
      MIN(unitPrice) AS minPrice,
      MAX(unitPrice) AS maxPrice,
      AVG(unitPrice) AS avgPrice
    FROM aggregated_product_prices
    WHERE category = ${category}
    GROUP BY destinationRegion, manufactureRegion, incoterm, effectiveMonth, currency
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    ORDER BY effectiveMonth DESC
  `;

  return rows.map((r) => ({ ...r, category }));
}

export interface LogisticsRouteFilters {
  manufactureCountryCode?: string;
  destinationCountryCode?: string;
  transportMode?: string;
  incoterm?: string;
  commodityGroup?: string;
  minDurationDays?: number;
  maxDurationDays?: number;
}

export interface LogisticsRouteSummary {
  manufactureCountryCode: string | null;
  destinationCountryCode: string | null;
  transportMode: string | null;
  incoterm: string | null;
  commodityGroup: string | null;
  sourceCount: number;
  shipmentCount: number;
  avgDistanceKm: number;
  avgCo2TotalKg: number;
  avgDurationDays: number | null;
  avgEfficiencyScore: number;
}

/**
 * The only read path the future global logistics dashboard should use —
 * same MINIMUM_COHORT_SIZE enforcement as getAggregatedPricing above.
 * Groups by the full (manufactureCountryCode, destinationCountryCode,
 * transportMode, incoterm, commodityGroup) combination Lewis asked for
 * ("country of manufacture to destination / co2 metric / distance / modes
 * of transport / incoterm"), filterable on any of those plus a duration
 * range. Two sort orders cover Lewis's two named views: "most common"
 * (by shipmentCount, callers sort client-side or pass orderBy) and "most
 * CO2-efficient" (by avgEfficiencyScore) — both are the same underlying
 * query, just ordered differently, so this returns the full filtered set
 * and leaves ordering to the caller rather than two near-duplicate
 * queries.
 */
export async function getAggregatedLogisticsRoutes(filters: LogisticsRouteFilters = {}): Promise<LogisticsRouteSummary[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.manufactureCountryCode) {
    conditions.push(`manufactureCountryCode = @P${params.length + 1}`);
    params.push(filters.manufactureCountryCode);
  }
  if (filters.destinationCountryCode) {
    conditions.push(`destinationCountryCode = @P${params.length + 1}`);
    params.push(filters.destinationCountryCode);
  }
  if (filters.transportMode) {
    conditions.push(`transportMode = @P${params.length + 1}`);
    params.push(filters.transportMode);
  }
  if (filters.incoterm) {
    conditions.push(`incoterm = @P${params.length + 1}`);
    params.push(filters.incoterm);
  }
  if (filters.commodityGroup) {
    conditions.push(`commodityGroup = @P${params.length + 1}`);
    params.push(filters.commodityGroup);
  }
  if (filters.minDurationDays !== undefined) {
    conditions.push(`durationDays >= @P${params.length + 1}`);
    params.push(filters.minDurationDays);
  }
  if (filters.maxDurationDays !== undefined) {
    conditions.push(`durationDays <= @P${params.length + 1}`);
    params.push(filters.maxDurationDays);
  }

  // $queryRawUnsafe is used here (not $queryRaw's tagged-template form)
  // because the WHERE clause is built from a variable number of optional
  // filters — every value is still passed as a bound parameter, never
  // string-interpolated, so this isn't susceptible to SQL injection.
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await insightsPrisma.$queryRawUnsafe<
    {
      manufactureCountryCode: string | null;
      destinationCountryCode: string | null;
      transportMode: string | null;
      incoterm: string | null;
      commodityGroup: string | null;
      sourceCount: number;
      shipmentCount: number;
      avgDistanceKm: number;
      avgCo2TotalKg: number;
      avgDurationDays: number | null;
      avgEfficiencyScore: number;
    }[]
  >(
    `
    SELECT
      manufactureCountryCode,
      destinationCountryCode,
      transportMode,
      incoterm,
      commodityGroup,
      COUNT(DISTINCT sourceHash) AS sourceCount,
      COUNT(*) AS shipmentCount,
      AVG(CAST(distanceKm AS FLOAT)) AS avgDistanceKm,
      AVG(CAST(co2TotalKg AS FLOAT)) AS avgCo2TotalKg,
      AVG(CAST(durationDays AS FLOAT)) AS avgDurationDays,
      AVG(CAST(efficiencyScore AS FLOAT)) AS avgEfficiencyScore
    FROM aggregated_logistics_metrics
    ${whereClause}
    GROUP BY manufactureCountryCode, destinationCountryCode, transportMode, incoterm, commodityGroup
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    `,
    ...params,
  );

  return rows;
}
