"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

const card: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "14px 16px", backgroundColor: "var(--u-surface-raised)", display: "grid", gap: 10, minWidth: 0 };

/**
 * A titled card whose body can be closed up again. Open on wide screens; starts closed on phones (2026-10-27, Lewis: the pipeline sections take a long time to scroll
 * on mobile). The heading is a button so keyboard and screen-reader users can open and close it.
 */
export function Card({ title, summary, children }: { title: string; summary?: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  useEffect(() => { if (window.innerWidth < 640) setOpen(false); }, []);
  return (
    <div style={card}>
      <h3 style={{ margin: 0, fontSize: 16, fontFamily: "var(--u-font-display)" }}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
          style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", minHeight: 32 }}>
          <span>{title}{summary && !open ? <span style={{ display: "block", fontSize: 12.5, fontWeight: 400, fontFamily: "var(--u-font-body)", color: "var(--u-ink-secondary)" }}>{summary}</span> : null}</span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" style={{ flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </h3>
      <div id={id} hidden={!open} style={{ display: open ? "grid" : "none", gap: 10, minWidth: 0 }}>{children}</div>
    </div>
  );
}
