import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { GrantStakeholderAccessDto } from "./dto/grant-stakeholder-access.dto";
import { StakeholderAccessService } from "./stakeholder-access.service";

@Controller("stakeholder-access")
@UseGuards(EntraAuthGuard)
export class StakeholderAccessController {
  constructor(private readonly service: StakeholderAccessService) {}

  @Get()
  overview(@CurrentUser() user: RequestUser) {
    return this.service.overview(user);
  }

  /** Seeds simulated anonymised benchmark rows (logistics/CO2, pricing, sourcing) for the demo. Platform staff only; adds rows only, deletes nothing, skips any table that already has them. */
  @Post("demo-benchmarks")
  seedDemoBenchmarks(@CurrentUser() user: RequestUser) {
    return this.service.seedDemoBenchmarks(user);
  }

  @Post()
  grant(@CurrentUser() user: RequestUser, @Body() dto: GrantStakeholderAccessDto) {
    return this.service.grant(user, dto);
  }
}
