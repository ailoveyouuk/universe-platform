"use client";

import { statusText } from "./statusText";
import type { CSSProperties, ReactNode } from "react";

/**
 * The small "key metrics" tile used across every top-level section's
 * mini-dashboard (Project Management's home page, Stakeholders, Quality,
 * Logistics & CO2) — extracted 2026-10-08 from three near-identical,
 * independently-hand-written copies (page.tsx's own `StatTile`,
 * partners/page.tsx's `SectionStat`, quality/page.tsx's `QaTile`) so the
 * livery (icon placement, tone colours, display-font figure) stays one
 * thing to change rather than three. Per Lewis's "standardize the small
 * key-metrics dashboard across all sections" request.
 *
 * Deliberately presentation-only — no `next/link` dependency, same
 * reasoning as TextLink.tsx — so it works unmodified in any app. A tile
 * that should navigate gets wrapped in the caller's own `<Link>` (see
 * page.tsx); a tile that should filter in place passes `onClick` instead,
 * which renders a `<button>` so it stays keyboard/focus accessible.
 */
export type StatTileTone = "brand" | "warning" | "good" | "neutral" | "critical";

const TONE_COLORS: Record<StatTileTone, string> = {
  brand: "var(--u-org-accent, var(--u-brand-violet))",
  warning: "var(--u-status-warning)",
  good: "var(--u-status-good)",
  neutral: "var(--u-ink-secondary)",
  critical: "var(--u-status-critical)",
};

export function StatTile({
  label,
  value,
  icon,
  tone = "brand",
  active,
  onClick,
  note,
  indicator,
}: {
  label: string;
  value: number | string | undefined;
  icon: ReactNode;
  tone?: StatTileTone;
  /** Highlights the tile as the currently-applied filter — see partners/page.tsx. */
  active?: boolean;
  /** When set, the tile renders as a `<button>` and applies a filter in place
   * rather than relying on an outer `<Link>` for navigation. */
  onClick?: () => void;
  /** Small qualifier shown before the figure, e.g. "approx." */
  note?: string;
  /** Colour-coded quick-read indicator under the figure (e.g. a score band); `fraction` (0–1) fills a thin gauge. */
  indicator?: { color: string; label: string; fraction?: number; /** Colour of the gauge bar only (e.g. a red-to-green score gradient); dot and label keep `color`. */ barColor?: string };
}) {
  const color = TONE_COLORS[tone];
  const Tag = (onClick ? "button" : "div") as "button" | "div";
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      className="u-card-hover"
      style={{
        textAlign: "left",
        padding: "18px 20px",
        borderRadius: "var(--u-radius-lg)",
        border: active ? `1px solid ${color}` : "1px solid var(--u-border)",
        backgroundColor: active ? "var(--u-accent-magenta-tint)" : "var(--u-surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: onClick ? "pointer" : undefined,
        font: "inherit",
        width: "100%",
        margin: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
        <span style={{ color, display: "flex" }}>{icon}</span>
      </div>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        {note && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{note}</span>}
        <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>
          {value === undefined ? "—" : value}
        </span>
      </span>
      {indicator && (
        <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {indicator.fraction !== undefined && (
            <span aria-hidden className="u-gauge-track" style={{ display: "block", height: 6, borderRadius: "var(--u-radius-pill)", backgroundColor: "var(--u-surface-alt)", overflow: "hidden" }}>
              <span className="u-gauge-fill" style={{ display: "block", height: "100%", width: `${Math.max(4, Math.min(1, indicator.fraction) * 100)}%`, backgroundColor: indicator.barColor ?? indicator.color, borderRadius: "var(--u-radius-pill)" }} />
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: statusText(indicator.color) }}>
            <span aria-hidden className="u-gauge-fill" style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: indicator.color }} />
            {indicator.label}
          </span>
        </span>
      )}
    </Tag>
  );
}

/** Standard responsive grid wrapper for a row of StatTiles — same
 * `repeat(auto-fit, minmax(190px, 1fr))` breakpoint used everywhere this
 * pattern already appears. Purely a convenience; passing your own grid
 * `style` inline works just as well. */
export function StatTileGrid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="u-stat-grid"
      style={{
        display: "grid",
        // min(190px, 46%) keeps tiles two across on a phone instead of one full-width tile per row.
        gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))",
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
