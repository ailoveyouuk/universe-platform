import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import type { CrmInteractionInput, CrmOpportunityInput, CrmPersonUpdate, CrmPrivacyRequestInput, CrmPrivacyRequestUpdate, CrmRelationshipUpdate } from "@universe/types";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { CurrentUser } from "../common/current-user.decorator";
import { CrmInteractionsService } from "./crm-interactions.service";
import { CrmOpportunitiesService } from "./crm-opportunities.service";
import { CrmSavedFiltersService } from "./crm-saved-filters.service";
import { CrmSearchService } from "./crm-search.service";
import { CrmTagsService } from "./crm-tags.service";
import { CrmPlacesService } from "./crm-places.service";
import { CrmNetworkService } from "./crm-network.service";
import { CrmCategoryService } from "./crm-category.service";
import { CrmHospitalityService } from "./crm-hospitality.service";
import { DocumentsService } from "../documents/documents.service";
import { RequestUploadDto } from "../documents/dto/request-upload.dto";
import { ConfirmStandaloneUploadDto } from "../documents/dto/confirm-standalone-upload.dto";
import { LinkStandaloneDocumentDto } from "../documents/dto/link-standalone.dto";
import { CrmPrivacyService } from "./crm-privacy.service";
import { CrmService } from "./crm.service";
import { BulkDto, GiftPolicyDto, HospitalityDecisionDto, HospitalityDto, AnonymiseDto, LinkDto, LocationDto, InteractionDto, OpportunityDto, PersonProfileDto, SavedFilterDto, TagDto, PrivacyRequestDto, PrivacyRequestUpdateDto, SuppressDto, UpdateRelationshipDto } from "./dto/crm.dto";

@Controller("crm")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("crm")
export class CrmController {
  constructor(private readonly crm: CrmService, private readonly searchSvc: CrmSearchService, private readonly interactions: CrmInteractionsService, private readonly privacy: CrmPrivacyService, private readonly opportunities: CrmOpportunitiesService, private readonly tags: CrmTagsService, private readonly savedFilters: CrmSavedFiltersService, private readonly places: CrmPlacesService, private readonly hospitality: CrmHospitalityService, private readonly documents: DocumentsService, private readonly network: CrmNetworkService, private readonly category: CrmCategoryService) {}

  @Get("overview") overview(@CurrentUser() user: RequestUser) { return this.crm.overview(user); }
  @Get("search") search(@CurrentUser() user: RequestUser, @Query("q") q: string, @Query("types") types?: string) { return this.searchSvc.search(user, q ?? "", types); }
  @Get("people") people(@CurrentUser() user: RequestUser) { return this.crm.people(user); }

  @Get("relationships/counts")
  counts(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) { return this.crm.counts(user, q); }

  @Get("relationships/map")
  portfolioMap(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) { return this.crm.portfolioMap(user, q); }

  @Get("relationships")
  list(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) {
    return this.crm.list(user, { ...q, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined });
  }

  @Get("relationships/:id") one(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.crm.one(user, id); }

  @Get("relationships/:id/detail") detail(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.crm.detail(user, id); }
  @Get("relationships/:id/scorecard") scorecard(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.crm.scorecard(user, id); }

