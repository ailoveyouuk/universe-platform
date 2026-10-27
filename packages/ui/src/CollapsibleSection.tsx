"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/** Screens narrower than this are phones and tablets (portrait or landscape): sections start closed there and open on larger screens. */
export const COMPACT_MAX_WIDTH = 1024;

/** True on phones and tablets, in either orientation. Re-evaluates when the window is rotated or resized. */
export function useCompactScreen(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_MAX_WIDTH - 1}px)`);
    const set = () => setCompact(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return compact;
}

const card: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "14px 16px", backgroundColor: "var(--u-surface-raised)", display: "grid", gap: 10, minWidth: 0 };

/**
 * A titled card whose body can be closed up again. Added 2026-10-27 (Lewis: long stacked sections take a long time to scroll on a phone). Open on large screens;
 * closed to begin with on phones and tablets, portrait and landscape, and the choice is kept while the page stays open. The heading is a real button
 * (aria-expanded) so keyboard and screen-reader users can open and close it. `summary` is a short line shown under the title while closed.
 * Use `bare` where the section already sits inside its own card.
 */
export function CollapsibleSection({ title, summary, children, bare = false, level = 3, defaultOpen }: { title: string; summary?: string; children: ReactNode; bare?: boolean; level?: 2 | 3 | 4; defaultOpen?: boolean }) {
  const compact = useCompactScreen();
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? (defaultOpen ?? !compact);
  const id = useId();
  const H = `h${level}` as "h2" | "h3" | "h4";
  return (
    <div style={bare ? { display: "grid", gap: 10, minWidth: 0 } : card}>
      <H style={{ margin: 0, fontSize: level === 2 ? 18 : 16, fontFamily: "var(--u-font-display)" }}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setChoice(!open)}
          style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", minHeight: 36 }}>
          <span>{title}{summary && !open ? <span style={{ display: "block", fontSize: 12.5, fontWeight: 400, fontFamily: "var(--u-font-body)", color: "var(--u-ink-secondary)" }}>{summary}</span> : null}</span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" style={{ flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </H>
      <div id={id} hidden={!open} style={{ display: open ? "grid" : "none", gap: 10, minWidth: 0 }}>{children}</div>
    </div>
  );
}
