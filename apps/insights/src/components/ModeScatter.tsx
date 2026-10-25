"use client";

import { useMemo } from "react";

export interface ScatterPoint { id: string; label: string; mode: string; days: number; co2: number; shipments: number; commodity: string }

const FILL: Record<string, string> = { AIR: "var(--u-accent-magenta)", SEA: "var(--u-brand-violet)", LAND: "var(--u-status-good)" };
export const MODE_NAME: Record<string, string> = { AIR: "Air", SEA: "Sea", LAND: "Land" };
const W = 680, H = 360, L = 66, R = 18, T = 14, B = 48;

/**
 * Speed against CO2: one mark per product group and transport mode. Across is average days in transit, up is average CO2e per shipment on a log
 * scale (air is around forty times sea, so a straight scale would squash the other modes flat). Size shows shipments; the shape tells the mode
 * apart without relying on colour (circle sea, square air, triangle land). Every mark is keyboard-focusable and the page also offers a table.
 */
export function ModeScatter({ points, activeMode, onSelect }: { points: ScatterPoint[]; activeMode: string; onSelect: (p: ScatterPoint) => void }) {
  const g = useMemo(() => {
    if (!points.length) return null;
    const maxDays = Math.max(...points.map((p) => p.days)) * 1.08;
    const lo = Math.log10(Math.min(...points.map((p) => p.co2)) / 1.4), hi = Math.log10(Math.max(...points.map((p) => p.co2)) * 1.4);
    const maxN = Math.max(...points.map((p) => p.shipments));
    const x = (d: number) => L + (d / maxDays) * (W - L - R);
    const y = (c: number) => T + (1 - (Math.log10(c) - lo) / (hi - lo)) * (H - T - B);
    const xTicks = Array.from({ length: 6 }, (_, i) => Math.round((maxDays / 5) * i));
    const yTicks: number[] = []; for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) yTicks.push(10 ** e);
    return { x, y, xTicks, yTicks, maxN };
  }, [points]);
  if (!g) return <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No route has enough contributors to show yet.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Chart of average days in transit against average CO2e per shipment, one mark per product group and transport mode. The same figures are in the table below." style={{ width: "100%", height: "auto", display: "block" }}>
      {g.yTicks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={g.y(t)} y2={g.y(t)} stroke="var(--u-border)" strokeWidth={1} /><text x={L - 8} y={g.y(t) + 4} textAnchor="end" fontSize={11} fill="var(--u-ink-secondary)">{t.toLocaleString("en-GB")}</text></g>)}
      {g.xTicks.map((t) => <g key={t}><line x1={g.x(t)} x2={g.x(t)} y1={T} y2={H - B} stroke="var(--u-border)" strokeWidth={1} strokeDasharray="2 4" /><text x={g.x(t)} y={H - B + 16} textAnchor="middle" fontSize={11} fill="var(--u-ink-secondary)">{t}</text></g>)}
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--u-ink-secondary)">Average days in transit</text>
      <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="var(--u-ink-secondary)">kg CO2e per shipment (log scale)</text>
      {[...points].sort((a, b) => b.shipments - a.shipments).map((p) => {
        const r = 5 + 13 * Math.sqrt(p.shipments / g.maxN), cx = g.x(p.days), cy = g.y(p.co2), dim = activeMode && activeMode !== p.mode;
        const label = `${p.label}, ${MODE_NAME[p.mode] ?? p.mode}: about ${Math.round(p.days)} days, ${Math.round(p.co2).toLocaleString("en-GB")} kg CO2e per shipment, ${p.shipments.toLocaleString("en-GB")} shipments`;
        const common = { fill: FILL[p.mode] ?? "var(--u-ink-secondary)", fillOpacity: dim ? 0.18 : 0.78, stroke: "var(--u-surface-raised)", strokeWidth: 1.5 };
        return (
          <g key={p.id} tabIndex={0} role="button" aria-label={label} onClick={() => onSelect(p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p); } }} style={{ cursor: "pointer" }}>
            <title>{label}</title>
            {p.mode === "AIR" ? <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={2} {...common} /> : p.mode === "LAND" ? <polygon points={`${cx},${cy - r * 1.15} ${cx + r * 1.1},${cy + r * 0.85} ${cx - r * 1.1},${cy + r * 0.85}`} {...common} /> : <circle cx={cx} cy={cy} r={r} {...common} />}
          </g>
        );
      })}
    </svg>
  );
}