  @Patch("relationships/:id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateRelationshipDto) { return this.crm.update(user, id, dto as CrmRelationshipUpdate); }

  @Get("follow-ups") followUps(@CurrentUser() user: RequestUser) { return this.interactions.myFollowUps(user); }

  @Get("relationships/:id/interactions")
  listInteractions(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query() q: Record<string, string>) {
    return this.interactions.list(user, id, { type: q.type || undefined, q: q.q || undefined, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined });
  }
  @Post("relationships/:id/interactions")
  logInteraction(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: InteractionDto) { return this.interactions.create(user, id, dto as CrmInteractionInput); }
  @Patch("interactions/:id")
  updateInteraction(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: InteractionDto) { return this.interactions.update(user, id, dto as Partial<CrmInteractionInput>); }

  // ---- People and privacy (step 4) ----
  @Get("relationships/:id/people") relationshipPeople(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.people(user, id); }
  @Patch("contacts/:id/profile") profile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PersonProfileDto) { return this.privacy.updateProfile(user, id, dto as CrmPersonUpdate); }
  @Post("contacts/:id/objection") @HttpCode(200) object(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.object(user, id); }
  @Post("contacts/:id/anonymise") @HttpCode(200) anonymise(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AnonymiseDto) { return this.privacy.anonymise(user, id, dto); }
  @Get("contacts/:id/access-copy") accessCopy(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.accessCopy(user, id); }
  @Post("contacts/:id/keep") @HttpCode(200) keep(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.keep(user, id).then(() => ({ ok: true })); }
  @Get("privacy/summary") privacySummary(@CurrentUser() user: RequestUser) { return this.privacy.summary(user); }
  @Get("privacy/find-person") findPerson(@CurrentUser() user: RequestUser, @Query("q") q: string) { return this.privacy.findPerson(user, q ?? ""); }
  @Get("privacy/requests") requests(@CurrentUser() user: RequestUser, @Query("status") status?: string, @Query("q") q?: string, @Query("type") type?: string) { return this.privacy.requests(user, status, q, type); }
  @Post("privacy/requests") createRequest(@CurrentUser() user: RequestUser, @Body() dto: PrivacyRequestDto) { return this.privacy.createRequest(user, dto as CrmPrivacyRequestInput); }
  @Patch("privacy/requests/:id") updateRequest(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PrivacyRequestUpdateDto) { return this.privacy.updateRequest(user, id, dto as CrmPrivacyRequestUpdate); }
  @Get("privacy/retention") retention(@CurrentUser() user: RequestUser) { return this.privacy.retention(user); }
  @Get("privacy/suppressions") suppressions(@CurrentUser() user: RequestUser) { return this.privacy.suppressions(user); }
  @Post("privacy/suppressions") @HttpCode(200) suppress(@CurrentUser() user: RequestUser, @Body() dto: SuppressDto) { return this.privacy.suppress(user, dto.email).then(() => ({ ok: true })); }
  @Get("privacy/access-log") accessLog(@CurrentUser() user: RequestUser) { return this.privacy.accessLog(user); }

  // ---- Opportunities (step 5) ----
  @Get("opportunities")
  listOpportunities(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) {
    return this.opportunities.list(user, { ...q, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined });
  }
  @Get("pipeline") pipeline(@CurrentUser() user: RequestUser) { return this.opportunities.pipeline(user); }
  @Post("opportunities") createOpportunity(@CurrentUser() user: RequestUser, @Body() dto: OpportunityDto) { return this.opportunities.create(user, dto as CrmOpportunityInput); }
  @Patch("opportunities/:id") updateOpportunity(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: OpportunityDto) { return this.opportunities.update(user, id, dto as CrmOpportunityInput); }

  // ---- Places, links and the projects drill-down (step 6f) ----
  @Get("relationships/:id/projects") projectsPage(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("bucket") bucket?: string, @Query("part") part?: string, @Query("q") q?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) { return this.crm.projectsPage(user, id, { bucket, part, q, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined }); }
  @Post("relationships/:id/locations") addLocation(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: LocationDto) { return this.places.saveLocation(user, id, null, dto); }
  @Patch("relationships/:id/locations/:locationId") editLocation(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("locationId") locationId: string, @Body() dto: LocationDto) { return this.places.saveLocation(user, id, locationId, dto); }
  @Post("relationships/bulk") bulk(@CurrentUser() user: RequestUser, @Body() dto: BulkDto) { return this.crm.bulk(user, dto); }
  @Get("network/organisations") networkSearch(@CurrentUser() user: RequestUser, @Query("q") q?: string) { return this.network.searchOrganisations(user, q); }
  @Post("relationships/from-organisation") addFromOrg(@CurrentUser() user: RequestUser, @Body() dto: { organizationId: string }) { return this.network.addFromOrganisation(user, String(dto?.organizationId ?? "")); }
  @Get("relationships/:id/category") categoryProfile(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.category.profile(user, id); }
  @Get("relationships/:id/network") networkPanel(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.network.panel(user, id); }
  @Post("relationships/:id/links") addLink(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: LinkDto) { return this.places.saveLink(user, id, null, dto); }
  @Patch("relationships/:id/links/:linkId") editLink(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("linkId") linkId: string, @Body() dto: LinkDto) { return this.places.saveLink(user, id, linkId, dto); }

