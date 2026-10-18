import { Module } from "@nestjs/common";
import { ProductCatalogController } from "./product-catalog.controller";
import { ProductRegistrationsService } from "./product-registrations.service";
import { ProductDocumentsService } from "./product-documents.service";
import { BlobStorageService } from "../documents/blob-storage.service";
import { ExportRestrictionsService } from "./export-restrictions.service";
import { RegulatoryWatchService } from "./regulatory-watch.service";
import { ProductSafetyNoticesService } from "./product-safety-notices.service";
import { ProductFamiliesService } from "./product-families.service";
import { ProductCatalogService } from "./product-catalog.service";
import { ExportRequestsService } from "./export-requests.service";
import { ProductExportsService } from "./product-exports.service";

@Module({
  controllers: [ProductCatalogController],
  providers: [ProductCatalogService, ProductRegistrationsService, ProductDocumentsService, ProductFamiliesService, ProductSafetyNoticesService, RegulatoryWatchService, ExportRestrictionsService, ProductExportsService, ExportRequestsService, BlobStorageService],
  // QualityModule imports this to delegate its existing product search to
  // the shared implementation (see product-source-approvals.service.ts) —
  // exported for exactly that, and for any future module (CRM, Supplier
  // Portal) that needs the same search-or-create logic directly.
  exports: [ProductCatalogService],
})
export class ProductCatalogModule {}
