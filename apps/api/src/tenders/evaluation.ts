/** Pure scoring and award arithmetic for tender evaluation (step 4, 2026-10-20). */

export interface CalcBid { bidId: string; totalTenderCurrency: number | null; avgLeadDays: number | null }
export interface CalcScores { price: number | null; leadTime: number | null }

/** Price and lead time are calculated, not judged: the best (lowest) bid scores 100 and the others in proportion. Only the bids passed in are compared. */
export function calculatedScores(bids: CalcBid[]): Map<string, CalcScores> {
  const prices = bids.map((b) => b.totalTenderCurrency).filter((x): x is number => x !== null && x > 0);
  const leads = bids.map((b) => b.avgLeadDays).filter((x): x is number => x !== null && x >= 0);
  const bestPrice = prices.length ? Math.min(...prices) : null;
  const bestLead = leads.length ? Math.min(...leads) : null;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return new Map(bids.map((b) => [b.bidId, {
    price: bestPrice !== null && b.totalTenderCurrency && b.totalTenderCurrency > 0 ? r2((100 * bestPrice) / b.totalTenderCurrency) : null,
    leadTime: bestLead !== null && b.avgLeadDays !== null ? (b.avgLeadDays <= bestLead ? 100 : r2((100 * bestLead) / b.avgLeadDays)) : null,
  }]));
}

export interface WeightedCriterion { id: string; weight: number }
/** Weighted total out of 100, or null while any weighted criterion has no score. */
export function weightedTotal(criteria: WeightedCriterion[], scores: Record<string, number | undefined>): number | null {
  let total = 0;
  for (const c of criteria) { const s = scores[c.id]; if (s === undefined || s === null) return null; total += (c.weight / 100) * s; }
  return Math.round(total * 100) / 100;
}

export const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
export const spread = (xs: number[]) => (xs.length < 2 ? 0 : Math.max(...xs) - Math.min(...xs));
/** Evaluators who differ by more than this many points on a criterion need a written moderation reason. */
export const MODERATION_SPREAD = 25;

/** Highest total first; a tie goes to the lower price. Bids without a total are not ranked. */
export function rankBids<T extends { total: number | null; price: number | null }>(rows: T[]): (T & { rank: number | null })[] {
  const ranked = rows.filter((r) => r.total !== null).sort((a, b) => (b.total! - a.total!) || ((a.price ?? Infinity) - (b.price ?? Infinity)));
  const pos = new Map(ranked.map((r, i) => [r, i + 1]));
  return rows.map((r) => ({ ...r, rank: pos.get(r) ?? null }));
}

/** Rescales weights to total exactly 100 (one decimal place), keeping their proportions. All-zero weights share equally. */
export function normaliseWeights(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = sum > 0 ? weights.map((w) => (w / sum) * 100) : weights.map(() => 100 / weights.length);
  const out = raw.map((w) => Math.floor(w * 10) / 10);
  let rem = Math.round((100 - out.reduce((a, b) => a + b, 0)) * 10);
  const order = raw.map((w, i) => ({ i, frac: w * 10 - Math.floor(w * 10) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; rem > 0; k = (k + 1) % order.length, rem--) out[order[k]!.i] = Math.round((out[order[k]!.i]! + 0.1) * 10) / 10;
  return out;
}

/** Adds working days (Monday to Friday; public holidays are not modelled) to a date. */
export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6) left--; }
  return d;
}

/** Line shares across awards must not exceed 100 per line. Returns the offending line ids. */
export function overAllocatedLines(allocations: { tenderLineId: string; sharePercent: number }[]): string[] {
  const totals = new Map<string, number>();
  for (const a of allocations) totals.set(a.tenderLineId, (totals.get(a.tenderLineId) ?? 0) + a.sharePercent);
  return [...totals].filter(([, v]) => v > 100.001).map(([k]) => k);
}
