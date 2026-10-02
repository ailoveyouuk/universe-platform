import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CreateProductMasterDto } from "./dto/create-product-master.dto";
import { ProductCatalogService } from "./product-catalog.service";

/**
 * The shared, central product catalogue — see ProductCatalogService's doc
 * comment. Search/get are open to any authenticated user, same reasoning
 * as StakeholderRegistryController and the existing GET /quality/products:
 * ProductMaster has always been globally readable. create() is the one
 * write path, and every created row is attributed to the calling user's
 * own organisation server-side (never trusted from the request body).
 */
@Controller("product-catalog")
@UseGuards(EntraAuthGuard)
export class ProductCatalogController {
  constructor(private readonly productCatalogService: ProductCatalogService) {}

  @Get("search")
  search(@Query("q") q?: string, @Query("category") category?: string) {
    return this.productCatalogService.search(q, category);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.productCatalogService.getOne(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductMasterDto) {
    return this.productCatalogService.create(user, dto);
  }
}
