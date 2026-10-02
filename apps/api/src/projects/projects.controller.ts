import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectLineDto } from "./dto/project-line.dto";
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
}
