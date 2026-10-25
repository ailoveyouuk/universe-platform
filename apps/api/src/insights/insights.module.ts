import { Module } from "@nestjs/common";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { LogisticsInsightsService } from "../logistics-insights/logistics-insights.service";
import { ProductSourcingInsightsService } from "../product-sourcing-insights/product-sourcing-insights.service";
import { InsightsAccessGuard } from "./insights-access.guard";
import { InsightsController } from "./insights.controller";
import { InsightsService } from "./insights.service";
import { InsightsUserItemsService } from "./insights-user-items.service";

@Module({ imports: [ExchangeRatesModule], controllers: [InsightsController], providers: [InsightsService, InsightsUserItemsService, InsightsAccessGuard, ProductSourcingInsightsService, LogisticsInsightsService] })
export class InsightsModule {}
