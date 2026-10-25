import type { MovementLine } from "../components/MovementChart";
import type { TrendMetric } from "../components/SectionTrend";

/**
 * Turns cost-index lines into the two measures the shared trend panel offers: the index itself (100 = the first month shown) and how many
 * organisations are behind each month. Lines whose points carry no month are skipped.
 */
export function indexMetrics(lines: MovementLine[], what: string): TrendMetric[] {
  const mk = (id: string, label: string, unit: string, fmt: (v: number) => string, zero: boolean, blurb: string, val: (p: MovementLine["points"][number]) => number): TrendMetric => ({
    id, label, unit, fmt, zero, blurb,
    lines: lines.map((l) => ({ id: l.id, name: l.name, color: l.color, dash: l.dash, points: l.points.flatMap((p) => (p.month ? [{ month: p.month, value: val(p) }] : [])) })),
  });
  return [
    mk("index", "Cost index", "(100 = first month)", (v) => v.toFixed(1), false, `${what} Like-for-like cost, starting at 100 in the first month shown, so 110 means 10% dearer. It is a ratio, never a price.`, (p) => p.index),
    mk("orgs", "Organisations", "organisations", (v) => String(Math.round(v)), true, "How many organisations are behind each month's figure.", (p) => p.sources),
  ];
}
