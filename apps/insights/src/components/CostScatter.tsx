"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChartTooltip, useChartTip } from "./ChartTip";
import { fmtMoney } from "../lib/format";

export interface CostPoint { id: string; label: string; mode: string; km: number; cost: number; shipments: number }
const FILL: Record<string, string> = { AIR: "var(--u-accent-magenta)", SEA: "var(--u-brand-violet)", LAND: "var(--u-status-good)" };
const NAME: Record<string, string> = { AIR: "Air", SEA: "Sea", LAND: "Land" };
const L = 66, R = 18, T = 14, B = 48;

/**
 * Distance against freight cost per tonne: one mark per lane and mode. Across is the lane's distance, up is cost per tonne on a log scale
 * (air costs many times sea). Shape tells the mode apart without relying on colour (circle sea, square air, triangle land). Marks are
 * keyboard-focusable and the page also offers a table. Drawn at the width it is shown at so text stays readable on a phone.
 */
export function CostScatter({ points, currency }: { points: CostPoint[]; currency: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setW(Math.max(280, Math.round(el.clientWidth)));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 320 : 360;
  const { tip, bind, close, activeKey } = useChartTip();
  const g = useMemo(() => {
    if (!points.length) return null;
    const maxKm = Math.max(...points.map((p) => p.km)) * 1.08;
    const lo = Math.log10(Math.min(...points.map((p) => p.cost)) / 1.4), hi = Math.log10(Math.max(...points.map((p) => p.cost)) * 1.4);
    const maxN = Math.max(...points.map((p) => p.shipments));
    const x = (d: number) => L + (d / maxKm) * (W - L - R);
    const y = (c: number) => T + (1 - (Math.log10(c) - lo) / (hi - lo)) * (H - T - B);
    const step = maxKm / (W < 480 ? 4 : 5);
    const xTicks = Array.from({ length: (W < 480 ? 4 : 5) + 1 }, (_, i) => Math.round((step * i) / 500) * 500);
    const yTicks: number[] = []; for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) yTicks.push(10 ** e);
    return { x, y, xTicks, yTicks, maxN };
  }, [points, W, H]);
  if (!g) return <div ref={box}><p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No lane has enough contributors to show yet.</p></div>;
  return (
    <div ref={box} style={{ width: "100%", position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Chart of lane distance against freight cost per tonne in ${currency}, one mark per lane and transport mode. The same figures are in the table below.`} style={{ display: "block", touchAction: "manipulation" }} onClick={close}>
        {g.yTicks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={g.y(t)} y2={g.y(t)} stroke="var(--u-border)" strokeWidth={1} /><text x={L - 8} y={g.y(t) + 4} textAnchor="end" fontSize={11} fill="var(--u-ink-secondary)">{fmtMoney(t)}</text></g>)}
        {g.xTicks.map((t) => <g key={t}><line x1={g.x(t)} x2={g.x(t)} y1={T} y2={H - B} stroke="var(--u-border)" strokeWidth={1} strokeDasharray="2 4" /><text x={g.x(t)} y={H - B + 16} textAnchor="middle" fontSize={11} fill="var(--u-ink-secondary)">{t.toLocaleString("en-GB")}</text></g>)}
        <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--u-ink-secondary)">Lane distance (km)</text>
        <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="var(--u-ink-secondary)">{currency} per tonne (log scale)</text>
        {[...points].sort((a, b) => b.shipments - a.shipments).map((p) => {
          const r = 5 + 11 * Math.sqrt(p.shipments / g.maxN), cx = g.x(p.km), cy = g.y(p.cost);
          const label = `${p.label}, ${NAME[p.mode] ?? p.mode}: ${Math.round(p.km).toLocaleString("en-GB")} km, ${fmtMoney(p.cost)} ${currency} per tonne, ${p.shipments.toLocaleString("en-GB")} shipments`;
          const common = { fill: FILL[p.mode] ?? "var(--u-ink-secondary)", fillOpacity: 0.78, stroke: "var(--u-surface-raised)", strokeWidth: 1.5 };
          return (
            <g data-chart-hit key={p.id} tabIndex={0} role="button" aria-label={label} style={{ cursor: "pointer", outlineOffset: 2 }} {...bind({ key: p.id, x: cx, y: cy - r, vw: W, vh: H, title: `${p.label}, ${NAME[p.mode] ?? p.mode}`, rows: [{ label: "Distance", value: `${Math.round(p.km).toLocaleString("en-GB")} km` }, { label: "Cost per tonne", value: `${fmtMoney(p.cost)} ${currency}` }, { label: "Shipments", value: p.shipments.toLocaleString("en-GB") }] })}>
              <circle cx={cx} cy={cy} r={Math.max(r, 14)} fill="transparent" />
              {activeKey === p.id && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="var(--u-ink)" strokeWidth={2} />}
              {p.mode === "AIR" ? <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={2} {...common} /> : p.mode === "LAND" ? <path d={`M${cx},${cy - r * 1.15} L${cx + r * 1.1},${cy + r * 0.85} L${cx - r * 1.1},${cy + r * 0.85} Z`} {...common} /> : <circle cx={cx} cy={cy} r={r} {...common} />}
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} onClose={close} />
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", listStyle: "none", margin: "6px 0 0", padding: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
        <li>● Sea</li><li>■ Air</li><li>▲ Land</li><li>Larger mark: more shipments</li>
      </ul>
    </div>
  );
}
