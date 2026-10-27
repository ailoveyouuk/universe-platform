import type { CSSProperties, ReactNode } from "react";

/**
 * Small, shared picture pieces for figures (2026-10-27, Lewis: show data as clear, colourful, drillable visuals rather than lists of text). Every piece:
 * uses only design tokens (so light and dark both work), never puts text in a bright status colour, carries its numbers in an accessible name, and does not
 * rely on colour alone (values are printed or in the title, and a legend names each colour).
 */

export type VizTone = "brand" | "good" | "warning" | "critical" | "neutral" | "crm";
const FILL: Record<VizTone, string> = {
  brand: "var(--u-brand-violet)", good: "var(--u-status-good)", warning: "var(--u-status-warning)", critical: "var(--u-status-critical)",
  neutral: "color-mix(in srgb, var(--u-ink-secondary) 70%, var(--u-surface))", crm: "var(--u-module-crm)",
};
export const vizFill = (t: VizTone) => FILL[t];

/** A ring showing a percentage (a chance of winning, a share delivered). The number sits in the middle in normal ink. */
export function ProgressRing({ value, size = 56, tone = "brand", label, caption, title }: { value: number | null; size?: number; tone?: VizTone; label?: string; caption?: string; title?: string }) {
  const stroke = Math.max(4, Math.round(size / 9)), r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const text = label ?? (value === null ? "—" : `${Math.round(value)}%`);
  const name = title ?? `${caption ?? "Value"}: ${value === null ? "not recorded yet" : `${Math.round(value)} per cent`}`;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={name}>
        <title>{name}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--u-hover)" strokeWidth={stroke} />
        {value !== null && v > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={FILL[tone]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--u-ink)" style={{ fontSize: Math.round(size / 4), fontWeight: 700, fontFamily: "var(--u-font-display)" }}>{text}</text>
      </svg>
      {caption && <span style={{ fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{caption}</span>}
    </span>
  );
}

export interface VizSegment { key: string; label: string; value: number; tone: VizTone; href?: string; onClick?: () => void }

/** One horizontal bar split into segments with a 2px gap (work by outcome, deals by stage). Segments can be pressed to drill in. */
export function SegmentBar({ segments, height = 12, legend = false, ariaLabel, minWidth = 90 }: { segments: VizSegment[]; height?: number; legend?: boolean; ariaLabel: string; minWidth?: number }) {
  const total = segments.reduce((n, s) => n + Math.max(0, s.value), 0);
  const live = segments.filter((s) => s.value > 0);
  const summary = `${ariaLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`;
  return (
    <div style={{ display: "grid", gap: 4, minWidth }}>
      <div role="img" aria-label={summary} title={summary} style={{ display: "flex", gap: 2, height, borderRadius: height, overflow: "hidden", backgroundColor: "var(--u-hover)" }}>
        {total > 0 && live.map((s) => {
          const seg: CSSProperties = { flex: `${s.value} 1 0`, minWidth: 4, backgroundColor: FILL[s.tone], border: 0, padding: 0, cursor: s.onClick || s.href ? "pointer" : "default" };
          return s.onClick ? <button key={s.key} type="button" aria-label={`${s.label}: ${s.value}. Show these`} title={`${s.label}: ${s.value}`} onClick={s.onClick} style={seg} /> : <span key={s.key} title={`${s.label}: ${s.value}`} style={seg} />;
        })}
      </div>
      {legend && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 12, color: "var(--u-ink-secondary)" }}>
          {segments.map((s) => <li key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: FILL[s.tone] }} />{s.label} {s.value}</li>)}
        </ul>
      )}
    </div>
  );
}

/** A bar against a limit (a framework ceiling): the used part, the part still free, and an optional marker. */
export function MeterBar({ used, max, tone = "brand", ariaLabel, marker, children }: { used: number; max: number | null; tone?: VizTone; ariaLabel: string; marker?: { at: number; label: string }; children?: ReactNode }) {
  const pct = max && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : null;
  const over = max !== null && max > 0 && used > max;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div role="img" aria-label={`${ariaLabel}${pct === null ? "" : `: ${pct} per cent used${over ? ", over the limit" : ""}`}`} style={{ position: "relative", height: 12, borderRadius: 12, backgroundColor: "var(--u-hover)", overflow: "hidden" }}>
        {pct !== null && <span style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct}%`, backgroundColor: over ? FILL.critical : FILL[tone], borderRadius: 12 }} />}
        {marker && <span title={marker.label} style={{ position: "absolute", top: 0, bottom: 0, left: `${Math.max(0, Math.min(100, marker.at))}%`, width: 2, backgroundColor: "var(--u-ink)" }} />}
      </div>
      {children}
    </div>
  );
}

/** A coloured dot beside a label — the identity colour is on the dot, the text keeps normal ink. */
export function Dot({ colour, size = 10 }: { colour: string; size?: number }) {
  return <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", backgroundColor: colour, flex: "none" }} />;
}
