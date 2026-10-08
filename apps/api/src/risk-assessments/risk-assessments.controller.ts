import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateRiskAssessmentDto } from "./dto/create-risk-assessment.dto";
import { UpdateRiskAssessmentDto } from "./dto/update-risk-assessment.dto";
import { CloseRiskAssessmentDto } from "./dto/close-risk-assessment.dto";
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

  // Declared before the generic @Get() below — Nest doesn't need this for
  // route-matching (literal static segments never conflict with each
  // other regardless of order), but it reads better grouped with its
  // sibling list endpoint.
  @Get("all")
  listAll(@CurrentUser() user: RequestUser) {
    return this.riskAssessmentsService.listAll(user);
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

  // Dedicated "Close" action, distinct from the generic update() above —
  // see RiskAssessmentsService.close's doc comment.
  @Patch(":id/close")
  close(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CloseRiskAssessmentDto) {
    return this.riskAssessmentsService.close(user, id, dto);
  }
}
