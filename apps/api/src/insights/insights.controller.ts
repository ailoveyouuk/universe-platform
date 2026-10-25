import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { InsightsAccessGuard } from "./insights-access.guard";
import { InsightsService } from "./insights.service";
import { InsightsUserItemsService } from "./insights-user-items.service";
import { RenameInsightsUserItemDto, SaveInsightsUserItemDto } from "./dto/insights-user-item.dto";

/** The Insights app's reads (2026-10-25). Sign-in plus the Insights app permission; every figure is an anonymised aggregate. */
@Controller("insights")
@UseGuards(EntraAuthGuard, InsightsAccessGuard)
export class InsightsController {
  constructor(private readonly insights: InsightsService, private readonly items: InsightsUserItemsService) {}

  @Get("me/items") listItems(@CurrentUser() u: RequestUser) { return this.items.list(u); }
  @Post("me/items") saveItem(@CurrentUser() u: RequestUser, @Body() dto: SaveInsightsUserItemDto) { return this.items.save(u, dto); }
  @Patch("me/items/:id") renameItem(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: RenameInsightsUserItemDto) { return this.items.rename(u, id, dto.name); }
  @Delete("me/items/:id") removeItem(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.items.remove(u, id); }


  @Get("overview") overview(@CurrentUser() u: RequestUser) { return this.insights.overview(u.inDemoOrganization === true); }
  @Get("prices/categories") categories(@CurrentUser() u: RequestUser) { return this.insights.priceCategories(u.inDemoOrganization === true); }
  @Get("prices/trend") trend(@CurrentUser() u: RequestUser, @Query("category") category = "") { return this.insights.priceTrend(category, u.inDemoOrganization === true); }
  @Get("prices/movement") movement(@CurrentUser() u: RequestUser) { return this.insights.priceMovement(u.inDemoOrganization === true); }
  @Get("fx/series") fxSeries(@Query("from") from = "USD", @Query("to") to = "EUR", @Query("start") start = "", @Query("end") end = "") { return this.insights.fxSeries(from, to, start, end); }
  @Get("activity") activity(@CurrentUser() u: RequestUser) { return this.insights.activity(u.inDemoOrganization === true); }
  @Get("freight/rates") freightRates(@CurrentUser() u: RequestUser) { return this.insights.freightRates(u.inDemoOrganization === true); }
  @Get("freight/movement") freightMovement(@CurrentUser() u: RequestUser) { return this.insights.freightMovement(u.inDemoOrganization === true); }
  @Get("services/prices") servicePrices(@CurrentUser() u: RequestUser, @Query("byRegion") byRegion = "") { return this.insights.servicePrices(byRegion === "true", u.inDemoOrganization === true); }
  @Get("services/movement") serviceMovement(@CurrentUser() u: RequestUser) { return this.insights.serviceMovement(u.inDemoOrganization === true); }
  @Get("prices/breakdown") breakdown(@CurrentUser() u: RequestUser, @Query("category") category = "", @Query("by") by = "destinationRegion") { return this.insights.priceBreakdown(category, by, u.inDemoOrganization === true); }
  @Get("sourcing") sourcing(@CurrentUser() u: RequestUser) { return this.insights.sourcingByCategory(u.inDemoOrganization === true); }
  @Get("logistics/routes") logisticsRoutes(
    @CurrentUser() u: RequestUser,
    @Query("manufactureCountryCode") manufactureCountryCode?: string,
    @Query("destinationCountryCode") destinationCountryCode?: string,
    @Query("transportMode") transportMode?: string,
    @Query("incoterm") incoterm?: string,
    @Query("commodityGroup") commodityGroup?: string,
  ) {
    return this.insights.logisticsRoutes({ manufactureCountryCode, destinationCountryCode, transportMode, incoterm, commodityGroup }, u.inDemoOrganization === true);
  }
  @Get("logistics/trend") logisticsTrend(
    @CurrentUser() u: RequestUser,
    @Query("manufactureCountryCode") manufactureCountryCode?: string,
    @Query("destinationCountryCode") destinationCountryCode?: string,
    @Query("transportMode") transportMode?: string,
  ) { return this.insights.logisticsTrend({ manufactureCountryCode: manufactureCountryCode || undefined, destinationCountryCode: destinationCountryCode || undefined, transportMode: transportMode || undefined }, u.inDemoOrganization === true); }
  @Get("sourcing/trend") sourcingTrend(@CurrentUser() u: RequestUser, @Query("manufactureCountryCode") manufactureCountryCode?: string) { return this.insights.sourcingTrend(manufactureCountryCode, u.inDemoOrganization === true); }
  @Get("logistics/ratings") logisticsRatings(@CurrentUser() u: RequestUser) { return this.insights.logisticsRatings(u.inDemoOrganization === true); }
}
