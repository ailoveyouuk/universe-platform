import { Injectable, Optional } from "@nestjs/common";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { convertAmount, DEFAULT_INDIVIDUAL_LIMIT, effectiveLimit } from "./tender-framework";

type Tx = Parameters<Parameters<typeof import("@universe/db").withTenantContext>[1]>[0];

export interface Authority {
  /** The person's own limit, in the currency the organisation set limits in. */
  limit: number;
  limitCurrency: string | null;
  /** The same limit expressed in the currency of the thing being approved; null when no exchange rate is available. */
  inTenderCurrency: number | null;
  /** True when the organisation has set at least one role limit. */
  rolesConfigured: boolean;
  /** The organisation has deliberately confirmed its limits (they are no longer just the default). */
  confirmed: boolean;
  rateNote: string | null;
}

/**
 * Who may authorise how much (2026-10-24). One shared rule for call-offs, awards and contract creation: a person may authorise alone up to the highest
 * limit among the roles they hold (else the organisation default), limits can be written in one currency and are converted into the tender's currency
 * at the day's rate. No rate available means the limit cannot be read, which is treated as "not within limit" rather than guessed.
 */
@Injectable()
export class TenderApprovalAuthority {
  constructor(@Optional() private readonly fx?: ExchangeRatesService) {}

  async settings(tx: Tx, orgId: string) {
    const s = await tx.tenderApprovalSettings.findUnique({ where: { organizationId: orgId } });
    const roles = await tx.tenderApprovalRoleLimit.findMany({ where: { organizationId: orgId } });
    return {
      defaultLimit: s ? Number(s.individualLimit) : DEFAULT_INDIVIDUAL_LIMIT,
      limitCurrency: s?.limitCurrency?.trim() || null,
      splitWindowDays: s?.splitWindowDays ?? 30,
      confirmed: !!s?.confirmedAt,
      roleLimits: roles.map((r) => ({ roleId: r.roleId, limit: Number(r.limit) })),
    };
  }

  async authorityOf(tx: Tx, orgId: string, userId: string, targetCurrency: string | null): Promise<Authority> {
    const cfg = await this.settings(tx, orgId);
    const held = cfg.roleLimits.length
      ? (await tx.userRole.findMany({ where: { userId, roleId: { in: cfg.roleLimits.map((r) => r.roleId) } }, select: { roleId: true } })).map((r) => r.roleId)
      : [];
    const heldLimits = cfg.roleLimits.filter((r) => held.includes(r.roleId)).map((r) => r.limit);
    const limit = effectiveLimit(cfg.defaultLimit, heldLimits);
    let inTender: number | null = limit; let rateNote: string | null = null;
    if (cfg.limitCurrency && targetCurrency && cfg.limitCurrency !== targetCurrency) {
      const snap = this.fx ? await this.fx.getSnapshotForDate(new Date()) : null;
      inTender = convertAmount(limit, cfg.limitCurrency, targetCurrency, snap?.rates ?? null);
      rateNote = inTender === null ? `No exchange rate is available between ${cfg.limitCurrency} and ${targetCurrency} right now.` : `Limit of ${limit.toLocaleString()} ${cfg.limitCurrency} read as ${inTender.toLocaleString()} ${targetCurrency} at today's rate.`;
    }
    return { limit, limitCurrency: cfg.limitCurrency, inTenderCurrency: inTender, rolesConfigured: cfg.roleLimits.length > 0, confirmed: cfg.confirmed, rateNote };
  }

  /** True when `value` (in `currency`) is within the person's own authority. */
  within(a: Authority, value: number): boolean {
    return a.inTenderCurrency !== null && value <= a.inTenderCurrency;
  }

  /** The plain-English reason a value is outside the person's authority. */
  explain(a: Authority, value: number, currency: string | null, what: string): string {
    const lim = a.inTenderCurrency === null ? `${a.limit.toLocaleString()}${a.limitCurrency ? ` ${a.limitCurrency}` : ""}` : `${a.inTenderCurrency.toLocaleString()}${currency ? ` ${currency}` : ""}`;
    return `${what} is worth ${value.toLocaleString()}${currency ? ` ${currency}` : ""}, which is above your approval limit of ${lim}.${a.rateNote ? ` ${a.rateNote}` : ""} Ask someone with a higher limit to do this.`;
  }
}
