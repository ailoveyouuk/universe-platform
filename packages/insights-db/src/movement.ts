// ---------------------------------------------------------------------------
// Cost-price movement (2026-10-25). A "like-for-like" index of what products in a group cost at source, so the movement is not distorted by
// which products happened to be bought in a month. An "item" is a product group + its structured specification + where it was made + where it was
// delivered. For each pair of consecutive months we take the items bought in both, compare their average cost price, and combine those changes
// with a geometric mean; the index chains these (starts at 100). A month is shown only when at least five different organisations are behind it
// AND at least three items match, so no single organisation's price can be read off. The index is a ratio: it never returns a price.
// Cost prices only (supplierUnitPrice); see aggregate-etl.ts.
// ---------------------------------------------------------------------------
export interface PricingMovementPoint { effectiveMonth: Date; index: number; sourceCount: number; matchedItems: number }
export interface PricingMovementSeries { category: string; segmentBy: "manufactureRegion" | "destinationRegion" | null; segment: string | null; currency: string; points: PricingMovementPoint[] }
export interface MovementInputRow { category: string; attributes: string | null; manufactureRegion: string | null; destinationRegion: string | null; currency: string; effectiveMonth: Date; sourceHash: string; priceSum: number; priceCount: number }

/** Pure calculation, separate from the database read so it can be tested. */
export function computePricingMovement(rows: MovementInputRow[], minCohort = 5, minItems = 3): PricingMovementSeries[] {
  type Node = { category: string; segmentBy: "manufactureRegion" | "destinationRegion" | null; segment: string | null; currency: string; months: Map<number, { hashes: Set<string>; items: Map<string, { sum: number; count: number }> }> };
  const nodes = new Map<string, Node>();
  const add = (category: string, segmentBy: Node["segmentBy"], segment: string | null, r: MovementInputRow) => {
    const key = `${category}|${segmentBy ?? ""}|${segment ?? ""}|${r.currency}`;
    let n = nodes.get(key);
    if (!n) { n = { category, segmentBy, segment, currency: r.currency, months: new Map() }; nodes.set(key, n); }
    const t = new Date(r.effectiveMonth).getTime();
    let m = n.months.get(t);
    if (!m) { m = { hashes: new Set(), items: new Map() }; n.months.set(t, m); }
    m.hashes.add(r.sourceHash);
    const item = `${r.attributes ?? ""}|${r.manufactureRegion ?? ""}|${r.destinationRegion ?? ""}`;
    const it = m.items.get(item) ?? { sum: 0, count: 0 };
    it.sum += r.priceSum; it.count += r.priceCount; m.items.set(item, it);
  };
  for (const r of rows) {
    add(r.category, null, null, r);
    if (r.manufactureRegion) add(r.category, "manufactureRegion", r.manufactureRegion, r);
    if (r.destinationRegion) add(r.category, "destinationRegion", r.destinationRegion, r);
  }
  const out: PricingMovementSeries[] = [];
  for (const n of nodes.values()) {
    const months = [...n.months.keys()].filter((t) => n.months.get(t)!.hashes.size >= minCohort).sort((a, b) => a - b);
    if (months.length < 2) continue;
    const points: PricingMovementPoint[] = [{ effectiveMonth: new Date(months[0]), index: 100, sourceCount: n.months.get(months[0])!.hashes.size, matchedItems: 0 }];
    let index = 100;
    for (let i = 1; i < months.length; i++) {
      const prev = n.months.get(months[i - 1])!, cur = n.months.get(months[i])!;
      const logs: number[] = [];
      for (const [k, c] of cur.items) { const p = prev.items.get(k); if (p && p.count && c.count && p.sum > 0 && c.sum > 0) logs.push(Math.log((c.sum / c.count) / (p.sum / p.count))); }
      if (logs.length < minItems) continue; // not enough like-for-like items: this month is left out
      index *= Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length);
      points.push({ effectiveMonth: new Date(months[i]), index: Math.round(index * 10) / 10, sourceCount: cur.hashes.size, matchedItems: logs.length });
    }
    if (points.length >= 2) out.push({ category: n.category, segmentBy: n.segmentBy, segment: n.segment, currency: n.currency, points });
  }
  return out.sort((a, b) => a.category.localeCompare(b.category));
}
