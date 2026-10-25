"use client";

import type { InsightsActivityMetric } from "@universe/types";
import { ChartTooltip, useChartTip } from "./ChartTip";

const W = 280, H = 64, PAD = 6;
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * One of the "most active today" tiles on the Overview (2026-10-25): a big number, how it compares with the previous week's daily average, and a
 * 14-day line. Solid colour from the platform palette with the on-accent text colour; the line points can be hovered, tapped or reached by keyboard.
 */
export function ActivityTile({ m, color, isLatestToday }: { m: InsightsActivityMetric; color: string; isLatestToday: boolean }) {
  const { tip, bind, close } = useChartTip();
  const max = Math.max(1, ...m.series.map((s) => s.count));
  const x = (i: number) => PAD + (i / (m.series.length - 1)) * (W - 2 * PAD);
  const y = (c: number) => H - PAD - (c / max) * (H - 2 * PAD);
  const line = m.series.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(s.count).toFixed(1)}`).join(" ");
  const area = `${line} L${x(m.series.length - 1).toFixed(1)} ${H - PAD} L${x(0).toFixed(1)} ${H - PAD} Z`;
  const change = m.changePct === null ? "No earlier week to compare with" : m.changePct === 0 ? "Same as the previous week's daily average" : `${m.changePct > 0 ? "Up" : "Down"} ${Math.abs(m.changePct)}% on the previous week's daily average (${m.avgPrevious7})`;
  const arrow = m.changePct === null ? "" : m.changePct > 0 ? "▲ " : m.changePct < 0 ? "▼ " : "";
  return (
    <article aria-label={`${m.label}: ${m.count.toLocaleString("en-GB")} ${m.unit} ${isLatestToday ? "today" : "on " + dayLabel(m.day)}. ${change}.`} style={{ backgroundColor: color, color: "var(--u-on-accent)", borderRadius: "var(--u-radius-lg)", padding: "18px 18px 12px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>{m.label}</div>
      <div style={{ fontFamily: "var(--u-font-display)", fontSize: 44, lineHeight: 1.05, fontWeight: 700 }}>{m.count.toLocaleString("en-GB")}</div>
      <div style={{ fontSize: 13 }}>{isLatestToday ? "today" : dayLabel(m.day)} · {m.organisations} organisations</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{arrow}{m.changePct === null ? "New this week" : `${Math.abs(m.changePct)}% ${m.changePct >= 0 ? "above" : "below"} the weekly average`}</div>
      <div style={{ position: "relative", marginTop: 6 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={`Last 14 days of ${m.label.toLowerCase()}`} style={{ display: "block", overflow: "visible" }} onClick={close}>
          <path d={area} fill="currentColor" opacity={0.18} />
          <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {m.series.map((s, i) => {
            const key = `${m.id}-${s.day}`;
            const t = { x: x(i), y: y(s.count), vw: W, vh: H, title: dayLabel(s.day), rows: [{ label: m.unit, value: s.count.toLocaleString("en-GB") }], key };
            return (
              <g key={key} tabIndex={0} role="img" aria-label={`${dayLabel(s.day)}: ${s.count.toLocaleString("en-GB")} ${m.unit}`} data-chart-hit {...bind(t)} style={{ cursor: "pointer" }}>
                <rect x={x(i) - (W - 2 * PAD) / (m.series.length - 1) / 2} y={0} width={(W - 2 * PAD) / (m.series.length - 1)} height={H} fill="transparent" />
                <circle cx={x(i)} cy={y(s.count)} r={tip?.key === key ? 5 : i === m.series.length - 1 ? 4 : 2.5} fill="currentColor" />
              </g>
            );
          })}
        </svg>
        <ChartTooltip tip={tip} onClose={close} />
      </div>
      <div style={{ fontSize: 12 }}>Last 14 days</div>
    </article>
  );
}
