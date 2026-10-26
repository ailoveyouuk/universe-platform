"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CRM_OPPORTUNITY_KIND_LABELS, CRM_OPPORTUNITY_KINDS, CRM_OPPORTUNITY_STAGE_LABELS, CRM_OPPORTUNITY_STAGES, type CrmOpportunity, type CrmOpportunityKind, type CrmOpportunityPage, type CrmOpportunityStage, type CrmPeopleOption, type CrmRelationshipDetail } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { ErrorNote, Field, fmtDate, inputStyle } from "../lib/ui";

export const money = (v: number | null, c: string | null) => (v === null || !c ? "No value set" : new Intl.NumberFormat("en-GB", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(v));
const stageTone = (s: CrmOpportunityStage) => (s === "WON" ? "good" : s === "LOST" ? "critical" : s === "WITHDRAWN" ? "neutral" : "brand") as "good" | "critical" | "neutral" | "brand";

/**
 * Opportunities list. With `relId` it is the tab on one stakeholder (and can add); without, it is the organisation-wide pipeline list.
 * `stage` (from the pipeline tiles) and the other filters are applied in the database.
 */
export function Opportunities({ relId, canManage, people, stage: stageProp, onChanged }: { relId?: string; canManage: boolean; people: CrmPeopleOption[]; stage?: string; onChanged?: () => void }) {
  const [stage, setStage] = useState(stageProp ?? "open");
  const [kind, setKind] = useState("");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmOpportunityPage | null>(null);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<CrmRelationshipDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (stageProp) { setStage(stageProp); setPage(1); } }, [stageProp]);
  const load = useCallback(() => {
    apiClient.crmOpportunities({ relationshipId: relId, open: stage === "open" ? "true" : undefined, stage: stage && stage !== "open" ? stage : undefined, kind, owner, page, pageSize: 10 })
      .then((d) => { setData(d); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load opportunities."));
  }, [relId, stage, kind, owner, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (adding && relId && !detail) apiClient.crmDetail(relId).then(setDetail).catch(() => undefined); }, [adding, relId, detail]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 160 }}><Select value={stage === "open" ? "" : stage} onChange={(v) => { setStage(v || "open"); setPage(1); }} allLabel="All open stages" options={CRM_OPPORTUNITY_STAGES.map((s) => ({ value: s, label: CRM_OPPORTUNITY_STAGE_LABELS[s] }))} ariaLabel="Filter by stage" /></div>
        <div style={{ minWidth: 160 }}><Select value={kind} onChange={(v) => { setKind(v); setPage(1); }} allLabel="Any kind" options={CRM_OPPORTUNITY_KINDS.map((k) => ({ value: k, label: CRM_OPPORTUNITY_KIND_LABELS[k] }))} ariaLabel="Filter by kind" /></div>
        <div style={{ minWidth: 150 }}><Select value={owner} onChange={(v) => { setOwner(v); setPage(1); }} allLabel="Any owner" options={[{ value: "me", label: "Mine" }, { value: "none", label: "No owner" }]} ariaLabel="Filter by owner" /></div>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{data ? `${data.total} opportunit${data.total === 1 ? "y" : "ies"}` : "Loading…"}</span>
        {relId && canManage && !adding && <Button size="sm" variant="primary" onClick={() => setAdding(true)}>Add an opportunity</Button>}
      </div>
      {adding && relId && <AddForm relId={relId} people={people} detail={detail} onDone={() => { setAdding(false); setPage(1); load(); onChanged?.(); }} />}
      {data && data.items.length === 0 && !adding && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{relId ? "No opportunities yet. Add a tender to bid on, something to source, a call-off or a supplier to qualify." : "No opportunities match."}</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {data?.items.map((o) => <Item key={o.id} o={o} showRel={!relId} canManage={canManage} onChanged={() => { load(); onChanged?.(); }} onError={setErr} />)}
      </ul>
      {data && pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Page {page} of {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function Item({ o, showRel, canManage, onChanged, onError }: { o: CrmOpportunity; showRel: boolean; canManage: boolean; onChanged: () => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false);
  const [reason, setReason] = useState("");
  const run = async (body: Parameters<typeof apiClient.updateCrmOpportunity>[1]) => { setBusy(true); try { await apiClient.updateCrmOpportunity(o.id, body); setLost(false); onChanged(); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  return (
    <li style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", display: "grid", gap: 4, fontSize: 13.5 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Pill tone={stageTone(o.stage)}>{CRM_OPPORTUNITY_STAGE_LABELS[o.stage]}</Pill>
        <strong>{o.title}</strong>
        <Pill tone="neutral">{CRM_OPPORTUNITY_KIND_LABELS[o.kind]}</Pill>
        {o.overdue && <Pill tone="critical">Past its date</Pill>}
        <span style={{ marginLeft: "auto", color: "var(--u-ink-secondary)" }}>{money(o.expectedValue, o.currency)}</span>
      </div>
      <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>
        {showRel && <><Link href={`/relationships?id=${o.relationshipId}`}>{o.relationshipName}</Link> · </>}
        {o.expectedDate ? `Expected ${fmtDate(o.expectedDate)}` : "No date set"}{o.ownerName ? ` · Owner ${o.ownerName}` : " · No owner"}{o.linkedLabel ? ` · ${o.linkedLabel}` : ""}
      </p>
      {o.notes && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{o.notes}</p>}
      {o.lostReason && <p style={{ margin: 0 }}><strong>Why lost:</strong> {o.lostReason}</p>}
      {canManage && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>Move to
            <select className="u-native-select" style={{ ...inputStyle, width: "auto" }} value={o.stage} disabled={busy} onChange={(e) => { const s = e.target.value as CrmOpportunityStage; if (s === "LOST") setLost(true); else void run({ stage: s }); }}>
              {CRM_OPPORTUNITY_STAGES.map((s) => <option key={s} value={s}>{CRM_OPPORTUNITY_STAGE_LABELS[s]}</option>)}
            </select>
          </label>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run({ archived: true })}>Archive</Button>
        </div>
      )}
      {lost && (
        <form onSubmit={(e) => { e.preventDefault(); void run({ stage: "LOST", lostReason: reason }); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px" }}><Field label="Why was it lost?"><input style={inputStyle} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus /></Field></div>
          <Button size="sm" variant="primary" type="submit" disabled={busy || !reason.trim()}>Mark as lost</Button>
          <Button size="sm" variant="secondary" type="button" onClick={() => setLost(false)}>Cancel</Button>
        </form>
      )}
    </li>
  );
}

function AddForm({ relId, people, detail, onDone }: { relId: string; people: CrmPeopleOption[]; detail: CrmRelationshipDetail | null; onDone: () => void }) {
  const [f, setF] = useState({ title: "", kind: "TENDER" as CrmOpportunityKind, value: "", currency: "GBP", date: "", owner: "", project: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const hasValue = f.value.trim() !== "";
      await apiClient.createCrmOpportunity({ relationshipId: relId, title: f.title, kind: f.kind, expectedValue: hasValue ? Number(f.value) : null, currency: hasValue ? f.currency.toUpperCase() : null,
        expectedDate: f.date || null, ownerUserId: f.owner || null, linkedProjectId: f.project || null, notes: f.notes || null });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Add an opportunity" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, display: "grid", gap: 12 }}>
      <ErrorNote message={err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Field label="Title"><input style={inputStyle} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
        <Field label="Kind"><select className="u-native-select" style={inputStyle} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CrmOpportunityKind })}>{CRM_OPPORTUNITY_KINDS.map((k) => <option key={k} value={k}>{CRM_OPPORTUNITY_KIND_LABELS[k]}</option>)}</select></Field>
        <Field label="Expected date"><input type="date" style={inputStyle} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Owner"><select className="u-native-select" style={inputStyle} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}><option value="">No owner yet</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Expected cost value (optional)" hint="Cost side only. Never enter a price that includes margin."><input inputMode="decimal" type="number" min={0} step="any" style={inputStyle} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Currency"><input style={inputStyle} maxLength={3} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} pattern="[A-Za-z]{3}" title="Three letters, such as GBP" /></Field>
        <Field label="Linked project (optional)"><select className="u-native-select" style={inputStyle} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}><option value="">Not linked</option>{detail?.projects?.items.map((p) => <option key={p.id} value={p.id}>{p.referenceNumber} · {p.title}</option>)}</select></Field>
      </div>
      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60 }} maxLength={1000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" variant="primary" type="submit" disabled={busy || !f.title.trim()}>Save</Button>
        <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
