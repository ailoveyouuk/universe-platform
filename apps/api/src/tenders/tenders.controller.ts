import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import {
  CancelTenderDto, CreateTenderDto, InviteDto, SavedSearchDto, SetCriteriaDto, SetLinesDto, SetRulesDto, ShortlistDto, UpdateTenderDto,
} from "./dto/tenders.dto";
import { TendersService } from "./tenders.service";

@Controller("tenders")
@UseGuards(EntraAuthGuard)
export class TendersController {
  constructor(private readonly tenders: TendersService) {}

  // ---- issuer (tenders.issue)
  @Post() create(@CurrentUser() u: RequestUser, @Body() dto: CreateTenderDto) { return this.tenders.create(u, dto); }
  @Get("mine") listMine(@CurrentUser() u: RequestUser, @Query("status") status?: string) { return this.tenders.listMine(u, status); }
  @Get("dashboard") dashboard(@CurrentUser() u: RequestUser) { return this.tenders.dashboard(u); }
  @Get("mine/:id") getMine(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.getMine(u, id); }
  @Patch(":id") update(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: UpdateTenderDto) { return this.tenders.update(u, id, dto); }
  @Put(":id/lines") setLines(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: SetLinesDto) { return this.tenders.setLines(u, id, dto); }
  @Put(":id/criteria") setCriteria(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: SetCriteriaDto) { return this.tenders.setCriteria(u, id, dto); }
  @Put(":id/rules") setRules(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: SetRulesDto) { return this.tenders.setRules(u, id, dto); }
  @Post(":id/invitations") invite(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: InviteDto) { return this.tenders.invite(u, id, dto); }
  @Post(":id/publish") publish(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.publish(u, id); }
  @Post(":id/cancel") cancel(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: CancelTenderDto) { return this.tenders.cancel(u, id, dto.reason); }

  // ---- participant (tenders.view / tenders.bid)
  @Get("available")
  available(@CurrentUser() u: RequestUser, @Query("chip") chip?: string, @Query("type") type?: string, @Query("country") country?: string, @Query("category") category?: string, @Query("keyword") keyword?: string, @Query("sort") sort?: string, @Query("shortlisted") shortlisted?: string) {
    return this.tenders.listAvailable(u, { chip, type, country, category, keyword, sort, shortlistedOnly: shortlisted === "true" });
  }
  @Get("for-you") forYou(@CurrentUser() u: RequestUser) { return this.tenders.forYou(u); }
  @Get("saved-searches") listSearches(@CurrentUser() u: RequestUser) { return this.tenders.listSavedSearches(u); }
  @Post("saved-searches") saveSearch(@CurrentUser() u: RequestUser, @Body() dto: SavedSearchDto) { return this.tenders.saveSearch(u, dto); }
  @Delete("saved-searches/:id") deleteSearch(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.deleteSearch(u, id); }
  @Get(":id/view") view(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.getForParticipant(u, id); }
  @Post(":id/interest") interest(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.expressInterest(u, id); }
  @Delete(":id/interest") withdraw(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.withdrawInterest(u, id); }
  @Put(":id/shortlist") shortlist(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ShortlistDto) { return this.tenders.addShortlist(u, id, dto.note); }
  @Delete(":id/shortlist") unshortlist(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.removeShortlist(u, id); }
}
