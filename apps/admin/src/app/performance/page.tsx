"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FEEDBACK_LABELS, type StaffPerformanceDetail, type StaffPerformanceRow } from "@universe/types";
import { AlertIcon, Button, CheckCircleIcon, LockIcon, Pill, SearchInput, Select, StatTile, StatTileGrid, ClockIcon } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Notice } from "../../components/form";

const BAND: Record<string, string> = { STRONG: "Strong", GOOD: "Good", SATISFACTORY: "Satisfactory", WATCH: "Watch", AT_RISK: "At risk", NOT_ENOUGH_DATA: "Not enough data", INSUFFICIENT_HISTORY: "Not enough data" };
const bandTone = (b: string) => (b === "STRONG" || b === "GOOD" ? "good" : b === "WATCH" || b === "SATISFACTORY" ? "warning" : b === "AT_RISK" ? "critical" : "neutral") as "good" | "warning" | "critical" | "neutral";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");
type Tile = "" | "attention" | "disputed" | "withdrawn";

/**
 * Tender performance records, platform staff only (2026-10-21; drill-down and filters added 2026-10-26). A record is shared by the tender owner
 * and the supplier; staff can withdraw one only for evident error or abuse, with a reason that is written to the tender's audit timeline, and
 * can restore it. Withdrawn records drop out of every aggregate immediately. Each row opens to show what the score is built from.
 */
