import { Module } from "@nestjs/common";
import { StakeholderRegistryController } from "./stakeholder-registry.controller";
import { StakeholderRegistryService } from "./stakeholder-registry.service";

@Module({
  controllers: [StakeholderRegistryController],
  providers: [StakeholderRegistryService],
  // PartnersModule imports this module to call StakeholderRegistryService
  // directly from PartnersService (resolving/creating a registry entry at
  // Partner-creation time) — exported for exactly that.
  exports: [StakeholderRegistryService],
})
export class StakeholderRegistryModule {}
