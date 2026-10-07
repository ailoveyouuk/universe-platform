import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateControlledDocumentDto, UpdateControlledDocumentDto } from "./dto/controlled-document.dto";
import { ControlledDocumentsService } from "./controlled-documents.service";

/** Gap 7 (compliance-standards-gap-analysis.md) — a top-level resource,
 * same reasoning as risk-assessments: an organisation's own document
 * register isn't nested under any one Partner/Project. */
@Controller("controlled-documents")
@UseGuards(EntraAuthGuard)
export class ControlledDocumentsController {
  constructor(private readonly controlledDocumentsService: ControlledDocumentsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateControlledDocumentDto) {
    return this.controlledDocumentsService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: RequestUser, @Query("category") category?: string) {
    return this.controlledDocumentsService.list(user, category);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateControlledDocumentDto) {
    return this.controlledDocumentsService.update(user, id, dto);
  }
}
