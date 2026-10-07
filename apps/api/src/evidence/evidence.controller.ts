import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateEvidenceStandardDto, UpdateEvidenceStandardDto } from "./dto/evidence-standard.dto";
import { CreateEvidenceRecordDto, UpdateEvidenceRecordDto, VerifyEvidenceRecordDto } from "./dto/evidence-record.dto";
import { EvidenceService } from "./evidence.service";

/** Gap 3 (compliance-standards-gap-analysis.md). Two resources under one
 * controller: the org's own catalog (/evidence-standards) and the evidence
 * records logged against it (/evidence-records) — kept together since
 * they're always read/written as a pair, same reasoning as quality.module.ts
 * grouping partner-performance + product-source-approvals. */
@Controller()
@UseGuards(EntraAuthGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post("evidence-standards")
  createStandard(@CurrentUser() user: RequestUser, @Body() dto: CreateEvidenceStandardDto) {
    return this.evidenceService.createStandard(user, dto);
  }

  @Get("evidence-standards")
  listStandards(
    @CurrentUser() user: RequestUser,
    @Query("stakeholderType") stakeholderType?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.evidenceService.listStandards(user, stakeholderType, includeInactive === "true");
  }

  @Patch("evidence-standards/:id")
  updateStandard(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateEvidenceStandardDto) {
    return this.evidenceService.updateStandard(user, id, dto);
  }

  @Post("evidence-records")
  createRecord(@CurrentUser() user: RequestUser, @Body() dto: CreateEvidenceRecordDto) {
    return this.evidenceService.createRecord(user, dto);
  }

  @Get("partners/:partnerId/evidence-records")
  listRecordsForPartner(@CurrentUser() user: RequestUser, @Param("partnerId") partnerId: string) {
    return this.evidenceService.listRecordsForPartner(user, partnerId);
  }

  @Patch("evidence-records/:id")
  updateRecord(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateEvidenceRecordDto) {
    return this.evidenceService.updateRecord(user, id, dto);
  }

  @Patch("evidence-records/:id/verify")
  verifyRecord(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: VerifyEvidenceRecordDto) {
    return this.evidenceService.verifyRecord(user, id, dto);
  }

  @Get("evidence-records/due-for-review")
  listDueForReVerification(@CurrentUser() user: RequestUser, @Query("withinDays") withinDays?: string) {
    return this.evidenceService.listDueForReVerification(user, withinDays ? parseInt(withinDays, 10) : undefined);
  }
}
