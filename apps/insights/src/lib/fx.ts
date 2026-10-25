"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useState } from "react";
import type { InsightsFxPoint, InsightsFxSeries } from "@universe/types";
import { apiClient } from "./apiClient";

/**
 * Currency conversion for Insights (2026-10-25). Figures are always stored and first shown in the currency they were agreed in. A person can ask to
 * see them in another currency, either at the rate when each figure was logged (the monthly average rate, because Insights keeps months, never days)
 * or at the rate on a date they choose (today by default). Rates are the same daily ECB reference rates the Project Management app locks prices to.
 */
export type FxMode = "logged" | "date";
export interface FxLens { target: string; mode: FxMode; asOf: string }
const KEY = "universe.insights.fx";
export const todayIso = () => new Date().toISOString().slice(0, 10);
const initial = (): FxLens => ({ target: "", mode: "logged", asOf: "" });

let lens: FxLens = initial();
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return; loaded = true;
  try { const raw = window.localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw) as Partial<FxLens>; lens = { target: typeof p.target === "string" ? p.target : "", mode: p.mode === "date" ? "date" : "logged", asOf: typeof p.asOf === "string" ? p.asOf : "" }; } } catch { /* storage unavailable: the choice just is not remembered */ }
}
export function setFxLens(patch: Partial<FxLens>) {
  load(); lens = { ...lens, ...patch };
  try { window.localStorage.setItem(KEY, JSON.stringify(lens)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export function useFxLens(): FxLens {
  useEffect(() => { load(); listeners.forEach((l) => l()); }, []);
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => lens, () => initial());
}

// ---- rates
const cache = new Map<string, Promise<InsightsFxSeries>>();
export function fetchFxSeries(from: string, to: string, start: string, end: string): Promise<InsightsFxSeries> {
  const k = `${from}|${to}|${start}|${end}`;
  let p = cache.get(k);
  if (!p) { p = apiClient.insightsFxSeries(from, to, start, end); cache.set(k, p); p.catch(() => cache.delete(k)); }
  return p;
}
export function useFxSeries(from: string, to: string, start: string, end: string) {
  const [state, setState] = useState<{ key: string; series: InsightsFxSeries | null; failed: boolean }>({ key: "", series: null, failed: false });
  const key = `${from}|${to}|${start}|${end}`;
  useEffect(() => {
    if (!from || !to || from === to || !start || !end) return;
    let live = true;
    fetchFxSeries(from, to, start, end).then((s) => live && setState({ key, series: s, failed: !s.available })).catch(() => live && setState({ key, series: null, failed: true }));
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const same = from === to;
  return { series: state.key === key ? state.series : null, failed: !same && state.key === key && state.failed, loading: !same && state.key !== key };
}

/** The rate on a date: the last published day on or before it (weekends and holidays have no rate), or the first day if the date is earlier than the history. */
export function rateOn(points: InsightsFxPoint[], date: string): number | null {
  if (!points.length) return null;
  let best = points[0]!;
  for (const p of points) { if (p.date <= date) best = p; else break; }
  return best.rate;
}
/** The average of the daily rates in a month ("YYYY-MM"), or the nearest day's rate if that month has none. */
export function monthAverage(points: InsightsFxPoint[], month: string): number | null {
  const inMonth = points.filter((p) => p.date.startsWith(month));
  if (inMonth.length) return inMonth.reduce((a, p) => a + p.rate, 0) / inMonth.length;
  return rateOn(points, `${month}-28`);
}
export const rateText = (r: number | null) => (r === null ? "not available" : r >= 100 ? r.toFixed(2) : r >= 1 ? r.toFixed(4) : r.toFixed(5));

export interface FxView {
  /** The currency the figures are shown in (the original currency when no conversion is on). */
  ccy: string;
  /** True when figures are being converted. */
  on: boolean;
  /** The original currency. */
  source: string;
  loading: boolean;
  failed: boolean;
  mode: FxMode;
  asOf: string;
  series: InsightsFxSeries | null;
  /** Convert an amount in the original currency. With a month ("YYYY-MM") and the "logged" mode the month's average rate is used, otherwise the rate on the chosen date. */
  conv: (value: number, month?: string) => number;
}

/** What a lens needs: the original currency of the figures on screen and the months they cover (empty for figures that average across months). */
export function useFxView(source: string, months: string[]): FxView {
  const l = useFxLens();
  const on = !!source && !!l.target && l.target !== source;
  const asOf = l.asOf || todayIso();
  const first = months.length ? [...months].sort()[0]! : asOf.slice(0, 7);
  const startMonth = first < asOf.slice(0, 7) ? first : asOf.slice(0, 7);
  const start = `${startMonth}-01`;
  const { series, failed, loading } = useFxSeries(on ? source : "", on ? l.target : "", start, todayIso());
  const ready = on && !!series && series.points.length > 0;
  const conv = useMemo(() => (value: number, month?: string) => {
    if (!ready || !series) return value;
    const r = l.mode === "logged" && month ? monthAverage(series.points, month) : rateOn(series.points, asOf);
    return r === null ? value : value * r;
  }, [ready, series, l.mode, asOf]);
  return { ccy: ready ? l.target : source, on: ready, source, loading: on && loading, failed: on && failed, mode: l.mode, asOf, series, conv };
}
