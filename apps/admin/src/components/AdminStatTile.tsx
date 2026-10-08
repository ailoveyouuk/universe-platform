"use client";

import type { ReactNode } from "react";

/**
 * Hand-matched copy of Project Management's StatTile livery
 * (packages/ui/src/StatTile.tsx) — icon top-right, big figure below —
 * for the Admin app, which doesn't import the design system's CSS tokens
 * (@universe/ui/src/tokens.css) the way project-management does. Adding
 * that import app-wide would restyle every input/button/background in
 * this app (see tokens.css's own `html, body` / `input, textarea, select,
 * button` rules), a much bigger change than "add a key-metrics strip"
 * calls for, so this hardcodes the same colour values instead
 * (brand violet #4A2E8C, status good/warning from tokens.css) to get the
 * same look without that side effect. Shared by organizations/page.tsx
 * and users/page.tsx rather than each hand-copying it again.
 */
const ADMIN_TONE_COLORS: Record<string, string> = {
  brand: "#4A2E8C",
  warning: "#fab219",
  good: "#0ca30c",
  neutral: "#6B7280",
};

export function AdminStatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  tone: "brand" | "warning" | "good" | "neutral";
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{label}</span>
        <span style={{ color: ADMIN_TONE_COLORS[tone], display: "flex" }}>{icon}</span>
      </div>
      <span style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{value === undefined ? "—" : value}</span>
    </div>
  );
}
