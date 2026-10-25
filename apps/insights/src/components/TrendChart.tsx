"use client";

import { fmtMoney } from "../lib/format";
import { ChartTooltip, useChartTip } from "./ChartTip";

export interface TrendPoint { label: string; avg: number; min: number; max: number; sources: number }

/**
 * Price trend: a shaded band from the lowest to the highest price each month, with the average as a line. Drawn in SVG with the design tokens
 * (so it follows light and dark), summarised in words for screen readers, and always paired with a data table (accessibility standard: no
 * chart without a text equivalent).
 */
export function TrendChart({ points, currency, title }: { points: TrendPoint[]; currency: string; title: string }) {
  const W = 760, H = 260, L = 56, R = 16, T = 12, B = 34;
  const { tip, bind, close, activeKey } = useChartTip();
  if (points.length === 0) return <p style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>No months have enough contributors to show a trend yet.</p>;
  const lo = Math.min(...points.map((p) => p.min)), hi = Math.max(...points.map((p) => p.max));
  const pad = (hi - lo || hi || 1) * 0.08;
  const y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const band = `${points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.max)}`).join(" ")} ${[...points].reverse().map((p, i) => `L${x(points.length - 1 - i)},${y(p.min)}`).join(" ")} Z`;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.avg)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => y0 + t * (y1 - y0));
  const first = points[0], last = points[points.length - 1];
  const summary = `${title}. Average price in ${currency} went from ${fmtMoney(first.avg)} in ${first.label} to ${fmtMoney(last.avg)} in ${last.label}. The range across contributors in ${last.label} was ${fmtMoney(last.min)} to ${fmtMoney(last.max)}.`;
  const every = Math.max(1, Math.ceil(points.length / 8));
  const colW = points.length > 1 ? (W - L - R) / (points.length - 1) : W - L - R;
  const tipFor = (p: TrendPoint, i: number) => ({ key: p.label, x: x(i), y: y(p.avg), vw: W, vh: H, title: p.label, rows: [{ label: "Average", value: `${fmtMoney(p.avg)} ${currency}` }, { label: "Lowest", value: fmtMoney(p.min) }, { label: "Highest", value: fmtMoney(p.max) }, { label: "Organisations", value: String(p.sources) }] });
  return (
    <div style={{ position: "relative" }}>
      <svg role="group" aria-label={summary} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation" }} onClick={close}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--u-border)" strokeWidth={1} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--u-ink-secondary)">{fmtMoney(t)}</text>
          </g>
        ))}
        <path d={band} fill="var(--u-org-accent, var(--u-brand-violet))" opacity={0.16} />
        <path d={line} fill="none" stroke="var(--u-org-accent, var(--u-brand-violet))" strokeWidth={2.5} strokeLinejoin="round" />
        {activeKey && <line x1={x(points.findIndex((q) => q.label === activeKey))} x2={x(points.findIndex((q) => q.label === activeKey))} y1={T} y2={H - B} stroke="var(--u-ink-secondary)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />}
        {points.map((p, i) => <circle key={p.label} cx={x(i)} cy={y(p.avg)} r={activeKey === p.label ? 6 : 3.8} fill={activeKey === p.label ? "var(--u-org-accent, var(--u-brand-violet))" : "var(--u-surface)"} stroke="var(--u-org-accent, var(--u-brand-violet))" strokeWidth={2} pointerEvents="none" />)}
        {points.map((p, i) => { const t = tipFor(p, i); return <rect key={`hit-${p.label}`} x={x(i) - colW / 2} y={T} width={Math.max(24, colW)} height={H - T - B} fill="transparent" tabIndex={0} role="button" aria-label={`${p.label}: average ${fmtMoney(p.avg)} ${currency}, lowest ${fmtMoney(p.min)}, highest ${fmtMoney(p.max)}, ${p.sources} organisations`} style={{ cursor: "pointer", outlineOffset: -2 }} {...bind(t)} />; })}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1 ? <text key={p.label} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--u-ink-secondary)">{p.label}</text> : null))}
      </svg>
      <ChartTooltip tip={tip} onClose={close} />
      <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "6px 0 10px" }}>
        <span><span aria-hidden style={{ display: "inline-block", width: 14, height: 3, background: "var(--u-org-accent, var(--u-brand-violet))", marginRight: 6, verticalAlign: "middle" }} />Average price ({currency})</span>
        <span><span aria-hidden style={{ display: "inline-block", width: 14, height: 10, background: "var(--u-org-accent, var(--u-brand-violet))", opacity: 0.16, marginRight: 6, verticalAlign: "middle" }} />Lowest to highest</span>
      </div>
      <details>
        <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Show the data as a table</summary>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13.5, width: "100%" }}>
            <caption style={{ textAlign: "left", color: "var(--u-ink-secondary)", padding: "4px 0" }}>{title}, prices in {currency}</caption>
            <thead><tr>{["Month", "Average", "Lowest", "Highest", "Organisations"].map((h) => <th key={h} scope="col" style={{ textAlign: h === "Month" ? "left" : "right", padding: "6px 10px", borderBottom: "1px solid var(--u-border)" }}>{h}</th>)}</tr></thead>
            <tbody>{points.map((p) => (
              <tr key={p.label}><th scope="row" style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>{p.label}</th>{[fmtMoney(p.avg), fmtMoney(p.min), fmtMoney(p.max), String(p.sources)].map((c, i) => <td key={i} style={{ textAlign: "right", padding: "6px 10px" }}>{c}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
