import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { StakeholderRegistryService } from "./stakeholder-registry.service";

/**
 * Read-only from outside PartnersService — see StakeholderRegistryService's
 * doc comment. Anyone authenticated can search/view, same reasoning as
 * SupplierDirectoryController.search: this is specifically the safe,
 * shared subset of stakeholder identity meant to be visible platform-wide,
 * not a sensitive endpoint to lock down further.
 */
@Controller("stakeholder-registry")
@UseGuards(EntraAuthGuard)
export class StakeholderRegistryController {
  constructor(private readonly stakeholderRegistryService: StakeholderRegistryService) {}

  @Get("search")
  search(
    @CurrentUser() user: RequestUser,
    @Query("type") type?: string,
    @Query("q") q?: string,
    @Query("field") field?: "name" | "registrationNumber" | "vatNumber",
  ) {
    return this.stakeholderRegistryService.search(type, q, field, user.inDemoOrganization === true);
  }

  @Get(":id")
  getOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.stakeholderRegistryService.getOne(id, user.inDemoOrganization === true);
  }

  @Get(":id/products")
  getProducts(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.stakeholderRegistryService.getProducts(id, user.inDemoOrganization === true);
  }
}
