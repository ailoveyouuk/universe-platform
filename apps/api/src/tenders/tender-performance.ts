import { withPlatformStaffContext } from "@universe/db";
import type { ScorecardMetric } from "@universe/types";
import { linearScore, pctStatus, summarise } from "../quality/scorecard-scoring";

/** Pure rules for the step 6 performance record and the anonymised aggregates (2026-10-21). */

export const MIN_AGGREGATE_CONTRACTS = 3;
export const MIN_AGGREGATE_OWNERS = 2;
export const REPLY_WINDOW_DAYS = 14;
export const HISTORY_YEARS = 5;

export const FEEDBACK_KEYS = ["quality", "communication", "documentation", "flexibility", "wouldUseAgain"] as const;
export type FeedbackKey = (typeof FEEDBACK_KEYS)[number];
export const FEEDBACK_LABEL: Record<FeedbackKey, string> = { quality: "Quality of goods", communication: "Communication", documentation: "Documentation", flexibility: "Flexibility", wouldUseAgain: "Would use again" };

export type SupplierBand = "STRONG" | "GOOD" | "WATCH" | "INSUFFICIENT_HISTORY";
export const BAND_RANK: Record<SupplierBand, number> = { INSUFFICIENT_HISTORY: -1, WATCH: 0, GOOD: 1, STRONG: 2 };

/** Aggregate band from an average overall score (the same 85 / 70 cut-offs as the partner scorecard's Strong / Satisfactory). */
export function bandFromScore(avg: number): Exclude<SupplierBand, "INSUFFICIENT_HISTORY"> { return avg >= 85 ? "STRONG" : avg >= 70 ? "GOOD" : "WATCH"; }

/** Rule value is a minimum band, optionally with ":STRICT" to also exclude suppliers with insufficient history (default allows them). */
export function parseRatingRule(value: string): { min: "GOOD" | "STRONG"; allowInsufficient: boolean } {
  const [band, flag] = value.trim().toUpperCase().split(":");
  return { min: band === "STRONG" ? "STRONG" : "GOOD", allowInsufficient: flag !== "STRICT" };
}

export interface FeedbackInput { quality: number; communication: number; documentation: number; flexibility: number; wouldUseAgain: number; reasons?: Record<string, string>; comment?: string }

/** Returns an error message when a rating of 1 or 2 has no one-line reason. */
export function feedbackProblem(f: FeedbackInput): string | null {
  for (const k of FEEDBACK_KEYS) if (f[k] <= 2 && !(f.reasons?.[k] ?? "").trim()) return `Please give a short reason for the low rating on "${FEEDBACK_LABEL[k]}".`;
  return null;
}
export const feedbackAverage = (f: FeedbackInput) => Math.round((FEEDBACK_KEYS.reduce((a, k) => a + f[k], 0) / FEEDBACK_KEYS.length) * 100) / 100;

export interface DeliveryFacts { onTimeYes: number; onTimeFlags: number; inFullYes: number; inFullFlags: number; otifYes: number; otifN: number }
export interface MilestoneFacts { total: number; pending?: number; done: number; onTime: number; late: number; missed: number }
/** Facts from the owner's linked complaints and temperature logs. Counts only: nothing here identifies a complaint. */
export interface QualityFacts { checked: boolean; complaints: number; concluded: number; upheldEq: number; seriousUpheld: number; open: number; logs: number; excursions: number }
export interface ScoringConfig { onTimeGood: number; onTimeWarn: number; inFullGood: number; inFullWarn: number; otifGood: number; otifWarn: number }

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

