import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { QualityComplaintsService } from "./quality-complaints.service";
import {
  CloseComplaintDto, ComplaintAttachmentDto, ComplaintNoteDto, CreateComplaintActionDto, CreateComplaintDto, EffectivenessDto, PartnerResponseDto, RaiseRiskDto, ReasonDto,
  RegulatorDecisionDto, ResolveComplaintDto, SaveInvestigationDto, SourceReviewDto, TriageComplaintDto, UpdateComplaintActionDto, UpdateComplaintDto,
} from "./dto/complaint.dto";

@Controller("quality/complaints")
@UseGuards(EntraAuthGuard)
export class QualityComplaintsController {
  constructor(private readonly complaints: QualityComplaintsService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: RequestUser) { return this.complaints.dashboard(user); }

  @Get("page")
  page(
    @CurrentUser() user: RequestUser,
    @Query("q") q?: string, @Query("status") status?: string, @Query("direction") direction?: string, @Query("severity") severity?: string,
    @Query("category") category?: string, @Query("partnerId") partnerId?: string, @Query("projectId") projectId?: string,
    @Query("overdue") overdue?: string, @Query("serious") serious?: string, @Query("open") open?: string,
    @Query("triage") triage?: string, @Query("actions") actions?: string,
    @Query("page") page?: string, @Query("pageSize") pageSize?: string,
  ) {
    return this.complaints.listPage(user, {
      q, status, direction, severity, category, partnerId, projectId, overdue: overdue === "true", serious: serious === "true", open: open === "true", triage: triage === "true", actions: actions === "true",
      page: Number(page) || 1, pageSize: Number(pageSize) || 25,
    });
  }

  @Post() create(@CurrentUser() user: RequestUser, @Body() dto: CreateComplaintDto) { return this.complaints.create(user, dto); }
  @Get(":id") get(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.complaints.get(user, id); }
  @Patch(":id") update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateComplaintDto) { return this.complaints.update(user, id, dto); }

  @Post(":id/acknowledge") acknowledge(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.complaints.acknowledge(user, id); }
  @Post(":id/triage") triage(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: TriageComplaintDto) { return this.complaints.triage(user, id, dto); }
  @Post(":id/investigation") investigation(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SaveInvestigationDto) { return this.complaints.saveInvestigation(user, id, dto); }
  @Post(":id/partner-response") partnerResponse(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PartnerResponseDto) { return this.complaints.recordPartnerResponse(user, id, dto); }
  @Post(":id/resolve") resolve(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ResolveComplaintDto) { return this.complaints.resolve(user, id, dto); }
  @Post(":id/regulator") regulator(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: RegulatorDecisionDto) { return this.complaints.recordRegulatorDecision(user, id, dto); }
  @Post(":id/close") close(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CloseComplaintDto) { return this.complaints.close(user, id, dto); }
  @Post(":id/effectiveness") effectiveness(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: EffectivenessDto) { return this.complaints.recordEffectiveness(user, id, dto); }
  @Post(":id/hold") hold(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ReasonDto) { return this.complaints.hold(user, id, dto.reason); }
  @Post(":id/resume") resume(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.complaints.resume(user, id); }
  @Post(":id/withdraw") withdraw(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ReasonDto) { return this.complaints.withdraw(user, id, dto.reason); }
  @Post(":id/reopen") reopen(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ReasonDto) { return this.complaints.reopen(user, id, dto.reason); }
  @Post(":id/notes") note(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ComplaintNoteDto) { return this.complaints.addNote(user, id, dto); }
  @Post(":id/attachments") attach(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ComplaintAttachmentDto) { return this.complaints.addAttachment(user, id, dto); }
  @Delete(":id/attachments/:attachmentId") removeAttachment(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("attachmentId") attachmentId: string) { return this.complaints.archiveAttachment(user, id, attachmentId); }
  @Post(":id/actions") addAction(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateComplaintActionDto) { return this.complaints.addAction(user, id, dto); }
  @Patch(":id/actions/:actionId") updateAction(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("actionId") actionId: string, @Body() dto: UpdateComplaintActionDto) { return this.complaints.updateAction(user, id, actionId, dto); }
  @Post(":id/risk") risk(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: RaiseRiskDto) { return this.complaints.raiseRisk(user, id, dto); }
  @Post(":id/source-review") sourceReview(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SourceReviewDto) { return this.complaints.requestSourceReview(user, id, dto); }
}
