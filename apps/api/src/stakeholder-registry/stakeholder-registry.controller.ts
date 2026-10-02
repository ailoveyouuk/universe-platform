import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
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
  search(@Query("type") type?: string, @Query("q") q?: string) {
    return this.stakeholderRegistryService.search(type, q);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.stakeholderRegistryService.getOne(id);
  }

  @Get(":id/products")
  getProducts(@Param("id") id: string) {
    return this.stakeholderRegistryService.getProducts(id);
  }
}
