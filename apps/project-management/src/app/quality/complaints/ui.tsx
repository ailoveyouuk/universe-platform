"use client";

import type { CSSProperties, ReactNode } from "react";
import { Pill } from "@universe/ui";

export const muted: CSSProperties = { color: "var(--u-ink-secondary)" };
export const inputStyle: CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: 8, fontSize: 14, fontFamily: "inherit",
  background: "var(--u-surface)", color: "var(--u-ink)", boxSizing: "border-box",
};
export const cardStyle: CSSProperties = { border: "1px solid var(--u-border)", borderRadius: 12, padding: 18, background: "var(--u-surface)", marginBottom: 16 };

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--u-ink-secondary)", marginBottom: 4 }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 3 }}>{hint}</span>}
    </label>
  );
}

export const label = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—");
export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: label(v) }));

export function SeverityPill({ severity }: { severity: string | null }) {
  if (!severity) return <Pill tone="neutral">Not triaged</Pill>;
  return <Pill tone={severity === "CRITICAL" ? "critical" : severity === "MAJOR" ? "warning" : "neutral"}>{label(severity)}</Pill>;
}
export function StatusPill({ status }: { status: string }) {
  const tone = status === "CLOSED" ? "good" : status === "WITHDRAWN" || status === "ON_HOLD" ? "neutral" : status === "LOGGED" ? "warning" : "brand";
  return <Pill tone={tone}>{label(status)}</Pill>;
}
