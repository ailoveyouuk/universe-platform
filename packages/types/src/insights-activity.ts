/**
 * Daily activity across Universe (2026-10-25): the counts behind the Insights landing page. Each metric is a plain count of something organisations did
 * that day (never what, never who). A figure is only ever published when at least five organisations contributed to it.
 */
export const INSIGHTS_ACTIVITY_METRICS = [
  { id: "LINES_ADDED", label: "Project lines added", unit: "lines added" },
  { id: "SUPPLIER_ENQUIRIES", label: "Supplier quote requests sent", unit: "quote requests" },
  { id: "BATCHES_RECORDED", label: "Product batches recorded", unit: "batches recorded" },
  { id: "PROJECTS_STARTED", label: "Projects started", unit: "projects started" },
  { id: "BIDS_SUBMITTED", label: "Tender bids submitted", unit: "bids submitted" },
  { id: "TENDERS_PUBLISHED", label: "Tenders published", unit: "tenders published" },
] as const;
export type InsightsActivityMetricId = (typeof INSIGHTS_ACTIVITY_METRICS)[number]["id"];
export const INSIGHTS_ACTIVITY_METRIC_IDS: string[] = INSIGHTS_ACTIVITY_METRICS.map((m) => m.id);

export interface InsightsActivityDay { day: string; count: number }
export interface InsightsActivityMetric {
  id: string;
  label: string;
  unit: string;
  /** The latest day with activity (YYYY-MM-DD). */
  day: string;
  count: number;
  /** Average per day over the seven days before `day`. */
  avgPrevious7: number;
  /** Change from that average, as a percentage; null when there is no earlier average. */
  changePct: number | null;
  /** Organisations that contributed on `day` (always at least five). */
  organisations: number;
  /** The last 14 days up to and including `day`, oldest first; a day with no published activity is 0. */
  series: InsightsActivityDay[];
}
export interface InsightsActivity { day: string | null; metrics: InsightsActivityMetric[] }

/** Daily exchange rate history for one pair (2026-10-25): units of `to` per 1 unit of `from`, one point per published day, oldest first. */
export interface InsightsFxPoint { date: string; rate: number }
export interface InsightsFxSeries { from: string; to: string; start: string; end: string; points: InsightsFxPoint[]; source: string; available: boolean }
