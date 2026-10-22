import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { TenderAwardService } from "./tender-award.service";
import { TenderBidsService } from "./tender-bids.service";
import { TenderContractsService } from "./tender-contracts.service";
import { TenderFrameworkService } from "./tender-framework.service";
import { TenderPerformanceService } from "./tender-performance.service";
import { TenderDocumentsService } from "./tender-documents.service";
import { TenderEvaluationService } from "./tender-evaluation.service";
import { TenderComplianceService } from "./tender-compliance.service";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import {
  AddendumDto, AnswerQuestionDto, AskQuestionDto, AwardDto, BidSaveDto, CancelTenderDto, CoiDto, ComplaintDto, ComplaintResponseDto, DebriefFeedbackDto, GateDto, ModerationDto, SaveScoresDto, SetEvaluatorsDto, ConfirmBidFileDto, RequestBidFileDto, ConfirmTenderDocumentDto, RequestTenderDocumentDto, CloseContractDto, QualityLinksDto, ContractPaymentDto, ContractPaymentUpdateDto, PerformanceAnswerDto, PerformanceResponseDto, ConfirmContractFileDto, ContractMilestoneDto, ContractMilestoneUpdateDto, ContractSignatoryDto, RequestContractFileDto, UpdateContractDto, TemplateUploadDto, ClarificationDto, CreateTenderDto, InterestDto, InviteDto, ScreeningDto, SavedSearchDto, SetCriteriaDto, SetLinesDto, SetRulesDto, ShortlistDto, UpdateTenderDto,
} from "./dto/tenders.dto";
import { ApprovalSettingsDto, CallOffReasonDto, CallOffResponseDto, PriceReviewDto, PriceReviewResponseDto, RaiseCallOffDto } from "./dto/tenders.dto";
import { TendersService } from "./tenders.service";

@Controller("tenders")
@UseGuards(EntraAuthGuard)
export class TendersController {
  constructor(private readonly tenders: TendersService, private readonly compliance: TenderComplianceService, private readonly bids: TenderBidsService, private readonly evaluation: TenderEvaluationService, private readonly awards: TenderAwardService, private readonly docs: TenderDocumentsService, private readonly contracts: TenderContractsService, private readonly performance: TenderPerformanceService, private readonly framework: TenderFrameworkService) {}

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
  @Post(":id/bids/open") openBids(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.openBids(u, id); }
  @Get(":id/bids") listBids(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.listBids(u, id); }
  @Get(":id/bids/count") bidCount(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.bids.countSubmitted(u, id); }
  @Get(":id/bids/files/:fileId/download-url") issuerBidFile(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("fileId") fid: string) { return this.bids.bidFileUrl(u, id, fid); }

  // ---- evaluation and award (step 4): evaluators and issuers
  @Get(":id/evaluation") evaluationOverview(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.evaluation.overview(u, id); }
  @Get(":id/evaluation/candidates") evaluatorCandidates(@CurrentUser() u: RequestUser, @Param("id") id: string, @Query("q") q = "") { return this.evaluation.listCandidates(u, id, q); }
  @Get(":id/evaluation/bidders") evaluationBidders(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.evaluation.bidderOptions(u, id); }
  @Put(":id/evaluation/evaluators") setEvaluators(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: SetEvaluatorsDto) { return this.evaluation.setEvaluators(u, id, dto); }
  @Put(":id/evaluation/conflict") declareConflict(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: CoiDto) { return this.evaluation.declareConflict(u, id, dto); }
  @Post(":id/evaluation/start") startEvaluation(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.evaluation.start(u, id); }
  @Put(":id/evaluation/gates") recordGate(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: GateDto) { return this.evaluation.recordGate(u, id, dto); }
  @Put(":id/evaluation/scores") saveScores(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: SaveScoresDto) { return this.evaluation.saveScores(u, id, dto); }
  @Put(":id/evaluation/moderation") moderate(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ModerationDto) { return this.evaluation.moderate(u, id, dto); }
  @Post(":id/evaluation/finalise") finaliseScoring(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.evaluation.finalise(u, id); }
  @Post(":id/award") award(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: AwardDto) { return this.awards.award(u, id, dto); }
  @Put(":id/debriefs/:bidId") debriefFeedback(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("bidId") bidId: string, @Body() dto: DebriefFeedbackDto) { return this.awards.updateFeedback(u, id, bidId, dto.feedback); }
  @Post(":id/complaints/:complaintId/respond") respondComplaint(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("complaintId") cid: string, @Body() dto: ComplaintResponseDto) { return this.awards.respondComplaint(u, id, cid, dto.status, dto.response); }

