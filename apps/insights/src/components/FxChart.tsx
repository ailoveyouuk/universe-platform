"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InsightsFxPoint } from "@universe/types";
import { ChartTooltip, useChartTip } from "./ChartTip";
import { rateText } from "../lib/fx";

const L = 62, R = 16, T = 14, B = 34;
const dayText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

/**
 * The daily exchange rate for one pair over time (2026-10-25): a line with a point for each published day. A shaded band marks the months the
 * prices on screen were logged in, and a vertical line marks the date the figures are being converted at. Hover, tap or focus a point for that day's
 * exact rate. Drawn at the width it is shown at; the same figures are in a table beside it for screen readers and keyboard use.
 */
export function FxChart({ points, from, to, loggedMonths = [], asOf }: { points: InsightsFxPoint[]; from: string; to: string; loggedMonths?: string[]; asOf?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setW(Math.max(280, Math.round(el.clientWidth)));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 240 : 280;
  const { tip, bind, close, activeKey } = useChartTip();
  const g = useMemo(() => {
    if (points.length < 2) return null;
    const t0 = Date.parse(`${points[0]!.date}T00:00:00Z`), t1 = Date.parse(`${points[points.length - 1]!.date}T00:00:00Z`);
    const lo = Math.min(...points.map((p) => p.rate)), hi = Math.max(...points.map((p) => p.rate));
    const pad = (hi - lo || hi * 0.01 || 1) * 0.12; const y0 = lo - pad, y1 = hi + pad;
    const x = (d: string) => L + ((Date.parse(`${d}T00:00:00Z`) - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => y0 + f * (y1 - y0));
    const nx = W < 480 ? 3 : 5;
    const xTicks = Array.from({ length: nx + 1 }, (_, i) => points[Math.round((i / nx) * (points.length - 1))]!.date);
    const stride = Math.max(1, Math.ceil(points.length / 12));
    return { x, y, yTicks, xTicks, t0, t1, stride };
  }, [points, W, H]);
  if (!g) return <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>Not enough exchange-rate days to draw a chart yet.</p>;
  const line = points.map((p, i) => `${i ? "L" : "M"}${g.x(p.date).toFixed(1)},${g.y(p.rate).toFixed(1)}`).join(" ");
  const logged = loggedMonths.length ? [...loggedMonths].sort() : [];
  const bandStart = logged.length ? `${logged[0]}-01` : null;
  const bandEnd = logged.length ? new Date(Date.UTC(+logged[logged.length - 1]!.slice(0, 4), +logged[logged.length - 1]!.slice(5, 7), 0)).toISOString().slice(0, 10) : null;
  const inRange = (d: string) => Date.parse(`${d}T00:00:00Z`) >= g.t0 && Date.parse(`${d}T00:00:00Z`) <= g.t1;
  const last = points[points.length - 1]!, first = points[0]!;
  const summary = `Daily exchange rate, 1 ${from} in ${to}, from ${dayText(first.date)} (${rateText(first.rate)}) to ${dayText(last.date)} (${rateText(last.rate)}). Highest ${rateText(Math.max(...points.map((p) => p.rate)))}, lowest ${rateText(Math.min(...points.map((p) => p.rate)))}. The same days are in the table.`;
  const colW = (W - L - R) / Math.max(1, points.length - 1);
  return (
    <div ref={box} style={{ width: "100%", position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={summary} style={{ display: "block", touchAction: "manipulation" }} onClick={close}>
        {g.yTicks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={g.y(t)} y2={g.y(t)} stroke="var(--u-border)" strokeWidth={1} /><text x={L - 8} y={g.y(t) + 4} textAnchor="end" fontSize={11} fill="var(--u-ink-secondary)">{rateText(t)}</text></g>)}
        {g.xTicks.map((d, i) => <text key={`${d}-${i}`} x={g.x(d)} y={H - 10} textAnchor={i === 0 ? "start" : i === g.xTicks.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--u-ink-secondary)">{shortDay(d)}</text>)}
        {bandStart && bandEnd && (() => { const a = Math.max(g.x(bandStart < first.date ? first.date : bandStart), L), b = Math.min(g.x(bandEnd > last.date ? last.date : bandEnd), W - R); return b > a ? <rect x={a} y={T} width={b - a} height={H - T - B} fill="var(--u-org-accent, var(--u-brand-violet))" opacity={0.12} /> : null; })()}
        {asOf && inRange(asOf) && <g><line x1={g.x(asOf)} x2={g.x(asOf)} y1={T} y2={H - B} stroke="var(--u-ink)" strokeWidth={1.5} strokeDasharray="4 3" /></g>}
        <path d={line} fill="none" stroke="var(--u-org-accent, var(--u-brand-violet))" strokeWidth={2} strokeLinejoin="round" />
        {activeKey && (() => { const p = points.find((q) => q.date === activeKey); return p ? <g pointerEvents="none"><line x1={g.x(p.date)} x2={g.x(p.date)} y1={T} y2={H - B} stroke="var(--u-ink-secondary)" strokeDasharray="3 3" /><circle cx={g.x(p.date)} cy={g.y(p.rate)} r={5} fill="var(--u-org-accent, var(--u-brand-violet))" stroke="var(--u-surface-raised)" strokeWidth={2} /></g> : null; })()}
        <circle cx={g.x(last.date)} cy={g.y(last.rate)} r={3.5} fill="var(--u-org-accent, var(--u-brand-violet))" />
        {points.map((p, i) => {
          const t = { key: p.date, x: g.x(p.date), y: g.y(p.rate), vw: W, vh: H, title: dayText(p.date), rows: [{ label: `1 ${from} =`, value: `${rateText(p.rate)} ${to}` }, { label: `1 ${to} =`, value: `${rateText(1 / p.rate)} ${from}` }] };
          const focusable = i % g.stride === 0 || i === points.length - 1;
          return <rect data-chart-hit key={p.date} x={g.x(p.date) - Math.max(2, colW) / 2} y={T} width={Math.max(2, colW)} height={H - T - B} fill="transparent" tabIndex={focusable ? 0 : -1} role={focusable ? "button" : undefined} aria-label={focusable ? `${dayText(p.date)}: 1 ${from} = ${rateText(p.rate)} ${to}` : undefined} aria-hidden={focusable ? undefined : true} style={{ cursor: "pointer" }} {...bind(t)} />;
        })}
      </svg>
      <ChartTooltip tip={tip} onClose={close} />
      <div style={{ display: "flex", gap: "4px 16px", flexWrap: "wrap", fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "6px 0 0" }}>
        <span><span aria-hidden style={{ display: "inline-block", width: 14, height: 3, background: "var(--u-org-accent, var(--u-brand-violet))", marginRight: 6, verticalAlign: "middle" }} />Daily rate: 1 {from} in {to}</span>
        {bandStart && <span><span aria-hidden style={{ display: "inline-block", width: 14, height: 10, background: "var(--u-org-accent, var(--u-brand-violet))", opacity: 0.2, marginRight: 6, verticalAlign: "middle" }} />Months the prices were logged</span>}
        {asOf && inRange(asOf) && <span><span aria-hidden style={{ display: "inline-block", width: 0, height: 12, borderLeft: "2px dashed var(--u-ink)", marginRight: 8, verticalAlign: "middle" }} />Conversion date</span>}
      </div>
    </div>
  );
}
