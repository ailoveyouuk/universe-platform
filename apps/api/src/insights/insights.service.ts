import { BadRequestException, Injectable } from "@nestjs/common";
import { MINIMUM_COHORT_SIZE, getInsightsFreshness, getPricingBreakdown, getPricingMovement, getFreightRates, getFreightMovement, getServicePrices, getServiceMovement, getDailyActivity, getPricingTrend, listPricedCategories } from "@universe/insights-db";
import { canonicalCommodityGroup } from "@universe/types";
import type { PricingDimension } from "@universe/insights-db";
import type { InsightsOverview, InsightsActivity, InsightsFxSeries, LogisticsFilters, LogisticsRouteSummary, StakeholderRatingSummary, InsightsFreightRate, InsightsServicePrice, InsightsPriceBreakdownRow, InsightsPriceMovement, InsightsPriceTrendPoint, InsightsPricedCategory, ProductSourcingSummary } from "@universe/types";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { LogisticsInsightsService } from "../logistics-insights/logistics-insights.service";
import { ProductSourcingInsightsService } from "../product-sourcing-insights/product-sourcing-insights.service";

const DIMENSIONS: PricingDimension[] = ["destinationRegion", "manufactureRegion", "incoterm"];
const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);

/**
 * Reads for the Insights app. Every method takes `showSimulated` (true only for demo-organisation requests) and reads only the separate insights
 * database, whose queries apply the minimum-contributor floor in SQL. Nothing tenant-private is read here.
 */
@Injectable()
export class InsightsService {
  constructor(private readonly sourcing: ProductSourcingInsightsService, private readonly logistics: LogisticsInsightsService, private readonly fx: ExchangeRatesService) {}

  async overview(showSimulated: boolean): Promise<InsightsOverview> {
    const [cats, src, fresh, routes] = await Promise.all([listPricedCategories(showSimulated), this.sourcing.getGlobalSourcing(showSimulated), getInsightsFreshness(showSimulated), this.logistics.getGlobalRoutes({}, showSimulated)]);
    return {
      pricedCategories: cats.length,
      sourcedCategories: new Set(src.map((r) => r.category)).size,
      logisticsRoutes: routes.length,
      minimumContributors: MINIMUM_COHORT_SIZE,
      freshness: { prices: iso(fresh.prices), sourcing: iso(fresh.sourcing), logistics: iso(fresh.logistics) },
    };
  }

  async priceCategories(showSimulated: boolean): Promise<InsightsPricedCategory[]> {
    return (await listPricedCategories(showSimulated)).map((c) => ({ category: c.category, sourceCount: c.sourceCount, observations: c.observations, latestMonth: new Date(c.latestMonth).toISOString() }));
  }

  async priceTrend(category: string, showSimulated: boolean): Promise<InsightsPriceTrendPoint[]> {
    if (!category.trim()) throw new BadRequestException("Choose a product group.");
    return (await getPricingTrend(category, showSimulated)).map((p) => ({ month: new Date(p.effectiveMonth).toISOString().slice(0, 7), currency: p.currency, sourceCount: p.sourceCount, minPrice: p.minPrice, maxPrice: p.maxPrice, avgPrice: p.avgPrice }));
  }

  async priceMovement(showSimulated: boolean): Promise<InsightsPriceMovement[]> {
    return (await getPricingMovement(showSimulated)).map((s) => ({ category: s.category, segmentBy: s.segmentBy, segment: s.segment, currency: s.currency, points: s.points.map((p) => ({ month: new Date(p.effectiveMonth).toISOString().slice(0, 7), index: p.index, sourceCount: p.sourceCount, matchedItems: p.matchedItems })) }));
  }

  private movementDto(rows: Awaited<ReturnType<typeof getPricingMovement>>): InsightsPriceMovement[] {
    return rows.map((s) => ({ category: s.category, segmentBy: s.segmentBy, segment: s.segment, currency: s.currency, points: s.points.map((p) => ({ month: new Date(p.effectiveMonth).toISOString().slice(0, 7), index: p.index, sourceCount: p.sourceCount, matchedItems: p.matchedItems })) }));
  }
  async fxSeries(from: string, to: string, start: string, end: string): Promise<InsightsFxSeries> {
    const f = from.toUpperCase(), t = to.toUpperCase();
    const ok = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
    if (!ok(start) || !ok(end)) throw new BadRequestException("start and end must be dates (YYYY-MM-DD).");
    const s0 = new Date(`${start}T00:00:00Z`), e0 = new Date(`${end}T00:00:00Z`);
    if (e0 < s0) throw new BadRequestException("end must not be before start.");
    if ((e0.getTime() - s0.getTime()) / 86_400_000 > 1830) throw new BadRequestException("The range can be at most five years.");
    if (f === t) return { from: f, to: t, start, end, points: [], source: "", available: true };
    const r = await this.fx.getSeries(f, t, s0, e0);
    return r ? { from: f, to: t, start, end, points: r.points, source: r.source, available: true } : { from: f, to: t, start, end, points: [], source: "", available: false };
  }
  async activity(showSimulated: boolean): Promise<InsightsActivity> { return getDailyActivity(showSimulated, 4); }
  async freightRates(showSimulated: boolean): Promise<InsightsFreightRate[]> { return getFreightRates(showSimulated); }
  async freightMovement(showSimulated: boolean): Promise<InsightsPriceMovement[]> { return this.movementDto(await getFreightMovement(showSimulated)); }
  async servicePrices(byRegion: boolean, showSimulated: boolean): Promise<InsightsServicePrice[]> { return getServicePrices(byRegion, showSimulated); }
  async serviceMovement(showSimulated: boolean): Promise<InsightsPriceMovement[]> { return this.movementDto(await getServiceMovement(showSimulated)); }

  async priceBreakdown(category: string, by: string, showSimulated: boolean): Promise<InsightsPriceBreakdownRow[]> {
    if (!category.trim()) throw new BadRequestException("Choose a product group.");
    if (!DIMENSIONS.includes(by as PricingDimension)) throw new BadRequestException("Choose destinationRegion, manufactureRegion or incoterm.");
    return getPricingBreakdown(category, by as PricingDimension, showSimulated);
  }

  sourcingByCategory(showSimulated: boolean): Promise<ProductSourcingSummary[]> {
    return this.sourcing.getGlobalSourcing(showSimulated);
  }

  /**
   * Routes with the commodity group written one way (older rows hold "Pharmaceuticals", newer ones "PHARMACEUTICALS"). The commodity filter is applied
   * here, after tidying, so both spellings are found. Merging spellings only adds organisations to a group, so the five-organisation floor still holds.
   */
  async logisticsRoutes(filters: LogisticsFilters, showSimulated: boolean): Promise<LogisticsRouteSummary[]> {
    const { commodityGroup, ...rest } = filters;
    const rows = (await this.logistics.getGlobalRoutes(rest, showSimulated)).map((r) => ({ ...r, commodityGroup: canonicalCommodityGroup(r.commodityGroup) }));
    return commodityGroup ? rows.filter((r) => r.commodityGroup === canonicalCommodityGroup(commodityGroup)) : rows;
  }

  logisticsRatings(showSimulated: boolean): Promise<StakeholderRatingSummary[]> {
    return this.logistics.getGlobalStakeholderRatings(showSimulated);
  }
}
