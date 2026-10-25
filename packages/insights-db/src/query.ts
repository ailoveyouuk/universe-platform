import { insightsPrisma, Prisma } from "./index";
import { computePricingMovement, type PricingMovementSeries } from "./movement";
import { rankActivity } from "./activity";
import type { InsightsActivity } from "@universe/types";

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
export async function getAggregatedPricing(category: string, showSimulated = false): Promise<CategoryPricingSummary[]> {
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
    WHERE category = ${category}${showSimulated ? Prisma.empty : Prisma.sql` AND isSimulated = 0`}
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
export async function getAggregatedLogisticsRoutes(filters: LogisticsRouteFilters = {}, showSimulated = false): Promise<LogisticsRouteSummary[]> {
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
  if (!showSimulated) conditions.push(Prisma.sql`isSimulated = 0`);

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
export async function getAggregatedProductSourcing(showSimulated = false): Promise<ProductSourcingSummary[]> {
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
    ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
    GROUP BY category, manufactureCountryCode
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    ORDER BY approvalCount DESC
  `;

  return rows;
}


// ---------------------------------------------------------------------------
// Insights app reads (2026-10-25). Same rules as every read above: the minimum-cohort floor is applied in SQL (HAVING), and simulated rows only
// reach demo requests. Nothing here returns a hash, an organisation or a single contributor's row.
// ---------------------------------------------------------------------------

export interface PricedCategory { category: string; sourceCount: number; observations: number; latestMonth: Date }

/** Product groups that have enough distinct contributors, overall, to be shown at all. */
export async function listPricedCategories(showSimulated = false): Promise<PricedCategory[]> {
  const rows = await insightsPrisma.$queryRaw<{ category: string; sourceCount: number; observations: number; latestMonth: Date }[]>`
    SELECT category, COUNT(DISTINCT sourceHash) AS sourceCount, COUNT(*) AS observations, MAX(effectiveMonth) AS latestMonth
    FROM aggregated_product_prices
    ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
    GROUP BY category
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    ORDER BY category ASC
  `;
  return rows.map((r) => ({ ...r, sourceCount: Number(r.sourceCount), observations: Number(r.observations) }));
}

export interface PricingTrendPoint { effectiveMonth: Date; currency: string; sourceCount: number; minPrice: number; maxPrice: number; avgPrice: number }

/** Price by month for one product group (all regions together), one series per currency. Months with too few contributors are left out. */
export async function getPricingTrend(category: string, showSimulated = false): Promise<PricingTrendPoint[]> {
  const rows = await insightsPrisma.$queryRaw<PricingTrendPoint[]>`
    SELECT effectiveMonth, currency, COUNT(DISTINCT sourceHash) AS sourceCount, MIN(unitPrice) AS minPrice, MAX(unitPrice) AS maxPrice, AVG(unitPrice) AS avgPrice
    FROM aggregated_product_prices
    WHERE category = ${category}${showSimulated ? Prisma.empty : Prisma.sql` AND isSimulated = 0`}
    GROUP BY effectiveMonth, currency
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    ORDER BY effectiveMonth ASC
  `;
  return rows.map((r) => ({ ...r, sourceCount: Number(r.sourceCount), minPrice: Number(r.minPrice), maxPrice: Number(r.maxPrice), avgPrice: Number(r.avgPrice) }));
}

export type PricingDimension = "destinationRegion" | "manufactureRegion" | "incoterm";
export interface PricingBreakdownRow { label: string | null; currency: string; sourceCount: number; observations: number; minPrice: number; maxPrice: number; avgPrice: number }

/** Price for one product group split by one dimension, over the whole period. The dimension is chosen from a fixed list, never interpolated from input. */
export async function getPricingBreakdown(category: string, by: PricingDimension, showSimulated = false): Promise<PricingBreakdownRow[]> {
  const col = by === "destinationRegion" ? Prisma.sql`destinationRegion` : by === "manufactureRegion" ? Prisma.sql`manufactureRegion` : Prisma.sql`incoterm`;
  const rows = await insightsPrisma.$queryRaw<{ label: string | null; currency: string; sourceCount: number; observations: number; minPrice: number; maxPrice: number; avgPrice: number }[]>`
    SELECT ${col} AS label, currency, COUNT(DISTINCT sourceHash) AS sourceCount, COUNT(*) AS observations, MIN(unitPrice) AS minPrice, MAX(unitPrice) AS maxPrice, AVG(unitPrice) AS avgPrice
    FROM aggregated_product_prices
    WHERE category = ${category}${showSimulated ? Prisma.empty : Prisma.sql` AND isSimulated = 0`}
    GROUP BY ${col}, currency
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
    ORDER BY avgPrice DESC
  `;
  return rows.map((r) => ({ ...r, sourceCount: Number(r.sourceCount), observations: Number(r.observations), minPrice: Number(r.minPrice), maxPrice: Number(r.maxPrice), avgPrice: Number(r.avgPrice) }));
}

/** When the aggregates were last refreshed (newest row), so the app can say how fresh the data is. */
export async function getInsightsFreshness(showSimulated = false): Promise<{ prices: Date | null; sourcing: Date | null; logistics: Date | null }> {
  const f = showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`;
  const [p, s, l] = await Promise.all([
    insightsPrisma.$queryRaw<{ d: Date | null }[]>`SELECT MAX(createdAt) AS d FROM aggregated_product_prices ${f}`,
    insightsPrisma.$queryRaw<{ d: Date | null }[]>`SELECT MAX(createdAt) AS d FROM aggregated_product_sourcing ${f}`,
    insightsPrisma.$queryRaw<{ d: Date | null }[]>`SELECT MAX(createdAt) AS d FROM aggregated_logistics_metrics ${f}`,
  ]);
  return { prices: p[0]?.d ?? null, sourcing: s[0]?.d ?? null, logistics: l[0]?.d ?? null };
}


export async function getPricingMovement(showSimulated = false): Promise<PricingMovementSeries[]> {
  const rows = await insightsPrisma.$queryRaw<{ category: string; attributes: string | null; manufactureRegion: string | null; destinationRegion: string | null; currency: string; effectiveMonth: Date; sourceHash: string; priceSum: number; priceCount: number }[]>`
    SELECT category, attributes, manufactureRegion, destinationRegion, currency, effectiveMonth, sourceHash, SUM(unitPrice) AS priceSum, COUNT(*) AS priceCount
    FROM aggregated_product_prices
    ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
    GROUP BY category, attributes, manufactureRegion, destinationRegion, currency, effectiveMonth, sourceHash
  `;
  return computePricingMovement(rows.map((r) => ({ ...r, priceSum: Number(r.priceSum), priceCount: Number(r.priceCount) })));
}

// ---------------------------------------------------------------------------
// Freight cost and service cost reads (2026-10-25). Same rules as every read above: minimum-cohort floor in SQL, simulated rows only for demo
// requests, cost only. Until the two tables have been created in the insights database (infra/sql/insights-freight-services.sql) these return
// nothing rather than failing, so the rest of the app keeps working.
// ---------------------------------------------------------------------------
const tableMissing = (e: unknown) => /Invalid object name|does not exist|no such table/i.test(e instanceof Error ? e.message : String(e));
async function orEmpty<T>(run: () => Promise<T[]>): Promise<T[]> {
  try { return await run(); } catch (e) { if (tableMissing(e)) return []; throw e; }
}

export interface FreightRateRow { freightMode: string; originRegion: string | null; destinationRegion: string | null; currency: string; sourceCount: number; shipments: number; avgDistanceKm: number; avgCostPerTonne: number; minCostPerTonne: number; maxCostPerTonne: number; avgCostPerTonneKm: number }

/** Freight cost per tonne and per tonne-km, by mode and lane (region to region), over the whole period. */
export function getFreightRates(showSimulated = false): Promise<FreightRateRow[]> {
  return orEmpty(async () => {
    const rows = await insightsPrisma.$queryRaw<FreightRateRow[]>`
      SELECT freightMode, originRegion, destinationRegion, currency, COUNT(DISTINCT sourceHash) AS sourceCount, COUNT(*) AS shipments, AVG(distanceKm) AS avgDistanceKm,
             AVG(costPerTonne) AS avgCostPerTonne, MIN(costPerTonne) AS minCostPerTonne, MAX(costPerTonne) AS maxCostPerTonne, AVG(costPerTonneKm) AS avgCostPerTonneKm
      FROM aggregated_freight_costs
      ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
      GROUP BY freightMode, originRegion, destinationRegion, currency
      HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
      ORDER BY avgCostPerTonne DESC`;
    return rows.map((r) => ({ ...r, sourceCount: Number(r.sourceCount), shipments: Number(r.shipments), avgDistanceKm: Number(r.avgDistanceKm), avgCostPerTonne: Number(r.avgCostPerTonne), minCostPerTonne: Number(r.minCostPerTonne), maxCostPerTonne: Number(r.maxCostPerTonne), avgCostPerTonneKm: Number(r.avgCostPerTonneKm) }));
  });
}

/** Like-for-like movement of freight cost per tonne-km, per mode (and per origin and destination region). Items: size band and lane. */
export function getFreightMovement(showSimulated = false): Promise<PricingMovementSeries[]> {
  return orEmpty(async () => {
    const rows = await insightsPrisma.$queryRaw<{ category: string; attributes: string; manufactureRegion: string | null; destinationRegion: string | null; currency: string; effectiveMonth: Date; sourceHash: string; priceSum: number; priceCount: number }[]>`
      SELECT freightMode AS category, weightBand AS attributes, originRegion AS manufactureRegion, destinationRegion, currency, effectiveMonth, sourceHash, SUM(costPerTonneKm) AS priceSum, COUNT(*) AS priceCount
      FROM aggregated_freight_costs
      ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
      GROUP BY freightMode, weightBand, originRegion, destinationRegion, currency, effectiveMonth, sourceHash`;
    return computePricingMovement(rows.map((r) => ({ ...r, priceSum: Number(r.priceSum), priceCount: Number(r.priceCount) })));
  });
}

export interface ServicePriceRow { serviceCategory: string; pricingBasis: string; deliveryRegion: string | null; currency: string; sourceCount: number; observations: number; minPrice: number; maxPrice: number; avgPrice: number }

/** Service cost by kind of service and pricing basis; `byRegion` also splits by region of delivery. */
export function getServicePrices(byRegion: boolean, showSimulated = false): Promise<ServicePriceRow[]> {
  return orEmpty(async () => {
    const region = byRegion ? Prisma.sql`deliveryRegion` : Prisma.sql`CAST(NULL AS NVARCHAR(1000))`;
    const group = byRegion ? Prisma.sql`serviceCategory, pricingBasis, deliveryRegion, currency` : Prisma.sql`serviceCategory, pricingBasis, currency`;
    const rows = await insightsPrisma.$queryRaw<ServicePriceRow[]>`
      SELECT serviceCategory, pricingBasis, ${region} AS deliveryRegion, currency, COUNT(DISTINCT sourceHash) AS sourceCount, COUNT(*) AS observations, MIN(unitPrice) AS minPrice, MAX(unitPrice) AS maxPrice, AVG(unitPrice) AS avgPrice
      FROM aggregated_service_prices
      ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
      GROUP BY ${group}
      HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
      ORDER BY serviceCategory ASC`;
    return rows.map((r) => ({ ...r, sourceCount: Number(r.sourceCount), observations: Number(r.observations), minPrice: Number(r.minPrice), maxPrice: Number(r.maxPrice), avgPrice: Number(r.avgPrice) }));
  });
}

/** Like-for-like movement of service cost. A series is one kind of service in one pricing basis ("CODE|BASIS"); items are regions of delivery. */
export function getServiceMovement(showSimulated = false): Promise<PricingMovementSeries[]> {
  return orEmpty(async () => {
    const rows = await insightsPrisma.$queryRaw<{ category: string; attributes: string | null; manufactureRegion: string | null; destinationRegion: string | null; currency: string; effectiveMonth: Date; sourceHash: string; priceSum: number; priceCount: number }[]>`
      SELECT serviceCategory + '|' + pricingBasis AS category, CAST(NULL AS NVARCHAR(1000)) AS attributes, CAST(NULL AS NVARCHAR(1000)) AS manufactureRegion, deliveryRegion AS destinationRegion, currency, effectiveMonth, sourceHash, SUM(unitPrice) AS priceSum, COUNT(*) AS priceCount
      FROM aggregated_service_prices
      ${showSimulated ? Prisma.empty : Prisma.sql`WHERE isSimulated = 0`}
      GROUP BY serviceCategory, pricingBasis, deliveryRegion, currency, effectiveMonth, sourceHash`;
    return computePricingMovement(rows.map((r) => ({ ...r, priceSum: Number(r.priceSum), priceCount: Number(r.priceCount) })));
  });
}

/** The most active metrics across Universe (2026-10-25). Only days where at least five organisations contributed are returned; simulated rows only to demo requests. */
export async function getDailyActivity(showSimulated = false, limit = 4): Promise<InsightsActivity> {
  const rows = await insightsPrisma.$queryRaw<{ day: Date; metric: string; events: number; organisations: number }[]>`
    SELECT day, metric, SUM(eventCount) AS events, COUNT(DISTINCT sourceHash) AS organisations
    FROM aggregated_daily_activity
    WHERE day >= DATEADD(day, -30, CAST(GETUTCDATE() AS date))
    ${showSimulated ? Prisma.empty : Prisma.sql`AND isSimulated = 0`}
    GROUP BY day, metric
    HAVING COUNT(DISTINCT sourceHash) >= ${MINIMUM_COHORT_SIZE}
  `;
  return rankActivity(rows.map((r) => ({ day: new Date(r.day).toISOString().slice(0, 10), metric: r.metric, events: Number(r.events), organisations: Number(r.organisations) })), limit);
}
