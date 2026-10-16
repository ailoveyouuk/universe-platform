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
  deactivate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.deactivate(user, id);
  }

  @Patch(":id/roles")
  updateRoles(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateUserRolesDto) {
    return this.usersService.updateRoles(user, id, dto.roleIds);
  }
}
