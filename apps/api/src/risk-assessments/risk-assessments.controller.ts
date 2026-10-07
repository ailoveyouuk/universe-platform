import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateRiskAssessmentDto } from "./dto/create-risk-assessment.dto";
import { UpdateRiskAssessmentDto } from "./dto/update-risk-assessment.dto";
import { RiskAssessmentsService } from "./risk-assessments.service";

/** Gap 4 (compliance-standards-gap-analysis.md) — a top-level resource
 * (not nested under /projects or /partners) since a risk assessment can
 * reference any subject type; callers filter by subjectType/subjectId via
 * query params on GET, the same polymorphic-reference shape the schema
 * itself uses. */
@Controller("risk-assessments")
@UseGuards(EntraAuthGuard)
export class RiskAssessmentsController {
  constructor(private readonly riskAssessmentsService: RiskAssessmentsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRiskAssessmentDto) {
    return this.riskAssessmentsService.create(user, dto);
  }

  @Get()
  listForSubject(
    @CurrentUser() user: RequestUser,
    @Query("subjectType") subjectType: string,
    @Query("subjectId") subjectId: string,
  ) {
    return this.riskAssessmentsService.listForSubject(user, subjectType, subjectId);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateRiskAssessmentDto) {
    return this.riskAssessmentsService.update(user, id, dto);
  }
}
