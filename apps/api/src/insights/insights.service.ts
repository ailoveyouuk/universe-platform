import { BadRequestException, Injectable } from "@nestjs/common";
import { MINIMUM_COHORT_SIZE, getInsightsFreshness, getPricingBreakdown, getPricingMovement, getFreightRates, getFreightMovement, getServicePrices, getServiceMovement, getDailyActivity, getLogisticsTrend, getSourcingTrend, getPricingTrend, listPricedCategories } from "@universe/insights-db";
import { canonicalCommodityGroup } from "@universe/types";
import { prisma } from "@universe/db";
import { noticeCountries, referenceCountries } from "./reference-layers";
import type { PricingDimension } from "@universe/insights-db";
import type { InsightsOverview, InsightsActivity, InsightsLogisticsTrendPoint, InsightsSourcingTrendPoint, InsightsReferenceCountry, InsightsFxSeries, LogisticsFilters, LogisticsRouteSummary, StakeholderRatingSummary, InsightsFreightRate, InsightsServicePrice, InsightsPriceBreakdownRow, InsightsPriceMovement, InsightsPriceTrendPoint, InsightsPricedCategory, ProductSourcingSummary } from "@universe/types";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { LogisticsInsightsService } from "../logistics-insights/logistics-insights.service";
import { ProductSourcingInsightsService } from "../product-sourcing-insights/product-sourcing-insights.service";

const DIMENSIONS: PricingDimension[] = ["destinationRegion", "manufactureRegion", "incoterm", "freightMode", "orderSize"];
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
    if (!DIMENSIONS.includes(by as PricingDimension)) throw new BadRequestException("Choose destinationRegion, manufactureRegion, incoterm, freightMode or orderSize.");
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

  /**
   * Monthly shipping figures by mode and commodity group. The two spellings of a commodity group are merged here (weighted by shipments); merging only
   * adds organisations to a cell, so every row still has at least the minimum number behind it.
   */
  async logisticsTrend(filters: { manufactureCountryCode?: string; destinationCountryCode?: string; transportMode?: string }, showSimulated: boolean): Promise<InsightsLogisticsTrendPoint[]> {
    const merged = new Map<string, InsightsLogisticsTrendPoint & { _d: number }>();
    for (const r of await getLogisticsTrend(filters, showSimulated)) {
      const month = new Date(r.effectiveMonth).toISOString().slice(0, 7), group = canonicalCommodityGroup(r.commodityGroup);
      const key = `${month}|${r.transportMode}|${group}`, n = Number(r.shipmentCount), cur = merged.get(key);
      if (!cur) { merged.set(key, { month, transportMode: r.transportMode, commodityGroup: group, sourceCount: Number(r.sourceCount), shipmentCount: n, avgDistanceKm: r.avgDistanceKm, avgCo2TotalKg: r.avgCo2TotalKg, avgDurationDays: r.avgDurationDays, avgEfficiencyScore: r.avgEfficiencyScore, _d: r.avgDurationDays === null ? 0 : n }); continue; }
      const t = cur.shipmentCount + n, w = (a: number, b: number) => (a * cur.shipmentCount + b * n) / t;
      const dn = r.avgDurationDays === null ? 0 : n, dt = cur._d + dn;
      cur.avgDurationDays = dt === 0 ? null : (((cur.avgDurationDays ?? 0) * cur._d) + (r.avgDurationDays ?? 0) * dn) / dt;
      cur.avgDistanceKm = w(cur.avgDistanceKm, r.avgDistanceKm); cur.avgCo2TotalKg = w(cur.avgCo2TotalKg, r.avgCo2TotalKg); cur.avgEfficiencyScore = w(cur.avgEfficiencyScore, r.avgEfficiencyScore);
      cur.shipmentCount = t; cur.sourceCount = Math.max(cur.sourceCount, Number(r.sourceCount)); cur._d = dt;
    }
    return [...merged.values()].map(({ _d, ...p }) => p).sort((a, b) => a.month.localeCompare(b.month));
  }

  async sourcingTrend(manufactureCountryCode: string | undefined, showSimulated: boolean): Promise<InsightsSourcingTrendPoint[]> {
    return (await getSourcingTrend(manufactureCountryCode || undefined, showSimulated)).map((r) => ({ month: new Date(r.month).toISOString().slice(0, 7), category: r.category, sourceCount: Number(r.sourceCount), approvalCount: Number(r.approvalCount) }));
  }

  /**
   * Shared regulatory reference data by country (export restrictions, active registrations, open safety notices). This is catalogue reference data, not
   * any organisation's own data, so it is read from the main database; only counts leave here, never a product, holder, contributor or notice text.
   */
  async referenceCountries(showSimulated: boolean): Promise<InsightsReferenceCountry[]> {
    const sim = showSimulated ? {} : { isSimulated: false };
    const [rs, regs, notes] = await Promise.all([
      prisma.exportRestriction.groupBy({ by: ["restrictingCountryCode"], where: { status: "ACTIVE", ...sim }, _count: { _all: true } }),
      prisma.productRegulatoryRegistration.groupBy({ by: ["countryCode"], where: { status: "ACTIVE", isArchived: false, countryCode: { not: null }, OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }], ...sim }, _count: { _all: true } }),
      prisma.productSafetyNotice.findMany({ where: { status: "OPEN", isArchived: false, ...sim }, select: { countryCodes: true } }),
    ]);
    const tally = (pairs: [string, number][]) => pairs.reduce((m, [c, n]) => m.set(c, (m.get(c) ?? 0) + n), new Map<string, number>());
    return referenceCountries(
      tally(rs.map((r) => [r.restrictingCountryCode.toUpperCase(), r._count._all])),
      tally(regs.flatMap((r) => (r.countryCode ? [[r.countryCode.toUpperCase(), r._count._all] as [string, number]] : []))),
      tally(notes.flatMap((n) => noticeCountries(n.countryCodes).map((c) => [c, 1] as [string, number]))),
    );
  }
}
