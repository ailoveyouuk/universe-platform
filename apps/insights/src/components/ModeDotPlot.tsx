"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChartTooltip, useChartTip, type TipRow } from "./ChartTip";

export const MODE_NAME: Record<string, string> = { AIR: "Air", SEA: "Sea", LAND: "Land" };
/** One colour and one shape per transport mode, used by every chart, map and key that shows modes, so a key always matches its marks. */
export const MODE_FILL: Record<string, string> = { AIR: "var(--u-accent-magenta)", SEA: "var(--u-brand-violet)", LAND: "var(--u-status-good)" };
const MODE_ORDER = ["SEA", "AIR", "LAND"];

function Shape({ mode, cx, cy, r, opacity = 0.9, stroke = "var(--u-surface-raised)" }: { mode: string; cx: number; cy: number; r: number; opacity?: number; stroke?: string }) {
  const common = { fill: MODE_FILL[mode] ?? "var(--u-ink-secondary)", fillOpacity: opacity, stroke, strokeWidth: 1.5 };
  return mode === "AIR" ? <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={2} {...common} />
    : mode === "LAND" ? <polygon points={`${cx},${cy - r * 1.15} ${cx + r * 1.1},${cy + r * 0.85} ${cx - r * 1.1},${cy + r * 0.85}`} {...common} />
    : <circle cx={cx} cy={cy} r={r} {...common} />;
}

/** The key for mode marks: the same shapes and colours the chart draws, so nothing has to be matched by guesswork. */
export function ModeLegend({ modes = MODE_ORDER, note }: { modes?: string[]; note?: string }) {
  return (
    <div role="group" aria-label="Key to marks" style={{ display: "flex", gap: "6px 18px", flexWrap: "wrap", fontSize: 12.5, alignItems: "center", marginBottom: 8, color: "var(--u-ink)" }}>
      {modes.map((m) => <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><Shape mode={m} cx={8} cy={8} r={6} /></svg>{MODE_NAME[m] ?? m}</span>)}
      {note && <span style={{ color: "var(--u-ink-secondary)" }}>{note}</span>}
    </div>
  );
}

export interface DotMark { key: string; mode: string; value: number; size: number; tipTitle: string; tipRows: TipRow[]; aria: string }
export interface DotRow { id: string; label: string; marks: DotMark[] }

const ROW = 34, T = 8, B = 50, R = 22;

/**
 * Dot plot: one row per lane (or product group), one mark per transport mode on a shared log scale, joined by a line so the gap between modes is
 * easy to see. Mark colour and shape both show the mode (matching ModeLegend); size shows shipments. Marks are keyboard-focusable and open their
 * exact values on hover, focus, click or tap. Drawn at the width it is shown at so text stays readable on a phone.
 */
export function ModeDotPlot({ rows, axisLabel, tick, ariaLabel, activeMode, onSelect }: {
  rows: DotRow[]; axisLabel: string; tick: (v: number) => string; ariaLabel: string; activeMode?: string; onSelect?: (rowId: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setW(Math.max(280, Math.round(el.clientWidth)));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  const { tip, bind, close, activeKey } = useChartTip();
  const L = W < 480 ? 112 : W < 900 ? 200 : 250;
  const H = T + rows.length * ROW + B;
  const g = useMemo(() => {
    const vals = rows.flatMap((r) => r.marks.map((m) => m.value)).filter((v) => v > 0);
    if (!vals.length) return null;
    const lo = Math.log10(Math.min(...vals) / 1.5), hi = Math.log10(Math.max(...vals) * 1.5);
    const maxN = Math.max(...rows.flatMap((r) => r.marks.map((m) => m.size)), 1);
    const x = (v: number) => L + ((Math.log10(v) - lo) / (hi - lo)) * (W - L - R);
    const ticks: number[] = []; for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) ticks.push(10 ** e);
    return { x, ticks, maxN };
  }, [rows, W, L]);
  if (!g) return <div ref={box}><p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>Nothing has enough contributors to show yet.</p></div>;
  const maxChars = Math.floor((L - 12) / 6.4);
  const clip = (s: string) => (s.length > maxChars ? `${s.slice(0, maxChars - 1)}…` : s);
  return (
    <div ref={box} style={{ width: "100%", position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={ariaLabel} style={{ display: "block", touchAction: "manipulation" }} onClick={close}>
        {g.ticks.map((t) => <g key={t}><line x1={g.x(t)} x2={g.x(t)} y1={T} y2={H - B} stroke="var(--u-border)" strokeWidth={1} strokeDasharray="2 4" /><text x={g.x(t)} y={H - B + 16} textAnchor="middle" fontSize={11} fill="var(--u-ink-secondary)">{tick(t)}</text></g>)}
        <text x={(L + W - R) / 2} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--u-ink-secondary)">{axisLabel}</text>
        {rows.map((row, i) => {
          const cy = T + i * ROW + ROW / 2;
          const vs = row.marks.map((m) => g.x(m.value));
          return (
            <g key={row.id}>
              {i % 2 === 0 && <rect x={0} y={T + i * ROW} width={W} height={ROW} fill="var(--u-surface-alt)" opacity={0.5} />}
              <text x={L - 10} y={cy + 4} textAnchor="end" fontSize={12} fill="var(--u-ink)">{clip(row.label)}<title>{row.label}</title></text>
              {vs.length > 1 && <line x1={Math.min(...vs)} x2={Math.max(...vs)} y1={cy} y2={cy} stroke="var(--u-ink-secondary)" strokeWidth={2} opacity={0.45} />}
              {[...row.marks].sort((a, b) => b.size - a.size).map((m) => {
                const r = 5 + 6 * Math.sqrt(m.size / g.maxN), cx = g.x(m.value);
                const dim = !!activeMode && activeMode !== m.mode;
                const b = bind({ key: m.key, x: cx, y: cy - r, vw: W, vh: H, title: m.tipTitle, rows: m.tipRows });
                return (
                  <g data-chart-hit key={m.key} tabIndex={0} role="button" aria-label={m.aria} style={{ cursor: "pointer", outlineOffset: 2 }}
                    {...b} onClick={(e) => { b.onClick(e); onSelect?.(row.id); }} onKeyDown={(e) => { b.onKeyDown(e); if (e.key === "Enter" || e.key === " ") onSelect?.(row.id); }}>
                    <circle cx={cx} cy={cy} r={Math.max(r, 14)} fill="transparent" />
                    {activeKey === m.key && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="var(--u-ink)" strokeWidth={2} />}
                    <Shape mode={m.mode} cx={cx} cy={cy} r={r} opacity={dim ? 0.25 : 0.9} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} onClose={close} />
    </div>
  );
}
