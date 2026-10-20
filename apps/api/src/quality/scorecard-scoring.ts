import type { PartnerScorecard, ScorecardMetric, ScorecardStatus } from "@universe/types";

/** Higher-is-better percentage → status by thresholds (good at/above `good`, warning at/above `warn`). */
export function pctStatus(pct: number, good: number, warn: number): ScorecardStatus {
  return pct >= good ? "good" : pct >= warn ? "warning" : "critical";
}

/** Linear score: `best` maps to 100 and `worst` to 0 (works for either direction). */
export function linearScore(value: number, best: number, worst: number): number {
  const s = ((value - worst) / (best - worst)) * 100;
  return Math.max(0, Math.min(100, Math.round(s)));
}

const STATUS_RANK: Record<ScorecardStatus, number> = { critical: 0, warning: 1, good: 2, neutral: 3 };

/** The four measures that matter most now: those needing attention first, then the heaviest. Measures without data never headline. */
export function pickHeadline(metrics: ScorecardMetric[]): ScorecardMetric[] {
  return metrics
    .filter((m) => m.score !== null || m.status === "critical" || m.status === "warning")
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.weight - a.weight)
    .slice(0, 4);
}

export function summarise(metrics: ScorecardMetric[]): Pick<PartnerScorecard, "overallScore" | "band" | "coverage" | "bandNote" | "headline"> {
  const weighted = metrics.filter((m) => m.weight > 0);
  const totalWeight = weighted.reduce((a, m) => a + m.weight, 0);
  const scored = weighted.filter((m) => m.score !== null);
  const scoredWeight = scored.reduce((a, m) => a + m.weight, 0);
  const coverage = totalWeight ? Math.round((scoredWeight / totalWeight) * 100) : 0;
  const headline = pickHeadline(metrics);
  if (!scored.length) return { overallScore: null, band: "NOT_ENOUGH_DATA", coverage, bandNote: null, headline };
  const overall = Math.round(scored.reduce((a, m) => a + (m.score as number) * m.weight, 0) / scoredWeight);
  let band: PartnerScorecard["band"] = overall >= 85 ? "STRONG" : overall >= 70 ? "SATISFACTORY" : overall >= 50 ? "WATCH" : "AT_RISK";
  let bandNote: string | null = null;
  const critical = metrics.filter((m) => m.status === "critical");
  if (critical.length && (band === "STRONG" || band === "SATISFACTORY")) {
    band = "WATCH";
    bandNote = `Held at Watch because of: ${critical.map((m) => m.label.toLowerCase()).join(", ")}.`;
  }
  return { overallScore: overall, band, coverage, bandNote, headline };
}
