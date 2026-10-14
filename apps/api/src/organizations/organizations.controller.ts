import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { SetOrganizationCountryPresenceDto } from "./dto/set-country-presence.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(EntraAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.organizationsService.findAll(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user, dto);
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
}
