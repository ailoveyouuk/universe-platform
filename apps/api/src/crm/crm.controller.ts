import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { CrmInteractionInput, CrmOpportunityInput, CrmPersonUpdate, CrmPrivacyRequestInput, CrmPrivacyRequestUpdate, CrmRelationshipUpdate } from "@universe/types";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { CrmInteractionsService } from "./crm-interactions.service";
import { CrmOpportunitiesService } from "./crm-opportunities.service";
import { CrmTagsService } from "./crm-tags.service";
import { CrmPrivacyService } from "./crm-privacy.service";
import { CrmService } from "./crm.service";
import { AnonymiseDto, InteractionDto, OpportunityDto, PersonProfileDto, TagDto, PrivacyRequestDto, PrivacyRequestUpdateDto, SuppressDto, UpdateRelationshipDto } from "./dto/crm.dto";

@Controller("crm")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("crm")
export class CrmController {
  constructor(private readonly crm: CrmService, private readonly interactions: CrmInteractionsService, private readonly privacy: CrmPrivacyService, private readonly opportunities: CrmOpportunitiesService, private readonly tags: CrmTagsService) {}

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

  // ---- People and privacy (step 4) ----
  @Get("relationships/:id/people") relationshipPeople(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.people(user, id); }
  @Patch("contacts/:id/profile") profile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PersonProfileDto) { return this.privacy.updateProfile(user, id, dto as CrmPersonUpdate); }
  @Post("contacts/:id/objection") @HttpCode(200) object(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.object(user, id); }
  @Post("contacts/:id/anonymise") @HttpCode(200) anonymise(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AnonymiseDto) { return this.privacy.anonymise(user, id, dto); }
  @Get("contacts/:id/access-copy") accessCopy(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.accessCopy(user, id); }
  @Post("contacts/:id/keep") @HttpCode(200) keep(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.privacy.keep(user, id).then(() => ({ ok: true })); }
  @Get("privacy/summary") privacySummary(@CurrentUser() user: RequestUser) { return this.privacy.summary(user); }
  @Get("privacy/find-person") findPerson(@CurrentUser() user: RequestUser, @Query("q") q: string) { return this.privacy.findPerson(user, q ?? ""); }
  @Get("privacy/requests") requests(@CurrentUser() user: RequestUser, @Query("status") status?: string) { return this.privacy.requests(user, status); }
  @Post("privacy/requests") createRequest(@CurrentUser() user: RequestUser, @Body() dto: PrivacyRequestDto) { return this.privacy.createRequest(user, dto as CrmPrivacyRequestInput); }
  @Patch("privacy/requests/:id") updateRequest(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PrivacyRequestUpdateDto) { return this.privacy.updateRequest(user, id, dto as CrmPrivacyRequestUpdate); }
  @Get("privacy/retention") retention(@CurrentUser() user: RequestUser) { return this.privacy.retention(user); }
  @Get("privacy/suppressions") suppressions(@CurrentUser() user: RequestUser) { return this.privacy.suppressions(user); }
  @Post("privacy/suppressions") @HttpCode(200) suppress(@CurrentUser() user: RequestUser, @Body() dto: SuppressDto) { return this.privacy.suppress(user, dto.email).then(() => ({ ok: true })); }
  @Get("privacy/access-log") accessLog(@CurrentUser() user: RequestUser) { return this.privacy.accessLog(user); }

  // ---- Opportunities (step 5) ----
  @Get("opportunities")
  listOpportunities(@CurrentUser() user: RequestUser, @Query() q: Record<string, string>) {
    return this.opportunities.list(user, { ...q, page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined });
  }
  @Get("pipeline") pipeline(@CurrentUser() user: RequestUser) { return this.opportunities.pipeline(user); }
  @Post("opportunities") createOpportunity(@CurrentUser() user: RequestUser, @Body() dto: OpportunityDto) { return this.opportunities.create(user, dto as CrmOpportunityInput); }
  @Patch("opportunities/:id") updateOpportunity(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: OpportunityDto) { return this.opportunities.update(user, id, dto as CrmOpportunityInput); }

  // ---- Tags and segments (step 6) ----
  @Get("tags") listTags(@CurrentUser() user: RequestUser) { return this.tags.list(user); }
  @Post("tags") createTag(@CurrentUser() user: RequestUser, @Body() dto: TagDto) { return this.tags.create(user, dto); }
  @Patch("tags/:id") updateTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: TagDto) { return this.tags.update(user, id, dto); }
  @Post("relationships/:id/tags/:tagId") applyTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("tagId") tagId: string) { return this.tags.apply(user, id, tagId); }
  @Delete("relationships/:id/tags/:tagId") removeTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("tagId") tagId: string) { return this.tags.remove(user, id, tagId); }
}
