"use client";

import { useState, type ReactNode } from "react";

/**
 * A "top N" ranked-list tile, built to sit in the same row/grid as StatTile (2026-10-17, Lewis: the ranked country list
 * should be a stylised dashboard tile above the maps rather than a list below them). Same livery as StatTile — raised
 * card, small secondary-ink label with a tone-coloured icon top-right, display-font figures — with each row showing a
 * rank, a name, the value, and a thin bar scaled to the largest row. A bar can be a single colour or split into
 * coloured `segments` (e.g. a country's category mix). Rows are buttons so a caller can link a row to the map beside it.
 * Shows `limit` rows and a quiet "Show all" toggle for the rest; the expanded list scrolls rather than pushing the page.
 */
export interface RankedRow {
  id: string;
  label: string;
  value: number;
  /** Bar colour (design token or hex). */
  color: string;
  /** Optional split of the bar; segment values should sum to ~value. */
  segments?: { color: string; value: number; label?: string }[];
  /** Small secondary text under the name, e.g. "Pharmaceuticals" — optional. */
  detail?: string;
}

export function RankedTile({
  label,
  icon,
  rows,
  limit = 5,
  tone = "var(--u-org-accent, var(--u-brand-violet))",
  activeId,
  onRowClick,
  emptyMessage = "Nothing to rank yet.",
  formatValue = (v: number) => Math.round(v).toLocaleString(),
}: {
  label: string;
  icon: ReactNode;
  rows: RankedRow[];
  limit?: number;
  /** Colour of the icon and of the rank-1 emphasis. */
  tone?: string;
  /** Row currently highlighted on the linked map. */
  activeId?: string | null;
  onRowClick?: (row: RankedRow) => void;
  emptyMessage?: string;
  formatValue?: (value: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, limit);
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;

  return (
    <div
      className="u-card-hover"
      style={{
        padding: "18px 20px",
        borderRadius: "var(--u-radius-lg)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
        <span style={{ color: tone, display: "flex" }}>{icon}</span>
      </div>

      {rows.length === 0 ? (
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{emptyMessage}</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: expanded ? 300 : undefined, overflowY: expanded ? "auto" : undefined, margin: "0 -8px", padding: "0 8px" }}>
          {shown.map((row, i) => {
            const active = row.id === activeId;
            const Tag = (onRowClick ? "button" : "div") as "button" | "div";
            return (
              <Tag
                key={row.id}
                {...(onRowClick ? { type: "button", onClick: () => onRowClick(row), "aria-pressed": active } : {})}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px minmax(0, 1fr) auto",
                  columnGap: 10,
                  alignItems: "center",
                  textAlign: "left",
                  font: "inherit",
                  margin: "0 -8px",
                  padding: "7px 8px",
                  borderRadius: "var(--u-radius-md)",
                  border: "none",
                  backgroundColor: active ? "var(--u-accent-magenta-tint)" : "transparent",
                  cursor: onRowClick ? "pointer" : undefined,
                  color: "var(--u-ink)",
                }}
              >
                <span style={{ fontFamily: "var(--u-font-display)", fontSize: 13, fontWeight: 700, color: i === 0 ? tone : "var(--u-ink-secondary)" }}>{i + 1}</span>
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                  <span style={{ display: "flex", height: 6, borderRadius: "var(--u-radius-pill)", backgroundColor: "var(--u-surface-alt)", overflow: "hidden" }} aria-hidden>
                    <span style={{ display: "flex", width: `${Math.max(3, (row.value / max) * 100)}%`, borderRadius: "var(--u-radius-pill)", overflow: "hidden" }}>
                      {row.segments && row.segments.length > 0
                        ? row.segments.map((seg, s) => <span key={s} title={seg.label} style={{ flexGrow: Math.max(seg.value, 0), flexBasis: 0, backgroundColor: seg.color }} />)
                        : <span style={{ flex: 1, backgroundColor: row.color }} />}
                    </span>
                  </span>
                </span>
                <span style={{ fontFamily: "var(--u-font-display)", fontSize: 16, fontWeight: 700 }}>{formatValue(row.value)}</span>
              </Tag>
            );
          })}
        </div>
      )}

      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, font: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--u-brand-violet)", cursor: "pointer" }}
        >
          {expanded ? `Show top ${limit}` : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

/** Responsive wrapper for one or more RankedTiles — wraps to a single column on a phone. */
export function RankedTileGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>{children}</div>;
}
