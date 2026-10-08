import { Module } from "@nestjs/common";
import { LogisticsInsightsController } from "./logistics-insights.controller";
import { LogisticsInsightsService } from "./logistics-insights.service";

@Module({
  controllers: [LogisticsInsightsController],
  providers: [LogisticsInsightsService],
})
export class LogisticsInsightsModule {}
