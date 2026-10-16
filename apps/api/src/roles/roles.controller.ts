import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { RolesService } from "./roles.service";

/** Role & permission management for the Admin app (added 2026-10-16). Every
 * endpoint requires org.roles.manage on the target organisation (platform
 * staff exempt) — see RolesService. */
@Controller()
@UseGuards(EntraAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** The global permission catalogue, so the UI can render grant checkboxes. */
  @Get("permissions")
  listPermissions(@CurrentUser() user: RequestUser) {
    return this.rolesService.listPermissions(user);
  }

  @Get("roles")
  list(@CurrentUser() user: RequestUser, @Query("organizationId") organizationId?: string) {
    return this.rolesService.list(user, organizationId);
  }

  @Post("roles")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(user, dto);
  }

  @Patch("roles/:id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(user, id, dto);
  }

  @Delete("roles/:id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.rolesService.remove(user, id);
  }
}
