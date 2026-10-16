import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";
import { AddPartnerCertificationDto, UpdatePartnerCertificationDto } from "./dto/partner-certification.dto";
import { AddPartnerCompanyCheckDto, UpdatePartnerCompanyCheckDto } from "./dto/partner-company-check.dto";
import { UpsertPartnerFinancialDetailDto } from "./dto/partner-financial-detail.dto";
import { PartnersService } from "./partners.service";

@Controller("partners")
@UseGuards(EntraAuthGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // Static segments first so ":id" never shadows them.
  @Get("page")
  findPage(
    @CurrentUser() user: RequestUser,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("q") q?: string,
    @Query("roleType") roleType?: string,
    @Query("approval") approval?: string,
    @Query("country") country?: string,
    @Query("risk") risk?: string,
    @Query("sort") sort?: string,
    @Query("dir") dir?: string,
  ) {
    return this.partnersService.findPage(user, { page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined, q, roleType, approval, country, risk, sort, dir });
  }

  @Get("overview")
  overview(@CurrentUser() user: RequestUser) {
    return this.partnersService.overview(user);
  }

  @Get("options")
  options(@CurrentUser() user: RequestUser, @Query("roleType") roleType?: string) {
    return this.partnersService.options(user, roleType);
  }

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

  /** Added 2026-10-14 — see partner-financial-detail.dto.ts's doc comment
   * for why this is a single GET + single PUT upsert rather than the
   * add/update pair the certification/company-check sub-resources above
   * use (PartnerFinancialDetail is one-to-one with Partner, not a list).
   * Permission gating (partners.financials.view/edit) happens inside the
   * service, not here — same convention as every other permission check
   * in this controller (none of the @Get/@Post/@Patch handlers above gate
   * in the controller layer either). */
  @Get(":id/financial-detail")
  getFinancialDetail(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.partnersService.getFinancialDetail(user, id);
  }

  @Put(":id/financial-detail")
  upsertFinancialDetail(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpsertPartnerFinancialDetailDto,
  ) {
    return this.partnersService.upsertFinancialDetail(user, id, dto);
  }
}
