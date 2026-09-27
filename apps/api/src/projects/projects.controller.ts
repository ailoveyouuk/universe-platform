import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
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

  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.findOne(user, id);
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
