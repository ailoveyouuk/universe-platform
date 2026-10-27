"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CRM_SEARCH_TYPES, CRM_SEARCH_TYPE_LABELS, type CrmSearchResult } from "@universe/types";
import { SearchInput } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { ErrorNote, Heading, Page } from "../../lib/ui";
import { SourceNote } from "../../components/SourceNote";

/** Keyword search across everything the CRM holds. Each group shows the first hits and a total; choosing a group name narrows to just that kind of record. */
export default function Search() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [only, setOnly] = useState("");
  const [res, setRes] = useState<CrmSearchResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const sp = new URLSearchParams(window.location.search); setQ(sp.get("q") ?? ""); setOnly(sp.get("types") ?? ""); }, []);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    if (dq.trim().length < 2) { setRes(null); return; }
    let live = true; setBusy(true); setErr(null);
    apiClient.crmSearch(dq, only || undefined).then((r) => { if (live) setRes(r); }).catch((e) => { if (live) setErr(e instanceof Error ? e.message : "Search failed."); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [dq, only]);
  const shown = (res?.groups ?? []).filter((g) => g.total > 0);
  const total = shown.reduce((n, g) => n + g.total, 0);
  return (
    <Page>
      <Heading title="Search" sub="Find anything in the CRM by keyword: stakeholders, contacts, interactions, opportunities, places, certificates, gifts and hospitality, and privacy requests. Every word you type must match." />
      <ErrorNote message={err} />
      <SourceNote keys={["search"]} />
      <div style={{ maxWidth: 640 }}><SearchInput value={q} onChange={setQ} placeholder="For example: manufacturer Kenya, ISO 13485, site visit, Dr Patel" /></div>
      <div role="group" aria-label="Kind of record" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["", "Everything"], ...CRM_SEARCH_TYPES.map((t) => [t, CRM_SEARCH_TYPE_LABELS[t]])].map(([k, label]) => (
          <button key={k} type="button" className="u-touch" aria-pressed={only === k} onClick={() => setOnly(k!)} style={{ padding: "5px 14px", borderRadius: 999, border: "1px solid var(--u-border)", backgroundColor: only === k ? "var(--u-brand-violet)" : "var(--u-surface-raised)", color: only === k ? "var(--u-on-accent)" : "var(--u-ink)", font: "inherit", fontSize: 13, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      {dq.trim().length < 2 && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Type at least two characters.</p>}
      {busy && <p role="status" style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Searching…</p>}
      {res && !busy && total === 0 && <p role="status" style={{ margin: 0 }}>Nothing matches “{res.q}”. Try fewer words, or a different spelling.</p>}
      {res && total > 0 && <p role="status" style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{total} match{total === 1 ? "" : "es"} for “{res.q}”.</p>}
      <div style={{ display: "grid", gap: 14 }}>
        {shown.map((g) => (
          <section key={g.type} aria-labelledby={`g-${g.type}`} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "14px 18px", backgroundColor: "var(--u-surface-raised)" }}>
            <h2 id={`g-${g.type}`} style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>{g.label} <span style={{ fontWeight: 400, color: "var(--u-ink-secondary)", fontSize: 14 }}>({g.total})</span></h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {g.hits.map((h) => (
                <li key={h.id}><Link href={h.link} style={{ fontWeight: 600 }}>{h.title}</Link> <span style={{ color: "var(--u-ink-secondary)", fontSize: 13.5 }}>{h.subtitle}</span></li>
              ))}
            </ul>
            {g.total > g.hits.length && only !== g.type && <p style={{ margin: "8px 0 0", fontSize: 13.5 }}><button type="button" onClick={() => setOnly(g.type)} style={{ background: "none", border: 0, padding: 0, color: "var(--u-link)", font: "inherit", textDecoration: "underline", cursor: "pointer" }}>Show only {g.label.toLowerCase()}</button> ({g.total - g.hits.length} more)</p>}
          </section>
        ))}
      </div>
    </Page>
  );
}
