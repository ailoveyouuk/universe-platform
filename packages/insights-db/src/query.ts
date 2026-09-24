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
