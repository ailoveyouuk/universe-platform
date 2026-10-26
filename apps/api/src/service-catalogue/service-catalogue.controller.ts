import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { ServiceCatalogueService, type CatalogueEntryInput } from "./service-catalogue.service";

@Controller("service-catalogue")
@UseGuards(EntraAuthGuard)
export class ServiceCatalogueController {
  constructor(private readonly catalogue: ServiceCatalogueService) {}
  @Get() list() { return this.catalogue.list(); }
  @Get("all") listAll(@CurrentUser() u: RequestUser) { return this.catalogue.listAll(u); }
  @Get(":code/cost-range") costRange(@CurrentUser() u: RequestUser, @Param("code") code: string) { return this.catalogue.costRange(u, code); }
  @Post() create(@CurrentUser() u: RequestUser, @Body() dto: CatalogueEntryInput) { return this.catalogue.create(u, dto); }
  @Patch(":code") update(@CurrentUser() u: RequestUser, @Param("code") code: string, @Body() dto: CatalogueEntryInput) { return this.catalogue.update(u, code, dto); }
}
