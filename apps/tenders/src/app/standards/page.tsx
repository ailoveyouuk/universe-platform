"use client";

import { BASIS_LABEL, STAGE_LABEL, STAGE_ORDER, STANDARD_SOURCES, guidanceFor, type GuidanceAudience, type StandardId } from "@universe/types";
import { Pill } from "@universe/ui";
import { useState } from "react";
import { GuidanceList } from "../../components/StandardsGuide";
import { Card, Heading, Page } from "../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;

/** Procurement standards and good practice by stage, for issuers and bidders, with every source and how well we have read it. */
export default function StandardsPage() {
  const [who, setWho] = useState<GuidanceAudience | "ALL">("ALL");
  return (
    <Page>
      <Heading title="Standards and good practice" sub="How the stages of a tender line up with the public procurement standards behind them." />
      <Card>
        <p style={{ marginTop: 0, fontSize: 13.5 }}>Universe is a platform, not a contracting authority. It is designed to support these frameworks, and it does not claim that any tender run on it complies with any law or standard. This is good-practice guidance, not legal advice. Each source is marked: &ldquo;read&rdquo; means we read the operative text, or official guidance on it, for every point cited; &ldquo;partly read&rdquo; means only some of it was readable and the note says which parts; &ldquo;principle only&rdquo; means it is cited for the principle with no clause numbers. A procurement specialist has not yet reviewed any of it.</p>
        <div role="group" aria-label="Show guidance for" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["ALL", "ISSUER", "BIDDER"] as const).map((w) => (
            <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(w)} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--u-border)", font: "inherit", fontSize: 13, cursor: "pointer", backgroundColor: who === w ? "var(--u-brand-violet)" : "var(--u-surface-raised)", color: who === w ? "var(--u-brand-violet-on)" : "var(--u-ink)" }}>
              {w === "ALL" ? "Everyone" : w === "ISSUER" ? "Issuing a tender" : "Bidding"}
            </button>))}
        </div>
      </Card>
      {STAGE_ORDER.map((s) => {
        const items = guidanceFor(s).filter((x) => who === "ALL" || x.audience === who);
        if (!items.length) return null;
        return (
          <Card key={s} title={STAGE_LABEL[s]}>
            {who === "ALL" ? (["ISSUER", "BIDDER"] as const).map((a) => { const part = items.filter((x) => x.audience === a); return part.length ? <div key={a} style={{ marginBottom: 12 }}><div style={{ marginBottom: 6 }}><Pill tone={a === "ISSUER" ? "brand" : "neutral"}>{a === "ISSUER" ? "For issuers" : "For bidders"}</Pill></div><GuidanceList items={part} /></div> : null; }) : <GuidanceList items={items} />}
          </Card>);
      })}
      <Card title="Sources">
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {(Object.keys(STANDARD_SOURCES) as StandardId[]).map((id) => { const s = STANDARD_SOURCES[id]; return (
            <li key={id} id={id} style={{ fontSize: 13.5 }}>
              <div><strong>{s.name}</strong> <Pill tone={s.basis === "read" ? "good" : s.basis === "partial" ? "warning" : "neutral"}>{BASIS_LABEL[s.basis]}</Pill></div>
              <div style={muted}>{s.publisher}. {s.note}</div>
              {s.url && <a href={s.url} target="_blank" rel="noreferrer">Open the source (new tab)</a>}
            </li>); })}
        </ul>
      </Card>
    </Page>
  );
}
