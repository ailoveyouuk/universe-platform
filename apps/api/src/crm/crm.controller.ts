import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import type { CrmRelationshipUpdate } from "@universe/types";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { CrmService } from "./crm.service";
import { UpdateRelationshipDto } from "./dto/crm.dto";

@Controller("crm")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("overview") overview(@CurrentUser() user: RequestUser) { return this.crm.overview(user); }
  @Get("people") people(@CurrentUser() user: RequestUser) { return this.crm.people(user); }

  @Get("relationships")
  list(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) {
    return this.crm.list(user, { ...q, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined });
  }

  @Get("relationships/:id") one(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.crm.one(user, id); }

  @Get("relationships/:id/detail") detail(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.crm.detail(user, id); }
  @Get("relationships/:id/scorecard") scorecard(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.crm.scorecard(user, id); }

  @Patch("relationships/:id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateRelationshipDto) { return this.crm.update(user, id, dto as CrmRelationshipUpdate); }
}
