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
@Injectable()
export class ProductSourcingInsightsService {
  async getGlobalSourcing(): Promise<ProductSourcingSummary[]> {
    const rows = await getAggregatedProductSourcing();
    return rows.map((r) => ({
      category: r.category,
      manufactureCountryCode: r.manufactureCountryCode,
      sourceCount: Number(r.sourceCount),
      approvalCount: Number(r.approvalCount),
    }));
  }
}
