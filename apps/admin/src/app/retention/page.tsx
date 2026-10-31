"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComplaintSubjectAccessCopy, ComplaintSubjectMatch, RetentionDecisionKind, RetentionEffectiveRule, RetentionQueueItem } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Field, Notice, Section, inputStyle } from "../../components/form";

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", color: "var(--u-ink-secondary)", fontWeight: 600, fontSize: 12.5, borderBottom: "1px solid var(--u-border)" };
const td: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top", fontSize: 13.5 };
const muted: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)", fontSize: 13.5 };
const period = (m: number) => (m === 0 ? "No end date" : m % 12 === 0 ? `${m / 12} year${m === 12 ? "" : "s"}` : `${m} month${m === 1 ? "" : "s"}`);
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const ACTION: Record<RetentionDecisionKind, string> = { KEEP: "Keep for a year", ARCHIVED: "Archive", ANONYMISED: "Remove personal details" };
const TYPE: Record<string, string> = { TENDER: "Tender", CONTRACT: "Contract", COMPLAINT: "Complaint", COMPLAINANT: "Complainant" };

/**
 * Retention (2026-10-31, Lewis: default periods compliant with UK/EU regulations). Records whose retention period has ended wait here for a person
 * to keep them (with a reason), archive them or remove a complainant's personal details. Nothing is deleted automatically. The periods are the
 * platform defaults (docs/RETENTION-SCHEDULE.md); an organisation can set its own with a reason.
 */
export default function RetentionPage() {
  const me = useCurrentUser();
  const allowed = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("org.users.manage"));
  const [queue, setQueue] = useState<RetentionQueueItem[] | null>(null);
  const [rules, setRules] = useState<RetentionEffectiveRule[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [keeping, setKeeping] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [months, setMonths] = useState("");
  const [why, setWhy] = useState("");
  const load = useCallback(() => {
    apiClient.retentionQueue().then(setQueue).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the review queue."));
    apiClient.retentionRules().then(setRules).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the schedule."));
  }, []);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (me && !allowed) return <div style={{ padding: "8px 0 32px" }}><h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24 }}>Retention</h1><p style={muted}>Retention is managed by organisation administrators.</p></div>;

  const act = async (i: RetentionQueueItem, decision: RetentionDecisionKind, r?: string) => {
    setErr(null); setOk(null);
    try { await apiClient.retentionDecide({ ruleKey: i.ruleKey, recordType: i.recordType, recordId: i.recordId, decision, reason: r }); setOk(`${i.label}: ${decision === "KEEP" ? "kept for another year" : decision === "ARCHIVED" ? "archived" : "personal details removed"}.`); setKeeping(null); setReason(""); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); }
  };
  const saveOverride = async (key: string) => {
    setErr(null); setOk(null);
    try { await apiClient.retentionSetOverride({ ruleKey: key, months: Number(months), reason: why }); setOk("Period saved."); setEditKey(null); setMonths(""); setWhy(""); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); }
  };
  const clearOverride = async (key: string) => {
    setErr(null); setOk(null);
    try { await apiClient.retentionClearOverride(key); setOk("Back to the platform default."); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); }
  };

  return (
    <div style={{ display: "grid", gap: 4, padding: "8px 0 32px" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24 }}>Retention</h1>
      <p style={{ ...muted, maxWidth: 760 }}>How long records are kept, and the ones that have reached the end of their period. UK and EU GDPR set no fixed periods, only that each one is justified and reviewed, so nothing here is deleted automatically: a person decides.</p>
      {err && <Notice tone="error">{err}</Notice>}
      {ok && <Notice tone="success">{ok}</Notice>}

      <Section title={`Ready for review${queue ? ` (${queue.length})` : ""}`} hint="Tender files, contracts and quality complaints past their period, and complainants whose details can now be removed." defaultOpen>
        {queue && queue.length === 0 && <p style={muted}>Nothing to review.</p>}
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
          {queue?.map((i) => { const k = `${i.ruleKey}:${i.recordId}`; return (
            <li key={k} style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 8, fontSize: 13.5 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill tone="neutral">{TYPE[i.recordType]}</Pill><strong>{i.label}</strong>
                <span style={{ color: "var(--u-ink-secondary)" }}>Period of {period(i.months)} ended {fmt(i.dueSince)}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {i.actions.filter((a) => a !== "KEEP").map((a) => <Button key={a} size="sm" variant="secondary" onClick={() => act(i, a)}>{ACTION[a]}</Button>)}
                  <Button size="sm" variant="secondary" onClick={() => { setKeeping(keeping === k ? null : k); setReason(""); }}>{ACTION.KEEP}</Button>
                </span>
              </div>
              {keeping === k && (
                <div style={{ display: "grid", gap: 8 }}>
                  <Field label="Why keep it?" hint="A sentence is enough. It is shown if the record is asked about later."><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} style={inputStyle} /></Field>
                  <div><Button size="sm" onClick={() => act(i, "KEEP", reason)} disabled={reason.trim().length < 10}>Keep for a year</Button></div>
                </div>
              )}
            </li>); })}
        </ul>
      </Section>

      <Section title="Periods" hint="The platform default for each kind of record. You can set your own period if you can justify it; the reason is recorded.">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <caption style={{ position: "absolute", left: -9999 }}>Retention periods</caption>
            <thead><tr><th scope="col" style={th}>What</th><th scope="col" style={th}>Kept for</th><th scope="col" style={th}>From</th><th scope="col" style={th}>Why</th><th scope="col" style={th}>Change</th></tr></thead>
            <tbody>
              {rules?.map((r) => (
                <tr key={r.key}>
                  <td style={td}><strong>{r.category}</strong><br />{r.covers}</td>
                  <td style={td}>{period(r.months)}{r.overridden && <><br /><Pill tone="brand">Your period (default {period(r.defaultMonths)})</Pill></>}</td>
                  <td style={td}>{r.from}</td>
                  <td style={td}>{r.overridden ? r.overrideReason : r.reason}</td>
                  <td style={td}>
                    {r.defaultMonths === 0 ? "—" : editKey === r.key ? (
                      <div style={{ display: "grid", gap: 6, minWidth: 180 }}>
                        <Field label="Months"><input type="number" min={1} max={240} value={months} onChange={(e) => setMonths(e.target.value)} style={inputStyle} /></Field>
                        <Field label="Reason"><textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} style={inputStyle} /></Field>
                        <span style={{ display: "flex", gap: 6 }}><Button size="sm" onClick={() => saveOverride(r.key)} disabled={!months || why.trim().length < 10}>Save</Button><Button size="sm" variant="secondary" onClick={() => setEditKey(null)}>Cancel</Button></span>
                      </div>
                    ) : (
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Button size="sm" variant="secondary" onClick={() => { setEditKey(r.key); setMonths(String(r.months)); setWhy(""); }}>Set own period</Button>
                        {r.overridden && <Button size="sm" variant="secondary" onClick={() => clearOverride(r.key)}>Use default</Button>}
                      </span>
                    )}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <p style={{ ...muted, fontSize: 12.5 }}>Source: Universe default retention schedule (docs/RETENTION-SCHEDULE.md). Reasons are recalled from the Limitation Act 1980, HMRC and Companies Act rules, MHRA and EU Good Distribution Practice and ICO guidance and are with a specialist to confirm.</p>
      </Section>

      <ComplainantAccess onError={setErr} />
    </div>
  );
}

