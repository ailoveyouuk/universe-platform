import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { PartnerScorecardService } from "./partner-scorecard.service";

@Controller("quality/partner-scorecard")
@UseGuards(EntraAuthGuard)
export class PartnerScorecardController {
  constructor(private readonly scorecard: PartnerScorecardService) {}

  @Get(":partnerId")
  get(@CurrentUser() user: RequestUser, @Param("partnerId") partnerId: string) { return this.scorecard.get(user, partnerId); }
}