  // ---- Tags and segments (step 6) ----
  @Get("tags") listTags(@CurrentUser() user: RequestUser) { return this.tags.list(user); }
  @Post("tags") createTag(@CurrentUser() user: RequestUser, @Body() dto: TagDto) { return this.tags.create(user, dto); }
  @Patch("tags/:id") updateTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: TagDto) { return this.tags.update(user, id, dto); }
  @Post("relationships/:id/tags/:tagId") applyTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("tagId") tagId: string) { return this.tags.apply(user, id, tagId); }
  @Delete("relationships/:id/tags/:tagId") removeTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("tagId") tagId: string) { return this.tags.remove(user, id, tagId); }

  // ---- Saved filters (step 6) ----
  @Get("saved-filters") listSavedFilters(@CurrentUser() user: RequestUser, @Query("view") view?: string) { return this.savedFilters.list(user, view); }
  @Post("saved-filters") createSavedFilter(@CurrentUser() user: RequestUser, @Body() dto: SavedFilterDto) { return this.savedFilters.create(user, dto); }
  @Patch("saved-filters/:id") updateSavedFilter(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SavedFilterDto) { return this.savedFilters.update(user, id, dto); }

  // ---- Gifts and hospitality, the organisation's policy and evidence files (step 8) ----
  @Get("compliance/summary") complianceSummary(@CurrentUser() user: RequestUser) { return this.hospitality.summary(user); }
  @Get("compliance/policy") giftPolicy(@CurrentUser() user: RequestUser) { return this.hospitality.policy(user); }
  @Put("compliance/policy") saveGiftPolicy(@CurrentUser() user: RequestUser, @Body() dto: GiftPolicyDto) { return this.hospitality.savePolicy(user, dto); }
  @Get("compliance/records")
  registerRecords(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) { return this.hospitality.list(user, { ...q, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }); }
  @Get("relationships/:id/hospitality")
  relationshipHospitality(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query() q: Record<string, string>) { return this.hospitality.list(user, { ...q, relationshipId: id, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }); }
  @Post("relationships/:id/hospitality") addHospitality(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: HospitalityDto) { return this.hospitality.create(user, id, dto); }
  @Patch("hospitality/:id") editHospitality(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: HospitalityDto) { return this.hospitality.update(user, id, dto); }
  @Post("hospitality/:id/decision") @HttpCode(200) decideHospitality(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: HospitalityDecisionDto) { return this.hospitality.decide(user, id, dto); }

  @Post("documents/upload-url") @HttpCode(200) requestUpload(@CurrentUser() user: RequestUser, @Body() dto: RequestUploadDto) { assertHasPermission(user, "crm.manage"); return this.documents.requestStandaloneUpload(user, dto); }
  @Post("documents") confirmUpload(@CurrentUser() user: RequestUser, @Body() dto: ConfirmStandaloneUploadDto) { assertHasPermission(user, "crm.manage"); return this.documents.confirmStandaloneUpload(user, { ...dto, type: "EVIDENCE" }); }
  @Post("documents/link") linkDocument(@CurrentUser() user: RequestUser, @Body() dto: LinkStandaloneDocumentDto) { assertHasPermission(user, "crm.manage"); return this.documents.linkStandalone(user, { ...dto, type: "EVIDENCE" }); }
  @Get("documents/:documentId/download-url") async downloadUrl(@CurrentUser() user: RequestUser, @Param("documentId") documentId: string) { await this.hospitality.assertDocumentVisible(user, documentId); return this.documents.getStandaloneDownloadUrl(user, documentId); }
}