/** Builds the record's measures with the owner's own thresholds and the partner scorecard's weighted mean. No data means "not measured", never zero. */
export function buildMeasures(delivery: DeliveryFacts | null, ms: MilestoneFacts, feedback: FeedbackInput | null, cfg: ScoringConfig, q: QualityFacts | null = null) {
  const m: ScorecardMetric[] = [];
  const add = (x: Omit<ScorecardMetric, "group" | "benchmark" | "href">) => m.push({ ...x, group: "DELIVERY", benchmark: null, href: null });
  const ot = delivery ? pct(delivery.onTimeYes, delivery.onTimeFlags) : null;
  add({ key: "on_time", label: "On-time delivery", weight: 20, display: ot === null ? "Not measured" : `${ot}%`, score: ot, status: ot === null ? "neutral" : pctStatus(ot, cfg.onTimeGood, cfg.onTimeWarn),
    detail: ot === null ? "The supplier's delivery project had no deliveries marked on time or late." : `${delivery!.onTimeYes} of ${delivery!.onTimeFlags} deliveries on time.` });
  const inf = delivery ? pct(delivery.inFullYes, delivery.inFullFlags) : null;
  add({ key: "in_full", label: "In-full delivery", weight: 15, display: inf === null ? "Not measured" : `${inf}%`, score: inf, status: inf === null ? "neutral" : pctStatus(inf, cfg.inFullGood, cfg.inFullWarn),
    detail: inf === null ? "No deliveries marked in full or short." : `${delivery!.inFullYes} of ${delivery!.inFullFlags} deliveries in full.` });
  const ot2 = delivery ? pct(delivery.otifYes, delivery.otifN) : null;
  add({ key: "otif", label: "On-time in-full (OTIF)", weight: 10, display: ot2 === null ? "Not measured" : `${ot2}%`, score: ot2, status: ot2 === null ? "neutral" : pctStatus(ot2, cfg.otifGood, cfg.otifWarn),
    detail: ot2 === null ? "Needs deliveries with both on-time and in-full recorded." : `${delivery!.otifYes} of ${delivery!.otifN} deliveries both on time and in full.` });
  const mp = pct(ms.onTime, ms.total);
  add({ key: "milestones", label: "Contract milestones met", weight: 20, display: mp === null ? "Not measured" : `${mp}%`, score: mp, status: mp === null ? "neutral" : pctStatus(mp, 90, 75),
    detail: ms.total === 0 ? `No milestone was recorded as done or missed${ms.pending ? ` (${ms.pending} left pending at close, not counted)` : ""}.` : `${ms.onTime} of ${ms.total} milestones done on or before the due date (${ms.late} late, ${ms.missed} missed${ms.pending ? `; ${ms.pending} left pending at close, not counted` : ""}).` });
  const fa = feedback ? feedbackAverage(feedback) : null;
  const fs = fa === null ? null : Math.round(((fa - 1) / 4) * 100);
  add({ key: "owner_feedback", label: "Tender owner's feedback", weight: 20, display: fa === null ? "Not given" : `${fa.toFixed(1)} of 5`, score: fs, status: fs === null ? "neutral" : pctStatus(fs, 75, 50),
    detail: fa === null ? "The tender owner did not give feedback." : "Average of five ratings given by the tender owner at close." });
  const qMeasured = !!q && (q.complaints > 0 || q.checked);
  const qScore = qMeasured ? Math.max(0, Math.round(100 - 30 * q!.upheldEq - 20 * q!.seriousUpheld)) : null;
  m.push({ key: "quality", group: "QUALITY", label: "Quality complaints", weight: 15, benchmark: null, href: null,
    display: !qMeasured ? "Not measured" : q!.complaints === 0 ? "No complaints" : `${q!.upheldEq} upheld of ${q!.complaints}`, score: qScore, status: qScore === null ? "neutral" : pctStatus(qScore, 85, 60),
    detail: !qMeasured ? "The tender owner did not link complaints or confirm that there were none." : q!.complaints === 0 ? "The tender owner confirmed there were no quality complaints on this contract." : `${q!.complaints} complaint${q!.complaints === 1 ? "" : "s"} linked: ${q!.concluded} concluded, ${q!.upheldEq} upheld${q!.seriousUpheld ? ` (${q!.seriousUpheld} serious)` : ""}${q!.open ? `; ${q!.open} still open and not counted` : ""}.` });
  const cMeasured = !!q && q.logs > 0;
  const cRate = cMeasured ? (q!.excursions / q!.logs) * 100 : null;
  m.push({ key: "cold_chain", group: "QUALITY", label: "Cold chain", weight: 10, benchmark: null, href: null,
    display: !cMeasured ? "Not measured" : `${q!.excursions} of ${q!.logs} logs`, score: cRate === null ? null : linearScore(cRate, 0, 20), status: cRate === null ? "neutral" : q!.excursions === 0 ? "good" : cRate <= 5 ? "warning" : "critical",
    detail: !cMeasured ? "No temperature logs were linked to this contract." : `${q!.excursions} temperature excursion${q!.excursions === 1 ? "" : "s"} across ${q!.logs} linked log${q!.logs === 1 ? "" : "s"}.` });
  return { measures: m, ...summarise(m) };
}

export interface SupplierAggregate {
  sufficient: boolean; band: SupplierBand;
  /** Only present when sufficient (so a thin record never leaks through an average). */
  contracts: number | null; owners: number | null; milestonesMetPercent: number | null; onTimePercent: number | null; inFullPercent: number | null; averageScore: number | null;
}