export default function PerformanceAdminPage() {
  const me = useCurrentUser();
  const staff = !!me && me.platformStaffRole !== "NONE";
  const [rows, setRows] = useState<StaffPerformanceRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, StaffPerformanceDetail | "loading" | "failed">>({});
  const [tile, setTile] = useState<Tile>("");
  const [search, setSearch] = useState("");
  const [band, setBand] = useState("");
  const [outcome, setOutcome] = useState("");
  const load = useCallback(() => { apiClient.staffPerformanceRecords().then(setRows).catch((e) => { setRows([]); setErr(e instanceof Error ? e.message : "Could not load the records."); }); }, []);
  useEffect(() => { if (staff) load(); }, [staff, load]);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); setWithdrawing(null); setReason(""); setDetail({}); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };

  const toggle = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!detail[id] || detail[id] === "failed") {
      setDetail((d) => ({ ...d, [id]: "loading" }));
      apiClient.staffPerformanceDetail(id).then((v) => setDetail((d) => ({ ...d, [id]: v }))).catch(() => setDetail((d) => ({ ...d, [id]: "failed" })));
    }
  };

  const counts = useMemo(() => {
    const all = rows ?? [];
    const live = all.filter((r) => !r.withdrawn);
    return { total: all.length, attention: live.filter((r) => r.band === "WATCH" || r.band === "AT_RISK").length, disputed: all.filter((r) => r.disputes > 0).length, withdrawn: all.filter((r) => r.withdrawn).length };
  }, [rows]);
  const bands = useMemo(() => [...new Set((rows ?? []).map((r) => r.band))], [rows]);
  const outcomes = useMemo(() => [...new Set((rows ?? []).map((r) => r.outcome))], [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => {
    if (tile === "attention" && (r.withdrawn || !(r.band === "WATCH" || r.band === "AT_RISK"))) return false;
    if (tile === "disputed" && r.disputes === 0) return false;
    if (tile === "withdrawn" && !r.withdrawn) return false;
    if (band && r.band !== band) return false;
    if (outcome && r.outcome !== outcome) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.contractReference ?? ""} ${r.ownerName ?? ""} ${r.supplierName ?? ""}`.toLowerCase().includes(q);
  }), [rows, tile, band, outcome, search]);
  const pick = (t: Tile) => setTile((cur) => (cur === t ? "" : t));

  if (me && !staff) return <div style={{ padding: 32 }}><h1>Performance records</h1><p>This page is for platform staff.</p></div>;
  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1>Performance records</h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, maxWidth: 720 }}>Records created when tender contracts close. Open a record to see what its score is built from. Withdraw one only for evident error or abuse; the reason goes on the tender&apos;s audit timeline and the record stops counting in supplier aggregates until restored.</p>
      {err && <Notice tone="error">{err}</Notice>}

      <StatTileGrid style={{ margin: "20px 0" }}>
        <StatTile label="Records" value={rows ? counts.total : undefined} icon={<CheckCircleIcon size={18} />} tone="brand" onClick={() => setTile("")} active={tile === ""} />
        <StatTile label="Watch or at risk" value={rows ? counts.attention : undefined} icon={<AlertIcon size={18} />} tone="warning" onClick={() => pick("attention")} active={tile === "attention"} />
        <StatTile label="With a dispute" value={rows ? counts.disputed : undefined} icon={<ClockIcon size={18} />} tone="critical" onClick={() => pick("disputed")} active={tile === "disputed"} />
        <StatTile label="Withdrawn" value={rows ? counts.withdrawn : undefined} icon={<LockIcon size={18} />} tone="neutral" onClick={() => pick("withdrawn")} active={tile === "withdrawn"} />
      </StatTileGrid>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ minWidth: 240, flex: "1 1 240px", maxWidth: 360 }}><SearchInput value={search} onChange={setSearch} placeholder="Search contract, owner, supplier…" /></div>
        <div style={{ minWidth: 180 }}><Select value={band} onChange={setBand} allLabel="All bands" options={bands.map((b) => ({ value: b, label: BAND[b] ?? b }))} ariaLabel="Filter by band" /></div>
        <div style={{ minWidth: 180 }}><Select value={outcome} onChange={setOutcome} allLabel="All outcomes" options={outcomes.map((o) => ({ value: o, label: o.charAt(0) + o.slice(1).toLowerCase() }))} ariaLabel="Filter by outcome" /></div>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{rows ? `${shown.length} of ${rows.length}` : ""}</span>
      </div>

      {rows === null && <p>Loading…</p>}
      {rows && rows.length === 0 && !err && <p style={{ color: "var(--u-ink-secondary)" }}>No performance records yet.</p>}
      {rows && rows.length > 0 && shown.length === 0 && <p style={{ color: "var(--u-ink-secondary)" }}>No records match.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((r) => {
          const open = expanded === r.id;
          const d = detail[r.id];
          return (
            <div key={r.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", fontSize: 13.5, opacity: r.withdrawn ? 0.85 : 1, background: "var(--u-surface)" }}>
              <button type="button" aria-expanded={open} aria-controls={`perf-${r.id}`} onClick={() => toggle(r.id)} style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", color: "var(--u-ink)" }}>
                <span><span aria-hidden="true" style={{ display: "inline-block", width: 14 }}>{open ? "▾" : "▸"}</span> <strong>{r.contractReference ?? "Contract"}</strong> · {r.ownerName} → {r.supplierName} · {r.outcome.toLowerCase()} {fmtDate(r.closedAt)}</span>
                <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill tone={bandTone(r.band)}>{BAND[r.band] ?? r.band}{r.overallScore !== null ? ` · ${r.overallScore}/100` : ""}</Pill>
                  {r.disputes > 0 && <Pill tone="critical">{r.disputes} dispute{r.disputes === 1 ? "" : "s"}</Pill>}
                  {r.withdrawn && <Pill tone="neutral">Withdrawn</Pill>}
                </span>
              </button>
              {open && (
                <div id={`perf-${r.id}`} style={{ padding: "4px 14px 12px", borderTop: "1px solid var(--u-border)" }}>
                  {r.withdrawn && <div style={{ marginTop: 8, color: "var(--u-ink-secondary)" }}>Withdrawn. Reason: {r.withdrawnReason}</div>}
                  {d === "loading" && <p>Loading the record…</p>}
                  {d === "failed" && <p style={{ color: "var(--u-status-critical-text)" }}>Could not load this record.</p>}
                  {d && d !== "loading" && d !== "failed" && <RecordDetail d={d} />}
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {r.withdrawn
                      ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.restorePerformanceRecord(r.id))}>Restore</Button>
                      : withdrawing === r.id
                        ? <>
                          <input aria-label="Reason for withdrawing" placeholder="Reason (required, goes on the audit timeline)" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: "1 1 320px", padding: 8, border: "1px solid var(--u-border)", borderRadius: 6, font: "inherit", background: "var(--u-surface)", color: "var(--u-ink)" }} />
                          <Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => run(() => apiClient.withdrawPerformanceRecord(r.id, reason.trim()))}>Withdraw record</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setWithdrawing(null); setReason(""); }}>Cancel</Button>
                        </>
                        : <Button size="sm" variant="secondary" onClick={() => setWithdrawing(r.id)}>Withdraw…</Button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordDetail({ d }: { d: StaffPerformanceDetail }) {
  const fb = d.feedback;
  const h = { margin: "14px 0 6px", fontSize: 14 } as const;
  return (
    <div>
      {d.contractTitle && <p style={{ margin: "8px 0 0", color: "var(--u-ink-secondary)" }}>{d.contractTitle}</p>}
      <p style={{ margin: "6px 0 0", color: "var(--u-ink-secondary)" }}>
        Closed {fmtDate(d.closedAt)} · coverage {Math.round(d.coverage)}% of the weighted measures · replies were open until {fmtDate(d.replyDeadline)}
        {d.feedbackAverage !== null ? ` · owner feedback average ${d.feedbackAverage.toFixed(1)}/5` : ""}
      </p>

      <h3 style={h}>What the score is built from</h3>
      {d.measures.length === 0 ? <p style={{ color: "var(--u-ink-secondary)" }}>No measures were recorded.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
            <thead><tr>{["Measure", "Result", "Score", "Weight", "What it is built from"].map((t) => <th key={t} scope="col" style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--u-border)", fontSize: 12, color: "var(--u-ink-secondary)" }}>{t}</th>)}</tr></thead>
            <tbody>
              {d.measures.map((m) => (
                <tr key={m.key}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" }}>{m.label}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" }}>{m.display}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" }}>{m.score !== null ? Math.round(m.score) : "n/a"}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" }}>{m.weight > 0 ? m.weight : "info only"}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--u-border)", color: "var(--u-ink-secondary)" }}>{m.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={h}>Owner feedback</h3>
      {!fb ? <p style={{ color: "var(--u-ink-secondary)" }}>No feedback was given.</p> : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(["quality", "communication", "documentation", "flexibility", "wouldUseAgain"] as const).map((k) => (
            <li key={k}>{FEEDBACK_LABELS[k]}: <strong>{fb[k]}/5</strong>{fb.reasons?.[k] ? <span style={{ color: "var(--u-ink-secondary)" }}> · {fb.reasons[k]}</span> : null}</li>
          ))}
          {fb.comment && <li>Comment: {fb.comment}</li>}
        </ul>
      )}

      <h3 style={h}>Replies and disputes{d.openDisputes ? ` (${d.openDisputes} open)` : ""}</h3>
      {d.responses.length === 0 ? <p style={{ color: "var(--u-ink-secondary)" }}>None.</p> : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {d.responses.map((x) => (
            <li key={x.id}><strong>{x.kind === "DISPUTE" ? "Dispute" : x.kind === "ANSWER" ? "Owner answer" : "Supplier reply"}</strong>{x.measureKey ? ` on ${d.measures.find((m) => m.key === x.measureKey)?.label ?? x.measureKey}` : ""} · {fmtDate(x.createdAt)}: {x.body}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
