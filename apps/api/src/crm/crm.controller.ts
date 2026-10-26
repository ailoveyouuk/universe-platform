import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { CrmInteractionInput, CrmRelationshipUpdate } from "@universe/types";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { CrmInteractionsService } from "./crm-interactions.service";
import { CrmService } from "./crm.service";
import { InteractionDto, UpdateRelationshipDto } from "./dto/crm.dto";

@Controller("crm")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("crm")
export class CrmController {
  constructor(private readonly crm: CrmService, private readonly interactions: CrmInteractionsService) {}

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

  @Get("follow-ups") followUps(@CurrentUser() user: RequestUser) { return this.interactions.myFollowUps(user); }

  @Get("relationships/:id/interactions")
  listInteractions(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query() q: Record<string, string>) {
    return this.interactions.list(user, id, { type: q.type || undefined, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined });
  }
  @Post("relationships/:id/interactions")
  logInteraction(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: InteractionDto) { return this.interactions.create(user, id, dto as CrmInteractionInput); }
  @Patch("interactions/:id")
  updateInteraction(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: InteractionDto) { return this.interactions.update(user, id, dto as Partial<CrmInteractionInput>); }
}
