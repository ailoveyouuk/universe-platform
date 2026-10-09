import { Controller, Get, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { ProductSourcingInsightsService } from "./product-sourcing-insights.service";

/**
 * Anonymized, cross-tenant "products by category and country of
 * manufacture" endpoint — Stage 3c. Requires sign-in (EntraAuthGuard,
 * same as every other endpoint here) but no particular org/role — the
 * data it returns is already de-identified with MINIMUM_COHORT_SIZE
 * enforced at query time, same gate as /logistics-insights/global/routes.
 */
@Controller("product-sourcing-insights")
@UseGuards(EntraAuthGuard)
export class ProductSourcingInsightsController {
  constructor(private readonly productSourcingInsightsService: ProductSourcingInsightsService) {}

  @Get("global")
  getGlobalSourcing() {
    return this.productSourcingInsightsService.getGlobalSourcing();
  }
}
