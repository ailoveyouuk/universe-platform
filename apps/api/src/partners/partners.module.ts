import { Module } from "@nestjs/common";
import { StakeholderRegistryModule } from "../stakeholder-registry/stakeholder-registry.module";
import { EvidenceModule } from "../evidence/evidence.module";
import { PartnersController } from "./partners.controller";
import { PartnersService } from "./partners.service";

@Module({
  imports: [StakeholderRegistryModule, EvidenceModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
