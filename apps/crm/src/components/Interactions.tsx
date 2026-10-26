"use client";
import { useCallback, useEffect, useState } from "react";
import { CRM_INTERACTION_TYPE_LABELS, CRM_INTERACTION_TYPES, type CrmInteraction, type CrmInteractionPage, type CrmInteractionType, type CrmPeopleOption, type CrmRelationshipDetail } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { ErrorNote, Field, fmtDate, inputStyle } from "../lib/ui";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Interactions tab: what happened with this stakeholder, newest first, with a short form to log one and optionally set a follow-up. */
export function Interactions({ relId, canManage, people }: { relId: string; canManage: boolean; people: CrmPeopleOption[] }) {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmInteractionPage | null>(null);
  const [detail, setDetail] = useState<CrmRelationshipDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(() => { apiClient.crmInteractions(relId, { type, page, pageSize: 10 }).then((d) => { setData(d); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load interactions.")); }, [relId, type, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (adding && !detail) apiClient.crmDetail(relId).then(setDetail).catch(() => undefined); }, [adding, detail, relId]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <ErrorNote message={err} />
      {ok && <p role="status" style={{ margin: 0, color: "var(--u-status-good-text)" }}>{ok}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 170 }}><Select value={type} onChange={(v) => { setType(v); setPage(1); }} allLabel="Any type" options={CRM_INTERACTION_TYPES.map((t) => ({ value: t, label: CRM_INTERACTION_TYPE_LABELS[t] }))} ariaLabel="Filter interactions by type" /></div>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{data ? `${data.total} interaction${data.total === 1 ? "" : "s"}` : "Loading…"}</span>
        {canManage && !adding && <Button size="sm" variant="primary" onClick={() => { setAdding(true); setOk(null); }}>Log an interaction</Button>}
      </div>
      {adding && <LogForm relId={relId} people={people} detail={detail} onDone={(msg) => { setAdding(false); if (msg) setOk(msg); setPage(1); load(); }} />}
      {data && data.items.length === 0 && !adding && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Nothing logged yet. Record meetings, calls, site visits, audits and decisions here so the whole team can see the history.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {data?.items.map((i) => <Item key={i.id} i={i} onChanged={load} onError={setErr} />)}
      </ul>
      {data && pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</Button>
          <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Page {page} of {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older</Button>
        </div>
      )}
    </div>
  );
}

function Item({ i, onChanged, onError }: { i: CrmInteraction; onChanged: () => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const archive = async () => { setBusy(true); try { await apiClient.updateCrmInteraction(i.id, { archived: true }); onChanged(); } catch (e) { onError(e instanceof Error ? e.message : "Could not archive."); } finally { setBusy(false); } };
  return (
    <li style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", display: "grid", gap: 4, fontSize: 13.5 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Pill tone="brand">{CRM_INTERACTION_TYPE_LABELS[i.type as CrmInteractionType]}</Pill>
        <strong>{i.title}</strong>
        {i.confidential && <Pill tone="warning">Confidential</Pill>}
        <span style={{ color: "var(--u-ink-secondary)", marginLeft: "auto" }}>{fmtDate(i.occurredAt)}{i.createdByName ? ` · ${i.createdByName}` : ""}</span>
      </div>
      {i.summary && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{i.summary}</p>}
      {i.outcome && <p style={{ margin: 0 }}><strong>Outcome:</strong> {i.outcome}</p>}
      {(i.participants.length > 0 || i.contacts.length > 0) && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>With: {[...i.participants.map((p) => p.name), ...i.contacts.map((c) => c.name)].join(", ")}</p>}
      {i.linkedLabel && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>About: {i.linkedLabel}</p>}
      {i.canEdit && <div><Button size="sm" variant="secondary" disabled={busy} onClick={archive}>Archive</Button></div>}
    </li>
  );
}

function LogForm({ relId, people, detail, onDone }: { relId: string; people: CrmPeopleOption[]; detail: CrmRelationshipDetail | null; onDone: (msg?: string) => void }) {
  const [f, setF] = useState({ type: "MEETING" as CrmInteractionType, occurredAt: today(), title: "", summary: "", outcome: "", participantUserIds: [] as string[], contactIds: [] as string[], linkedProjectId: "", confidential: false,
    followUp: false, assignee: "", due: inDays(7), note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toggle = (k: "contactIds", id: string) => setF((c) => ({ ...c, [k]: c[k].includes(id) ? c[k].filter((x) => x !== id) : [...c[k], id] }));
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await apiClient.logCrmInteraction(relId, { type: f.type, occurredAt: f.occurredAt, title: f.title, summary: f.summary || null, outcome: f.outcome || null, participantUserIds: f.participantUserIds, contactIds: f.contactIds,
        linkedProjectId: f.linkedProjectId || null, confidential: f.confidential, followUp: f.followUp && f.assignee ? { assigneeUserId: f.assignee, dueDate: f.due, note: f.note || null } : null });
      onDone(f.followUp && f.assignee ? "Logged, and the follow-up is in their actions." : "Logged.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Log an interaction" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, display: "grid", gap: 12 }}>
      <ErrorNote message={err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <Field label="Type"><select className="u-native-select" style={inputStyle} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as CrmInteractionType })}>{CRM_INTERACTION_TYPES.map((t) => <option key={t} value={t}>{CRM_INTERACTION_TYPE_LABELS[t]}</option>)}</select></Field>
        <Field label="Date"><input type="date" style={inputStyle} max={today()} value={f.occurredAt} onChange={(e) => setF({ ...f, occurredAt: e.target.value })} required /></Field>
        <Field label="Title"><input style={inputStyle} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
      </div>
      <Field label="What was discussed" hint="Stick to business facts. Do not record personal opinions about individuals."><textarea style={{ ...inputStyle, minHeight: 70 }} maxLength={4000} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
      <Field label="Outcome or decision"><input style={inputStyle} maxLength={1000} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Field label="Colleagues who took part" hint="Hold Ctrl or Cmd to pick several."><select multiple size={4} className="u-native-select" style={inputStyle} value={f.participantUserIds} onChange={(e) => setF({ ...f, participantUserIds: [...e.target.selectedOptions].map((o) => o.value) })}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="About a project (optional)"><select className="u-native-select" style={inputStyle} value={f.linkedProjectId} onChange={(e) => setF({ ...f, linkedProjectId: e.target.value })}><option value="">Not about a project</option>{detail?.projects?.items.map((p) => <option key={p.id} value={p.id}>{p.referenceNumber} · {p.title}</option>)}</select></Field>
      </div>
      {detail?.contacts && detail.contacts.length > 0 && (
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>Their people who took part</legend>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{detail.contacts.map((c) => <label key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.contactIds.includes(c.id)} onChange={() => toggle("contactIds", c.id)} />{c.name}</label>)}</div>
        </fieldset>
      )}
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5 }}><input type="checkbox" checked={f.confidential} onChange={(e) => setF({ ...f, confidential: e.target.checked })} style={{ marginTop: 3 }} /><span><strong>Confidential.</strong> Only you, the relationship owner and CRM managers can see it.</span></label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.followUp} onChange={(e) => setF({ ...f, followUp: e.target.checked })} />Set a follow-up</label>
      {f.followUp && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
          <Field label="Who follows up"><select className="u-native-select" style={inputStyle} value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} required><option value="">Choose a colleague</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Due"><input type="date" style={inputStyle} min={today()} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} required /></Field>
          <Field label="What needs doing"><input style={inputStyle} maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" variant="primary" type="submit" disabled={busy || !f.title.trim()}>Save</Button>
        <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={() => onDone()}>Cancel</Button>
      </div>
    </form>
  );
}
