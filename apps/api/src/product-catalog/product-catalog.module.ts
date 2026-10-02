import { Module } from "@nestjs/common";
import { ProductCatalogController } from "./product-catalog.controller";
import { ProductCatalogService } from "./product-catalog.service";

@Module({
  controllers: [ProductCatalogController],
  providers: [ProductCatalogService],
  // QualityModule imports this to delegate its existing product search to
  // the shared implementation (see product-source-approvals.service.ts) —
  // exported for exactly that, and for any future module (CRM, Supplier
  // Portal) that needs the same search-or-create logic directly.
  exports: [ProductCatalogService],
})
export class ProductCatalogModule {}
