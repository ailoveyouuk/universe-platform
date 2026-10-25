"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChartTooltip, useChartTip } from "./ChartTip";
import { SourceNote } from "./SourceNote";
import type { SourceKey } from "../lib/sources";
import { Card, pill } from "../lib/ui";
import { monthLabel } from "../lib/format";

export interface TrendPoint { month: string; value: number }
export interface TrendLine { id: string; name: string; color: string; dash?: string; points: TrendPoint[] }
export interface TrendMetric {
  id: string; label: string;
  /** Short unit for the axis and the table, e.g. "km" or "USD per tonne". */
  unit: string; fmt: (v: number) => string;
  lines: TrendLine[];
  /** Start the axis at zero (counts, totals). Leave off for averages that sit in a narrow band. */
  zero?: boolean;
  /** One plain sentence under the chart saying what the figure is. */
  blurb?: string;
}

/** Line colours: platform tokens, told apart by dash as well so colour is never the only cue. */
export const TREND_COLORS = ["var(--u-brand-violet)", "var(--u-accent-magenta)", "var(--u-module-crm)", "var(--u-module-product-database)", "var(--u-module-tender-issuance)", "var(--u-ink-secondary)"];
export const TREND_DASHES: (string | undefined)[] = [undefined, "7 4", "2 3", "10 4 2 4", "4 4", "1 5"];
export const trendStyle = (i: number) => ({ color: TREND_COLORS[i % TREND_COLORS.length]!, dash: TREND_DASHES[i % TREND_DASHES.length] });

const L = 54, R = 14, T = 12, B = 30;