/** Find everything held about a complainant and take a copy (a subject access request). */
function ComplainantAccess({ onError }: { onError: (m: string | null) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ComplaintSubjectMatch[] | null>(null);
  const [copy, setCopy] = useState<ComplaintSubjectAccessCopy | null>(null);
  const find = async () => { onError(null); setCopy(null); try { setRows(await apiClient.retentionFindComplainant(q)); } catch (e) { onError(e instanceof Error ? e.message : "Search failed."); } };
  const take = async () => { onError(null); try { setCopy(await apiClient.retentionComplainantCopy(q)); } catch (e) { onError(e instanceof Error ? e.message : "Could not build the copy."); } };
  const download = () => {
    if (!copy) return;
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "complainant-copy.json"; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <Section title="Complainant requests" hint="Find the complaints that name a person (by name, email or phone) and take a copy of what is held, for a subject access request. The one-month clock for a reply is tracked in the CRM Privacy page.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: "1 1 260px" }}><Field label="Name, email or phone"><input value={q} onChange={(e) => setQ(e.target.value)} style={inputStyle} /></Field></div>
        <Button onClick={find} disabled={q.trim().length < 3}>Find</Button>
      </div>
      {rows && rows.length === 0 && <p style={muted}>No complaints name this person.</p>}
      {rows && rows.length > 0 && (
        <>
          <ul style={{ margin: "10px 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {rows.map((r) => <li key={r.id} style={{ fontSize: 13.5 }}><strong>{r.referenceNumber}</strong> {r.title} <span style={{ color: "var(--u-ink-secondary)" }}>({r.status.toLowerCase()}{r.complainant ? `, ${r.complainant}` : ""}{r.anonymised ? ", details already removed" : ""})</span></li>)}
          </ul>
          <Button variant="secondary" onClick={take}>Take a copy</Button>
        </>
      )}
      {copy && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <p style={muted}>{copy.complaints.length} complaint(s) in the copy. Read it before sending: timelines may name other people, who must be redacted.</p>
          <Button size="sm" onClick={download}>Download the copy</Button>
        </div>
      )}
      <p style={{ ...muted, fontSize: 12.5, marginTop: 10 }}>To remove a complainant&rsquo;s details, use the review list above once the period has ended, or ask for an earlier removal from the complaint itself. Source: quality complaints held by your organisation.</p>
    </Section>
  );
}