  // ---- participants: status page and complaints
  @Get(":id/status") participantStatus(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.awards.participantStatus(u, id); }
  @Post(":id/complaints") lodgeComplaint(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ComplaintDto) { return this.awards.lodgeComplaint(u, id, dto.body); }

  // ---- issuer: fairness and audit
  @Post(":id/questions/:questionId/answer") answer(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("questionId") qid: string, @Body() dto: AnswerQuestionDto) { return this.compliance.answerQuestion(u, id, qid, dto); }
  @Post(":id/clarifications") clarify(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ClarificationDto) { return this.compliance.postClarification(u, id, dto); }
  @Post(":id/documents/upload-url") docUploadUrl(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: RequestTenderDocumentDto) { return this.docs.requestUpload(u, id, dto); }
  @Post(":id/documents") confirmDoc(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ConfirmTenderDocumentDto) { return this.docs.confirm(u, id, dto); }
  @Delete(":id/documents/:docId") removeDoc(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("docId") docId: string) { return this.docs.remove(u, id, docId); }
  @Get(":id/documents/:docId/download-url") docUrl(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("docId") docId: string) { return this.docs.downloadUrl(u, id, docId); }
  // ---- contracts (step 5): one per award, shared by the issuer and the awarded supplier
  @Get(":id/contracts") contractsFor(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.contracts.forTender(u, id); }
  @Post(":id/contracts/:awardId") createContract(@CurrentUser() u: RequestUser, @Param("id") id: string, @Param("awardId") awardId: string) { return this.contracts.create(u, id, awardId); }
  @Patch("contracts/:cid") updateContract(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: UpdateContractDto) { return this.contracts.update(u, cid, dto); }
  @Post("contracts/:cid/milestones") addMilestone(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: ContractMilestoneDto) { return this.contracts.addMilestone(u, cid, dto); }
  @Patch("contracts/:cid/milestones/:mid") updateMilestone(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Param("mid") mid: string, @Body() dto: ContractMilestoneUpdateDto) { return this.contracts.updateMilestone(u, cid, mid, dto); }
  @Post("contracts/:cid/send") sendContract(@CurrentUser() u: RequestUser, @Param("cid") cid: string) { return this.contracts.send(u, cid); }
  @Post("contracts/:cid/close") closeContract(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: CloseContractDto) { return this.contracts.close(u, cid, dto); }
  @Post("contracts/:cid/files/upload-url") contractUploadUrl(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: RequestContractFileDto) { return this.contracts.requestFileUpload(u, cid, dto); }
  @Post("contracts/:cid/files") contractFile(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: ConfirmContractFileDto) { return this.contracts.confirmFile(u, cid, dto); }
  @Get("contracts/:cid/files/:fid/download-url") contractFileUrl(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Param("fid") fid: string) { return this.contracts.fileUrl(u, cid, fid); }
  @Post("contracts/:cid/signatories") addSignatory(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: ContractSignatoryDto) { return this.contracts.recordSignatory(u, cid, dto); }
  @Delete("contracts/:cid/signatories/:sid") removeSignatory(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Param("sid") sid: string) { return this.contracts.removeSignatory(u, cid, sid); }
  @Post("contracts/:cid/project") contractProject(@CurrentUser() u: RequestUser, @Param("cid") cid: string) { return this.contracts.createProject(u, cid); }

