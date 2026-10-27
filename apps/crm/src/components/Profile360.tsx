"use client";
import { useEffect, useState } from "react";
import type { CrmRelationshipDetail, CrmRelationshipRow } from "@universe/types";
import { ExternalLinkIcon, Pill } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { fmtDate, humanise } from "../lib/ui";
import { since, sinceAgo, WORK_STATUS_TONE } from "../lib/since";

const lab: React.CSSProperties = { color: "var(--u-ink-secondary)", fontSize: 12.5 };

/** Dates and logic at a glance: when the stakeholder joined Universe, when its record last changed, its most recent project and where it stands, and its main links. */
export function Profile360({ r }: { r: CrmRelationshipRow }) {
  const [d, setD] = useState<CrmRelationshipDetail | null>(null);
  useEffect(() => { let live = true; apiClient.crmDetail(r.id).then((x) => { if (live) setD(x); }).catch(() => {}); return () => { live = false; }; }, [r.id]);
  const lp = d?.portfolio?.lastProject ?? null;
  const links = (d?.links ?? []).slice(0, 6);
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const item = (title: string, main: React.ReactNode, sub?: React.ReactNode) => (
    <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 12px", display: "grid", gap: 2 }}>
      <span style={lab}>{title}</span><span style={{ fontWeight: 600 }}>{main}</span>{sub && <span style={{ ...lab }}>{sub}</span>}
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        {item("Added to Universe", fmtDate(r.partnerAddedAt), r.partnerAddedAt ? `${since(r.partnerAddedAt)} ago` : undefined)}
        {item("Last updated", r.partnerUpdatedAt ? fmtDate(r.partnerUpdatedAt) : "Not recorded", r.partnerUpdatedAt ? sinceAgo(r.partnerUpdatedAt) ?? undefined : undefined)}
        {d?.portfolio ? item("Last project", lp ? fmtDate(lp.date) : "None yet", lp ? <><span>{lp.referenceNumber} · {lp.title} </span><Pill tone={WORK_STATUS_TONE[lp.status] ?? "neutral"}>{humanise(lp.status)}</Pill><span> · {sinceAgo(lp.date)}</span></> : undefined) : null}
      </div>
      {links.length > 0 && (
        <p style={{ margin: 0, fontSize: 13.5, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`${l.label}, ${host(l.url)} (opens in a new tab)`} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>{l.label}<ExternalLinkIcon size={13} aria-hidden="true" /></a>)}
        </p>
      )}
    </div>
  );
}
