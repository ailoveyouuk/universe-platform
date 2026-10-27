"use client";

import { useEffect, useState } from "react";
import { Select } from "@universe/ui";

/**
 * Section switcher for a record with many sections. Tabs on wide screens; on phones a dropdown, because a strip of tabs that scrolls sideways hides what is off-screen
 * and bounces when pulled (2026-10-27, Lewis). The dropdown always shows which section is open and lists every one.
 */
export function SectionNav<T extends string>({ label, idPrefix, items, value, onChange, panelId }: { label: string; idPrefix: string; items: { key: T; label: string }[]; value: T; onChange: (k: T) => void; panelId: string }) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const set = () => setNarrow(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  if (narrow) {
    return (
      <div style={{ display: "grid", gap: 4, borderBottom: "1px solid var(--u-border)", paddingBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Section ({items.length})</span>
        <Select value={value} onChange={(v) => onChange(v as T)} options={items.map((t) => ({ value: t.key, label: t.label }))} ariaLabel={`${label}: choose a section`} />
      </div>
    );
  }
  return (
    <div role="tablist" aria-label={label} style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--u-border)", overflowX: "auto", overscrollBehaviorX: "contain" }}>
      {items.map((t) => { const on = value === t.key; return (
        <button key={t.key} type="button" role="tab" id={`${idPrefix}-${t.key}`} aria-selected={on} aria-controls={panelId} onClick={() => onChange(t.key)}
          style={{ border: "none", background: "none", cursor: "pointer", padding: "8px 14px", fontSize: 13.5, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", fontFamily: "inherit", color: on ? "var(--u-brand-violet)" : "var(--u-ink-secondary)", borderBottom: on ? "2px solid var(--u-brand-violet)" : "2px solid transparent", marginBottom: -1 }}>{t.label}</button>
      ); })}
    </div>
  );
}
