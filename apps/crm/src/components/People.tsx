"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CRM_CONTACT_STATUS_LABELS, CRM_DECISION_ROLE_LABELS, CRM_DECISION_ROLES, CRM_LAWFUL_BASES, CRM_LAWFUL_BASIS_LABELS, CRM_SUBSCRIBER_TYPE_LABELS, CRM_SUBSCRIBER_TYPES,
  type CrmContactStatus, type CrmDecisionRole, type CrmLawfulBasis, type CrmPerson, type CrmSubscriberType,
} from "@universe/types";
import { Button, Pill, UNIVERSE_APPS } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { ErrorNote, Field, fmtDate, inputStyle } from "../lib/ui";

const TONE: Record<CrmContactStatus, "good" | "neutral" | "warning" | "critical"> = { ACTIVE: "good", LEFT: "neutral", RESTRICTED: "warning", OBJECTED: "critical", ANONYMISED: "neutral" };

/** The people at a stakeholder: who they are, how they matter, and on what basis the organisation holds their details. Viewing is logged. */
export function People({ relId, partnerId, canManage }: { relId: string; partnerId: string | null; canManage: boolean }) {
  const [rows, setRows] = useState<CrmPerson[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(() => { apiClient.crmPersons(relId).then((r) => { setRows(r); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load people.")); }, [relId]);
  useEffect(() => { load(); }, [load]);
  const pm = UNIVERSE_APPS.find((a) => a.key === "project-management")?.href;
  if (err && !rows) return <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{err}</p>;
  if (!rows) return <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Loading…</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <ErrorNote message={err} />
      {ok && <p role="status" style={{ margin: 0, color: "var(--u-status-good-text)" }}>{ok}</p>}
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Business details only. Do not record health, beliefs, trade-union membership or criminal allegations about anyone. Opening this list is recorded in the access log.</p>
      {rows.length === 0 && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>No contacts recorded yet. Contacts are added on the stakeholder record in Project Management.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {rows.map((p) => (
          <li key={p.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", display: "grid", gap: 6, fontSize: 13.5 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <strong>{p.name}</strong>
              {p.title && <span style={{ color: "var(--u-ink-secondary)" }}>{p.title}</span>}
              <Pill tone={TONE[p.status]}>{CRM_CONTACT_STATUS_LABELS[p.status]}</Pill>
              {p.decisionRole && <Pill tone="brand">{CRM_DECISION_ROLE_LABELS[p.decisionRole]}</Pill>}
              {p.suppressed && <Pill tone="critical">On suppression list</Pill>}
            </div>
            <div style={{ color: "var(--u-ink-secondary)" }}>{p.email ?? "No email"} · {p.phone ?? "No phone"}</div>
            <div style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>
              Basis: {CRM_LAWFUL_BASIS_LABELS[p.lawfulBasis]} · Verified {fmtDate(p.lastVerifiedAt)} · Privacy notice {p.noticeSentAt ? `sent ${fmtDate(p.noticeSentAt)}` : "not sent"}
            </div>
            {canManage && p.status !== "ANONYMISED" && p.status !== "OBJECTED" && (
              <div><Button size="sm" variant="secondary" aria-expanded={openId === p.id} onClick={() => setOpenId(openId === p.id ? null : p.id)}>{openId === p.id ? "Close" : "Manage"}</Button></div>
            )}
            {openId === p.id && <Manage p={p} onDone={(msg) => { setOpenId(null); if (msg) setOk(msg); load(); }} onError={setErr} />}
          </li>
        ))}
      </ul>
      {pm && partnerId && <p style={{ margin: 0 }}><a href={`${pm}/partners/detail?id=${partnerId}`}>Add or edit contact details in Project Management</a></p>}
    </div>
  );
}

function Manage({ p, onDone, onError }: { p: CrmPerson; onDone: (msg?: string) => void; onError: (m: string | null) => void }) {
  const [d, setD] = useState({ decisionRole: (p.decisionRole ?? "") as CrmDecisionRole | "", lawfulBasis: p.lawfulBasis as CrmLawfulBasis, reason: p.lawfulBasisReason ?? "", subscriberType: p.subscriberType as CrmSubscriberType, status: (p.status === "LEFT" || p.status === "RESTRICTED" ? p.status : "ACTIVE") as "ACTIVE" | "LEFT" | "RESTRICTED" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"object" | "anonymise" | null>(null);
  const [why, setWhy] = useState("");
  const run = async (fn: () => Promise<unknown>, done: string) => { setBusy(true); onError(null); try { await fn(); onDone(done); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  return (
    <div style={{ borderTop: "1px solid var(--u-border)", paddingTop: 10, display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Field label="Role in decisions"><select className="u-native-select" style={inputStyle} value={d.decisionRole} onChange={(e) => setD({ ...d, decisionRole: e.target.value as CrmDecisionRole | "" })}><option value="">Not set</option>{CRM_DECISION_ROLES.map((r) => <option key={r} value={r}>{CRM_DECISION_ROLE_LABELS[r]}</option>)}</select></Field>
        <Field label="Lawful basis for holding their details" hint="Legitimate interests is the usual basis for managing a supply relationship."><select className="u-native-select" style={inputStyle} value={d.lawfulBasis} onChange={(e) => setD({ ...d, lawfulBasis: e.target.value as CrmLawfulBasis })}>{CRM_LAWFUL_BASES.map((r) => <option key={r} value={r}>{CRM_LAWFUL_BASIS_LABELS[r]}</option>)}</select></Field>
        <Field label="Kind of business" hint="Sole traders and partnerships count as individuals for electronic marketing."><select className="u-native-select" style={inputStyle} value={d.subscriberType} onChange={(e) => setD({ ...d, subscriberType: e.target.value as CrmSubscriberType })}>{CRM_SUBSCRIBER_TYPES.map((r) => <option key={r} value={r}>{CRM_SUBSCRIBER_TYPE_LABELS[r]}</option>)}</select></Field>
        <Field label="Status"><select className="u-native-select" style={inputStyle} value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as "ACTIVE" | "LEFT" | "RESTRICTED" })}><option value="ACTIVE">Active</option><option value="LEFT">Has left the organisation</option><option value="RESTRICTED">Use restricted while a dispute is resolved</option></select></Field>
      </div>
      <Field label="Why this basis applies (optional)"><input style={inputStyle} maxLength={500} value={d.reason} onChange={(e) => setD({ ...d, reason: e.target.value })} /></Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => apiClient.updateCrmPerson(p.id, { decisionRole: d.decisionRole || null, lawfulBasis: d.lawfulBasis, lawfulBasisReason: d.reason || null, subscriberType: d.subscriberType, status: d.status }), `${p.name}: saved.`)}>Save</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.updateCrmPerson(p.id, { markVerified: true }), `${p.name}: marked as verified today.`)}>Details verified today</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.updateCrmPerson(p.id, { noticeSent: true }), `${p.name}: privacy notice recorded as sent.`)}>Privacy notice sent</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirm("object")}>They object…</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirm("anonymise")}>Anonymise…</Button>
      </div>
      {confirm === "object" && (
        <div role="group" aria-label="Confirm objection" style={{ border: "1px solid var(--u-status-warning)", borderRadius: "var(--u-radius-md)", padding: 10, display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}>Record that {p.name} objects to their details being used. Their email goes on the suppression list so they are not contacted or added again, and their record is locked. You can still anonymise them afterwards.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => apiClient.crmPersonObjects(p.id), `${p.name}: objection recorded.`)}>Record the objection</Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {confirm === "anonymise" && (
        <div role="group" aria-label="Confirm anonymisation" style={{ border: "1px solid var(--u-status-critical)", borderRadius: "var(--u-radius-md)", padding: 10, display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>This cannot be undone.</strong> {p.name}&rsquo;s name, email, phone and title are removed everywhere in your organisation, including interaction notes and complaint records. Only a one-way hash of their email stays, so they are not added back. Check there is no reason to keep the record (a legal claim, for example).</p>
          <Field label="Reason (recorded in the log)"><input style={inputStyle} maxLength={500} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="primary" disabled={busy || !why.trim()} onClick={() => run(async () => { const r = await apiClient.crmAnonymise(p.id, { reason: why }); onError(null); return r; }, `${p.name} has been anonymised. Check free-text notes for nicknames or descriptions that could still identify them.`)}>Anonymise permanently</Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
