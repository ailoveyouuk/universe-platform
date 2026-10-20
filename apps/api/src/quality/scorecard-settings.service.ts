import { BadRequestException, Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import { SCORECARD_THRESHOLDS as D } from "@universe/types";
import type { ScorecardSettings } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { tenantScope } from "../common/tenant-scoped";
import type { UpdateScorecardSettingsDto } from "./dto/scorecard-settings.dto";

export const EDIT_SCORECARD_PERMISSION = "partners.approve";
const FIELDS = ["onTimeGood", "onTimeWarn", "inFullGood", "inFullWarn", "otifGood", "otifWarn", "earlyDays", "lateDays"] as const;

export const DEFAULT_SETTINGS = {
  onTimeGood: D.onTime.good, onTimeWarn: D.onTime.warn, inFullGood: D.inFull.good, inFullWarn: D.inFull.warn,
  otifGood: D.otif.good, otifWarn: D.otif.warn, earlyDays: D.window.earlyBusinessDays, lateDays: D.window.lateBusinessDays,
};

/** Reads the settings in force inside an existing tenant transaction (defaults when the organisation has none). */
export async function loadSettings(tx: Prisma.TransactionClient, organizationId: string) {
  const row = await tx.qualityScorecardSettings.findUnique({ where: { organizationId } });
  return { ...DEFAULT_SETTINGS, ...(row ? Object.fromEntries(FIELDS.map((f) => [f, row[f]])) : {}) } as typeof DEFAULT_SETTINGS;
}

@Injectable()
export class ScorecardSettingsService {
  async get(user: RequestUser): Promise<ScorecardSettings> {
    return withTenantContext(user.organizationId, async (tx) => {
      const row = await tx.qualityScorecardSettings.findUnique({ where: { organizationId: user.organizationId } });
      return this.shape(user, await loadSettings(tx, user.organizationId), row?.updatedAt ?? null, !!row);
    });
  }

  async update(user: RequestUser, dto: UpdateScorecardSettingsDto): Promise<ScorecardSettings> {
    assertHasPermission(user, EDIT_SCORECARD_PERMISSION);
    return withTenantContext(user.organizationId, async (tx) => {
      const before = await loadSettings(tx, user.organizationId);
      const next = { ...before, ...Object.fromEntries(FIELDS.filter((f) => dto[f] !== undefined).map((f) => [f, dto[f]])) } as typeof before;
      for (const [g, w, label] of [["onTimeGood", "onTimeWarn", "On-time"], ["inFullGood", "inFullWarn", "In-full"], ["otifGood", "otifWarn", "OTIF"]] as const) {
        if (next[w] >= next[g]) throw new BadRequestException(`${label}: the warning level must be lower than the good level.`);
      }
      const existing = await tx.qualityScorecardSettings.findUnique({ where: { organizationId: user.organizationId } });
      const row = existing
        ? await tx.qualityScorecardSettings.update({ where: { organizationId: user.organizationId }, data: { ...next, updatedById: user.id } })
        : await tx.qualityScorecardSettings.create({ data: { organizationId: user.organizationId, ...next, updatedById: user.id } });
      await recordFieldChanges(tx, {
        organizationId: user.organizationId, tableName: "quality_scorecard_settings", recordId: row.id, changedById: user.id,
        changes: diffForAudit(before, next, FIELDS), reason: dto.reason ?? null,
      });
      return this.shape(user, next, row.updatedAt, true);
    });
  }

  /** Puts the organisation back on the platform defaults (the row is kept; its values are reset and the reset is audited). */
  async reset(user: RequestUser): Promise<ScorecardSettings> {
    return this.update(user, { ...DEFAULT_SETTINGS, reason: "Reset to platform defaults" });
  }

  private shape(user: RequestUser, s: typeof DEFAULT_SETTINGS, updatedAt: Date | null, isCustom: boolean): ScorecardSettings {
    return { ...s, isCustom, canEdit: user.platformStaffRole !== "NONE" || user.permissions.includes(EDIT_SCORECARD_PERMISSION), updatedAt: updatedAt ? updatedAt.toISOString() : null };
  }
}
