import { Injectable } from "@nestjs/common";
import { getAggregatedProductSourcing } from "@universe/insights-db";
import type { ProductSourcingSummary } from "@universe/types";

/**
 * Product sourcing read service — Stage 3c of
 * product-database-and-map-roadmap.md. Mirrors LogisticsInsightsService's
 * global/anonymized read: this endpoint reads only the separate
 * @universe/insights-db database, never this organization's own
 * ProductSourceApproval data directly (that stays tenant-private, read
 * via the existing Product Database catalogue's own sourcing panel —
 * see Fix 3 in the roadmap doc).
 */
/** The aggregates only change when the nightly ETL runs, and the grouping over the whole table took about 5 seconds, so the result is kept for 10 minutes per audience (2026-10-22). */
export const SOURCING_CACHE_MS = 10 * 60 * 1000;

@Injectable()
export class ProductSourcingInsightsService {
  private cache = new Map<boolean, { at: number; value: Promise<ProductSourcingSummary[]> }>();

  async getGlobalSourcing(showSimulated = false, now = Date.now()): Promise<ProductSourcingSummary[]> {
    const hit = this.cache.get(showSimulated);
    if (hit && now - hit.at < SOURCING_CACHE_MS) return hit.value;
    const value = getAggregatedProductSourcing(showSimulated).then((rows) => rows.map((r) => ({
      category: r.category,
      manufactureCountryCode: r.manufactureCountryCode,
      sourceCount: Number(r.sourceCount),
      approvalCount: Number(r.approvalCount),
    })));
    this.cache.set(showSimulated, { at: now, value });
    // A failed read must not be remembered.
    value.catch(() => { if (this.cache.get(showSimulated)?.value === value) this.cache.delete(showSimulated); });
    return value;
  }
}
