"use client";

import { useEffect, useState } from "react";
import type { DataGap, DataHealthSection } from "@universe/types";
import { DataHints } from "./DataHints";
import { UNIVERSE_APPS } from "./AppSwitcher";

const SOURCE = "counts of your organisation's own records as they stand now. Nothing from other organisations and no money. Each link goes to the screen where it can be fixed.";

/** Makes a section's links absolute when the fix lives in another app than the one showing the note. */
export function resolveGaps(section: DataHealthSection, currentApp: string): DataGap[] {
  if (section.app === currentApp) return section.gaps;
  const base = UNIVERSE_APPS.find((a) => a.key === section.app)?.href?.replace(/\/$/, "");
  return section.gaps.map((g) => ({ ...g, href: g.href && g.href.startsWith("/") ? (base ? `${base}${g.href}` : null) : g.href }));
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
