import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
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
}
