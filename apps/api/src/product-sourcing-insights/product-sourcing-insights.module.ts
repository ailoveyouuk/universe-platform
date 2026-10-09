import { Module } from "@nestjs/common";
import { ProductSourcingInsightsController } from "./product-sourcing-insights.controller";
import { ProductSourcingInsightsService } from "./product-sourcing-insights.service";

@Module({
  controllers: [ProductSourcingInsightsController],
  providers: [ProductSourcingInsightsService],
})
export class ProductSourcingInsightsModule {}
