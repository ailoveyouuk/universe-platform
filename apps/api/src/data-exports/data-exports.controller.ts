import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard, type RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { OrganisationExportsService } from "./organisation-exports.service";

/** GET /exports/organisation/:entity — CSV of the caller's own organisation's records (partners, projects, project-lines). */
@Controller("exports")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("product-database", "project-management")
export class DataExportsController {
  constructor(private readonly service: OrganisationExportsService) {}

  @Get("organisation/:entity")
  organisation(@CurrentUser() user: RequestUser, @Param("entity") entity: string, @Query("includeArchived") includeArchived?: string) {
    return this.service.export(user, entity, includeArchived === "true");
  }
}
