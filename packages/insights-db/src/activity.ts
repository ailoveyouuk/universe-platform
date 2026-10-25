import { INSIGHTS_ACTIVITY_METRICS, type InsightsActivity, type InsightsActivityMetric } from "@universe/types";

export interface ActivityRow { day: string; metric: string; events: number; organisations: number }

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Turns published daily rows (already past the five-organisation floor) into the top metrics. Each metric uses its latest day with activity;
 * metrics are ranked by that day's count, then limited. A day missing from the rows means no published activity and counts as 0.
 */
export function rankActivity(rows: ActivityRow[], limit = 4): InsightsActivity {
  const metrics: InsightsActivityMetric[] = [];
  for (const def of INSIGHTS_ACTIVITY_METRICS) {
    const mine = rows.filter((r) => r.metric === def.id);
    if (mine.length === 0) continue;
    const byDay = new Map(mine.map((r) => [r.day, r]));
    const day = [...byDay.keys()].sort().at(-1)!;
    const latest = byDay.get(day)!;
    const prev: number[] = [];
    for (let i = 1; i <= 7; i++) prev.push(byDay.get(addDays(day, -i))?.events ?? 0);
    const avgPrevious7 = Math.round((prev.reduce((a, b) => a + b, 0) / 7) * 10) / 10;
    const series = Array.from({ length: 14 }, (_, i) => { const d = addDays(day, i - 13); return { day: d, count: byDay.get(d)?.events ?? 0 }; });
    metrics.push({
      id: def.id, label: def.label, unit: def.unit, day, count: latest.events, avgPrevious7,
      changePct: avgPrevious7 > 0 ? Math.round(((latest.events - avgPrevious7) / avgPrevious7) * 100) : null,
      organisations: latest.organisations, series,
    });
  }
  metrics.sort((a, b) => (b.day.localeCompare(a.day)) || b.count - a.count);
  const top = metrics.slice(0, limit);
  return { day: top[0]?.day ?? null, metrics: top };
}
