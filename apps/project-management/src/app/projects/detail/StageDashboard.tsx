"use client";

import { scoreColor, scoreColor100, StatTile, StatTileGrid, BuildingIcon, CalendarIcon, ClockIcon, HourglassIcon, TrendingUpIcon, CheckCircleIcon, AlertIcon, GaugeIcon, ShieldIcon, ClipboardCheckIcon, BanIcon, CalendarXIcon } from "@universe/ui";
import type { StatTileTone } from "@universe/ui";
import type { ReactNode } from "react";
import type { ProductSafetyFlag, ProjectDetail, ProjectExportCheckItem, ProjectFinancialSummary } from "@universe/types";

const DAY = 86_400_000;
const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
/** Whole calendar days from today to a date (negative = in the past). */
export function daysFromToday(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((startOfDay(d) - startOfDay(now)) / DAY);
}
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const num = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Which project lines a stage tile stands for (platform standard: a tile filters the list it counts). */
export const TILE_LINE_FILTER: Record<string, { id: string; label: string }> = {
  priced: { id: "unpriced", label: "lines not yet priced" },
  delivered: { id: "delivered", label: "delivered lines" },
  next: { id: "undelivered", label: "lines still to deliver" },
  otif: { id: "otiffail", label: "lines that were late or short" },
  supplierpay: { id: "owing", label: "lines with a supplier balance owing" },
};
type L = ProjectDetail["lines"][number];
export const LINE_FILTER_TEST: Record<string, (l: L) => boolean> = {
  unpriced: (l) => num(l.supplierPaymentAmountTotal) === null,
  delivered: (l) => !!l.actualDeliveryDate || !!l.goodsDeliveredToClientDate,
  undelivered: (l) => !l.actualDeliveryDate && !l.goodsDeliveredToClientDate,
  otiffail: (l) => l.otif === false,
  owing: (l) => (num(l.supplierRemainingBalance) ?? 0) > 0.005,
};

export interface Tile { key: string; label: string; value: string | number; icon: ReactNode; tone?: StatTileTone; note?: string; indicator?: { color: string; label: string; fraction?: number } }

const GREEN = "var(--u-status-good)";
const AMBER = "var(--u-status-warning)";
const RED = "var(--u-status-critical)";

function money(v: number, ccy: string): string {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy, notation: "compact", maximumFractionDigits: 1 }).format(v); } catch { return `${ccy} ${Math.round(v).toLocaleString("en-GB")}`; }
}

/** Counts used by several stages. */
function lineFacts(p: ProjectDetail) {
  const lines = p.lines;
  const delivered = lines.filter((l) => !!l.actualDeliveryDate || !!l.goodsDeliveredToClientDate);
  const judged = lines.filter((l) => l.otif !== null);
  const otifOk = judged.filter((l) => l.otif === true).length;
  const paidBoth = lines.filter((l) => l.supplierPaymentStatus === "PAID" && !!l.clientPaymentDate).length;
  const supplierOwing = lines.filter((l) => (num(l.supplierRemainingBalance) ?? 0) > 0.005).length;
  const invoiced = lines.filter((l) => !!l.internalInvoiceNumber).length;
  const received = lines.filter((l) => !!l.clientPaymentDate).length;
  const upcoming = lines.filter((l) => !l.actualDeliveryDate && l.projectedDeliveryDate).map((l) => l.projectedDeliveryDate as string).sort()[0] ?? null;
  const co2 = lines.reduce((s, l) => s + (num(l.logisticsMetric?.co2TotalKg) ?? 0), 0);
  const co2Lines = lines.filter((l) => l.logisticsMetric).length;
  const suppliers = new Set(lines.map((l) => l.supplierId).filter(Boolean)).size;
  const enquiries = lines.flatMap((l) => l.enquiries ?? []);
  const waiting = enquiries.filter((e) => e.responseStatus === "WAITING").length;
  const quoted = enquiries.filter((e) => e.responseStatus === "QUOTED").length;
  const priced = lines.filter((l) => num(l.supplierPaymentAmountTotal) !== null).length;
  return { delivered, judged, otifOk, paidBoth, supplierOwing, invoiced, received, upcoming, co2, co2Lines, suppliers, enquiries, waiting, quoted, priced };
}

/**
 * The tiles for a stage (2026-10-19). Each stage foregrounds what someone running a procurement project needs at that point:
 * identification and in-progress are deadline- and readiness-led; submitted is about the wait and the value at stake; awarded is
 * delivery, supplier and payment execution; completed is outcome (margin, OTIF, settlement, cycle time). Money tiles are left
 * out when the viewer lacks financial permission. All figures are derived from the loaded project; nothing new is stored.
 */
