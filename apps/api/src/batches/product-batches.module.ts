import { Module } from "@nestjs/common";
import { ProductBatchesController } from "./product-batches.controller";
import { ProductBatchesService } from "./product-batches.service";

@Module({
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService],
})
export class ProductBatchesModule {}
