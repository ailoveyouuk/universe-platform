import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { LogisticsInsightsService } from "./logistics-insights.service";
import type { LogisticsFilters } from "@universe/types";

function filtersFromQuery(query: Record<string, unknown>): LogisticsFilters {
  const str = (k: string) => (typeof query[k] === "string" && query[k] !== "" ? (query[k] as string) : undefined);
  const num = (k: string) => {
    const v = str(k);
    return v !== undefined ? Number(v) : undefined;
  };
  return {
    manufactureCountryCode: str("manufactureCountryCode"),
    destinationCountryCode: str("destinationCountryCode"),
    transportMode: str("transportMode"),
    incoterm: str("incoterm"),
    commodityGroup: str("commodityGroup"),
    scoreBand: str("scoreBand"),
    minDurationDays: num("minDurationDays"),
    maxDurationDays: num("maxDurationDays"),
    search: str("search"),
  };
}

/**
 * Supply-chain CO2/distance/efficiency endpoints — added 2026-10-08. See
 * LogisticsInsightsService's doc comment for the org-private vs. global
 * split. All three endpoints share the same filter query-string shape
 * (LogisticsFilters) — "full filtering and search... in a concatenated
 * view" per Lewis's request.
 */
@Controller("logistics-insights")
@UseGuards(EntraAuthGuard)
export class LogisticsInsightsController {
  constructor(private readonly logisticsInsightsService: LogisticsInsightsService) {}

  @Get("lines")
  getOrgLines(@CurrentUser() user: RequestUser, @Query() query: Record<string, unknown>) {
    return this.logisticsInsightsService.getOrgLines(user, filtersFromQuery(query));
  }

  @Get("global/routes")
  getGlobalRoutes(@Query() query: Record<string, unknown>) {
    return this.logisticsInsightsService.getGlobalRoutes(filtersFromQuery(query));
  }

  @Get("global/stakeholder-ratings")
  getGlobalStakeholderRatings() {
    return this.logisticsInsightsService.getGlobalStakeholderRatings();
  }
}
