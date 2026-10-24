import { crossRate } from "./bid-completeness";
/**
 * Pure rules for framework agreements and call-offs (step 7 part 2, 2026-10-22). No database, so they can be tested directly.
 *
 * Approval limits: there is no single published standard for call-off approval limits. The shape used here is the common delegated-authority
 * pattern (one authoriser up to a limit, a second and different authoriser above it, recent orders to the same supplier counted together so a large
 * order cannot be split to stay under the limit). The limit itself is set by each organisation; the default is a starting point only.
 */
export const DEFAULT_INDIVIDUAL_LIMIT = 25000;
export const DEFAULT_SPLIT_WINDOW_DAYS = 30;

/** A call-off needs a second authoriser when its value, together with recent open orders to the same supplier, is above the limit. */
export function requiresSecondApproval(callOffValue: number, recentSameSupplier: number, limit: number): { tested: number; second: boolean } {
  const tested = Math.round((callOffValue + recentSameSupplier) * 100) / 100;
  return { tested, second: tested > limit };
}

/** A second authoriser must be a different person from the one raising (who gave the first authorisation) and from the first authoriser. */
export function canGiveSecondApproval(userId: string, raisedById: string, firstApprovedById: string | null): boolean {
  return userId !== raisedById && userId !== firstApprovedById;
}

/**
 * A person's own authority (2026-10-24): the highest limit among the roles they hold that have one, otherwise the organisation's default.
 * Role limits and the default are written in the same currency.
 */
export function effectiveLimit(defaultLimit: number, heldRoleLimits: number[]): number {
  return heldRoleLimits.length ? Math.max(...heldRoleLimits) : defaultLimit;
}

/** Converts an amount using the USD-based daily table. Null when either currency is not in the table. */
export function convertAmount(amount: number, from: string, to: string, rates: Record<string, number> | null): number | null {
  if (from === to) return amount;
  const r = rates ? crossRate(rates, from, to) : null;
  return r === null ? null : Math.round(amount * r * 100) / 100;
}

export interface SupplierCandidate { contractId: string; organizationId: string; rank: number | null; callOffs: number }
/** DIRECT: the best-ranked supplier. ROTATION: the supplier with the fewest call-offs so far, the better rank breaking a tie. */
export function chooseSupplier(method: "DIRECT" | "ROTATION", candidates: SupplierCandidate[]): SupplierCandidate | null {
  const r = (c: SupplierCandidate) => c.rank ?? 999;
  const sorted = [...candidates].sort((a, b) => method === "ROTATION" ? (a.callOffs - b.callOffs) || (r(a) - r(b)) : (r(a) - r(b)) || (a.callOffs - b.callOffs));
  return sorted[0] ?? null;
}

/** The end of the price-hold period, counted from signature. Null when the contract is not yet executed. */
export function holdEndsAt(executedAt: Date | null, holdDays: number | null): Date | null {
  if (!executedAt) return null;
  return new Date(executedAt.getTime() + (holdDays ?? 0) * 86_400_000);
}
export const holdActive = (now: Date, executedAt: Date | null, holdDays: number | null) => { const e = holdEndsAt(executedAt, holdDays); return !e || now.getTime() < e.getTime(); };

/** The price in force for an item: the latest accepted review if there is one, otherwise the supplier's bid price. */
export function effectivePrice(bidPrice: number, reviews: { status: string; proposedPrice: number; respondedAt: Date | null }[]): number {
  const accepted = reviews.filter((r) => r.status === "ACCEPTED").sort((a, b) => (b.respondedAt?.getTime() ?? 0) - (a.respondedAt?.getTime() ?? 0));
  return accepted.length ? accepted[0].proposedPrice : bidPrice;
}

/** The ceiling is a guide: exceeding it warns but does not block. */
export function ceilingCheck(ceiling: number | null, committed: number, adding: number): { exceeded: boolean; remainingAfter: number | null } {
  if (ceiling === null) return { exceeded: false, remainingAfter: null };
  const after = ceiling - committed - adding;
  return { exceeded: after < 0, remainingAfter: Math.round(after * 100) / 100 };
}

export function addMonths(d: Date, months: number): Date { const x = new Date(d.getTime()); x.setUTCMonth(x.getUTCMonth() + months); return x; }

// ---------------------------------------------------------------- mini-competition (step 7 part 2b)

export const MIN_COMPETITORS = 2;

/** A competition accepts quotes until its closing time; after that the owner may read the quotes and award. */
export function competitionOpen(closesAt: Date, now: Date): boolean { return closesAt.getTime() > now.getTime(); }

/** Why a quote is not acceptable: every item must be priced, above zero, and no higher than the supplier's agreed framework price. */
export function quoteProblems(lines: { label: string; frameworkPrice: number; quotedPrice: number | null | undefined }[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if (l.quotedPrice == null || !Number.isFinite(l.quotedPrice) || l.quotedPrice <= 0) out.push(`Enter a price for ${l.label}.`);
    else if (l.quotedPrice > l.frameworkPrice + 1e-9) out.push(`${l.label}: your quote cannot be higher than your framework price of ${l.frameworkPrice}.`);
  }
  return out;
}