function niceStep(span: number) { const raw = span / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

/** A plain multi-line chart of one measure by month. Drawn at the width it is shown at, with hover, tap and keyboard tooltips and a spoken summary. */
export function MetricLineChart({ metric, title }: { metric: TrendMetric; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setW(Math.max(280, Math.round(el.clientWidth)));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 240 : 280;
  const { tip, bind, close, activeKey } = useChartTip();
  const lines = metric.lines.filter((l) => l.points.length > 0);
  const all = lines.flatMap((l) => l.points);
  if (all.length === 0) return <div ref={box}><p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>Not enough organisations behind this yet to show it over time. Figures appear once at least five organisations contribute.</p></div>;
  const months = [...new Set(all.map((p) => p.month))].sort();
  let lo = Math.min(...all.map((p) => p.value)), hi = Math.max(...all.map((p) => p.value));
  if (metric.zero) lo = Math.min(0, lo);
  if (hi === lo) hi = lo + 1;
  const step = niceStep(hi - lo);
  const y0 = metric.zero ? 0 : Math.floor((lo - (hi - lo) * 0.08) / step) * step, y1 = Math.ceil((hi + (hi - lo) * 0.05) / step) * step;
  const ticks: number[] = []; for (let v = y0; v <= y1 + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  const x = (m: string) => L + (months.length === 1 ? (W - L - R) / 2 : (months.indexOf(m) * (W - L - R)) / (months.length - 1));
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const colW = months.length > 1 ? (W - L - R) / (months.length - 1) : W - L - R;
  const every = Math.max(1, Math.ceil(months.length / (W < 480 ? 4 : 8)));
  const tipFor = (m: string) => {
    const rows = lines.flatMap((l) => { const p = l.points.find((q) => q.month === m); return p ? [{ label: l.name, value: `${metric.fmt(p.value)} ${metric.unit}`.trim(), swatch: l.color }] : []; });
    const ys = lines.flatMap((l) => l.points.filter((q) => q.month === m).map((q) => y(q.value)));
    return { key: m, x: x(m), y: Math.min(...ys), vw: W, vh: H, title: `${monthLabel(m)}: ${metric.label.toLowerCase()}`, rows };
  };
  const summary = `${title}. ` + lines.map((l) => { const a = l.points[0]!, b = l.points[l.points.length - 1]!; return `${l.name} went from ${metric.fmt(a.value)} in ${monthLabel(a.month)} to ${metric.fmt(b.value)} ${metric.unit} in ${monthLabel(b.month)}.`; }).join(" ");
  return (
    <div ref={box} style={{ width: "100%", position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={summary} style={{ display: "block", touchAction: "manipulation" }} onClick={close}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--u-border)" strokeWidth={1} /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--u-ink-secondary)">{metric.fmt(t)}</text></g>)}
        {lines.map((l) => (
          <g key={l.id}>
            <path d={l.points.map((p, i) => `${i ? "L" : "M"}${x(p.month)},${y(p.value)}`).join(" ")} fill="none" stroke={l.color} strokeWidth={2.5} strokeDasharray={l.dash} strokeLinejoin="round" />
            {l.points.map((p) => <circle key={p.month} cx={x(p.month)} cy={y(p.value)} r={activeKey === p.month ? 6 : 3.4} fill={activeKey === p.month ? l.color : "var(--u-surface)"} stroke={l.color} strokeWidth={2} pointerEvents="none" />)}
          </g>
        ))}
        {activeKey && <line x1={x(activeKey)} x2={x(activeKey)} y1={T} y2={H - B} stroke="var(--u-ink-secondary)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />}
        {months.map((m) => { const t = tipFor(m); return <rect data-chart-hit key={`hit-${m}`} x={x(m) - colW / 2} y={T} width={Math.max(24, colW)} height={H - T - B} fill="transparent" tabIndex={0} role="button" aria-label={`${monthLabel(m)}: ${t.rows.map((r) => `${r.label} ${r.value}`).join(", ")}`} style={{ cursor: "pointer", outlineOffset: -2 }} {...bind(t)} />; })}
        {months.map((m, i) => (i % every === 0 || i === months.length - 1 ? <text key={m} x={x(m)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--u-ink-secondary)">{monthLabel(m)}</text> : null))}
      </svg>
      <ChartTooltip tip={tip} onClose={close} />
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", listStyle: "none", margin: "6px 0 0", padding: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
        {lines.map((l) => <li key={l.id}><svg width="26" height="8" aria-hidden style={{ verticalAlign: "middle", marginRight: 6 }}><line x1="0" x2="26" y1="4" y2="4" stroke={l.color} strokeWidth={3} strokeDasharray={l.dash} /></svg>{l.name}</li>)}
      </ul>
    </div>
  );
}

/**
 * The standard "over time" panel for an Insights section: a switch for what to measure, the section's own filters (passed in), the chart, a plain
 * sentence on what the figure is, a table with the same numbers, and where the data comes from.
 */
export function SectionTrend({ title, metrics, metric, onMetric, filters, loading, sources, exportName }: {
  title: string; metrics: TrendMetric[]; metric: string; onMetric: (id: string) => void;
  filters?: ReactNode; loading?: boolean; sources: SourceKey[]; exportName: string;
}) {
  const cur = metrics.find((m) => m.id === metric) ?? metrics[0];
  const headId = `trend-${exportName}`;
  if (!cur) return null;
  const lines = cur.lines.filter((l) => l.points.length > 0);
  const months = [...new Set(lines.flatMap((l) => l.points.map((p) => p.month)))].sort();
  const download = () => {
    const rows = [["Month", ...lines.map((l) => `${l.name} (${cur.unit})`)], ...months.map((m) => [m, ...lines.map((l) => String(l.points.find((p) => p.month === m)?.value ?? ""))])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = `${exportName}-${cur.id}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Card title={title} style={{ minWidth: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, maxWidth: "100%" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", justifyContent: "space-between" }}>
          <div role="group" aria-label={`Measure shown in ${title}`} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {metrics.map((m) => <button key={m.id} type="button" className="u-touch" aria-pressed={m.id === cur.id} style={pill(m.id === cur.id)} onClick={() => onMetric(m.id)}>{m.label}</button>)}
          </div>
          {filters && <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", minWidth: 0, maxWidth: "100%" }}>{filters}</div>}
        </div>
        {loading ? <p style={{ margin: 0 }}>Loading…</p> : <MetricLineChart metric={cur} title={`${title}: ${cur.label}`} />}
        {cur.blurb && <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>{cur.blurb}</p>}
        {!loading && months.length > 0 && (
          <details style={{ minWidth: 0, maxWidth: "100%" }}>
            <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }} id={headId}>Show these figures as a table</summary>
            <div style={{ overflowX: "auto", marginTop: 8, maxWidth: "100%" }} tabIndex={0} role="region" aria-label={`${cur.label} table`}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 320 }}>
                <caption style={{ textAlign: "left", fontSize: 12.5, color: "var(--u-ink-secondary)", paddingBottom: 4 }}>{cur.label} by month ({cur.unit})</caption>
                <thead><tr><th scope="col" style={{ textAlign: "left", padding: "4px 12px 4px 0", borderBottom: "1px solid var(--u-border)" }}>Month</th>{lines.map((l) => <th key={l.id} scope="col" style={{ textAlign: "right", padding: "4px 0 4px 12px", borderBottom: "1px solid var(--u-border)" }}>{l.name}</th>)}</tr></thead>
                <tbody>{months.map((m) => <tr key={m}><th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "3px 12px 3px 0" }}>{monthLabel(m)}</th>{lines.map((l) => { const p = l.points.find((q) => q.month === m); return <td key={l.id} style={{ textAlign: "right", padding: "3px 0 3px 12px" }}>{p ? cur.fmt(p.value) : "–"}</td>; })}</tr>)}</tbody>
              </table>
            </div>
            <button type="button" className="u-touch" style={{ ...pill(false), marginTop: 8 }} onClick={download}>Download as CSV</button>
          </details>
        )}
        <SourceNote keys={sources} />
      </div>
    </Card>
  );
}
