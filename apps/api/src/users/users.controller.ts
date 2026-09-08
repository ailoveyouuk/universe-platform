import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { InviteUserDto } from "./dto/invite-user.dto";
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

  @Delete(":id")
  deactivate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.deactivate(user, id);
  }
}
