import { Module } from "@nestjs/common";
import { BlobStorageService } from "../documents/blob-storage.service";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { PublicNoticesController, TendersController } from "./tenders.controller";
import { TenderAwardService } from "./tender-award.service";
import { TenderBidsService } from "./tender-bids.service";
import { TenderContractsService } from "./tender-contracts.service";
import { TenderFrameworkService } from "./tender-framework.service";
import { TenderVariationsService } from "./tender-variations.service";
import { TenderEvidenceService } from "./tender-evidence.service";
import { TenderPerformanceService } from "./tender-performance.service";
import { TenderDocumentsService } from "./tender-documents.service";
import { TenderEvaluationService } from "./tender-evaluation.service";
import { TenderComplianceService } from "./tender-compliance.service";
import { TendersService } from "./tenders.service";

@Module({
  imports: [ExchangeRatesModule],
  controllers: [TendersController, PublicNoticesController],
  providers: [TendersService, TenderComplianceService, TenderBidsService, TenderEvaluationService, TenderAwardService, TenderDocumentsService, TenderContractsService, TenderPerformanceService, TenderFrameworkService, TenderVariationsService, TenderEvidenceService, BlobStorageService],
})
export class TendersModule {}
