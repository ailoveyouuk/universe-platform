import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { InviteUserDto } from "./dto/invite-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserRolesDto } from "./dto/update-user-roles.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(EntraAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Static routes are declared before ":id" so they are never read as an id.
  @Get("page")
  findPage(
    @CurrentUser() user: RequestUser,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("organizationId") organizationId?: string,
    @Query("includeSimulated") includeSimulated?: string,
  ) {
    return this.usersService.findPage(user, { page: Number(page) || 1, pageSize: Number(pageSize) || 25, q, status, organizationId, includeSimulated: includeSimulated === "true" });
  }

  @Get("counts")
  counts(@CurrentUser() user: RequestUser, @Query("organizationId") organizationId?: string, @Query("includeSimulated") includeSimulated?: string) {
    return this.usersService.counts(user, organizationId, includeSimulated === "true");
  }

  @Get("options")
  options(@CurrentUser() user: RequestUser, @Query("q") q?: string, @Query("active") active?: string) {
    return this.usersService.options(user, q, active === "true");
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query("organizationId") organizationId?: string) {
    return this.usersService.findAll(user, organizationId);
  }

  @Post()
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteUserDto) {
    return this.usersService.invite(user, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.findOne(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user, id, dto);
  }

  @Post(":id/reactivate")
  reactivate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.reactivate(user, id);
  }

  @Post(":id/reset-sign-in")
  resetSignIn(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.resetSignIn(user, id);
  }

  @Delete(":id")
  deactivate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("reason") reason?: string) {
    return this.usersService.deactivate(user, id, reason);
  }

  @Patch(":id/roles")
  updateRoles(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateUserRolesDto) {
    return this.usersService.updateRoles(user, id, dto.roleIds);
  }
}
