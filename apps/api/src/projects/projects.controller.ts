import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectLineDto } from "./dto/project-line.dto";
import { AddProjectLeadDto } from "./dto/add-project-lead.dto";
import { AddProjectContactDto } from "./dto/add-project-contact.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(EntraAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.projectsService.findAll(user);
  }

  // Declared BEFORE the ":id" route below — Nest/Express match routes in
  // declaration order, and a single dynamic segment would otherwise treat
  // "financial-summary" as an :id value and shadow this entirely.
  @Get("financial-summary")
  getFinancialSummary(@CurrentUser() user: RequestUser, @Query("currency") currency?: string) {
    return this.projectsService.getFinancialSummary(user, currency);
  }

  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.findOne(user, id);
  }

  // A distinct two-segment path from the flat "financial-summary" route
  // above — no declaration-order concern here, Nest/Express match by
  // segment count too, so ":id" alone never shadows ":id/financial-summary".
  @Get(":id/financial-summary")
  getProjectFinancialSummary(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("currency") currency?: string) {
    return this.projectsService.getProjectFinancialSummary(user, id, currency);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(user, id, dto);
  }

  // Soft-delete/retirement — see ProjectsService.archive's doc comment.
  // Distinct, dedicated routes rather than overloading PATCH ":id" with an
  // isArchived field on UpdateProjectDto, same reasoning as every other
  // deliberate-action endpoint in this build (e.g. risk-assessments'
  // :id/close) — archiving is a specific decision with its own audit
  // trail entry, not an ordinary header edit.
  @Patch(":id/archive")
  archive(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.archive(user, id);
  }

  @Patch(":id/unarchive")
  unarchive(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.unarchive(user, id);
  }

  @Post(":id/lines")
  addLine(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: ProjectLineDto) {
    return this.projectsService.addLine(user, id, dto);
  }

  @Patch(":id/lines/:lineId")
  updateLine(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @Body() dto: ProjectLineDto,
  ) {
    return this.projectsService.updateLine(user, id, lineId, dto);
  }

  // --- Project Leads/Contacts (added 2026-10-08) — independent
  // add/remove, not a full project PATCH. See ProjectsService's doc
  // comment above addLead/addContact. ---

  @Post(":id/leads")
  addLead(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AddProjectLeadDto) {
    return this.projectsService.addLead(user, id, dto.userId);
  }

  @Delete(":id/leads/:userId")
  removeLead(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("userId") userId: string) {
    return this.projectsService.removeLead(user, id, userId);
  }

  @Post(":id/contacts")
  addContact(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AddProjectContactDto) {
    return this.projectsService.addContact(user, id, dto.contactId);
  }

  @Delete(":id/contacts/:contactId")
  removeContact(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("contactId") contactId: string) {
    return this.projectsService.removeContact(user, id, contactId);
  }
}
