import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { getAggregatedLogisticsRoutes, getStakeholderRatingDistribution } from "@universe/insights-db";
import type {
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
  async getOrgLines(user: RequestUser, filters: LogisticsFilters): Promise<OrgLogisticsLineSummary[]> {
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.projectLineLogisticsMetric.findMany({
        where: {
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
        },
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
      });

      return rows.map((m): OrgLogisticsLineSummary => {
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
      });
    });
  }

  async getGlobalRoutes(filters: LogisticsFilters): Promise<LogisticsRouteSummary[]> {
    const rows = await getAggregatedLogisticsRoutes({
      manufactureCountryCode: filters.manufactureCountryCode,
      destinationCountryCode: filters.destinationCountryCode,
      transportMode: filters.transportMode,
      incoterm: filters.incoterm,
      commodityGroup: filters.commodityGroup,
      minDurationDays: filters.minDurationDays,
      maxDurationDays: filters.maxDurationDays,
    });
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

  async getGlobalStakeholderRatings(): Promise<StakeholderRatingBucket[]> {
    return getStakeholderRatingDistribution();
  }
}
