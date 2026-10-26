"use client";

import Link from "next/link";
import { GUIDANCE, STANDARD_SOURCES, guidanceFor, type GuidanceAudience, type GuidanceItem, type TenderStage } from "@universe/types";
import { Pill } from "@universe/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;

/** Reference chips: each links to the sources list on the standards page. */
export function RefChips({ item }: { item: GuidanceItem }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
      {item.refs.map((r) => (
        <Link key={r.src + (r.at ?? "")} href={`/standards#${r.src}`} style={{ textDecoration: "none" }}>
          <Pill tone={STANDARD_SOURCES[r.src].basis === "read" ? "brand" : "neutral"}>{STANDARD_SOURCES[r.src].short}{r.at ? `, ${r.at}` : ""}</Pill>
        </Link>))}
    </span>
  );
}

export function GuidanceList({ items }: { items: GuidanceItem[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((x) => (
        <li key={x.id} id={x.id} style={{ fontSize: 13.5 }}>
          <div style={{ fontWeight: 600 }}>{x.title}</div>
          <div style={muted}>{x.detail}</div>
          {x.platform && <div style={{ marginTop: 2 }}><strong>In Universe:</strong> <span style={muted}>{x.platform}</span></div>}
          <div style={{ marginTop: 4 }}><RefChips item={x} /></div>
        </li>))}
    </ul>
  );
}

/**
 * Collapsible "good practice at this stage" panel. Guidance only: it never blocks anything. Pass the stage(s) the screen covers and who is reading.
 * The wording and sources live in @universe/types (tender-standards.ts) so every screen and the standards page say the same thing.
 */
export function StandardsGuide({ stages, audience, title }: { stages: TenderStage | TenderStage[]; audience: GuidanceAudience; title?: string }) {
  const items = guidanceFor(stages, audience);
  if (!items.length) return null;
  return (
    <details style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "10px 16px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{title ?? (audience === "BIDDER" ? "Good practice for bidders at this stage" : "Good practice for issuers at this stage")} ({items.length})</summary>
      <p style={{ fontSize: 12.5, margin: "8px 0 12px", ...muted }}>Guidance drawn from public procurement standards. It is not legal advice, and it does not stop you doing anything. <Link href="/standards">See every source and how well we have read it.</Link></p>
      <GuidanceList items={items} />
    </details>
  );
}

export const guidanceCount = GUIDANCE.length;
