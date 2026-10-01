"use client";

import type { ReactNode } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "./icons";

/** A <th> with a click-to-sort affordance and direction indicator — shared
 * by the Projects and Stakeholders tables. */
export function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  style,
}: {
  label: ReactNode;
  sortKey: string;
  activeKey: string | null;
  direction: "asc" | "desc";
  onSort: (key: string) => void;
  style?: React.CSSProperties;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: "10px 8px",
        textAlign: "left",
        fontSize: 12,
        fontWeight: 700,
        color: active ? "var(--u-ink)" : "var(--u-ink-secondary)",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUpIcon size={12} />
          ) : (
            <ArrowDownIcon size={12} />
          )
        ) : (
          <span style={{ width: 12, display: "inline-block" }} />
        )}
      </span>
    </th>
  );
}
