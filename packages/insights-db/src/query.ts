import { insightsPrisma, Prisma } from "./index";

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
  // Fixed 2026-10-09 — this previously used $queryRawUnsafe with
  // hand-rolled "@P1"-style positional placeholders, which 500'd in
  // production (confirmed live: both this page's embedded map and the
  // standalone /logistics/global page silently showed "no routes meet
  // cohort size" because the frontend's .catch() swallowed the real
  // error). getAggregatedPricing just above uses Prisma's safe tagged-
  // template $queryRaw instead and works correctly — switched this
  // function to the same pattern (Prisma.sql/Prisma.join/Prisma.empty for
  // the variable-length WHERE clause) rather than hand-building SQL text
  // and a separate positional-params array.
  const conditions: Prisma.Sql[] = [];

  if (filters.manufactureCountryCode) {
    conditions.push(Prisma.sql`manufactureCountryCode = ${filters.manufactureCountryCode}`);
  }
  if (filters.destinationCountryCode) {
    conditions.push(Prisma.sql`destinationCountryCode = ${filters.destinationCountryCode}`);
  }
  if (filters.transportMode) {
    conditions.push(Prisma.sql`transportMode = ${filters.transportMode}`);
  }
  if (filters.incoterm) {
    conditions.push(Prisma.sql`incoterm = ${filters.incoterm}`);
  }
  if (filters.commodityGroup) {
    conditions.push(Prisma.sql`commodityGroup = ${filters.commodityGroup}`);
  }
  if (filters.minDurationDays !== undefined) {
    conditions.push(Prisma.sql`durationDays >= ${filters.minDurationDays}`);
  }
  if (filters.maxDurationDays !== undefined) {
    conditions.push(Prisma.sql`durationDays <= ${filters.maxDurationDays}`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

  const rows = await insightsPrisma.$queryRaw<
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
  >`
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
  `;

  return rows;
}

export interface ProductSourcingSummary {
  category: string;
  manufactureCountryCode: string | null;
  sourceCount: number;
  approvalCount: number;
}

/**
 * The only read path the Product Database catalogue map (Stage 3c) should
 * use — same MINIMUM_COHORT_SIZE enforcement as every other read in this
 * file. Groups by (category, manufactureCountryCode) only — coarser than
 * the logistics/pricing aggregates' multi-dimension grouping, since the
 * map just needs "how many approved sourcing relationships put this
 * category in this country", not a further breakdown by mode/incoterm.
 * approvalCount is COUNT(*) (every contributing approval, including
 * repeats from the same org for different products) — distinct from
 * sourceCount (COUNT(DISTINCT sourceHash), the number of organizations
 * behind that count), same shipmentCount/sourceCount split
 * getAggregatedLogisticsRoutes already uses.
 */
export async function getAggregatedProductSourcing(): Promise<ProductSourcingSummary[]> {
  const rows = await insightsPrisma.$queryRaw<
    {
      category: string;
      manufactureCountryCode: string | null;
      sourceCount: number;
      approvalCount: number;
    }[]
  >`
    SELECT
      category,
      manufactureCountryCode,
      COUNT(DISTINCT sourceHash) AS sourceCount,
      COUNT(*) AS approvalCount
    FROM aggregated_product_sourcing
    GROUP BY category, manufactureCountryCode
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    ORDER BY approvalCount DESC
  `;

  return rows;
}