  // ---- performance records (step 6) and the manual payment log
  @Get("performance/staff") staffPerformance(@CurrentUser() u: RequestUser) { return this.performance.listForStaff(u); }
  @Post("performance/:rid/restore") restorePerformance(@CurrentUser() u: RequestUser, @Param("rid") rid: string) { return this.performance.restore(u, rid); }
  @Get("performance/mine") myPerformance(@CurrentUser() u: RequestUser) { return this.performance.mine(u); }
  @Get("performance/supplier/:orgId") supplierPerformance(@CurrentUser() u: RequestUser, @Param("orgId") orgId: string) { return this.performance.supplierSummary(u, orgId); }
  @Get("performance/owner/:orgId/payments") ownerPayments(@CurrentUser() u: RequestUser, @Param("orgId") orgId: string) { return this.performance.ownerPractice(u, orgId); }
  @Post("performance/:rid/respond") respondPerformance(@CurrentUser() u: RequestUser, @Param("rid") rid: string, @Body() dto: PerformanceResponseDto) { return this.performance.respond(u, rid, dto); }
  @Post("performance/:rid/answer") answerPerformance(@CurrentUser() u: RequestUser, @Param("rid") rid: string, @Body() dto: PerformanceAnswerDto) { return this.performance.answer(u, rid, dto); }
  @Post("performance/:rid/withdraw") withdrawPerformance(@CurrentUser() u: RequestUser, @Param("rid") rid: string, @Body() dto: PerformanceAnswerDto) { return this.performance.withdraw(u, rid, dto.body); }
  @Get("contracts/:cid/quality") qualityEvidence(@CurrentUser() u: RequestUser, @Param("cid") cid: string) { return this.performance.qualityEvidence(u, cid); }
  @Put("contracts/:cid/quality") setQuality(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: QualityLinksDto) { return this.performance.setQualityLinks(u, cid, dto.complaintIds, dto.temperatureLogIds); }
  @Post("contracts/:cid/payments") addPayment(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: ContractPaymentDto) { return this.performance.addPayment(u, cid, dto); }
  @Patch("contracts/:cid/payments/:pid") updatePayment(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Param("pid") pid: string, @Body() dto: ContractPaymentUpdateDto) { return this.performance.updatePayment(u, cid, pid, dto); }
  @Post(":id/addenda") addendum(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: AddendumDto) { return this.compliance.createAddendum(u, id, dto); }
  @Post(":id/screenings") screening(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ScreeningDto) { return this.compliance.recordScreening(u, id, dto); }
  @Get(":id/timeline/verify") verify(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.compliance.verifyTimeline(u, id); }
  @Delete(":id/interest") withdraw(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.withdrawInterest(u, id); }
  @Put(":id/shortlist") shortlist(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: ShortlistDto) { return this.tenders.addShortlist(u, id, dto.note); }
  @Delete(":id/shortlist") unshortlist(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.tenders.removeShortlist(u, id); }
  // ---- frameworks and call-offs (step 7 part 2)
  @Get("framework/settings") frameworkSettings(@CurrentUser() u: RequestUser) { return this.framework.getSettings(u); }
  @Put("framework/settings") saveFrameworkSettings(@CurrentUser() u: RequestUser, @Body() dto: ApprovalSettingsDto) { return this.framework.saveSettings(u, dto); }
  @Get(":id/framework") frameworkView(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.framework.view(u, id); }
  @Post(":id/call-offs") raiseCallOff(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() dto: RaiseCallOffDto) { return this.framework.raise(u, id, dto); }
  @Post("call-offs/:cid/approve") approveCallOff(@CurrentUser() u: RequestUser, @Param("cid") cid: string) { return this.framework.approve(u, cid); }
  @Post("call-offs/:cid/reject") rejectCallOff(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: CallOffReasonDto) { return this.framework.reject(u, cid, dto.reason); }
  @Post("call-offs/:cid/cancel") cancelCallOff(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: CallOffReasonDto) { return this.framework.reject(u, cid, dto.reason, true); }
  @Post("call-offs/:cid/respond") respondCallOff(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: CallOffResponseDto) { return this.framework.respond(u, cid, dto.accept, dto.reason); }
  @Post("call-offs/:cid/project") callOffProject(@CurrentUser() u: RequestUser, @Param("cid") cid: string) { return this.framework.createProject(u, cid); }
  @Post("contracts/:cid/price-reviews") proposePrice(@CurrentUser() u: RequestUser, @Param("cid") cid: string, @Body() dto: PriceReviewDto) { return this.framework.proposePrice(u, cid, dto); }
  @Post("price-reviews/:rid/respond") respondPrice(@CurrentUser() u: RequestUser, @Param("rid") rid: string, @Body() dto: PriceReviewResponseDto) { return this.framework.respondPrice(u, rid, dto); }
}

/** Public notices: no sign-in. Only tenders whose issuer switched "public notice" on, and never simulated ones. */
@Controller("public/notices")
export class PublicNoticesController {
  constructor(private readonly compliance: TenderComplianceService) {}
  @Get() list() { return this.compliance.publicNotices(); }
  @Get(":id") async one(@Param("id") id: string) { return (await this.compliance.publicNotices(id))[0] ?? null; }

}
