import type { LogisticsRouteSummary } from "@universe/types";

/** Weighted totals over anonymised route groups (each group already has at least five organisations behind it). */
export function totalsOf(rows: LogisticsRouteSummary[]) {
  let n = 0, dist = 0, co2 = 0, score = 0, days = 0, daysN = 0;
  for (const r of rows) {
    n += r.shipmentCount; dist += r.avgDistanceKm * r.shipmentCount; co2 += r.avgCo2TotalKg * r.shipmentCount; score += r.avgEfficiencyScore * r.shipmentCount;
    if (r.avgDurationDays !== null) { days += r.avgDurationDays * r.shipmentCount; daysN += r.shipmentCount; }
  }
  return { shipments: n, avgDistance: n ? dist / n : 0, avgCo2: n ? co2 / n : 0, avgScore: n ? score / n : 0, avgDays: daysN ? days / daysN : null };
}

/** Sums shipments by a key, largest first. */
export function groupShipments(rows: LogisticsRouteSummary[], key: (r: LogisticsRouteSummary) => string | null) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + r.shipmentCount); }
  return [...m.entries()].map(([code, shipments]) => ({ code, shipments })).sort((a, b) => b.shipments - a.shipments);
}
