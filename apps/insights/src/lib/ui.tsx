"use client";

import type { CSSProperties, ReactNode } from "react";

export const inputStyle: CSSProperties = { padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13.5, minWidth: 0, width: "100%", boxSizing: "border-box", backgroundColor: "var(--u-surface)", color: "var(--u-ink)" };

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: wide ? "1 / -1" : undefined, minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--u-ink)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: "var(--u-ink-secondary)", lineHeight: 1.4 }}>{hint}</span>}
    </label>
  );
}

export function Card({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "18px 20px", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {title && <h2 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16, color: "var(--u-ink)" }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const Page = ({ children }: { children: ReactNode }) => <div style={{ padding: "28px 32px 56px", maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>;

export const Heading = ({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
    <div style={{ minWidth: 0 }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24, color: "var(--u-ink)" }}>{title}</h1>
      {sub && <div style={{ marginTop: 6, color: "var(--u-ink-secondary)", fontSize: 13.5 }}>{sub}</div>}
    </div>
    {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
  </div>
);

/** Sticky so an error stays in view even when the action that caused it is far down a long panel. */
export const ErrorNote = ({ message }: { message: string | null }) => message ? <div role="alert" style={{ position: "sticky", top: 8, zIndex: 20, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-critical)", color: "var(--u-status-critical-text)", fontSize: 13.5, backgroundColor: "var(--u-surface)", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>{message}</div> : null;

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not available");
