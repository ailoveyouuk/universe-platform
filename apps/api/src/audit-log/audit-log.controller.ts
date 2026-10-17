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

  /** Global activity feed (Admin app, added 2026-10-16): newest-first field
   * changes across records. Platform staff: any/all organisations. Org
   * admins (org.users.manage): their own organisation only. Keyset-paginated
   * on changedAt via `before`. */
  @Get("feed")
  feed(
    @CurrentUser() user: RequestUser,
    @Query("organizationId") organizationId?: string,
    @Query("tableName") tableName?: string,
    @Query("changedById") changedById?: string,
    @Query("before") before?: string,
    @Query("limit") limit?: string,
    @Query("includeSimulated") includeSimulated?: string,
  ) {
    return this.auditLogService.feed(user, { organizationId, tableName, changedById, before, limit: limit ? Number(limit) : undefined, includeSimulated: includeSimulated === "true" });
  }

  @Get()
  forRecord(@CurrentUser() user: RequestUser, @Query("tableName") tableName: string, @Query("recordId") recordId: string) {
    return this.auditLogService.forRecord(user, tableName, recordId);
  }
}