export interface AggRow { organizationId: string; overallScore: number | null; milestonesTotal: number; milestonesOnTime: number; onTimePercent: number | null; inFullPercent: number | null }
const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };

export function aggregateRecords(rows: AggRow[]): SupplierAggregate {
  const owners = new Set(rows.map((r) => r.organizationId)).size;
  const sufficient = rows.length >= MIN_AGGREGATE_CONTRACTS && owners >= MIN_AGGREGATE_OWNERS;
  if (!sufficient) return { sufficient: false, band: "INSUFFICIENT_HISTORY", contracts: null, owners: null, milestonesMetPercent: null, onTimePercent: null, inFullPercent: null, averageScore: null };
  const mt = rows.reduce((a, r) => a + r.milestonesTotal, 0), mo = rows.reduce((a, r) => a + r.milestonesOnTime, 0);
  const score = avg(rows.map((r) => r.overallScore));
  return { sufficient: true, band: score === null ? "INSUFFICIENT_HISTORY" : bandFromScore(score), contracts: rows.length, owners, milestonesMetPercent: pct(mo, mt), onTimePercent: avg(rows.map((r) => r.onTimePercent)), inFullPercent: avg(rows.map((r) => r.inFullPercent)), averageScore: score };
}

/** Does a supplier's aggregate satisfy a MIN_SUPPLIER_RATING rule value? */
export function ratingRuleMet(value: string, agg: SupplierAggregate): { met: boolean; reason: string } {
  const r = parseRatingRule(value);
  if (agg.band === "INSUFFICIENT_HISTORY") return r.allowInsufficient ? { met: true, reason: "no history yet, which this tender allows" } : { met: false, reason: "not enough history on the platform yet" };
  return BAND_RANK[agg.band] >= BAND_RANK[r.min] ? { met: true, reason: `rated ${agg.band.toLowerCase()}` } : { met: false, reason: `rated ${agg.band.toLowerCase()}` };
}

/** Anonymised supplier aggregate across every owner (platform-staff read; the result carries no owner identity or feedback text). */
export async function supplierAggregate(supplierOrgId: string): Promise<SupplierAggregate> {
  const since = new Date(); since.setFullYear(since.getFullYear() - HISTORY_YEARS);
  const rows = await withPlatformStaffContext((tx) => tx.tenderPerformanceRecord.findMany({
    where: { awardedOrganizationId: supplierOrgId, withdrawnAt: null, closedAt: { gte: since } },
    select: { organizationId: true, overallScore: true, milestonesTotal: true, milestonesOnTime: true, onTimePercent: true, inFullPercent: true },
  }));
  return aggregateRecords(rows);
}

export interface PaymentPractice { sufficient: boolean; payments: number | null; paidOnTimePercent: number | null; averageDaysLate: number | null }

/** Payment practice of an owner across all its suppliers: share of logged, paid invoices settled by the due date. Needs 3 paid entries from 2 suppliers. */
export function paymentPractice(rows: { awardedOrganizationId: string; dueDate: Date; paidDate: Date | null }[]): PaymentPractice {
  const paid = rows.filter((r) => r.paidDate);
  const suppliers = new Set(paid.map((r) => r.awardedOrganizationId)).size;
  if (paid.length < MIN_AGGREGATE_CONTRACTS || suppliers < MIN_AGGREGATE_OWNERS) return { sufficient: false, payments: null, paidOnTimePercent: null, averageDaysLate: null };
  const day = 86_400_000;
  const late = paid.map((r) => Math.max(0, Math.round((r.paidDate!.getTime() - r.dueDate.getTime()) / day)));
  return { sufficient: true, payments: paid.length, paidOnTimePercent: pct(late.filter((d) => d === 0).length, paid.length), averageDaysLate: Math.round(late.reduce((a, b) => a + b, 0) / paid.length) };
}
export async function ownerPaymentPractice(ownerOrgId: string): Promise<PaymentPractice> {
  const rows = await withPlatformStaffContext((tx) => tx.tenderContractPayment.findMany({ where: { organizationId: ownerOrgId }, select: { awardedOrganizationId: true, dueDate: true, paidDate: true } }));
  return paymentPractice(rows);
}

/** Score for the optional "past performance" criterion. No sufficient history scores the Good line (70), so newcomers are neither rewarded nor penalised. */
export const NEUTRAL_PAST_PERFORMANCE = 70;
export function pastPerformanceScore(agg: SupplierAggregate): number { return agg.sufficient && agg.averageScore !== null ? agg.averageScore : NEUTRAL_PAST_PERFORMANCE; }
