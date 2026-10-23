import { Module } from "@nestjs/common";
import { StakeholderRegistryModule } from "../stakeholder-registry/stakeholder-registry.module";
import { SupplierDirectoryController } from "./supplier-directory.controller";
import { NetworkSearchesService } from "./network-searches.service";
import { SupplierDirectoryService } from "./supplier-directory.service";

@Module({
  imports: [StakeholderRegistryModule],
  controllers: [SupplierDirectoryController],
  providers: [SupplierDirectoryService, NetworkSearchesService],
})
export class SupplierDirectoryModule {}
