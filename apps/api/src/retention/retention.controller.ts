import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { RetentionService } from "./retention.service";
import type { RetentionDecisionInput, RetentionOverrideInput } from "@universe/types";

@Controller("retention")
@UseGuards(EntraAuthGuard)
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}
  @Get("rules") rules(@CurrentUser() u: RequestUser) { return this.retention.rules(u); }
  @Put("rules") setOverride(@CurrentUser() u: RequestUser, @Body() dto: RetentionOverrideInput) { return this.retention.setOverride(u, dto); }
  @Delete("rules/:key") clearOverride(@CurrentUser() u: RequestUser, @Param("key") key: string) { return this.retention.clearOverride(u, key); }
  @Get("queue") queue(@CurrentUser() u: RequestUser) { return this.retention.queue(u); }
  @Post("decisions") decide(@CurrentUser() u: RequestUser, @Body() dto: RetentionDecisionInput) { return this.retention.decide(u, dto); }
  @Get("complainant/find") find(@CurrentUser() u: RequestUser, @Query("q") q: string) { return this.retention.findComplainant(u, q); }
  @Get("complainant/copy") copy(@CurrentUser() u: RequestUser, @Query("q") q: string) { return this.retention.subjectAccessCopy(u, q); }
}
