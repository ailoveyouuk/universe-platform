import { Controller, Get, UseGuards } from "@nestjs/common";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { ProductSourcingInsightsService } from "./product-sourcing-insights.service";

/**
 * Anonymized, cross-tenant "products by category and country of
 * manufacture" endpoint — Stage 3c. Requires sign-in (EntraAuthGuard,
 * same as every other endpoint here) but no particular org/role — the
 * data it returns is already de-identified with MINIMUM_COHORT_SIZE
 * enforced at query time, same gate as /logistics-insights/global/routes.
 */
@Controller("product-sourcing-insights")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("product-database")
export class ProductSourcingInsightsController {
  constructor(private readonly productSourcingInsightsService: ProductSourcingInsightsService) {}

  @Get("global")
  getGlobalSourcing(@CurrentUser() user: RequestUser) {
    return this.productSourcingInsightsService.getGlobalSourcing(user.inDemoOrganization === true);
  }
}
