import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { AuditLogService } from "./audit-log.service";

/** Gap 1 (compliance-standards-gap-analysis.md) — GET /audit-log?tableName=
 * projects&recordId=<id> returns that record's full field-change history,
 * newest first. No write endpoints here by design — see AuditLogService's
 * doc comment. */
@Controller("audit-log")
@UseGuards(EntraAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  forRecord(@CurrentUser() user: RequestUser, @Query("tableName") tableName: string, @Query("recordId") recordId: string) {
    return this.auditLogService.forRecord(user, tableName, recordId);
  }
}
