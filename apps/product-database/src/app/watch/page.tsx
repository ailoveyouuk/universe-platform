"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { RegulatoryWatchDashboard, WatchMatchSummary } from "@universe/types";
import { AlertIcon, Button, CheckCircleIcon, ClipboardCheckIcon, ClockIcon, ExternalLinkIcon, Pill, StatTile } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";

/**
 * Regulatory watch (Product Database step 4b, 2026-10-18): the daily check of public regulator feeds (openFDA, MHRA / GOV.UK).
 * Matches to catalogue products are ADVISORY. Platform staff confirm a match (which records a safety notice and alerts the
 * organisations using the product) or dismiss it with a reason. Nothing is blocked automatically.
 */
const SOURCE_LABEL: Record<string, string> = { OPENFDA_DEVICE: "openFDA — devices", OPENFDA_DRUG: "openFDA — drugs", MHRA_ALERTS: "MHRA / GOV.UK alerts", UK_EXPORT_RESTRICTIONS: "UK export and hoarding list" };
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "never");
const tone = (s: string): "critical" | "warning" | "neutral" => (s === "CRITICAL" ? "critical" : s === "HIGH" || s === "MEDIUM" ? "warning" : "neutral");

export default function WatchPage() {
  const me = useCurrentUser();
  const isStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const [d, setD] = useState<RegulatoryWatchDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Tiles filter the lists below (platform standard): "" shows the default view.
  const [view, setView] = useState<"" | "items" | "pending" | "confirmed" | "dismissed">("");
  const [byStatus, setByStatus] = useState<WatchMatchSummary[] | null>(null);
  useEffect(() => {
    if (view !== "confirmed" && view !== "dismissed") { setByStatus(null); return; }
    let live = true; setByStatus(null);
    apiClient.getWatchMatches(view.toUpperCase()).then((r) => { if (live) setByStatus(r); }).catch(() => { if (live) setByStatus([]); });
    return () => { live = false; };
  }, [view]);
  const toggle = (v: "items" | "pending" | "confirmed" | "dismissed") => setView((c) => (c === v ? "" : v));
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [rf, setRf] = useState<Record<string, string>>({ restrictingCountryCode: "", scope: "BOTH" });
  const load = useCallback(() => { apiClient.getRegulatoryWatchDashboard().then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Could not load.")); }, []);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); setDismissing(null); setReason(""); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  };
  const n = (v: number) => v.toLocaleString("en-GB");
  const card = (m: WatchMatchSummary) => (
    <div key={m.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Link href={`/products/detail?id=${m.productMasterId}`} style={{ fontWeight: 600, fontSize: 14 }}>{m.productName}</Link>
          <Pill tone={tone(m.item.severity)}>{m.item.severity.toLowerCase()}</Pill>
          <Pill tone="neutral">{m.item.authority}</Pill>
          <Pill tone={m.confidence >= 0.9 ? "critical" : "warning"}>{m.confidence >= 0.9 ? "identifier match" : "name and strength match"} ({Math.round(m.confidence * 100)}%)</Pill>
          {m.item.isSimulated && <Pill tone="neutral">simulated</Pill>}
        </div>
        {m.item.url && <a href={m.item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>View source <ExternalLinkIcon size={13} /></span></a>}
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 13 }}><strong>{m.item.title}</strong></p>
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{m.item.summary.slice(0, 280)}{m.item.summary.length > 280 ? "…" : ""} · Issued {new Date(m.item.issueDate).toLocaleDateString("en-GB")}</p>
      {m.matchDetail && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Why it matched: {m.matchDetail}. Advisory only: check the notice against the product before confirming.</p>}
      {isStaff ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => apiClient.confirmWatchMatch(m.id))}>Confirm and record safety notice</Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setDismissing(m.id)}>Dismiss</Button>
        </div>
      ) : <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Awaiting review by platform staff.</p>}
      {dismissing === m.id && (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          <label style={{ fontSize: 12 }}>Reason for dismissing (required)
            <input style={{ padding: "6px 8px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-sm)", fontSize: 13, width: "100%", boxSizing: "border-box" }} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" disabled={busy || !reason.trim()} onClick={() => run(() => apiClient.dismissWatchMatch(m.id, reason))}>Dismiss match</Button>
            <Button variant="secondary" size="sm" onClick={() => setDismissing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>Regulatory watch</h1>
      <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>A daily automated check of public regulator feeds for recalls and safety alerts. Matches to products in the catalogue are advisory flags for platform staff to confirm; nothing is blocked automatically. This supports, but does not replace, formal regulatory intelligence.</p>
      {err && <p style={{ color: "var(--u-status-critical)" }}>{err}</p>}
      {!d ? !err && <p>Loading…</p> : (
        <>
          <h2 style={{ fontSize: 15, marginTop: 20 }}>Sources</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {d.sources.map((s) => (
              <div key={s.source} style={{ border: `1px solid ${s.stale || s.lastStatus === "FAILED" ? "var(--u-status-critical)" : "var(--u-border)"}`, borderRadius: "var(--u-radius-md)", padding: 12, fontSize: 13 }}>
                <strong>{SOURCE_LABEL[s.source] ?? s.source}</strong>{" "}
                <Pill tone={s.lastStatus === "FAILED" || s.stale ? "critical" : "good"}>{s.lastStatus === "FAILED" ? "last run failed" : s.stale ? "stale" : "healthy"}</Pill>
                <p style={{ margin: "6px 0 0", color: "var(--u-ink-secondary)" }}>Last run {dt(s.lastRunAt)} · last success {dt(s.lastSuccessAt)}</p>
                {s.lastError && <p style={{ margin: "4px 0 0", color: "var(--u-status-critical)" }}>{s.lastError}</p>}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 16 }}>
            <StatTile label="Items in last 30 days" onClick={() => toggle("items")} active={view === "items"} value={n(d.totals.itemsLast30Days)} icon={<ClockIcon size={20} />} tone="brand" />
            <StatTile label="Matches awaiting review" onClick={() => toggle("pending")} active={view === "pending"} value={n(d.totals.pendingMatches)} icon={<AlertIcon size={20} />} tone="warning" />
            <StatTile label="Confirmed" onClick={() => toggle("confirmed")} active={view === "confirmed"} value={n(d.totals.confirmed)} icon={<CheckCircleIcon size={20} />} tone="critical" />
            <StatTile label="Dismissed" onClick={() => toggle("dismissed")} active={view === "dismissed"} value={n(d.totals.dismissed)} icon={<ClipboardCheckIcon size={20} />} tone="good" />
          </div>
          {(view === "confirmed" || view === "dismissed") && (<>
            <h2 style={{ fontSize: 15, marginTop: 24 }}>{view === "confirmed" ? "Confirmed matches" : "Dismissed matches"}</h2>
            {!byStatus ? <p>Loading…</p> : byStatus.length === 0 ? <p style={{ fontSize: 13 }}>None.</p> : <div style={{ display: "grid", gap: 10 }}>{byStatus.map(card)}</div>}
          </>)}
          {(view === "" || view === "pending") && (<>
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Potential matches awaiting review</h2>
          {d.pending.length === 0 ? <p style={{ fontSize: 13 }}>No matches awaiting review.</p> : <div style={{ display: "grid", gap: 10 }}>{d.pending.map(card)}</div>}
          </>)}
          {(view === "" || view === "items") && (<>
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Recent items from the regulators{view === "items" ? " (last 30 days)" : ""}</h2>
          {d.recentItems.length === 0 ? <p style={{ fontSize: 13 }}>No items fetched yet. The first daily run will populate this.</p> : (
            <div style={{ display: "grid", gap: 6 }}>
              {d.recentItems.filter((i) => view !== "items" || new Date(i.issueDate).getTime() >= Date.now() - 30 * 86400000).map((i) => (
                <div key={i.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "8px 12px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", fontSize: 13 }}>
                  <Pill tone={tone(i.severity)}>{i.severity.toLowerCase()}</Pill><Pill tone="neutral">{i.authority}</Pill>
                  <span style={{ flex: 1, minWidth: 220 }}>{i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer">{i.title}</a> : i.title}</span>
                  <span style={{ color: "var(--u-ink-secondary)" }}>{new Date(i.issueDate).toLocaleDateString("en-GB")}</span>
                </div>
              ))}
            </div>
          )}
          </>)}
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Export and hoarding restrictions</h2>
          <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "0 0 8px" }}>
            The UK list of medicines that cannot be exported or hoarded is fetched daily. Other countries publish no single feed, so platform staff add their restrictions here with a source link. A project line is flagged when its goods originate in a restricting country and are delivered elsewhere. An initial check only; the legal duty stays with the licence holder.
          </p>
          {d.exportRestrictions.length === 0 ? <p style={{ fontSize: 13 }}>None recorded yet. The first daily run loads the UK list.</p> : (
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)" }}>
              <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                <thead><tr style={{ textAlign: "left", color: "var(--u-ink-secondary)" }}><th style={{ padding: 6 }}>Country</th><th>Medicine</th><th>Strength</th><th>Form</th><th>Listed</th><th>Source</th></tr></thead>
                <tbody>
                  {d.exportRestrictions.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--u-border)" }}>
                      <td style={{ padding: 6 }}>{r.restrictingCountryCode}</td><td>{r.medicineName}</td><td>{r.strength ?? "All"}</td><td>{r.form ?? "All"}</td>
                      <td>{r.restrictionDate ? new Date(r.restrictionDate).toLocaleDateString("en-GB") : "—"}</td>
                      <td>{r.source === "MANUAL" ? (r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">curated</a> : "curated") : "UK list (daily)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isStaff && !adding && <div style={{ marginTop: 10 }}><Button variant="secondary" size="sm" onClick={() => setAdding(true)}>Add a restriction for another country</Button></div>}
          {isStaff && adding && (
            <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              {[["restrictingCountryCode", "Country (2-letter code)"], ["medicineName", "Medicine (generic name)"], ["strength", "Strength (blank = all)"], ["form", "Form (blank = all)"], ["restrictionDate", "Date in force"], ["sourceUrl", "Source link (required)"]].map(([k, l]) => (
                <label key={k} style={{ fontSize: 12 }}>{l}
                  <input type={k === "restrictionDate" ? "date" : "text"} style={{ padding: "6px 8px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-sm)", fontSize: 13, width: "100%", boxSizing: "border-box" }} value={rf[k] ?? ""} onChange={(e) => setRf({ ...rf, [k]: e.target.value })} />
                </label>
              ))}
              <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                <Button variant="primary" size="sm" disabled={busy || !rf.restrictingCountryCode || !rf.medicineName || !rf.sourceUrl} onClick={() => run(async () => { await apiClient.createExportRestriction(rf as never); setAdding(false); setRf({ restrictingCountryCode: "", scope: "BOTH" }); })}>Save restriction</Button>
                <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Run log</h2>
          {d.runs.length === 0 ? <p style={{ fontSize: 13 }}>No runs recorded yet.</p> : (
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left", color: "var(--u-ink-secondary)" }}><th>Started</th><th>Source</th><th>Status</th><th>Fetched</th><th>New</th><th>Changed</th><th>New matches</th></tr></thead>
              <tbody>
                {d.runs.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--u-border)" }}>
                    <td style={{ padding: "6px 4px" }}>{dt(r.startedAt)}</td><td>{SOURCE_LABEL[r.source] ?? r.source}</td>
                    <td><Pill tone={r.status === "SUCCESS" ? "good" : r.status === "FAILED" ? "critical" : "neutral"}>{r.status.toLowerCase()}</Pill></td>
                    <td>{r.fetched}</td><td>{r.newItems}</td><td>{r.changedItems}</td><td>{r.newMatches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
