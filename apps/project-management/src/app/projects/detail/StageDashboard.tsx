"use client";

import { StatTile, StatTileGrid, CalendarIcon, ClockIcon, HourglassIcon, TrendingUpIcon, CheckCircleIcon, AlertIcon, GlobeIcon, UserIcon, BuildingIcon, DocumentIcon, GaugeIcon, ShieldIcon, ClipboardCheckIcon, BanIcon, CalendarXIcon } from "@universe/ui";
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

export interface Tile { key: string; label: string; value: string | number; icon: ReactNode; tone?: StatTileTone; note?: string; indicator?: { color: string; label: string; fraction?: number } }

const GREEN = "var(--u-status-good, #1a7f4b)";
const AMBER = "var(--u-status-warning, #b7791f)";
const RED = "var(--u-status-critical, #c0392b)";

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
export function buildStageTiles(p: ProjectDetail, fin: ProjectFinancialSummary | null, exportChecks: ProjectExportCheckItem[], safety: Record<string, ProductSafetyFlag>, countryName: (c: string) => string, now = new Date()): Tile[] {
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
  const deadline = (label: string): Tile[] => {
    if (!p.dueDate) return [{ key: "days", label, value: "—", icon: <HourglassIcon size={20} />, tone: "neutral", indicator: { color: AMBER, label: "No due date set" } }, { key: "due", label: "Due date", value: "—", icon: <CalendarIcon size={20} />, tone: "neutral" }];
    const d = dueIn ?? 0;
    const tone: StatTileTone = d <= 0 ? "critical" : d <= 3 ? "critical" : d <= 7 ? "warning" : "good";
    const ind = d < 0 ? { color: RED, label: "Due date has passed" } : d === 0 ? { color: RED, label: "Due today" } : d <= 3 ? { color: RED, label: "Under 3 days" } : d <= 7 ? { color: AMBER, label: "Within a week" } : { color: GREEN, label: "On track" };
    return [
      { key: "days", label, value: Math.max(0, d), icon: <HourglassIcon size={20} />, tone, indicator: ind },
      { key: "due", label: "Due date", value: fmtDate(p.dueDate), icon: <CalendarIcon size={20} />, tone },
    ];
  };
  const value: Tile = { key: "value", label: "Quoted value", value: invoice !== null ? money(invoice, ccy) : "—", icon: <TrendingUpIcon size={20} />, tone: "brand", note: invoice === null ? undefined : "client total" };
  const marginTile: Tile = { key: "margin", label: "Gross margin", value: marginPct !== null ? `${marginPct.toFixed(1)}%` : "—", icon: <GaugeIcon size={20} />, tone: marginPct === null ? "neutral" : marginPct >= 12 ? "good" : marginPct >= 6 ? "warning" : "critical", indicator: marginPct === null ? undefined : { color: marginPct >= 12 ? GREEN : marginPct >= 6 ? AMBER : RED, label: margin !== null ? money(margin, ccy) : "", fraction: Math.min(1, Math.max(0, marginPct / 25)) } };
  const countries = p.deliveryCountryCodes;
  const dest: Tile = { key: "dest", label: countries.length > 1 ? "Destinations" : "Destination", value: countries.length === 0 ? "—" : countries.length === 1 ? countryName(countries[0]) : `${countries.length} countries`, icon: <GlobeIcon size={20} />, tone: "neutral" };
  const client: Tile = { key: "client", label: "Client", value: p.clientName ?? "—", icon: <BuildingIcon size={20} />, tone: "neutral" };
  const team: Tile = { key: "team", label: "Project leads", value: p.leads.length, icon: <UserIcon size={20} />, tone: p.leads.length === 0 ? "warning" : "neutral", indicator: p.leads.length === 0 ? { color: AMBER, label: "No lead assigned" } : undefined };
  const lineCount = p.lines.length;

  switch (p.status) {
    case "IDENTIFIED":
      return [...deadline("Days to submission"), client, dest, { key: "scope", label: "Lines scoped", value: lineCount, icon: <ClipboardCheckIcon size={20} />, tone: "neutral", indicator: lineCount === 0 ? { color: AMBER, label: "Nothing scoped yet" } : undefined }, team];
    case "IN_PROGRESS": {
      const open = f.enquiries.length ? `${f.waiting} awaiting · ${f.quoted} quoted` : "No enquiries logged";
      return [
        ...deadline("Days to submission"),
        { key: "priced", label: "Lines priced", value: `${f.priced}/${lineCount}`, icon: <ClipboardCheckIcon size={20} />, tone: lineCount > 0 && f.priced === lineCount ? "good" : "warning", indicator: lineCount ? { color: f.priced === lineCount ? GREEN : AMBER, label: f.priced === lineCount ? "All priced" : `${lineCount - f.priced} to price`, fraction: f.priced / lineCount } : undefined },
        { key: "enq", label: "Supplier enquiries", value: f.enquiries.length, icon: <ClockIcon size={20} />, tone: f.waiting > 0 ? "warning" : "neutral", indicator: { color: f.waiting > 0 ? AMBER : GREEN, label: open } },
        ...(showMoney ? [value, marginTile] : []),
        flagTile,
      ];
    }
    case "SUBMITTED": {
      const since = daysFromToday(p.submissionDate ?? p.statusHistory.find((h) => h.status === "SUBMITTED")?.enteredAt ?? null, now);
      return [
        { key: "submitted", label: "Submitted", value: fmtDate(p.submissionDate ?? p.statusHistory.find((h) => h.status === "SUBMITTED")?.enteredAt), icon: <CalendarIcon size={20} />, tone: "brand" },
        { key: "waiting", label: "Awaiting decision", value: since === null ? "—" : plural(Math.max(0, -since), "day"), icon: <HourglassIcon size={20} />, tone: since !== null && -since > 30 ? "warning" : "neutral", indicator: since !== null && -since > 30 ? { color: AMBER, label: "Over 30 days — chase the client" } : undefined },
        ...(showMoney ? [{ ...value, label: "Bid value" }, marginTile] : []),
        client, dest, flagTile,
      ];
    }
    case "AWARDED": {
      const next = daysFromToday(f.upcoming, now);
      const otifPct = f.judged.length ? Math.round((f.otifOk / f.judged.length) * 100) : null;
      return [
        ...(showMoney ? [{ ...value, label: "Order value" }] : []),
        { key: "delivered", label: "Lines delivered", value: `${f.delivered.length}/${lineCount}`, icon: <CheckCircleIcon size={20} />, tone: lineCount > 0 && f.delivered.length === lineCount ? "good" : "brand", indicator: lineCount ? { color: GREEN, label: `${lineCount - f.delivered.length} outstanding`, fraction: f.delivered.length / lineCount } : undefined },
        { key: "next", label: "Next delivery", value: f.upcoming ? fmtDate(f.upcoming) : "—", icon: <CalendarIcon size={20} />, tone: next !== null && next < 0 ? "critical" : next !== null && next <= 7 ? "warning" : "neutral", indicator: next === null ? undefined : next < 0 ? { color: RED, label: `${-next} days late` } : { color: next <= 7 ? AMBER : GREEN, label: next === 0 ? "Today" : `In ${plural(next, "day")}` } },
        { key: "otif", label: "On time, in full", value: otifPct === null ? "—" : `${otifPct}%`, icon: <TrendingUpIcon size={20} />, tone: otifPct === null ? "neutral" : otifPct >= 90 ? "good" : otifPct >= 75 ? "warning" : "critical", indicator: otifPct === null ? { color: AMBER, label: "Awaiting deliveries" } : { color: otifPct >= 90 ? GREEN : otifPct >= 75 ? AMBER : RED, label: `${f.otifOk} of ${f.judged.length} lines`, fraction: otifPct / 100 } },
        { key: "supplierpay", label: "Supplier payments due", value: f.supplierOwing, icon: <ClockIcon size={20} />, tone: f.supplierOwing > 0 ? "warning" : "good", indicator: { color: f.supplierOwing > 0 ? AMBER : GREEN, label: f.supplierOwing > 0 ? "Lines with a balance" : "Settled" } },
        { key: "clientpay", label: "Client invoiced / paid", value: `${f.invoiced} / ${f.received}`, icon: <DocumentIcon size={20} />, tone: "neutral", note: "lines" },
        flagTile,
      ];
    }
    case "COMPLETED": {
      const start = p.statusHistory.find((h) => h.status === "IN_PROGRESS")?.enteredAt ?? p.startDate;
      const end = p.statusHistory.filter((h) => h.status === "COMPLETED").pop()?.enteredAt;
      const cycle = start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / DAY)) : null;
      const otifPct = f.judged.length ? Math.round((f.otifOk / f.judged.length) * 100) : null;
      const closeout = p.documents.some((d) => d.type === "CLOSEOUT_REPORT");
      return [
        ...(showMoney ? [{ ...value, label: "Final value" }, marginTile] : []),
        { key: "otif", label: "On time, in full", value: otifPct === null ? "—" : `${otifPct}%`, icon: <TrendingUpIcon size={20} />, tone: otifPct === null ? "neutral" : otifPct >= 90 ? "good" : otifPct >= 75 ? "warning" : "critical", indicator: otifPct === null ? undefined : { color: otifPct >= 90 ? GREEN : otifPct >= 75 ? AMBER : RED, label: `${f.otifOk} of ${f.judged.length} lines`, fraction: otifPct / 100 } },
        { key: "settled", label: "Fully settled", value: `${f.paidBoth}/${lineCount}`, icon: <CheckCircleIcon size={20} />, tone: lineCount > 0 && f.paidBoth === lineCount ? "good" : "warning", indicator: lineCount ? { color: f.paidBoth === lineCount ? GREEN : AMBER, label: f.paidBoth === lineCount ? "Supplier and client paid" : "Payments outstanding", fraction: f.paidBoth / lineCount } : undefined },
        { key: "cycle", label: "Cycle time", value: cycle === null ? "—" : plural(cycle, "day"), icon: <ClockIcon size={20} />, tone: "neutral", note: "in progress → completed" },
        { key: "close", label: "Closeout", value: (p.completionStage ?? "Not started").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), icon: <ClipboardCheckIcon size={20} />, tone: p.completionStage === "CLOSEOUT_FILED" ? "good" : "warning", indicator: { color: closeout ? GREEN : AMBER, label: closeout ? "Closeout report filed" : "No closeout report" } },
        ...(f.co2Lines ? [{ key: "co2", label: "Transport CO2e", value: `${Math.round(f.co2).toLocaleString("en-GB")} kg`, icon: <GlobeIcon size={20} />, tone: "neutral" as StatTileTone, note: `${f.co2Lines} lines` }] : []),
      ];
    }
    default: {
      // UNAWARDED, DECLINED, CANCELLED
      const entered = p.statusHistory.filter((h) => h.status === p.status).pop()?.enteredAt;
      const first = p.statusHistory[0]?.enteredAt ?? p.startDate;
      const inPipeline = entered && first ? Math.max(0, Math.round((new Date(entered).getTime() - new Date(first).getTime()) / DAY)) : null;
      return [
        { key: "outcome", label: p.status === "UNAWARDED" ? "Unawarded on" : p.status === "DECLINED" ? "Declined on" : "Cancelled on", value: fmtDate(entered), icon: <CalendarXIcon size={20} />, tone: "neutral" },
        { key: "pipeline", label: "Time in pipeline", value: inPipeline === null ? "—" : plural(inPipeline, "day"), icon: <ClockIcon size={20} />, tone: "neutral" },
        ...(showMoney ? [{ ...value, label: "Value at stake" }] : []),
        client,
        ...(p.status === "CANCELLED" ? [{ key: "reason", label: "Reason", value: p.reasonForCancellation ?? "—", icon: <BanIcon size={20} />, tone: "neutral" as StatTileTone }] : []),
      ];
    }
  }
}

export function StageDashboard({ project, financialSummary, exportChecks, safetyFlags, countryName }: { project: ProjectDetail; financialSummary: ProjectFinancialSummary | null; exportChecks: ProjectExportCheckItem[]; safetyFlags: Record<string, ProductSafetyFlag>; countryName: (code: string) => string }) {
  const tiles = buildStageTiles(project, financialSummary, exportChecks, safetyFlags, countryName);
  return (
    <StatTileGrid style={{ marginTop: 20 }}>
      {tiles.map((t) => <StatTile key={t.key} label={t.label} value={t.value} icon={t.icon} tone={t.tone} note={t.note} indicator={t.indicator} />)}
    </StatTileGrid>
  );
}
