import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { SetOrganizationCountryPresenceDto } from "./dto/set-country-presence.dto";
import {
  UpsertProcurementAgentProfileDto,
  UpsertTenderingBodyProfileDto,
  UpsertFunderProfileDto,
  UpsertManufacturerProfileDto,
  UpsertDataInsightsUserProfileDto,
  AddManufacturerSiteDto,
} from "./dto/org-type-profiles.dto";
import { OrganizationAccessService } from "./organization-access.service";
import { AddOrganizationAccessDto } from "./dto/organization-access.dto";
import { OrgScopeCertsService } from "./org-scope-certs.service";
import { SaveOrganizationCertificationDto, SetOrganizationScopeDto } from "./dto/org-scope-certs.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(EntraAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService, private readonly access: OrganizationAccessService, private readonly scopeCerts: OrgScopeCertsService) {}

  /** The organisations the caller can act inside: their own, plus (demo users) the demo organisations they have been granted. */
  @Get("accessible")
  findAccessible(@CurrentUser() user: RequestUser) {
    return this.organizationsService.findAccessible(user);
  }

  /** Cross-organisation access for demo organisations (2026-10-21). */
  @Get(":id/access")
  listAccess(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.access.list(user, id);
  }

  @Post(":id/access")
  addAccess(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AddOrganizationAccessDto) {
    return this.access.add(user, id, dto.email);
  }

  @Delete(":id/access/:grantId")
  removeAccess(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("grantId") grantId: string) {
    return this.access.remove(user, id, grantId);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query("includeSimulated") includeSimulated?: string) {
    return this.organizationsService.findAll(user, includeSimulated === "true");
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user, dto);
  }

  /** Who to contact for help in the organisation the app is acting as. Must
   * stay above ":id" so "support-contacts" isn't read as an id. */
  @Get("current/support-contacts")
  supportContacts(@CurrentUser() user: RequestUser) {
    return this.organizationsService.supportContacts(user);
  }

  /** Admin app detail page (added 2026-10-16). Declared before the
   * more specific ":id/..." routes only for readability — Nest matches on
   * the full path so ordering doesn't matter here. */
  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.findOne(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(user, id, dto);
  }

  @Get(":id/roles")
  findRoles(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.findRoles(user, id);
  }

  /** Added 2026-10-14 — see DataSharingConsentSummary's doc comment in
   * @universe/types for why this is read-only. */
  @Get(":id/data-sharing-consent")
  getDataSharingConsent(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.getDataSharingConsent(user, id);
  }

  /** Added 2026-10-14 — see OrganizationCountryPresenceSummary's doc
   * comment in @universe/types. */
  @Get(":id/country-presence")
  listCountryPresence(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.listCountryPresence(user, id);
  }

  @Put(":id/country-presence")
  setCountryPresence(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: SetOrganizationCountryPresenceDto,
  ) {
    return this.organizationsService.setCountryPresence(user, id, dto);
  }

  /** Added 2026-10-14 — the five org-type detail profiles, see
   * OrganizationsService's own doc comment on this block for the shape
   * decisions (1:1 get/upsert for four of them, 1:many list/add/remove
   * for manufacturer sites). */
  @Get(":id/procurement-agent-profile")
  getProcurementAgentProfile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.getProcurementAgentProfile(user, id);
  }

  @Put(":id/procurement-agent-profile")
  upsertProcurementAgentProfile(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpsertProcurementAgentProfileDto,
  ) {
    return this.organizationsService.upsertProcurementAgentProfile(user, id, dto);
  }

  @Get(":id/tendering-body-profile")
  getTenderingBodyProfile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.getTenderingBodyProfile(user, id);
  }

  @Put(":id/tendering-body-profile")
  upsertTenderingBodyProfile(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpsertTenderingBodyProfileDto,
  ) {
    return this.organizationsService.upsertTenderingBodyProfile(user, id, dto);
  }

  @Get(":id/manufacturer-profile")
  getManufacturerProfile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.getManufacturerProfile(user, id);
  }

  @Put(":id/manufacturer-profile")
  upsertManufacturerProfile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpsertManufacturerProfileDto) {
    return this.organizationsService.upsertManufacturerProfile(user, id, dto);
  }

  @Get(":id/funder-profile")
  getFunderProfile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.getFunderProfile(user, id);
  }

  @Put(":id/funder-profile")
  upsertFunderProfile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpsertFunderProfileDto) {
    return this.organizationsService.upsertFunderProfile(user, id, dto);
  }

  @Get(":id/data-insights-profile")
  getDataInsightsUserProfile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.getDataInsightsUserProfile(user, id);
  }

  @Put(":id/data-insights-profile")
  upsertDataInsightsUserProfile(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpsertDataInsightsUserProfileDto,
  ) {
    return this.organizationsService.upsertDataInsightsUserProfile(user, id, dto);
  }

  @Get(":id/manufacturer-sites")
  listManufacturerSites(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.organizationsService.listManufacturerSites(user, id);
  }

  @Post(":id/manufacturer-sites")
  addManufacturerSite(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AddManufacturerSiteDto) {
    return this.organizationsService.addManufacturerSite(user, id, dto);
  }

  @Delete(":id/manufacturer-sites/:siteId")
  removeManufacturerSite(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("siteId") siteId: string) {
    return this.organizationsService.removeManufacturerSite(user, id, siteId);
  }

  @Get(":id/scope")
  getScope(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.scopeCerts.getScope(user, id);
  }

  @Put(":id/scope")
  setScope(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SetOrganizationScopeDto) {
    return this.scopeCerts.setScope(user, id, dto.scopeSubIds);
  }

  @Get(":id/certifications")
  listCertifications(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.scopeCerts.listCertifications(user, id);
  }

  @Post(":id/certifications")
  addCertification(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SaveOrganizationCertificationDto) {
    return this.scopeCerts.addCertification(user, id, dto);
  }

  @Put(":id/certifications/:certId")
  updateCertification(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("certId") certId: string, @Body() dto: SaveOrganizationCertificationDto) {
    return this.scopeCerts.updateCertification(user, id, certId, dto);
  }

  @Delete(":id/certifications/:certId")
  archiveCertification(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("certId") certId: string) {
    return this.scopeCerts.archiveCertification(user, id, certId);
  }
}
