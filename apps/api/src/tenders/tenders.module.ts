import { Module } from "@nestjs/common";
import { BlobStorageService } from "../documents/blob-storage.service";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { PublicNoticesController, TendersController } from "./tenders.controller";
import { TenderBidsService } from "./tender-bids.service";
import { TenderComplianceService } from "./tender-compliance.service";
import { TendersService } from "./tenders.service";

@Module({
  imports: [ExchangeRatesModule],
  controllers: [TendersController, PublicNoticesController],
  providers: [TendersService, TenderComplianceService, TenderBidsService, BlobStorageService],
})
export class TendersModule {}
