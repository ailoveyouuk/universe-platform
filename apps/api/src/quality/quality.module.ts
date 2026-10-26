import { Module } from "@nestjs/common";
import { QualityController } from "./quality.controller";
import { ProductSourceApprovalsService } from "./product-source-approvals.service";
import { PartnerPerformanceService } from "./partner-performance.service";
import { QaQueueService } from "./qa-queue.service";
import { PartnerScorecardController } from "./partner-scorecard.controller";
import { PartnerScorecardService } from "./partner-scorecard.service";
import { ScorecardRecordsService } from "./scorecard-records.service";
import { ScorecardSettingsService } from "./scorecard-settings.service";
import { QualityComplaintsController } from "./quality-complaints.controller";
import { QualityComplaintsService } from "./quality-complaints.service";

@Module({
  controllers: [QualityController, QualityComplaintsController, PartnerScorecardController],
  providers: [ProductSourceApprovalsService, PartnerPerformanceService, QaQueueService, QualityComplaintsService, PartnerScorecardService, ScorecardSettingsService, ScorecardRecordsService],
  exports: [PartnerScorecardService],
})
export class QualityModule {}
