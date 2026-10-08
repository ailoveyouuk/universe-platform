"use client";

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
      <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>
        {value === undefined ? "—" : value}
      </span>
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
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
