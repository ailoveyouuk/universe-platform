import { Module } from "@nestjs/common";
import { SupplierPortalController } from "./supplier-portal.controller";
import { SupplierPortalService } from "./supplier-portal.service";

@Module({ controllers: [SupplierPortalController], providers: [SupplierPortalService] })
export class SupplierPortalModule {}
