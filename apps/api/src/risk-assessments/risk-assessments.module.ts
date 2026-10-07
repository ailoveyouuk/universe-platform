import { Module } from "@nestjs/common";
import { RiskAssessmentsController } from "./risk-assessments.controller";
import { RiskAssessmentsService } from "./risk-assessments.service";

@Module({
  controllers: [RiskAssessmentsController],
  providers: [RiskAssessmentsService],
})
export class RiskAssessmentsModule {}
