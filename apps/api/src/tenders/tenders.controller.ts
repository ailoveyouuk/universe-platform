import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { TenderBidsService } from "./tender-bids.service";
import { TenderComplianceService } from "./tender-compliance.service";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import {
  AddendumDto, AnswerQuestionDto, AskQuestionDto, BidSaveDto, CancelTenderDto, ConfirmBidFileDto, RequestBidFileDto, TemplateUploadDto, ClarificationDto, CreateTenderDto, InterestDto, InviteDto, ScreeningDto, SavedSearchDto, SetCriteriaDto, SetLinesDto, SetRulesDto, ShortlistDto, UpdateTenderDto,
} from "./dto/tenders.dto";
import { TendersService } from "./tenders.service";

@Controller("tenders")
@UseGuards(EntraAuthGuard)
export class TendersController {
  constructor(private readonly tenders: TendersService, private readonly compliance: TenderComplianceService, private readonly bids: TenderBidsService) {}

  // ---- issuer (tenders.issue)
  @Post() create(@CurrentUser() u: RequestUser, @Body() dto: CreateTenderDto) { return this.tenders.create(u, dto); }
  @Get("organisations") organisations(@CurrentUser() u: RequestUser, @Query("q") q = "") { return this.tenders.searchOrganisations(u, q); }
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
  @Post(":id/interest") interest(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: InterestDto) { return this.tenders.expressInterest(u, id, dto); }
  @Post(":id/questions") ask(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: AskQuestionDto) { return this.compliance.askQuestion(u, id, dto.question); }
  @Post(":id/addenda/:addendumId/acknowledge") acknowledge(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("addendumId") aid: string) { return this.compliance.acknowledgeAddendum(u, id, aid); }

  // ---- bidder: the bid workspace (tenders.bid)
  @Get("bids/mine") myBids(@CurrentUser() u: RequestUser) { return this.bids.myBids(u); }
  @Get(":id/bid") bidWorkspace(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.getWorkspace(u, id); }
  @Put(":id/bid") saveBid(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: BidSaveDto) { return this.bids.saveBid(u, id, dto); }
  @Get(":id/bid/template/:kind") bidTemplate(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("kind") kind: string) { return this.bids.downloadTemplate(u, id, kind); }
  @Post(":id/bid/template/:kind") uploadBidTemplate(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("kind") kind: string, @Body() dto: TemplateUploadDto) { return this.bids.uploadTemplate(u, id, kind, dto); }
  @Post(":id/bid/submit") submitBid(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.submitBid(u, id); }
  @Post(":id/bid/withdraw") withdrawBid(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.withdrawBid(u, id); }
  @Post(":id/bid/files/upload-url") bidUploadUrl(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: RequestBidFileDto) { return this.bids.requestFileUpload(u, id, dto); }
  @Post(":id/bid/files") confirmBidFile(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ConfirmBidFileDto) { return this.bids.confirmFile(u, id, dto); }
  @Delete(":id/bid/files/:fileId") removeBidFile(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("fileId") fid: string) { return this.bids.removeFile(u, id, fid); }
  @Get(":id/bid/files/:fileId/download-url") myBidFile(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("fileId") fid: string) { return this.bids.myFileUrl(u, id, fid); }

  // ---- issuer: sealed bids, opened after closing
  @Get(":id/bids") listBids(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.listBids(u, id); }
  @Get(":id/bids/count") bidCount(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.countSubmitted(u, id); }
  @Get(":id/bids/files/:fileId/download-url") issuerBidFile(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("fileId") fid: string) { return this.bids.bidFileUrl(u, id, fid); }

  // ---- issuer: fairness and audit
  @Post(":id/questions/:questionId/answer") answer(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("questionId") qid: string, @Body() dto: AnswerQuestionDto) { return this.compliance.answerQuestion(u, id, qid, dto); }
  @Post(":id/clarifications") clarify(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ClarificationDto) { return this.compliance.postClarification(u, id, dto); }
  @Post(":id/addenda") addendum(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: AddendumDto) { return this.compliance.createAddendum(u, id, dto); }
  @Post(":id/screenings") screening(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ScreeningDto) { return this.compliance.recordScreening(u, id, dto); }
  @Get(":id/timeline/verify") verify(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.compliance.verifyTimeline(u, id); }
  @Delete(":id/interest") withdraw(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.withdrawInterest(u, id); }
  @Put(":id/shortlist") shortlist(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ShortlistDto) { return this.tenders.addShortlist(u, id, dto.note); }
  @Delete(":id/shortlist") unshortlist(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.removeShortlist(u, id); }
}

/** Public notices: no sign-in. Only tenders whose issuer switched "public notice" on, and never simulated ones. */
@Controller("public/notices")
export class PublicNoticesController {
  constructor(private readonly compliance: TenderComplianceService) {}
  @Get() list() { return this.compliance.publicNotices(); }
  @Get(":id") async one(@Param("id") id: string) { return (await this.compliance.publicNotices(id))[0] ?? null; }
}
