/**
 * Win probability for an open opportunity (2026-10-27). Pure: no database. Starts from a prior for the stage, then moves it using the organisation's own
 * closed history (won and lost only; withdrawn says nothing about winning):
 *   1. how often opportunities that reached this stage were later won (from the stage events),
 *   2. how often this kind of work, in this commodity or service group, was won (kind first, then group inside the kind),
 *   3. how often this stakeholder's opportunities were won.
 * Every figure is pulled towards a wider one in proportion to how little evidence there is (shrinkage), so three past deals cannot swing a forecast.
 * The result carries its evidence so the screen can say why.
 */
export const OPEN_STAGES = ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"] as const;
export type OpenStage = (typeof OPEN_STAGES)[number];

/** Starting probabilities by stage, used when there is no history. */
export const STAGE_PRIOR: Record<OpenStage, number> = { IDENTIFIED: 0.1, QUALIFYING: 0.25, ENGAGED: 0.5, SUBMITTED: 0.7 };

const K_STAGE = 20, K_SEGMENT = 25, K_STAKEHOLDER = 12, K_OVERALL = 10;
const MIN_P = 0.02, MAX_P = 0.95, MIN_ADJ = 0.5, MAX_ADJ = 1.5;

export interface ClosedSample { outcome: "WON" | "LOST"; kind: string; commodityGroup: string | null; relationshipId: string; reached: string[] }
export interface OpenSample { stage: string; kind: string; commodityGroup: string | null; relationshipId: string }
export interface WinBasis {
  stagePrior: number;
  /** Closed opportunities that reached this stage, and how many of those were won. */
  stageHistory: { n: number; won: number };
  segmentHistory: { n: number; won: number; label: string };
  stakeholderHistory: { n: number; won: number };
  overallRate: number;
  adjustment: number;
}
export interface WinEstimate { probability: number; basis: WinBasis }

const shrink = (won: number, n: number, k: number, towards: number) => (won + k * towards) / (n + k);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Tally { n: number; won: number }
const bump = (m: Map<string, Tally>, key: string, won: boolean) => { const t = m.get(key) ?? { n: 0, won: 0 }; t.n++; if (won) t.won++; m.set(key, t); };
const get = (m: Map<string, Tally>, key: string): Tally => m.get(key) ?? { n: 0, won: 0 };

export class WinModel {
  private readonly overall: Tally = { n: 0, won: 0 };
  private readonly byStage = new Map<string, Tally>();
  private readonly byKind = new Map<string, Tally>();
  private readonly bySegment = new Map<string, Tally>();
  private readonly byStakeholder = new Map<string, Tally>();

  constructor(closed: ClosedSample[]) {
    for (const c of closed) {
      const won = c.outcome === "WON";
      this.overall.n++; if (won) this.overall.won++;
      for (const s of new Set(c.reached)) bump(this.byStage, s, won);
      bump(this.byKind, c.kind, won);
      if (c.commodityGroup) bump(this.bySegment, `${c.kind}|${c.commodityGroup}`, won);
      bump(this.byStakeholder, c.relationshipId, won);
    }
  }

  get closedCount() { return this.overall.n; }
  get overallRate() { return shrink(this.overall.won, this.overall.n, K_OVERALL, 0.5); }

  estimate(o: OpenSample): WinEstimate | null {
    const stage = o.stage as OpenStage;
    const prior = STAGE_PRIOR[stage]; if (prior === undefined) return null;
    const overall = this.overallRate;
    const st = get(this.byStage, stage);
    const base = shrink(st.won, st.n, K_STAGE, prior);
    const kt = get(this.byKind, o.kind);
    const kindRate = shrink(kt.won, kt.n, K_SEGMENT, overall);
    const seg = o.commodityGroup ? get(this.bySegment, `${o.kind}|${o.commodityGroup}`) : { n: 0, won: 0 };
    const segRate = o.commodityGroup ? shrink(seg.won, seg.n, K_SEGMENT, kindRate) : kindRate;
    const sh = get(this.byStakeholder, o.relationshipId);
    const stakeRate = shrink(sh.won, sh.n, K_STAKEHOLDER, overall);
    // Square roots so the two factors share the weight: one past deal is evidence for both the segment and the stakeholder, and must not count twice.
    const adjustment = clamp(Math.sqrt(segRate / overall) * Math.sqrt(stakeRate / overall), MIN_ADJ, MAX_ADJ);
    const probability = clamp(base * adjustment, MIN_P, MAX_P);
    return {
      probability: Math.round(probability * 1000) / 1000,
      basis: { stagePrior: prior, stageHistory: { n: st.n, won: st.won }, segmentHistory: o.commodityGroup ? { ...seg, label: `${o.kind} · ${o.commodityGroup}` } : { ...kt, label: o.kind }, stakeholderHistory: { n: sh.n, won: sh.won }, overallRate: Math.round(overall * 1000) / 1000, adjustment: Math.round(adjustment * 100) / 100 },
    };
  }
}

/** Which stages an opportunity is known to have passed through, from its stage events, plus the stage it ended on. Opportunities with no events count only their final stage. */
export function reachedStages(events: { toStage: string | null }[], finalStage: string): string[] {
  const set = new Set<string>();
  for (const e of events) if (e.toStage) set.add(e.toStage);
  set.add(finalStage);
  return [...set];
}
