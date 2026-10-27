"use client";

import { useEffect, useState } from "react";
import type { DataGap, DataHealthSection } from "@universe/types";
import { DataHints } from "./DataHints";
import { UNIVERSE_APPS } from "./AppSwitcher";

const SOURCE = "counts of your organisation's own records as they stand now. Nothing from other organisations and no money. Each link goes to the screen where it can be fixed.";

/** Makes a section's links absolute when the fix lives in another app than the one showing the note. */
export function resolveGaps(section: DataHealthSection, currentApp: string): DataGap[] {
  // Data-health uses "tenders" for Tender Issuance; the app switcher calls it "tender-issuance".
  const baseOf = (key: string) => UNIVERSE_APPS.find((a) => a.key === (key === "tenders" ? "tender-issuance" : key))?.href?.replace(/\/$/, "");
  return section.gaps.map((g) => {
    if (!g.href) return g;
    // "app:<key>/path" points at a screen in another app (e.g. Insights gaps are fixed in Project Management).
    const m = /^app:([a-z-]+)(\/.*)$/.exec(g.href);
    if (m) { if (m[1] === currentApp) return { ...g, href: m[2] }; const b = baseOf(m[1]); return { ...g, href: b ? `${b}${m[2]}` : null }; }
    if (g.href.startsWith("/") && section.app !== currentApp) { const b = baseOf(section.app); return { ...g, href: b ? `${b}${g.href}` : null }; }
    return g;
  });
}

/**
 * The "make this richer" note for an app (2026-10-27, Lewis). Each app drops it on its Overview with a loader for its own api client; `all` shows every app the person can
 * use, one note per app (the Admin data-health page). It stays out of the way: collapsed, absent when nothing is missing, and a failed load shows nothing.
 */
export function DataHealthNote({ load, currentApp, all = false }: { load: () => Promise<DataHealthSection[]>; currentApp: string; all?: boolean }) {
  const [sections, setSections] = useState<DataHealthSection[] | null>(null);
  useEffect(() => { let off = false; load().then((s) => { if (!off) setSections(s); }).catch(() => { if (!off) setSections(null); }); return () => { off = true; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sections || sections.length === 0) return null;
  if (!all) return <>{sections.map((s) => <DataHints key={s.app} gaps={resolveGaps(s, currentApp)} source={SOURCE} />)}</>;
  return <div style={{ display: "grid", gap: 10 }}>{sections.map((s) => <DataHints key={s.app} title={s.label} open gaps={resolveGaps(s, currentApp)} source={SOURCE} />)}</div>;
}
