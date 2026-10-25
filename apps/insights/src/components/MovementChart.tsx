"use client";

import { useEffect, useRef, useState } from "react";
import { ChartTooltip, useChartTip } from "./ChartTip";

export interface MovementPoint { label: string; index: number; sources: number }
export interface MovementLine { id: string; name: string; color: string; dash?: string; points: MovementPoint[] }
const L = 46, R = 14, T = 12, B = 30;

/**
 * Cost-price movement: one or more index lines (100 = the first month shown), with a dotted line at 100. Drawn at the width it is shown at so
 * the text stays readable on a phone, summarised in words for screen readers, and paired by the page with a data table. Lines are told apart by
 * dash style as well as colour. It shows an index (a ratio), never a price.
 */
export function MovementChart({ lines, title }: { lines: MovementLine[]; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setW(Math.max(280, Math.round(el.clientWidth)));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 240 : 280;
  const { tip, bind, close, activeKey } = useChartTip();
  const all = lines.flatMap((l) => l.points);
  if (all.length === 0) return <div ref={box}><p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>Not enough like-for-like purchases yet to show a movement.</p></div>;
  const labels = [...new Set(lines.flatMap((l) => l.points.map((p) => p.label)))];
  const lo = Math.min(100, ...all.map((p) => p.index)), hi = Math.max(100, ...all.map((p) => p.index));
  const pad = Math.max(1, (hi - lo) * 0.15), y0 = lo - pad, y1 = hi + pad;
  const x = (label: string) => { const i = labels.indexOf(label); return L + (labels.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1)); };
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(y0 + t * (y1 - y0))))];
  const colW = labels.length > 1 ? (W - L - R) / (labels.length - 1) : W - L - R;
  const chg = (v: number) => { const c = v - 100; return Math.abs(c) < 0.05 ? "no change" : `${c > 0 ? "+" : "−"}${Math.abs(c).toFixed(1)}%`; };
  const tipFor = (lb: string) => {
    const rows = lines.flatMap((l) => { const p = l.points.find((q) => q.label === lb); return p ? [{ label: l.name, value: `${p.index.toFixed(1)} (${chg(p.index)})`, swatch: l.color }] : []; });
    const first = lines.flatMap((l) => l.points.filter((q) => q.label === lb).map((q) => q.sources))[0];
    return { key: lb, x: x(lb), y: Math.min(...lines.flatMap((l) => l.points.filter((q) => q.label === lb).map((q) => y(q.index)))), vw: W, vh: H, title: `${lb}: index (100 = first month)`, rows: first === undefined ? rows : [...rows, { label: "Organisations", value: String(first) }] };
  };
  const every = Math.max(1, Math.ceil(labels.length / (W < 480 ? 4 : 8)));
  const summary = `${title}. ` + lines.map((l) => { const a = l.points[0], b = l.points[l.points.length - 1]; return a && b ? `${l.name} went from 100 in ${a.label} to ${b.index.toFixed(1)} in ${b.label}.` : ""; }).join(" ");
  return (
    <div ref={box} style={{ width: "100%", position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={summary} style={{ display: "block", touchAction: "manipulation" }} onClick={close}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--u-border)" strokeWidth={1} /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--u-ink-secondary)">{t}</text></g>)}
        <line x1={L} x2={W - R} y1={y(100)} y2={y(100)} stroke="var(--u-ink-secondary)" strokeWidth={1.2} strokeDasharray="2 4" />
        {lines.map((l) => (
          <g key={l.id}>
            <path d={l.points.map((p, i) => `${i ? "L" : "M"}${x(p.label)},${y(p.index)}`).join(" ")} fill="none" stroke={l.color} strokeWidth={2.5} strokeDasharray={l.dash} strokeLinejoin="round" />
            {l.points.map((p) => <circle key={p.label} cx={x(p.label)} cy={y(p.index)} r={activeKey === p.label ? 6 : 3.6} fill={activeKey === p.label ? l.color : "var(--u-surface)"} stroke={l.color} strokeWidth={2} pointerEvents="none" />)}
          </g>
        ))}
        {activeKey && <line x1={x(activeKey)} x2={x(activeKey)} y1={T} y2={H - B} stroke="var(--u-ink-secondary)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />}
        {labels.map((lb) => { const t = tipFor(lb); return <rect key={`hit-${lb}`} x={x(lb) - colW / 2} y={T} width={Math.max(24, colW)} height={H - T - B} fill="transparent" tabIndex={0} role="button" aria-label={`${lb}: ${t.rows.map((r) => `${r.label} ${r.value}`).join(", ")}`} style={{ cursor: "pointer", outlineOffset: -2 }} {...bind(t)} />; })}
        {labels.map((lb, i) => (i % every === 0 || i === labels.length - 1 ? <text key={lb} x={x(lb)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--u-ink-secondary)">{lb}</text> : null))}
      </svg>
      <ChartTooltip tip={tip} onClose={close} />
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", listStyle: "none", margin: "6px 0 0", padding: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
        {lines.map((l) => (
          <li key={l.id}><svg width="26" height="8" aria-hidden style={{ verticalAlign: "middle", marginRight: 6 }}><line x1="0" x2="26" y1="4" y2="4" stroke={l.color} strokeWidth={3} strokeDasharray={l.dash} /></svg>{l.name}</li>
        ))}
        <li>Dotted line: 100, the starting level</li>
      </ul>
    </div>
  );
}
