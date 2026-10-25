import { Module } from "@nestjs/common";
import { ProductSourcingInsightsService } from "../product-sourcing-insights/product-sourcing-insights.service";
import { InsightsAccessGuard } from "./insights-access.guard";
import { InsightsController } from "./insights.controller";
import { InsightsService } from "./insights.service";

@Module({ controllers: [InsightsController], providers: [InsightsService, InsightsAccessGuard, ProductSourcingInsightsService] })
export class InsightsModule {}
