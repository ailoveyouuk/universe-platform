import { Module } from "@nestjs/common";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [ExchangeRatesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
