import { Module } from "@nestjs/common";
import { QualityController } from "./quality.controller";
import { ProductSourceApprovalsService } from "./product-source-approvals.service";
import { PartnerPerformanceService } from "./partner-performance.service";
import { ProductCatalogModule } from "../product-catalog/product-catalog.module";

@Module({
  imports: [ProductCatalogModule],
  controllers: [QualityController],
  providers: [ProductSourceApprovalsService, PartnerPerformanceService],
})
export class QualityModule {}
