import { Module } from "@nestjs/common";
import { QualityModule } from "../quality/quality.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [QualityModule], controllers: [CrmController], providers: [CrmService], exports: [CrmService] })
export class CrmModule {}
