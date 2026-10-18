import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CreateProductMasterDto } from "./dto/create-product-master.dto";
import { UpdateProductMasterDto } from "./dto/update-product-master.dto";
import { ImportProductMasterDto } from "./dto/import-product-master.dto";
import { RejectProductAmendmentDto } from "./dto/reject-product-amendment.dto";
import { ProductRegistrationsService } from "./product-registrations.service";
import { ExportRestrictionsService } from "./export-restrictions.service";
import { CreateExportRestrictionDto, UpdateExportRestrictionDto } from "./dto/export-restriction.dto";
import { RegulatoryWatchService } from "./regulatory-watch.service";
import { ConfirmWatchMatchDto, DismissWatchMatchDto } from "./dto/watch-match.dto";
import { ProductSafetyNoticesService } from "./product-safety-notices.service";
import { CreateSafetyNoticeDto, ReviewSafetyNoticeDto, UpdateSafetyNoticeDto } from "./dto/safety-notice.dto";
import { CreateRegistrationDto, UpdateRegistrationDto, VerifyRegistrationDto } from "./dto/registration.dto";
import { familyTarget, productTarget } from "./product-target";
import { ProductFamiliesService } from "./product-families.service";
import { AssignFamilyDto, CreateProductFamilyDto, UpdateProductFamilyDto } from "./dto/product-family.dto";
import { ProductDocumentsService } from "./product-documents.service";
import { CreateProductDocumentDto, RequestProductDocumentUploadDto } from "./dto/product-document.dto";
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
  constructor(
    private readonly productCatalogService: ProductCatalogService,
    private readonly registrations: ProductRegistrationsService,
    private readonly safety: ProductSafetyNoticesService,
    private readonly watch: RegulatoryWatchService,
    private readonly exportRestrictions: ExportRestrictionsService,
    private readonly documents: ProductDocumentsService,
    private readonly families: ProductFamiliesService,
  ) {}

  /** GET /product-catalog — paginated browse for the Product Database
   * Management app's catalogue screen. Added 2026-10-03. */
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("sourceStandard") sourceStandard?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("includeArchived") includeArchived?: string,
    @Query("missingField") missingField?: "gtin" | "hsCode" | "unspscCode" | "standardUnit",
  ) {
    return this.productCatalogService.list({
      viewer: user,
      q,
      category,
      sourceStandard,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      includeArchived: includeArchived === "true",
      missingField,
      showSimulated: user.inDemoOrganization === true,
    });
  }

  /** GET /product-catalog/completeness-stats — Stage 0 point 3 (data
   * completeness pass). Declared before ":id" for the same routing
   * reason as "search"/"import"/"amendments" above. Added 2026-10-09. */
  @Get("completeness-stats")
  getCompletenessStats(@CurrentUser() user: RequestUser) {
    return this.productCatalogService.getCompletenessStats(user.inDemoOrganization === true);
  }

  /** GET /product-catalog/dashboard-stats — Stage 1 (standardised
   * dashboard pattern), applied to the catalogue screen for the first
   * time. Same routing reason as above. Added 2026-10-09. */
  @Get("dashboard-stats")
  getDashboardStats(@CurrentUser() user: RequestUser) {
    return this.productCatalogService.getDashboardStats(user.inDemoOrganization === true);
  }

  /** GET /product-catalog/regulatory/dashboard — registration health plus the caller's own verification queue. */
  @Get("regulatory/dashboard")
  regulatoryDashboard(@CurrentUser() user: RequestUser) {
    return this.registrations.dashboard(user);
  }

  /** Export / hoarding restrictions: UK list fetched daily; other countries curated by platform staff. */
  @Get("export-restrictions")
  listExportRestrictions(@Query("includeRemoved") includeRemoved?: string) {
    return this.exportRestrictions.list(includeRemoved === "true");
  }

  @Post("export-restrictions")
  createExportRestriction(@CurrentUser() user: RequestUser, @Body() dto: CreateExportRestrictionDto) {
    return this.exportRestrictions.create(user, dto);
  }

  /** GET …/export-restrictions/project/:projectId — project lines whose route (origin to delivery country) is restricted. */
  @Get("export-restrictions/project/:projectId")
  projectExportChecks(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.exportRestrictions.checkProject(user, projectId);
  }

  @Patch("export-restrictions/:restrictionId")
  updateExportRestriction(@CurrentUser() user: RequestUser, @Param("restrictionId") restrictionId: string, @Body() dto: UpdateExportRestrictionDto) {
    return this.exportRestrictions.update(user, restrictionId, dto);
  }

  @Get(":id/export-restrictions")
  productExportRestrictions(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.exportRestrictions.forProduct(user, id);
  }

  /** GET /product-catalog/regulatory-watch/dashboard — source health, run log, pending advisory matches, recent items. */
  @Get("regulatory-watch/dashboard")
  watchDashboard(@CurrentUser() user: RequestUser) {
    return this.watch.dashboard(user);
  }

  /** POST …/regulatory-watch/matches/:id/confirm — platform staff; records a safety notice and notifies affected organisations. */
  @Post("regulatory-watch/matches/:matchId/confirm")
  confirmWatchMatch(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string, @Body() dto: ConfirmWatchMatchDto) {
    return this.watch.confirm(user, matchId, dto.notes);
  }

  /** POST …/regulatory-watch/matches/:id/dismiss — platform staff; reason required; the match is kept. */
  @Post("regulatory-watch/matches/:matchId/dismiss")
  dismissWatchMatch(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string, @Body() dto: DismissWatchMatchDto) {
    return this.watch.dismiss(user, matchId, dto.notes);
  }

  @Get(":id/watch-matches")
  productWatchMatches(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.watch.forProduct(user, id);
  }

  /** GET /product-catalog/safety-notices/dashboard — open notices plus the caller's organisation's review queue. */
  @Get("safety-notices/dashboard")
  safetyDashboard(@CurrentUser() user: RequestUser) {
    return this.safety.dashboard(user);
  }

  /** GET /product-catalog/safety-notices/flags?ids=a,b — open-notice position per product, for project-line flags. */
  @Get("safety-notices/flags")
  safetyFlags(@CurrentUser() user: RequestUser, @Query("ids") ids?: string) {
    return this.safety.flags(user, (ids ?? "").split(",").map((i) => i.trim()).filter(Boolean));
  }

  /** PATCH /product-catalog/safety-notices/:noticeId — edit, close (status CLOSED with a reason) or archive; nothing is deleted. */
  @Patch("safety-notices/:noticeId")
  updateSafetyNotice(@CurrentUser() user: RequestUser, @Param("noticeId") noticeId: string, @Body() dto: UpdateSafetyNoticeDto) {
    return this.safety.update(user, noticeId, dto);
  }

  /** POST /product-catalog/safety-notices/:noticeId/review — the caller's organisation records its own check. */
  @Post("safety-notices/:noticeId/review")
  reviewSafetyNotice(@CurrentUser() user: RequestUser, @Param("noticeId") noticeId: string, @Body() dto: ReviewSafetyNoticeDto) {
    return this.safety.review(user, noticeId, dto);
  }

  @Get("families/:familyId/safety-notices")
  listFamilySafetyNotices(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Query("includeArchived") includeArchived?: string) {
    return this.safety.list(user, familyTarget(familyId), includeArchived === "true");
  }

  @Post("families/:familyId/safety-notices")
  createFamilySafetyNotice(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Body() dto: CreateSafetyNoticeDto) {
    return this.safety.create(user, familyTarget(familyId), dto);
  }

  /** PATCH /product-catalog/registrations/:registrationId — nothing is deleted; retire with isArchived. */
  @Patch("registrations/:registrationId")
  updateRegistration(@CurrentUser() user: RequestUser, @Param("registrationId") registrationId: string, @Body() dto: UpdateRegistrationDto) {
    return this.registrations.update(user, registrationId, dto);
  }

  /** POST /product-catalog/registrations/:registrationId/verify — the caller's organisation records its own check. */
  @Post("registrations/:registrationId/verify")
  verifyRegistration(@CurrentUser() user: RequestUser, @Param("registrationId") registrationId: string, @Body() dto: VerifyRegistrationDto) {
    return this.registrations.verify(user, registrationId, dto);
  }

  // ---- Product families (step 3b). Declared before ":id" so "families" is not read as an id. ----
  @Get("families")
  listFamilies(@CurrentUser() user: RequestUser, @Query("search") search?: string, @Query("category") category?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.families.list(user, { search, category, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
  }

  @Post("families")
  createFamily(@CurrentUser() user: RequestUser, @Body() dto: CreateProductFamilyDto) {
    return this.families.create(user, dto);
  }

  @Get("families/:familyId")
  getFamily(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string) {
    return this.families.getOne(user, familyId);
  }

  @Patch("families/:familyId")
  updateFamily(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Body() dto: UpdateProductFamilyDto) {
    return this.families.update(user, familyId, dto);
  }

  @Get("families/:familyId/history")
  familyHistory(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string) {
    return this.families.history(user, familyId);
  }

  @Get("families/:familyId/registrations")
  listFamilyRegistrations(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Query("includeArchived") includeArchived?: string) {
    return this.registrations.list(user, familyTarget(familyId), includeArchived === "true");
  }

  @Post("families/:familyId/registrations")
  createFamilyRegistration(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Body() dto: CreateRegistrationDto) {
    return this.registrations.create(user, familyTarget(familyId), dto);
  }

  @Get("families/:familyId/documents")
  listFamilyDocuments(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Query("includeArchived") includeArchived?: string) {
    return this.documents.list(user, familyTarget(familyId), includeArchived === "true");
  }

  @Post("families/:familyId/documents/upload-url")
  requestFamilyDocumentUpload(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Body() dto: RequestProductDocumentUploadDto) {
    return this.documents.requestUpload(user, familyTarget(familyId), dto);
  }

  @Post("families/:familyId/documents")
  createFamilyDocument(@CurrentUser() user: RequestUser, @Param("familyId") familyId: string, @Body() dto: CreateProductDocumentDto) {
    return this.documents.create(user, familyTarget(familyId), dto);
  }

  /** Controlled product documents: private to the caller's organisation. Approve is four-eyes; archive is soft. */
  @Post("documents/:documentId/approve")
  approveDocument(@CurrentUser() user: RequestUser, @Param("documentId") documentId: string) {
    return this.documents.approve(user, documentId);
  }

  @Post("documents/:documentId/archive")
  archiveDocument(@CurrentUser() user: RequestUser, @Param("documentId") documentId: string, @Body() body: { reason?: string }) {
    return this.documents.archive(user, documentId, body?.reason);
  }

  @Get("documents/:documentId/download-url")
  documentDownloadUrl(@CurrentUser() user: RequestUser, @Param("documentId") documentId: string) {
    return this.documents.downloadUrl(user, documentId);
  }

  @Get("search-scoped")
  searchScoped(@CurrentUser() user: RequestUser, @Query("q") q?: string, @Query("category") category?: string, @Query("scope") scope?: string) {
    return this.productCatalogService.searchScoped(user, q, category, scope === "APPROVED" || scope === "CATALOGUE" ? scope : "ALL");
  }

  @Get("search")
  search(@CurrentUser() user: RequestUser, @Query("q") q?: string, @Query("category") category?: string) {
    return this.productCatalogService.search(q, category, user.inDemoOrganization === true, user);
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
  getOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.productCatalogService.getOne(id, user.inDemoOrganization === true, user);
  }

  /** GET /product-catalog/:id/price-history — ProductPriceHistory rows for
   * this ProductMaster, tenant-scoped to the caller's own organisation.
   * Read access, same EntraAuthGuard as every other route here; no new
   * permission needed. Added 2026-10-09. Declared after the bare ":id"
   * route is fine here since Nest still matches "/:id/price-history" as a
   * separate, more specific path — not ambiguous with ":id" the way
   * "search"/"import" were. */
  /** GET /product-catalog/:id/history — shared change history (who changed what, when, from which organisation). */
  @Get(":id/safety-notices")
  listSafetyNotices(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("includeArchived") includeArchived?: string) {
    return this.safety.list(user, productTarget(id), includeArchived === "true");
  }

  @Post(":id/safety-notices")
  createSafetyNotice(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateSafetyNoticeDto) {
    return this.safety.create(user, productTarget(id), dto);
  }

  @Get(":id/registrations")
  listRegistrations(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("includeArchived") includeArchived?: string) {
    return this.registrations.list(user, productTarget(id), includeArchived === "true");
  }

  @Post(":id/registrations")
  createRegistration(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateRegistrationDto) {
    return this.registrations.create(user, productTarget(id), dto);
  }

  @Get(":id/documents")
  listDocuments(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("includeArchived") includeArchived?: string) {
    return this.documents.list(user, productTarget(id), includeArchived === "true");
  }

  @Post(":id/documents/upload-url")
  requestDocumentUpload(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: RequestProductDocumentUploadDto) {
    return this.documents.requestUpload(user, productTarget(id), dto);
  }

  @Post(":id/documents")
  createDocument(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateProductDocumentDto) {
    return this.documents.create(user, productTarget(id), dto);
  }

  @Post(":id/family")
  assignFamily(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AssignFamilyDto) {
    return this.families.assign(user, id, dto);
  }

  @Post(":id/family/create")
  createFamilyFromProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.families.createFromProduct(user, id);
  }

  @Get(":id/history")
  getHistory(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.productCatalogService.getHistory(id, user.inDemoOrganization === true, user);
  }

  /** GET /product-catalog/:id/usage — the caller's own organisation's use of this product. */
  @Get(":id/usage")
  getUsage(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.productCatalogService.getUsage(user, id);
  }

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
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductMasterDto) {
    // Only platform staff may create a new family; everyone else adds variants to existing families.
    if (dto.newFamilyName?.trim() && !dto.familyId) {
      const f = await this.families.create(user, {
        name: dto.newFamilyName.trim(), category: dto.category, brand: dto.brand, inn: dto.inn, regulatoryClass: dto.regulatoryClass,
      } as never);
      dto = { ...dto, familyId: f.id };
    }
    return this.productCatalogService.create(user, dto);
  }
}
