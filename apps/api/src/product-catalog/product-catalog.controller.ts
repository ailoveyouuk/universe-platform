import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CreateProductMasterDto } from "./dto/create-product-master.dto";
import { UpdateProductMasterDto } from "./dto/update-product-master.dto";
import { ImportProductMasterDto } from "./dto/import-product-master.dto";
import { RejectProductAmendmentDto } from "./dto/reject-product-amendment.dto";
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
 * "search", "import", "amendments/...") are declared before the ":id"
 * param route so Nest matches them first rather than treating
 * "search"/"import"/"amendments" as an id.
 *
 * Added 2026-10-09 — the "amendments/:amendmentId/ratify|reject" routes
 * for the catalogue edit-rights + ratification workflow (see
 * ProductCatalogService.update()'s doc comment for the full design).
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

  /** GET /product-catalog/amendments/:amendmentId — a single amendment,
   * tenant-scoped to the caller's own organisation. Declared before ":id"
   * for the same reason as "search"/"import" above. Added 2026-10-09 for
   * the QA Queue's "Review amendment" deep link. */
  @Get("amendments/:amendmentId")
  getAmendment(@CurrentUser() user: RequestUser, @Param("amendmentId") amendmentId: string) {
    return this.productCatalogService.getAmendment(user, amendmentId);
  }

  /** POST /product-catalog/amendments/:amendmentId/ratify — applies a
   * PENDING ProductAmendment's proposed changes to the live product and
   * marks it APPROVED. Gated on products.approve inside the service
   * (assertHasPermission). Declared before ":id" so Nest doesn't treat
   * "amendments" as a product id. */
  @Post("amendments/:amendmentId/ratify")
  ratifyAmendment(@CurrentUser() user: RequestUser, @Param("amendmentId") amendmentId: string) {
    return this.productCatalogService.ratifyAmendment(user, amendmentId);
  }

  /** POST /product-catalog/amendments/:amendmentId/reject — marks a
   * PENDING ProductAmendment REJECTED; the live product is never
   * touched. Same products.approve gate as ratifyAmendment. */
  @Post("amendments/:amendmentId/reject")
  rejectAmendment(
    @CurrentUser() user: RequestUser,
    @Param("amendmentId") amendmentId: string,
    @Body() dto: RejectProductAmendmentDto,
  ) {
    return this.productCatalogService.rejectAmendment(user, amendmentId, dto);
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

  /** GET /product-catalog/:id/amendments — this product's amendment
   * history, tenant-scoped to the caller's own organisation. Declared
   * after ":id" but before the bare ":id" match is irrelevant here since
   * this is itself a sub-path of ":id" — Nest matches the more specific
   * route. Added 2026-10-09. */
  @Get(":id/amendments")
  listAmendments(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.productCatalogService.listAmendments(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProductMasterDto) {
    return this.productCatalogService.update(user, id, dto);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductMasterDto) {
    return this.productCatalogService.create(user, dto);
  }
}
