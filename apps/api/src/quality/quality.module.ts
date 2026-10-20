import { Module } from "@nestjs/common";
import { QualityController } from "./quality.controller";
import { ProductSourceApprovalsService } from "./product-source-approvals.service";
import { PartnerPerformanceService } from "./partner-performance.service";
import { QaQueueService } from "./qa-queue.service";
import { QualityComplaintsController } from "./quality-complaints.controller";
import { QualityComplaintsService } from "./quality-complaints.service";

@Module({
  controllers: [QualityController, QualityComplaintsController],
  providers: [ProductSourceApprovalsService, PartnerPerformanceService, QaQueueService, QualityComplaintsService],
})
export class QualityModule {}
