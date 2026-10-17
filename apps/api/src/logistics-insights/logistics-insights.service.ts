import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { getAggregatedLogisticsRoutes, getStakeholderRatingDistribution } from "@universe/insights-db";
import type {
  LogisticsLinesPage,
  LogisticsFilters,
  LogisticsMetricSummary,
  LogisticsRouteSummary,
  OrgLogisticsLineSummary,
  StakeholderRatingBucket,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";

function decimalToString(d: unknown): string {
  return d === null || d === undefined ? "0" : String(d);
}

/**
 * Supply-chain CO2/distance/efficiency read service — added 2026-10-08.
 * See supply-chain-co2-efficiency.md for the full feature writeup.
 *
 * - getOrgLines: the host organization's OWN computed metrics, org-private
 *   by default (plain withTenantContext/RLS scoping, same as every other
 *   tenant-scoped read in this codebase) — "visible by default only to
 *   the host universe organisation" per Lewis's request.
 * - getGlobalRoutes / getGlobalStakeholderRatings: the anonymized,
 *   cross-tenant views, read from the separate @universe/insights-db
 *   package — never derived from this organization's own tenant data
 *   directly, same separation-of-databases convention as the existing
 *   pricing-insights feature.
 */
@Injectable()
export class LogisticsInsightsService {
  private whereFor(filters: LogisticsFilters) {
    return {

          manufactureCountryCode: filters.manufactureCountryCode || undefined,
          destinationCountryCode: filters.destinationCountryCode || undefined,
          transportMode: filters.transportMode || undefined,
          incoterm: filters.incoterm || undefined,
          commodityGroup: filters.commodityGroup || undefined,
          scoreBand: filters.scoreBand || undefined,
          durationDays:
            filters.minDurationDays !== undefined || filters.maxDurationDays !== undefined
              ? { gte: filters.minDurationDays, lte: filters.maxDurationDays }
              : undefined,
          projectLine: filters.search
            ? {
                OR: [
                  { clientProductDescription: { contains: filters.search } },
                  { project: { referenceNumber: { contains: filters.search } } },
                  { project: { title: { contains: filters.search } } },
                ],
              }
            : undefined,
        
    };
  }

  private toLineSummary(m: any): OrgLogisticsLineSummary {

        const metric: LogisticsMetricSummary = {
          manufactureCountryCode: m.manufactureCountryCode,
          destinationCountryCode: m.destinationCountryCode,
          transportMode: m.transportMode,
          incoterm: m.incoterm,
          commodityGroup: m.commodityGroup,
          weightKgUsed: decimalToString(m.weightKgUsed),
          weightEstimated: m.weightEstimated,
          distanceKm: decimalToString(m.distanceKm),
          co2FactorKgPerTonneKm: decimalToString(m.co2FactorKgPerTonneKm),
          co2TotalKg: decimalToString(m.co2TotalKg),
          durationDays: m.durationDays,
          efficiencyScore: m.efficiencyScore,
          scoreBand: m.scoreBand,
          methodologyVersion: m.methodologyVersion,
          calculatedAt: m.calculatedAt.toISOString(),
        };
        return {
          projectLineId: m.projectLineId,
          projectId: m.projectId,
          projectReferenceNumber: m.projectLine.project.referenceNumber,
          projectTitle: m.projectLine.project.title,
          clientProductDescription: m.projectLine.clientProductDescription,
          manufacturerName: m.projectLine.manufacturer?.name ?? null,
          supplierName: m.projectLine.supplier?.name ?? null,
          metric,
        };
  }

  /** @deprecated First 500 only — the screen uses getOrgLinesPage. */
  async getOrgLines(user: RequestUser, filters: LogisticsFilters): Promise<OrgLogisticsLineSummary[]> {
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.projectLineLogisticsMetric.findMany({
        where: this.whereFor(filters),
        include: {
          projectLine: {
            include: {
              project: { select: { referenceNumber: true, title: true } },
              manufacturer: { select: { name: true } },
              supplier: { select: { name: true } },
            },
          },
        },
        orderBy: { calculatedAt: "desc" },
        take: 500,
      });
      return rows.map((m) => this.toLineSummary(m));
    });
  }

  /** One page of this organisation's logistics lines plus totals over the whole filtered set,
   * computed in the database (2026-10-17, scale work) — the screen's tiles used to be summed in the
   * browser from every row. */
  async getOrgLinesPage(user: RequestUser, filters: LogisticsFilters, opts: { page?: number; pageSize?: number }): Promise<LogisticsLinesPage> {
    const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? 25), 5), 100);
    const page = Math.max(Math.floor(opts.page ?? 1), 1);
    const where = this.whereFor(filters);
    return withTenantContext(user.organizationId, async (tx) => {
      const [agg, rows] = await Promise.all([
        tx.projectLineLogisticsMetric.aggregate({ where, _count: { _all: true }, _sum: { co2TotalKg: true, distanceKm: true }, _avg: { efficiencyScore: true } }),
        tx.projectLineLogisticsMetric.findMany({
          where,
        include: {
          projectLine: {
            include: {
              project: { select: { referenceNumber: true, title: true } },
              manufacturer: { select: { name: true } },
              supplier: { select: { name: true } },
            },
          },
        },
          orderBy: [{ calculatedAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return {
        items: rows.map((m) => this.toLineSummary(m)),
        total: agg._count._all,
        page,
        pageSize,
        totals: {
          count: agg._count._all,
          totalCo2Kg: Number(agg._sum.co2TotalKg ?? 0),
          totalDistanceKm: Number(agg._sum.distanceKm ?? 0),
          avgScore: agg._avg.efficiencyScore ?? 0,
        },
      };
    });
  }

  async getGlobalRoutes(filters: LogisticsFilters, showSimulated = false): Promise<LogisticsRouteSummary[]> {
    const rows = await getAggregatedLogisticsRoutes({
      manufactureCountryCode: filters.manufactureCountryCode,
      destinationCountryCode: filters.destinationCountryCode,
      transportMode: filters.transportMode,
      incoterm: filters.incoterm,
      commodityGroup: filters.commodityGroup,
      minDurationDays: filters.minDurationDays,
      maxDurationDays: filters.maxDurationDays,
    }, showSimulated);
    return rows.map((r) => ({
      manufactureCountryCode: r.manufactureCountryCode,
      destinationCountryCode: r.destinationCountryCode,
      transportMode: r.transportMode,
      incoterm: r.incoterm,
      commodityGroup: r.commodityGroup,
      sourceCount: Number(r.sourceCount),
      shipmentCount: Number(r.shipmentCount),
      avgDistanceKm: Number(r.avgDistanceKm),
      avgCo2TotalKg: Number(r.avgCo2TotalKg),
      avgDurationDays: r.avgDurationDays !== null ? Number(r.avgDurationDays) : null,
      avgEfficiencyScore: Number(r.avgEfficiencyScore),
    }));
  }

  async getGlobalStakeholderRatings(showSimulated = false): Promise<StakeholderRatingBucket[]> {
    return getStakeholderRatingDistribution(showSimulated);
  }
}
