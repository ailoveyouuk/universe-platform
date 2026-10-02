import { Module } from "@nestjs/common";
import { StakeholderRegistryModule } from "../stakeholder-registry/stakeholder-registry.module";
import { PartnersController } from "./partners.controller";
import { PartnersService } from "./partners.service";

@Module({
  imports: [StakeholderRegistryModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
