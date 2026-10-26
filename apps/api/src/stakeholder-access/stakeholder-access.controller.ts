import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { GrantStakeholderAccessDto } from "./dto/grant-stakeholder-access.dto";
import { StakeholderAccessService } from "./stakeholder-access.service";

@Controller("stakeholder-access")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("admin")
export class StakeholderAccessController {
  constructor(private readonly service: StakeholderAccessService) {}

  @Get()
  overview(@CurrentUser() user: RequestUser) {
    return this.service.overview(user);
  }

  @Post()
  grant(@CurrentUser() user: RequestUser, @Body() dto: GrantStakeholderAccessDto) {
    return this.service.grant(user, dto);
  }
}
