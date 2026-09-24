import { Module } from "@nestjs/common";
import { SupplierDirectoryController } from "./supplier-directory.controller";
import { SupplierDirectoryService } from "./supplier-directory.service";

@Module({
  controllers: [SupplierDirectoryController],
  providers: [SupplierDirectoryService],
})
export class SupplierDirectoryModule {}
