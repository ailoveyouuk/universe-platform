import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import {
  CreateSupplierProductDto,
  SetCountryPresenceDto,
  UpdateSupplierProductDto,
  UpsertSupplierProfileDto,
} from "./dto/supplier-directory.dto";
import { SupplierDirectoryService } from "./supplier-directory.service";

@Controller("supplier-directory")
@UseGuards(EntraAuthGuard)
export class SupplierDirectoryController {
  constructor(private readonly supplierDirectoryService: SupplierDirectoryService) {}

  @Get("search")
  search(@CurrentUser() user: RequestUser, @Query("category") category?: string, @Query("countryCode") countryCode?: string) {
    return this.supplierDirectoryService.search(user, category, countryCode);
  }

  @Get("profile/me")
  getMyProfile(@CurrentUser() user: RequestUser) {
    return this.supplierDirectoryService.getMyProfile(user);
  }

  @Put("profile/me")
  upsertMyProfile(@CurrentUser() user: RequestUser, @Body() dto: UpsertSupplierProfileDto) {
    return this.supplierDirectoryService.upsertMyProfile(user, dto);
  }

  @Post("profile/me/publish")
  publish(@CurrentUser() user: RequestUser) {
    return this.supplierDirectoryService.setPublished(user, true);
  }

  @Post("profile/me/unpublish")
  unpublish(@CurrentUser() user: RequestUser) {
    return this.supplierDirectoryService.setPublished(user, false);
  }

  @Put("profile/me/countries")
  setCountryPresence(@CurrentUser() user: RequestUser, @Body() dto: SetCountryPresenceDto) {
    return this.supplierDirectoryService.setCountryPresence(user, dto);
  }

  @Get("profile/:organizationId")
  getProfile(@CurrentUser() user: RequestUser, @Param("organizationId") organizationId: string) {
    return this.supplierDirectoryService.getProfile(user, organizationId);
  }

  @Get("products/me")
  listMyProducts(@CurrentUser() user: RequestUser) {
    return this.supplierDirectoryService.listMyProducts(user);
  }

  @Post("products")
  createProduct(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierProductDto) {
    return this.supplierDirectoryService.createProduct(user, dto);
  }

  @Patch("products/:id")
  updateProduct(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateSupplierProductDto) {
    return this.supplierDirectoryService.updateProduct(user, id, dto);
  }

  @Post("products/:id/select")
  selectProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.supplierDirectoryService.selectProduct(user, id);
  }

  @Get("leads/me")
  getMyLeads(@CurrentUser() user: RequestUser) {
    return this.supplierDirectoryService.getMyLeads(user);
  }
}
