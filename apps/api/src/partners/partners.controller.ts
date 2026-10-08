import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";
import { AddPartnerCertificationDto, UpdatePartnerCertificationDto } from "./dto/partner-certification.dto";
import { AddPartnerCompanyCheckDto, UpdatePartnerCompanyCheckDto } from "./dto/partner-company-check.dto";
import { PartnersService } from "./partners.service";

@Controller("partners")
@UseGuards(EntraAuthGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query("roleType") roleType?: string) {
    return this.partnersService.findAll(user, roleType);
  }

  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.partnersService.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartnerDto) {
    return this.partnersService.create(user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(user, id, dto);
  }

  // --- Certifications / company checks / approval history sub-resources
  // (added 2026-10-08) — before this, a single certification or company
  // check could only be ADDED via the big Partner create/update DTOs
  // (CreatePartnerDto.certifications/companyChecks,
  // UpdatePartnerDto.addCertifications/addCompanyChecks), never edited
  // or retired on its own — see partner-certification.dto.ts's doc
  // comment. Nested under /partners/:id, same convention as
  // DocumentsController's /projects/:projectId/documents.

  @Post(":id/certifications")
  addCertification(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AddPartnerCertificationDto,
  ) {
    return this.partnersService.addCertification(user, id, dto);
  }

  @Patch(":id/certifications/:certId")
  updateCertification(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("certId") certId: string,
    @Body() dto: UpdatePartnerCertificationDto,
  ) {
    // Retiring a certification (compliance history must be retained, so
    // this is never a hard delete) is just this same PATCH with
    // { status: "ARCHIVED" } — see PartnerCertification.status's doc
    // comment in schema.prisma and partner-certification.dto.ts.
    return this.partnersService.updateCertification(user, id, certId, dto);
  }

  @Post(":id/company-checks")
  addCompanyCheck(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AddPartnerCompanyCheckDto,
  ) {
    return this.partnersService.addCompanyCheck(user, id, dto);
  }

  @Patch(":id/company-checks/:checkId")
  updateCompanyCheck(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("checkId") checkId: string,
    @Body() dto: UpdatePartnerCompanyCheckDto,
  ) {
    return this.partnersService.updateCompanyCheck(user, id, checkId, dto);
  }

  /** PartnerApprovalHistory is itself an append-only history log (see its
   * doc comment in schema.prisma) — read-only, no edit/delete endpoint.
   * Already readable merged into GET /audit-log?tableName=partners&... via
   * AuditLogService (see that file's doc comment), but that endpoint
   * returns it reshaped into a generic FieldChangeLogEntry; this one
   * returns the raw PartnerApprovalHistory rows for a caller that wants
   * them on their own. */
  @Get(":id/approval-history")
  listApprovalHistory(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.partnersService.listApprovalHistory(user, id);
  }
}
