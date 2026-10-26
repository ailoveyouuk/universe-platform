"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CRM_CONTACT_STATUS_LABELS, CRM_PRIVACY_REQUEST_TYPE_LABELS, CRM_PRIVACY_REQUEST_TYPES,
  type CrmAccessLogRow, type CrmPersonMatch, type CrmPrivacyRequestRow, type CrmPrivacyRequestType, type CrmPrivacySummary, type CrmRetentionItem,
} from "@universe/types";
import { AlertIcon, Button, ClockIcon, Pill, ShieldIcon, StatTile, StatTileGrid, UserIcon } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { ErrorNote, Field, Heading, OkNote, Page, fmtDate, humanise, inputStyle } from "../../lib/ui";

type Tab = "requests" | "find" | "retention" | "suppression" | "log";
const TABS: { key: Tab; label: string }[] = [{ key: "requests", label: "Requests" }, { key: "find", label: "Find a person" }, { key: "retention", label: "Retention review" }, { key: "suppression", label: "Suppression list" }, { key: "log", label: "Access log" }];
const today = () => new Date().toISOString().slice(0, 10);

/** Privacy: what the organisation needs to run its CRM lawfully (UK GDPR). Managers only. */
export default function PrivacyPage() {
  const me = useCurrentUser();
  const allowed = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("crm.manage"));
  const [tab, setTab] = useState<Tab>("requests");
  const [sum, setSum] = useState<CrmPrivacySummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const refresh = useCallback(() => { apiClient.crmPrivacySummary().then(setSum).catch(() => undefined); }, []);
  useEffect(() => { if (allowed) refresh(); }, [allowed, refresh]);
  if (me && !allowed) return <Page><Heading title="Privacy" sub="These tools are for people who manage the CRM. Ask your administrator if you need them." /></Page>;
  const go = (t: Tab) => () => setTab(t);
  return (
    <Page>
      <Heading title="Privacy" sub="Handle requests from people about their data, find everything held about someone, review who should no longer be kept, and see who has looked at personal data. The one-month clock for requests starts when the request is received." />
      <ErrorNote message={err} />
      <OkNote message={ok} />
      <StatTileGrid>
        <StatTile label="Open requests" value={sum?.openRequests} icon={<ShieldIcon size={18} />} tone="brand" onClick={go("requests")} active={tab === "requests"} />
        <StatTile label="Overdue" value={sum?.overdueRequests} icon={<ClockIcon size={18} />} tone="critical" onClick={go("requests")} />
        <StatTile label="Retention review" value={sum?.retentionDue} icon={<AlertIcon size={18} />} tone="warning" onClick={go("retention")} active={tab === "retention"} />
        <StatTile label="Suppression list" value={sum?.suppressions} icon={<UserIcon size={18} />} tone="neutral" onClick={go("suppression")} active={tab === "suppression"} />
      </StatTileGrid>
      <div role="tablist" aria-label="Privacy sections" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--u-border)", overflowX: "auto" }}>
        {TABS.map((t) => { const on = tab === t.key; return (
          <button key={t.key} type="button" role="tab" id={`ptab-${t.key}`} aria-selected={on} aria-controls="ppanel" onClick={() => setTab(t.key)}
            style={{ border: "none", background: "none", cursor: "pointer", padding: "8px 14px", fontSize: 13.5, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", fontFamily: "inherit", color: on ? "var(--u-brand-violet)" : "var(--u-ink-secondary)", borderBottom: on ? "2px solid var(--u-brand-violet)" : "2px solid transparent", marginBottom: -1 }}>{t.label}</button>
        ); })}
      </div>
      <div role="tabpanel" id="ppanel" aria-labelledby={`ptab-${tab}`} style={{ display: "grid", gap: 12 }}>
        {tab === "requests" && <Requests onError={setErr} onOk={(m) => { setOk(m); refresh(); }} />}
        {tab === "find" && <Find onError={setErr} />}
        {tab === "retention" && <Retention onError={setErr} onOk={(m) => { setOk(m); refresh(); }} />}
        {tab === "suppression" && <Suppression onError={setErr} onOk={(m) => { setOk(m); refresh(); }} />}
        {tab === "log" && <Log onError={setErr} />}
      </div>
    </Page>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", color: "var(--u-ink-secondary)", fontWeight: 600, fontSize: 12.5, borderBottom: "1px solid var(--u-border)" };
const td: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top", fontSize: 13.5 };
const muted: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)" };

function Requests({ onError, onOk }: { onError: (m: string | null) => void; onOk: (m: string) => void }) {
  const [rows, setRows] = useState<CrmPrivacyRequestRow[] | null>(null);
  const [which, setWhich] = useState<"open" | "closed">("open");
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => { apiClient.crmPrivacyRequests(which).then(setRows).catch((e) => onError(e instanceof Error ? e.message : "Could not load requests.")); }, [which, onError]);
  useEffect(() => { setRows(null); load(); }, [load]);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant={which === "open" ? "primary" : "secondary"} onClick={() => setWhich("open")}>Open</Button>
        <Button size="sm" variant={which === "closed" ? "primary" : "secondary"} onClick={() => setWhich("closed")}>Closed</Button>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>Log a request</Button>}
      </div>
      {adding && <NewRequest onDone={(m) => { setAdding(false); if (m) onOk(m); load(); }} onError={onError} />}
      {rows && rows.length === 0 && <p style={muted}>{which === "open" ? "No open requests." : "No closed requests."}</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>{rows?.map((r) => <RequestItem key={r.id} r={r} onChanged={(m) => { if (m) onOk(m); load(); }} onError={onError} />)}</ul>
    </>
  );
}

