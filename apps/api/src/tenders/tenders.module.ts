import { Module } from "@nestjs/common";
import { PublicNoticesController, TendersController } from "./tenders.controller";
import { TenderComplianceService } from "./tender-compliance.service";
import { TendersService } from "./tenders.service";

@Module({ controllers: [TendersController, PublicNoticesController], providers: [TendersService, TenderComplianceService] })
export class TendersModule {}
