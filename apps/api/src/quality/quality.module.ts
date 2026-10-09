import { Module } from "@nestjs/common";
import { QualityController } from "./quality.controller";
import { ProductSourceApprovalsService } from "./product-source-approvals.service";
import { PartnerPerformanceService } from "./partner-performance.service";
import { QaQueueService } from "./qa-queue.service";

@Module({
  controllers: [QualityController],
  providers: [ProductSourceApprovalsService, PartnerPerformanceService, QaQueueService],
})
export class QualityModule {}