function NewRequest({ onDone, onError }: { onDone: (m?: string) => void; onError: (m: string | null) => void }) {
  const [f, setF] = useState({ type: "ACCESS" as CrmPrivacyRequestType, name: "", email: "", received: today() });
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); onError(null); try { await apiClient.createCrmPrivacyRequest({ type: f.type, requesterName: f.name, requesterEmail: f.email || null, receivedAt: f.received }); onDone("Request logged. The one-month clock started on the date it was received."); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Log a privacy request" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <Field label="What they are asking for"><select className="u-native-select" style={inputStyle} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as CrmPrivacyRequestType })}>{CRM_PRIVACY_REQUEST_TYPES.map((t) => <option key={t} value={t}>{CRM_PRIVACY_REQUEST_TYPE_LABELS[t]}</option>)}</select></Field>
        <Field label="Their name"><input style={inputStyle} maxLength={200} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Their email (optional)"><input type="email" style={inputStyle} maxLength={300} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Date received"><input type="date" style={inputStyle} max={today()} value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} required /></Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}><Button size="sm" variant="primary" type="submit" disabled={busy || !f.name.trim()}>Log request</Button><Button size="sm" variant="secondary" type="button" onClick={() => onDone()}>Cancel</Button></div>
    </form>
  );
}

function RequestItem({ r, onChanged, onError }: { r: CrmPrivacyRequestRow; onChanged: (m?: string) => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState<null | "COMPLETED" | "REFUSED">(null);
  const [decision, setDecision] = useState(""); const [exemption, setExemption] = useState("");
  const run = async (body: Parameters<typeof apiClient.updateCrmPrivacyRequest>[1], done: string) => { setBusy(true); onError(null); try { await apiClient.updateCrmPrivacyRequest(r.id, body); onChanged(done); } catch (e) { onError(e instanceof Error ? e.message : "Could not update."); } finally { setBusy(false); } };
  const open = r.status === "OPEN" || r.status === "WAITING";
  return (
    <li style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", display: "grid", gap: 6, fontSize: 13.5 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong>{CRM_PRIVACY_REQUEST_TYPE_LABELS[r.type]}</strong><span>from {r.requesterName}</span>
        <Pill tone={r.status === "COMPLETED" ? "good" : r.status === "REFUSED" ? "neutral" : r.overdue ? "critical" : "brand"}>{r.overdue ? "Overdue" : humanise(r.status)}</Pill>
        {r.clockStoppedAt && <Pill tone="warning">Clock paused</Pill>}
        {open && <span style={{ marginLeft: "auto", color: "var(--u-ink-secondary)" }}>Due {fmtDate(r.dueAt)}</span>}
      </div>
      <div style={{ color: "var(--u-ink-secondary)" }}>Received {fmtDate(r.receivedAt)} · Identity {r.identityConfirmedAt ? `confirmed ${fmtDate(r.identityConfirmedAt)}` : "not yet confirmed"}{r.extendedUntil ? " · Extended" : ""}{r.requesterEmail ? ` · ${r.requesterEmail}` : ""}</div>
      {r.decision && <div><strong>Decision:</strong> {r.decision}{r.exemptionReason ? ` Exemption relied on: ${r.exemptionReason}` : ""}</div>}
      {open && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!r.identityConfirmedAt && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run({ identityConfirmed: true }, "Identity recorded as confirmed.")}>Identity confirmed</Button>}
          {!r.clockStoppedAt ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => run({ pauseClock: true }, "Clock paused while you wait for a clarification.")}>Pause clock (waiting for clarification)</Button> : <Button size="sm" variant="secondary" disabled={busy} onClick={() => run({ resumeClock: true }, "Clock resumed.")}>Resume clock</Button>}
          {!r.extendedUntil && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run({ extendTwoMonths: true }, "Extended by two months. Tell the person within the first month and say why.")}>Extend by two months</Button>}
          <Button size="sm" variant="primary" disabled={busy} onClick={() => setClosing("COMPLETED")}>Complete</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setClosing("REFUSED")}>Refuse</Button>
        </div>
      )}
      {closing && (
        <div role="group" aria-label="Close request" style={{ display: "grid", gap: 8, borderTop: "1px solid var(--u-border)", paddingTop: 8 }}>
          <Field label="What was decided and done"><textarea style={{ ...inputStyle, minHeight: 60 }} maxLength={1000} value={decision} onChange={(e) => setDecision(e.target.value)} /></Field>
          {closing === "REFUSED" && <Field label="Exemption or reason relied on"><input style={inputStyle} maxLength={500} value={exemption} onChange={(e) => setExemption(e.target.value)} /></Field>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="primary" disabled={busy || !decision.trim() || (closing === "REFUSED" && !exemption.trim())} onClick={() => run({ status: closing, decision, exemptionReason: exemption || null }, closing === "COMPLETED" ? "Request completed." : "Request refused and recorded.")}>Save and close request</Button>
            <Button size="sm" variant="secondary" onClick={() => setClosing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function Find({ onError }: { onError: (m: string | null) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CrmPersonMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const search = async () => { setBusy(true); onError(null); try { setRows(await apiClient.crmFindPerson(q)); } catch (e) { onError(e instanceof Error ? e.message : "Could not search."); } finally { setBusy(false); } };
  const download = async (m: CrmPersonMatch) => {
    try {
      const copy = await apiClient.crmAccessCopy(m.contactId);
      const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `access-copy-${m.contactId.slice(0, 8)}.json`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { onError(e instanceof Error ? e.message : "Could not prepare the copy."); }
  };
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); void search(); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }} role="search" aria-label="Find a person">
        <div style={{ flex: "1 1 260px", maxWidth: 420 }}><Field label="Name or email address" hint="Finds contacts and counts the notes that mention them. Searches are recorded in the access log."><input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <Button size="sm" variant="primary" type="submit" disabled={busy || q.trim().length < 3}>Search</Button>
      </form>
      {rows && rows.length === 0 && <p style={muted}>Nobody found. Check the spelling, or try the email address.</p>}
      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table aria-label="People found" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr>{["Name", "Stakeholder", "Status", "Interactions", "Mentioned in notes", ""].map((h, i) => <th key={i} scope="col" style={th}>{h || "Actions"}</th>)}</tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.contactId}>
                <td style={td}><strong>{m.name}</strong><br /><span style={{ color: "var(--u-ink-secondary)" }}>{m.email ?? "No email"}</span></td>
                <td style={td}>{m.relationshipId ? <Link href={`/relationships?id=${m.relationshipId}`}>{m.partnerName}</Link> : m.partnerName ?? "—"}</td>
                <td style={td}>{CRM_CONTACT_STATUS_LABELS[m.status]}</td>
                <td style={td}>{m.interactions}</td><td style={td}>{m.mentions}</td>
                <td style={td}>{m.status !== "ANONYMISED" && <Button size="sm" variant="secondary" onClick={() => download(m)}>Download a copy</Button>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <p style={{ ...muted, fontSize: 12.5 }}>A copy lists everything held about the person. Read it before sending: notes about other people may name them and must be redacted. To erase someone, open their stakeholder, go to People, then Manage and Anonymise.</p>
    </>
  );
}

function Retention({ onError, onOk }: { onError: (m: string | null) => void; onOk: (m: string) => void }) {
  const [rows, setRows] = useState<CrmRetentionItem[] | null>(null);
  const load = useCallback(() => { apiClient.crmRetention().then(setRows).catch((e) => onError(e instanceof Error ? e.message : "Could not load the review.")); }, [onError]);
  useEffect(() => { load(); }, [load]);
  const keep = async (c: CrmRetentionItem) => { try { await apiClient.crmKeepContact(c.contactId); onOk(`${c.name} kept for another year.`); load(); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } };
  return (
    <>
      <p style={muted}>People you may no longer have a reason to keep: those who left over two years ago, whose details have not been checked for three years, or whose stakeholder relationship ended over two years ago. A person decides for each: keep them for another year, or anonymise them from their stakeholder&rsquo;s People tab.</p>
      {rows && rows.length === 0 && <p style={muted}>Nothing to review.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {rows?.map((c) => (
          <li key={c.contactId} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 13.5 }}>
            <strong>{c.name}</strong><span style={{ color: "var(--u-ink-secondary)" }}>{c.partnerName}</span>
            <span>{c.reasons.join("; ")}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {c.relationshipId && <Link href={`/relationships?id=${c.relationshipId}`}>Open stakeholder</Link>}
              <Button size="sm" variant="secondary" onClick={() => keep(c)}>Keep for a year</Button>
            </span>
          </li>))}
      </ul>
    </>
  );
}

function Suppression({ onError, onOk }: { onError: (m: string | null) => void; onOk: (m: string) => void }) {
  const [d, setD] = useState<{ total: number; recent: { id: string; reason: string; createdAt: string }[] } | null>(null);
  const [email, setEmail] = useState("");
  const load = useCallback(() => { apiClient.crmSuppressions().then(setD).catch((e) => onError(e instanceof Error ? e.message : "Could not load the list.")); }, [onError]);
  useEffect(() => { load(); }, [load]);
  const add = async () => { try { await apiClient.crmSuppress(email); setEmail(""); onOk("Added to the suppression list."); load(); } catch (e) { onError(e instanceof Error ? e.message : "Could not add."); } };
  return (
    <>
      <p style={muted}>People who must not be contacted or added again. Only a one-way scrambled form of each email address is kept, so the list cannot be read back, and it stays even after someone is erased. Objections and erasures add to it automatically.</p>
      <form onSubmit={(e) => { e.preventDefault(); void add(); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }} aria-label="Add to the suppression list">
        <div style={{ flex: "1 1 260px", maxWidth: 380 }}><Field label="Add an email address"><input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} required /></Field></div>
        <Button size="sm" variant="secondary" type="submit" disabled={!email.trim()}>Add</Button>
      </form>
      {d && <p style={muted}>{d.total} on the list.</p>}
      {d && d.recent.length > 0 && (
        <table aria-label="Recent suppression entries" style={{ borderCollapse: "collapse", width: "100%", maxWidth: 480 }}>
          <thead><tr><th scope="col" style={th}>Added</th><th scope="col" style={th}>Reason</th></tr></thead>
          <tbody>{d.recent.map((r) => <tr key={r.id}><td style={td}>{fmtDate(r.createdAt)}</td><td style={td}>{humanise(r.reason)}</td></tr>)}</tbody>
        </table>
      )}
    </>
  );
}

function Log({ onError }: { onError: (m: string | null) => void }) {
  const [rows, setRows] = useState<CrmAccessLogRow[] | null>(null);
  useEffect(() => { apiClient.crmAccessLog().then(setRows).catch((e) => onError(e instanceof Error ? e.message : "Could not load the log.")); }, [onError]);
  return (
    <>
      <p style={muted}>The latest 100 times someone opened a stakeholder&rsquo;s people, searched for a person, downloaded a copy, changed a person&rsquo;s details, or recorded an objection or an anonymisation.</p>
      {rows && rows.length === 0 && <p style={muted}>Nothing logged yet.</p>}
      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table aria-label="Access log" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr>{["When", "Who", "What", "Detail"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><td style={td}>{new Date(r.at).toLocaleString("en-GB")}</td><td style={td}>{r.userName ?? "Unknown"}</td><td style={td}>{humanise(r.action)}</td><td style={td}>{r.detail ?? ""}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
