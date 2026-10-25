"use client";

import { useMemo, useState } from "react";
import { CURRENCY_NAMES, SUPPORTED_CURRENCIES } from "@universe/types";
import { StatTile, StatTileGrid, GaugeIcon, TrendingUpIcon, ClockIcon, GlobeIcon } from "@universe/ui";
import { DataTable, type Col } from "../../components/DataTable";
import { FxChart } from "../../components/FxChart";
import { SourceNote } from "../../components/SourceNote";
import { useFxSeries, rateText, todayIso } from "../../lib/fx";
import { useViewBridge } from "../../lib/views";
import { Card, Heading, Page, inputStyle, pill } from "../../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const RANGES = [{ id: "3m", label: "3 months", days: 92 }, { id: "6m", label: "6 months", days: 183 }, { id: "1y", label: "1 year", days: 366 }, { id: "3y", label: "3 years", days: 1096 }] as const;
const dayText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthText = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const startFor = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

export default function CurrencyPage() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("1y");
  const days = RANGES.find((r) => r.id === range)!.days;
  const start = useMemo(() => startFor(days), [days]);
  const { series, loading, failed } = useFxSeries(from, to, start, todayIso());
  useViewBridge(() => ({ from, to, range }), (s) => { if (s.from) setFrom(s.from); if (s.to) setTo(s.to); if (s.range) setRange(s.range as typeof range); });

  const pts = series?.points ?? [];
  const stats = useMemo(() => {
    if (pts.length < 2) return null;
    const first = pts[0]!, last = pts[pts.length - 1]!;
    const hi = pts.reduce((a, p) => (p.rate > a.rate ? p : a)), lo = pts.reduce((a, p) => (p.rate < a.rate ? p : a));
    return { first, last, hi, lo, change: (last.rate / first.rate - 1) * 100 };
  }, [pts]);
  const monthly = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const p of pts) m.set(p.date.slice(0, 7), [...(m.get(p.date.slice(0, 7)) ?? []), p.rate]);
    return [...m.entries()].map(([month, r]) => ({ month, avg: r.reduce((a, b) => a + b, 0) / r.length, hi: Math.max(...r), lo: Math.min(...r), days: r.length })).sort((a, b) => b.month.localeCompare(a.month));
  }, [pts]);
  const monthCols: Col<(typeof monthly)[number]>[] = [
    { key: "month", header: "Month", value: (r) => r.month, render: (r) => monthText(r.month) },
    { key: "avg", header: `Average (${to} per ${from})`, align: "right", value: (r) => Number(r.avg.toFixed(5)), render: (r) => rateText(r.avg) },
    { key: "hi", header: "Highest", align: "right", value: (r) => Number(r.hi.toFixed(5)), render: (r) => rateText(r.hi) },
    { key: "lo", header: "Lowest", align: "right", value: (r) => Number(r.lo.toFixed(5)), render: (r) => rateText(r.lo) },
    { key: "days", header: "Days", align: "right", value: (r) => r.days },
  ];
  const dailyCols: Col<{ date: string; rate: number }>[] = [
    { key: "date", header: "Date", value: (r) => r.date, render: (r) => dayText(r.date) },
    { key: "rate", header: `1 ${from} in ${to}`, align: "right", value: (r) => r.rate, render: (r) => rateText(r.rate) },
  ];
  const daily = useMemo(() => [...pts].reverse(), [pts]);
  const options = (skip: string) => SUPPORTED_CURRENCIES.filter((c) => c !== skip).map((c) => <option key={c} value={c}>{c} · {CURRENCY_NAMES[c]}</option>);

  return (
    <Page>
      <Heading title="Currencies" sub="The daily exchange rate between any two currencies, tracked over time. These are the rates used when Insights converts costs from the currency they were agreed in." />
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600 }}>From (the currency of the cost)
            <select className="u-native-select" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 210 }}>{options(to)}</select>
          </label>
          <button type="button" className="u-touch" style={pill(false)} aria-label="Swap the two currencies" onClick={() => { setFrom(to); setTo(from); }}>Swap ⇄</button>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600 }}>To (the currency to show it in)
            <select className="u-native-select" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 210 }}>{options(from)}</select>
          </label>
          <div role="group" aria-label="Time range" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RANGES.map((r) => <button key={r.id} type="button" className="u-touch" style={pill(range === r.id)} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
          </div>
        </div>
      </Card>

      <StatTileGrid>
        <StatTile label={stats ? `Latest: 1 ${from} in ${to}` : "Latest rate"} value={loading ? "…" : stats ? rateText(stats.last.rate) : "—"} icon={<GaugeIcon size={18} />} />
        <StatTile label={stats ? `Change since ${dayText(stats.first.date)}` : "Change over the range"} value={loading ? "…" : stats ? `${stats.change >= 0 ? "+" : "−"}${Math.abs(stats.change).toFixed(1)}%` : "—"} icon={<TrendingUpIcon size={18} />} tone="neutral" />
        <StatTile label={stats ? `Highest (${dayText(stats.hi.date)})` : "Highest"} value={loading ? "…" : stats ? rateText(stats.hi.rate) : "—"} icon={<GlobeIcon size={18} />} tone="neutral" />
        <StatTile label={stats ? `Lowest (${dayText(stats.lo.date)})` : "Lowest"} value={loading ? "…" : stats ? rateText(stats.lo.rate) : "—"} icon={<ClockIcon size={18} />} tone="neutral" />
      </StatTileGrid>

      <section aria-labelledby="fx-chart" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="fx-chart" style={h2}>Daily exchange rate: 1 {from} in {to}</h2>
        <Card>
          {loading ? <p style={{ margin: 0 }}>Loading exchange rates…</p> : failed ? <p role="status" style={{ margin: 0, color: "var(--u-status-critical-text)" }}>Exchange rates are not available just now. Try again shortly.</p> : <FxChart points={pts} from={from} to={to} />}
        </Card>
      </section>

      {pts.length > 0 && (
        <section aria-labelledby="fx-tables" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="fx-tables" style={h2}>The same figures as tables</h2>
          <Card title="Month by month">
            <DataTable rows={monthly} rowKey={(r) => r.month} columns={monthCols} caption={`Monthly average, highest and lowest rate of ${from} in ${to}`} exportName={`fx-${from}-${to}-monthly`} />
          </Card>
          <details>
            <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Every day</summary>
            <div style={{ marginTop: 8 }}><Card><DataTable rows={daily} rowKey={(r) => r.date} columns={dailyCols} caption={`Daily rate of ${from} in ${to}`} exportName={`fx-${from}-${to}-daily`} /></Card></div>
          </details>
        </section>
      )}
      <SourceNote keys={["fx"]} />
    </Page>
  );
}
