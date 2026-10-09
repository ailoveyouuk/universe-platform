import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CreateProductMasterDto } from "./dto/create-product-master.dto";
import { UpdateProductMasterDto } from "./dto/update-product-master.dto";
import { ImportProductMasterDto } from "./dto/import-product-master.dto";
import { ProductCatalogService } from "./product-catalog.service";

/**
 * The shared, central product catalogue — see ProductCatalogService's doc
 * comment. Search/get/list are open to any authenticated user, same
 * reasoning as StakeholderRegistryController and the existing GET
 * /quality/products: ProductMaster has always been globally readable.
 * create/update/import are the write paths — every created/imported row is
 * attributed to the calling user's own organisation server-side (never
 * trusted from the request body).
 *
 * Route order matters here: the static routes (list at the bare path,
 * "search", "import") are declared before the ":id" param route so Nest
 * matches them first rather than treating "search"/"import" as an id.
 */
@Controller("product-catalog")
@UseGuards(EntraAuthGuard)
export class ProductCatalogController {
  constructor(private readonly productCatalogService: ProductCatalogService) {}

  /** GET /product-catalog — paginated browse for the Product Database
   * Management app's catalogue screen. Added 2026-10-03. */
  @Get()
  list(
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("sourceStandard") sourceStandard?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("includeArchived") includeArchived?: string,
  ) {
    return this.productCatalogService.list({
      q,
      category,
      sourceStandard,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      includeArchived: includeArchived === "true",
    });
  }

  @Get("search")
  search(@Query("q") q?: string, @Query("category") category?: string) {
    return this.productCatalogService.search(q, category);
  }

  /** POST /product-catalog/import — bulk reference-data importer. See
   * ImportProductMasterDto's doc comment. Added 2026-10-03. */
  @Post("import")
  import(@CurrentUser() user: RequestUser, @Body() dto: ImportProductMasterDto) {
    return this.productCatalogService.importBatch(user, dto.sourceStandard, dto.rows);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.productCatalogService.getOne(id);
  }

  /** GET /product-catalog/:id/price-history — ProductPriceHistory rows for
   * this ProductMaster, tenant-scoped to the caller's own organisation.
   * Read access, same EntraAuthGuard as every other route here; no new
   * permission needed. Added 2026-10-09. Declared after the bare ":id"
   * route is fine here since Nest still matches "/:id/price-history" as a
   * separate, more specific path — not ambiguous with ":id" the way
   * "search"/"import" were. */
  @Get(":id/price-history")
  getPriceHistory(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.productCatalogService.getPriceHistory(user, id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductMasterDto) {
    return this.productCatalogService.update(id, dto);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductMasterDto) {
    return this.productCatalogService.create(user, dto);
  }
}