export function buildStageTiles(p: ProjectDetail, fin: ProjectFinancialSummary | null, exportChecks: ProjectExportCheckItem[], safety: Record<string, ProductSafetyFlag>, _countryName: (c: string) => string, now = new Date()): Tile[] {
  const f = lineFacts(p);
  const showMoney = !p.financialsRedacted && !!fin && fin.linesWithPricing > 0;
  const ccy = fin?.displayCurrencyCode ?? "USD";
  const invoice = showMoney ? Number(fin!.totalInvoiceValue) : null;
  const margin = showMoney ? Number(fin!.totalMargin) : null;
  const marginPct = invoice && margin !== null && invoice > 0 ? (margin / invoice) * 100 : null;
  const dueIn = daysFromToday(p.dueDate, now);
  const flags = new Set(exportChecks.map((c) => c.lineId)).size + Object.values(safety).filter((s) => s.openNotices > 0).length;
  const criticalFlags = Object.values(safety).filter((s) => s.criticalOpen > 0).length;
  const flagTile: Tile = { key: "flags", label: "Compliance flags", value: flags, icon: <ShieldIcon size={20} />, tone: criticalFlags > 0 ? "critical" : flags > 0 ? "warning" : "good", indicator: flags === 0 ? { color: GREEN, label: "No export or safety flags" } : { color: criticalFlags > 0 ? RED : AMBER, label: `${plural(new Set(exportChecks.map((c) => c.lineId)).size, "export restriction")} · ${plural(Object.values(safety).filter((s) => s.openNotices > 0).length, "safety notice")}` } };
  /** One tile: days left as the figure, the due date in the indicator line. */
  const deadline = (label: string): Tile => {
    if (!p.dueDate) return { key: "days", label, value: "—", icon: <HourglassIcon size={20} />, tone: "neutral", indicator: { color: AMBER, label: "No due date set" } };
    const d = dueIn ?? 0;
    const due = fmtDate(p.dueDate);
    const tone: StatTileTone = d <= 3 ? "critical" : d <= 7 ? "warning" : "good";
    const color = d <= 3 ? RED : d <= 7 ? AMBER : GREEN;
    const text = d < 0 ? `Due ${due} · passed` : d === 0 ? `Due today · ${due}` : `Due ${due}`;
    return { key: "days", label, value: Math.max(0, d), icon: <HourglassIcon size={20} />, tone, indicator: { color, label: text } };
  };
  const value: Tile = { key: "value", label: "Quoted value", value: invoice !== null ? money(invoice, ccy) : "—", icon: <TrendingUpIcon size={20} />, tone: "brand", note: invoice === null ? undefined : "client total" };
  const marginTile: Tile = { key: "margin", label: "Gross margin", value: marginPct !== null ? `${marginPct.toFixed(1)}%` : "—", icon: <GaugeIcon size={20} />, tone: marginPct === null ? "neutral" : marginPct >= 12 ? "good" : marginPct >= 6 ? "warning" : "critical", indicator: marginPct === null ? undefined : { color: marginPct >= 12 ? GREEN : marginPct >= 6 ? AMBER : RED, label: margin !== null ? money(margin, ccy) : "", fraction: Math.min(1, Math.max(0, marginPct / 25)) } };
  const client: Tile = { key: "client", label: "Client", value: p.clientName ?? "—", icon: <BuildingIcon size={20} />, tone: "neutral" };
  const lineCount = p.lines.length;

  const out = (tiles: Tile[]) => tiles.slice(0, 4);
  const otifPct = f.judged.length ? Math.round((f.otifOk / f.judged.length) * 100) : null;
  const otifTile: Tile = { key: "otif", label: "On time, in full", value: otifPct === null ? "—" : `${otifPct}%`, icon: <TrendingUpIcon size={20} />, tone: otifPct === null ? "neutral" : otifPct >= 90 ? "good" : otifPct >= 75 ? "warning" : "critical", indicator: otifPct === null ? { color: AMBER, label: "Awaiting deliveries" } : { color: scoreColor100(otifPct) ?? AMBER, label: `${f.otifOk} of ${f.judged.length} lines`, fraction: otifPct / 100 } };

  // At most four tiles per stage, most relevant first. Identification has no data worth a tile yet.
  switch (p.status) {
    case "IDENTIFIED":
      return [];
    case "IN_PROGRESS":
      return out([
        deadline("Days to submission"),
        { key: "priced", label: "Lines priced", value: `${f.priced}/${lineCount}`, icon: <ClipboardCheckIcon size={20} />, tone: lineCount > 0 && f.priced === lineCount ? "good" : "warning", indicator: lineCount ? { color: scoreColor(f.priced / lineCount) ?? AMBER, label: f.priced === lineCount ? "All priced" : `${lineCount - f.priced} to price`, fraction: f.priced / lineCount } : undefined },
        ...(showMoney ? [value] : []),
        flags > 0 || !showMoney ? flagTile : marginTile,
      ]);
    case "SUBMITTED": {
      const subAt = p.submissionDate ?? p.statusHistory.find((h) => h.status === "SUBMITTED")?.enteredAt ?? null;
      const since = daysFromToday(subAt, now);
      const waited = since === null ? null : Math.max(0, -since);
      return out([
        { key: "waiting", label: "Awaiting decision", value: waited === null ? "—" : plural(waited, "day"), icon: <HourglassIcon size={20} />, tone: waited !== null && waited > 30 ? "warning" : "neutral", indicator: { color: waited !== null && waited > 30 ? AMBER : GREEN, label: waited !== null && waited > 30 ? "Over 30 days · chase the client" : `Submitted ${fmtDate(subAt)}` } },
        ...(showMoney ? [{ ...value, label: "Bid value" }, marginTile] : []),
        flagTile,
      ]);
    }
    case "AWARDED": {
      const next = daysFromToday(f.upcoming, now);
      return out([
        { key: "delivered", label: "Lines delivered", value: `${f.delivered.length}/${lineCount}`, icon: <CheckCircleIcon size={20} />, tone: lineCount > 0 && f.delivered.length === lineCount ? "good" : "brand", indicator: lineCount ? { color: scoreColor(f.delivered.length / lineCount) ?? GREEN, label: `${lineCount - f.delivered.length} outstanding`, fraction: f.delivered.length / lineCount } : undefined },
        { key: "next", label: "Next delivery", value: f.upcoming ? fmtDate(f.upcoming) : "—", icon: <CalendarIcon size={20} />, tone: next !== null && next < 0 ? "critical" : next !== null && next <= 7 ? "warning" : "neutral", indicator: next === null ? undefined : next < 0 ? { color: RED, label: `${-next} days late` } : { color: next <= 7 ? AMBER : GREEN, label: next === 0 ? "Today" : `In ${plural(next, "day")}` } },
        otifTile,
        { key: "supplierpay", label: "Supplier payments due", value: f.supplierOwing, icon: <ClockIcon size={20} />, tone: f.supplierOwing > 0 ? "warning" : "good", indicator: { color: f.supplierOwing > 0 ? AMBER : GREEN, label: f.supplierOwing > 0 ? "Lines with a balance" : "Settled" } },
      ]);
    }
    case "COMPLETED": {
      const closeout = p.documents.some((d) => d.type === "CLOSEOUT_REPORT");
      return out([
        ...(showMoney ? [{ ...value, label: "Final value" }, marginTile] : []),
        otifTile,
        { key: "close", label: "Closeout", value: (p.completionStage ?? "Not started").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), icon: <ClipboardCheckIcon size={20} />, tone: p.completionStage === "CLOSEOUT_FILED" ? "good" : "warning", indicator: { color: closeout && f.paidBoth === lineCount ? GREEN : AMBER, label: `${f.paidBoth}/${lineCount} settled · ${closeout ? "report filed" : "no report"}`, fraction: lineCount ? f.paidBoth / lineCount : undefined } },
      ]);
    }
    default: {
      // UNAWARDED, DECLINED, CANCELLED
      const entered = p.statusHistory.filter((h) => h.status === p.status).pop()?.enteredAt;
      const first = p.statusHistory[0]?.enteredAt ?? p.startDate;
      const inPipeline = entered && first ? Math.max(0, Math.round((new Date(entered).getTime() - new Date(first).getTime()) / DAY)) : null;
      return out([
        { key: "outcome", label: p.status === "UNAWARDED" ? "Unawarded on" : p.status === "DECLINED" ? "Declined on" : "Cancelled on", value: fmtDate(entered), icon: <CalendarXIcon size={20} />, tone: "neutral" },
        { key: "pipeline", label: "Time in pipeline", value: inPipeline === null ? "—" : plural(inPipeline, "day"), icon: <ClockIcon size={20} />, tone: "neutral" },
        ...(showMoney ? [{ ...value, label: "Value at stake" }] : []),
        p.status === "CANCELLED" ? { key: "reason", label: "Reason", value: p.reasonForCancellation ?? "—", icon: <BanIcon size={20} />, tone: "neutral" as StatTileTone } : client,
      ]);
    }
  }
}

export function StageDashboard({ project, financialSummary, exportChecks, safetyFlags, countryName, lineFilter, onLineFilter }: { lineFilter?: string; onLineFilter?: (id: string) => void; project: ProjectDetail; financialSummary: ProjectFinancialSummary | null; exportChecks: ProjectExportCheckItem[]; safetyFlags: Record<string, ProductSafetyFlag>; countryName: (code: string) => string }) {
  const tiles = buildStageTiles(project, financialSummary, exportChecks, safetyFlags, countryName);
  if (tiles.length === 0) return null;
  return (
    <StatTileGrid style={{ marginTop: 20 }}>
      {tiles.map((t) => { const f = TILE_LINE_FILTER[t.key]; return <StatTile key={t.key} label={t.label} value={t.value} icon={t.icon} tone={t.tone} note={t.note} indicator={t.indicator} active={!!f && lineFilter === f.id} onClick={f && onLineFilter ? () => onLineFilter(lineFilter === f.id ? "" : f.id) : undefined} />; })}
    </StatTileGrid>
  );
}
