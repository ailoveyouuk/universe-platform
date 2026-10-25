import type { InsightsPriceMovement } from "@universe/types";

export interface GroupMove { category: string; currency: string; months: number; last: number; momPct: number | null; sincePct: number; volatility: number | null; organisations: number; points: { month: string; index: number; sources: number }[] }

/**
 * Per product group: month-on-month change (latest month against the one before), change since the first month shown, and volatility (how much
 * the month-to-month changes swing: the standard deviation of the monthly changes, in percentage points). Works from the like-for-like cost index,
 * so a change in what was bought never looks like a price change. Volatility needs at least four months.
 */
export function groupMoves(series: InsightsPriceMovement[], currency: string): GroupMove[] {
  const out: GroupMove[] = [];
  for (const s of series) {
    if (s.segmentBy !== null || s.currency !== currency || s.points.length < 2) continue;
    const pts = [...s.points].sort((a, b) => a.month.localeCompare(b.month));
    const last = pts[pts.length - 1]!, prev = pts[pts.length - 2]!;
    const changes = pts.slice(1).map((p, i) => (p.index / pts[i]!.index - 1) * 100);
    const mean = changes.reduce((a, c) => a + c, 0) / changes.length;
    const vol = changes.length >= 3 ? Math.sqrt(changes.reduce((a, c) => a + (c - mean) ** 2, 0) / (changes.length - 1)) : null;
    out.push({ category: s.category, currency: s.currency, months: pts.length, last: last.index, momPct: prev.index ? (last.index / prev.index - 1) * 100 : null, sincePct: last.index - 100, volatility: vol, organisations: last.sourceCount, points: pts.map((p) => ({ month: p.month, index: p.index, sources: p.sourceCount })) });
  }
  return out.sort((a, b) => a.category.localeCompare(b.category));
}
