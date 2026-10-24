import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { PartnerScorecardService } from "./partner-scorecard.service";
import { ScorecardSettingsService } from "./scorecard-settings.service";
import { ScorecardRecordsService } from "./scorecard-records.service";
import { UpdateScorecardSettingsDto } from "./dto/scorecard-settings.dto";

@Controller("quality/partner-scorecard")
@UseGuards(EntraAuthGuard)
export class PartnerScorecardController {
  constructor(private readonly scorecard: PartnerScorecardService, private readonly settings: ScorecardSettingsService, private readonly records: ScorecardRecordsService) {}

  // Static segments before ":partnerId".
  @Get("settings") getSettings(@CurrentUser() user: RequestUser) { return this.settings.get(user); }
  @Put("settings") putSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateScorecardSettingsDto) { return this.settings.update(user, dto); }
  @Post("settings/reset") resetSettings(@CurrentUser() user: RequestUser) { return this.settings.reset(user); }

  @Get("scores") scores(@CurrentUser() user: RequestUser, @Query("ids") ids?: string) { return this.scorecard.scores(user, (ids ?? "").split(",").map((x) => x.trim()).filter(Boolean)); }

  @Get(":partnerId/records/:key")
  getRecords(@CurrentUser() user: RequestUser, @Param("partnerId") partnerId: string, @Param("key") key: string) { return this.records.get(user, partnerId, key); }

  @Get(":partnerId")
  get(@CurrentUser() user: RequestUser, @Param("partnerId") partnerId: string) { return this.scorecard.get(user, partnerId); }
}
