"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { COMMODITY_GROUPS, commodityGroupLabel, CRM_OPPORTUNITY_KIND_LABELS, CRM_OPPORTUNITY_KINDS, CRM_OPPORTUNITY_STAGE_LABELS, CRM_OPPORTUNITY_STAGES, type CrmOpportunity, type CrmOpportunityKind, type CrmOpportunityPage, type CrmOpportunityStage, type CrmPeopleOption, type CrmRelationshipDetail, type CrmTenderOption, CRM_PARTICIPANT_ROLE_LABELS } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { ErrorNote, Field, fmtDate, inputStyle } from "../lib/ui";
import { SavedFilters } from "./SavedFilters";
import { PipelineBoard } from "./PipelineBoard";
import { OpportunityLinks } from "./OpportunityLinks";
import { SourceNote } from "./SourceNote";

export const money = (v: number | null, c: string | null) => (v === null || !c ? "No value set" : new Intl.NumberFormat("en-GB", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(v));
const stageTone = (s: CrmOpportunityStage) => (s === "WON" ? "good" : s === "LOST" ? "critical" : s === "WITHDRAWN" ? "neutral" : "brand") as "good" | "critical" | "neutral" | "brand";

/**
 * Opportunities list. With `relId` it is the tab on one stakeholder (and can add); without, it is the organisation-wide pipeline list.
 * `stage` (from the pipeline tiles) and the other filters are applied in the database.
 */
export function Opportunities({ relId, canManage, people: peopleProp, stage: stageProp, attention: attentionProp, onAttention, onChanged }: { relId?: string; canManage: boolean; people: CrmPeopleOption[]; stage?: string; attention?: string; onAttention?: (a: string) => void; onChanged?: () => void }) {
  const [stage, setStage] = useState(stageProp ?? "open");
  const [kind, setKind] = useState("");
  const [owner, setOwner] = useState("");
  const [group, setGroup] = useState("");
  const [attention, setAttention] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [people, setPeople] = useState<CrmPeopleOption[]>(peopleProp);
  useEffect(() => { if (!peopleProp.length) apiClient.crmPeople().then(setPeople).catch(() => undefined); }, [peopleProp]);
  useEffect(() => { if (attentionProp !== undefined) { setAttention(attentionProp); setPage(1); } }, [attentionProp]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmOpportunityPage | null>(null);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<CrmRelationshipDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (stageProp) { setStage(stageProp); setPage(1); } }, [stageProp]);
  const load = useCallback(() => {
    apiClient.crmOpportunities({ relationshipId: relId, open: stage === "open" ? "true" : undefined, stage: stage && stage !== "open" ? stage : undefined, kind, owner, group, attention, page, pageSize: 10 })
      .then((d) => { setData(d); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load opportunities."));
  }, [relId, stage, kind, owner, group, attention, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (adding && relId && !detail) apiClient.crmDetail(relId).then(setDetail).catch(() => undefined); }, [adding, relId, detail]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 160 }}><Select value={stage === "open" ? "" : stage} onChange={(v) => { setStage(v || "open"); setPage(1); }} allLabel="All open stages" options={CRM_OPPORTUNITY_STAGES.map((s) => ({ value: s, label: CRM_OPPORTUNITY_STAGE_LABELS[s] }))} ariaLabel="Filter by stage" /></div>
        <div style={{ minWidth: 160 }}><Select value={kind} onChange={(v) => { setKind(v); setPage(1); }} allLabel="Any kind" options={CRM_OPPORTUNITY_KINDS.map((k) => ({ value: k, label: CRM_OPPORTUNITY_KIND_LABELS[k] }))} ariaLabel="Filter by kind" /></div>
        <div style={{ minWidth: 150 }}><Select value={owner} onChange={(v) => { setOwner(v); setPage(1); }} allLabel="Any owner" options={[{ value: "me", label: "Mine" }, { value: "none", label: "No owner" }, ...people.map((p) => ({ value: p.id, label: p.name }))]} ariaLabel="Filter by owner" /></div>
        <div style={{ minWidth: 190 }}><Select value={group} onChange={(v) => { setGroup(v); setPage(1); }} allLabel="Any commodity or service" options={COMMODITY_GROUPS.map((g) => ({ value: g, label: commodityGroupLabel(g) }))} ariaLabel="Filter by commodity or service group" /></div>
        <div style={{ minWidth: 170 }}><Select value={attention} onChange={(v) => { setAttention(v); onAttention?.(v); setPage(1); }} allLabel="Any state" options={[{ value: "stale", label: "No movement for 60+ days" }, { value: "overdue", label: "Past expected date" }]} ariaLabel="Filter by needs attention" /></div>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{data ? `${data.total} opportunit${data.total === 1 ? "y" : "ies"}` : "Loading…"}</span>
        {!relId && <div role="group" aria-label="Show as" style={{ display: "inline-flex", border: "1px solid var(--u-border)", borderRadius: 999, overflow: "hidden" }}>
          {(["list", "board"] as const).map((k) => <button key={k} type="button" className="u-touch" aria-pressed={view === k} onClick={() => setView(k)} style={{ padding: "6px 14px", border: 0, font: "inherit", fontSize: 13, cursor: "pointer", backgroundColor: view === k ? "var(--u-brand-violet)" : "var(--u-surface-raised)", color: view === k ? "var(--u-on-accent)" : "var(--u-ink)" }}>{k === "list" ? "List" : "Board"}</button>)}
        </div>}
        {relId && canManage && !adding && <Button size="sm" variant="primary" onClick={() => setAdding(true)}>Add an opportunity</Button>}
      </div>
      {!relId && <SavedFilters view="OPPORTUNITIES" current={{ stage: stage === "open" ? "" : stage, kind, owner, group, attention }} onApply={(f) => { setStage(f.stage || "open"); setKind(f.kind ?? ""); setOwner(f.owner ?? ""); setGroup(f.group ?? ""); setAttention(f.attention ?? ""); setPage(1); }} canShare={canManage} onError={setErr} />}
      {!relId && view === "board" && <PipelineBoard kind={kind} owner={owner} group={group} attention={attention} canManage={canManage} onChanged={() => { load(); onChanged?.(); }} onError={setErr} />}
      {adding && relId && <AddForm relId={relId} people={people} detail={detail} onDone={() => { setAdding(false); setPage(1); load(); onChanged?.(); }} />}
      {data && data.items.length === 0 && !adding && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{relId ? "No opportunities yet. Add a tender to bid on, something to source, a call-off or a supplier to qualify." : "No opportunities match."}</p>}
      {relId && <AlsoInvolved relId={relId} />}
      {(relId || view === "list") && <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {data?.items.map((o) => <Item key={o.id} o={o} showRel={!relId} canManage={canManage} onChanged={() => { load(); onChanged?.(); }} onError={setErr} />)}
      </ul>}
      {data && pages > 1 && (relId || view === "list") && (
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
        {o.probability !== null && <Pill tone="neutral">{Math.round(o.probability * 100)}% likely</Pill>}
        {o.commodityGroup && <Pill tone="neutral">{commodityGroupLabel(o.commodityGroup)}</Pill>}
        <span style={{ marginLeft: "auto", color: "var(--u-ink-secondary)" }}>{money(o.expectedValue, o.currency)}</span>
      </div>
      <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>
        {showRel && <><Link href={`/relationships?id=${o.relationshipId}`}>{o.relationshipName}</Link> · </>}
        {o.expectedDate ? `Expected ${fmtDate(o.expectedDate)}` : "No date set"}{o.ownerName ? ` · Owner ${o.ownerName}` : " · No owner"}{o.linkedLabel ? ` · ${o.linkedLabel}` : ""}
      </p>
      {o.winBasis && (
        <details style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
          <summary style={{ cursor: "pointer" }}>Why {Math.round((o.probability ?? 0) * 100)}% likely</summary>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            <li>{o.winBasis.stageHistory.n ? `${o.winBasis.stageHistory.won} of ${o.winBasis.stageHistory.n} past opportunities that reached ${CRM_OPPORTUNITY_STAGE_LABELS[o.stage]} were won` : `No past opportunities have reached ${CRM_OPPORTUNITY_STAGE_LABELS[o.stage]} yet, so the usual starting figure of ${Math.round(o.winBasis.stagePrior * 100)}% is used`}.</li>
            <li>{o.winBasis.segmentHistory.n ? `Similar work (${o.winBasis.segmentHistory.label.split(" · ").map((x) => x.trim()).map((x) => CRM_OPPORTUNITY_KIND_LABELS[x as CrmOpportunityKind] ?? commodityGroupLabel(x)).join(", ")}): ${o.winBasis.segmentHistory.won} won of ${o.winBasis.segmentHistory.n} closed` : "No closed history for this kind of work yet"}.</li>
            <li>{o.winBasis.stakeholderHistory.n ? `This stakeholder: ${o.winBasis.stakeholderHistory.won} won of ${o.winBasis.stakeholderHistory.n} closed` : "No closed history with this stakeholder yet"}.</li>
            <li>Your overall win rate is about {Math.round(o.winBasis.overallRate * 100)}%. More closed opportunities make this estimate firmer.</li>
          </ul>
          <SourceNote keys={["probability"]} />
        </details>
      )}
      {o.notes && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{o.notes}</p>}
      <OpportunityLinks o={o} canManage={canManage} onChanged={onChanged} onError={onError} />
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

/** Opportunities of other stakeholders where this one took part (issuer, manufacturer, forwarder and so on). Not counted in this stakeholder's own pipeline. */
function AlsoInvolved({ relId }: { relId: string }) {
  const [items, setItems] = useState<CrmOpportunity[] | null>(null);
  useEffect(() => { apiClient.crmOpportunities({ involved: relId, pageSize: 20 }).then((d) => setItems(d.items)).catch(() => setItems([])); }, [relId]);
  if (!items || items.length === 0) return null;
  return (
    <section aria-label="Also involved in" style={{ borderTop: "1px solid var(--u-border)", paddingTop: 8 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Also involved in</h3>
      <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Opportunities of other stakeholders that this one took part in. They do not count towards this stakeholder&apos;s own pipeline value.</p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 13 }}>
        {items.map((o) => {
          const mine = o.participants.filter((p) => p.relationshipId === relId).map((p) => CRM_PARTICIPANT_ROLE_LABELS[p.role]);
          return <li key={o.id}><Link href={`/relationships?id=${o.relationshipId}`}>{o.title}</Link> <span style={{ color: "var(--u-ink-secondary)" }}>· {o.relationshipName} · {CRM_OPPORTUNITY_STAGE_LABELS[o.stage]} · as {[...new Set(mine)].join(", ").toLowerCase()}</span></li>;
        })}
      </ul>
    </section>
  );
}

function AddForm({ relId, people, detail, onDone }: { relId: string; people: CrmPeopleOption[]; detail: CrmRelationshipDetail | null; onDone: () => void }) {
  const [f, setF] = useState({ title: "", kind: "TENDER" as CrmOpportunityKind, value: "", currency: "GBP", date: "", owner: "", project: "", group: "", notes: "", tender: "", sync: false });
  const [tenders, setTenders] = useState<CrmTenderOption[]>([]);
  useEffect(() => { apiClient.crmTenderOptions().then(setTenders).catch(() => undefined); }, []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const hasValue = f.value.trim() !== "";
      await apiClient.createCrmOpportunity({ relationshipId: relId, title: f.title, kind: f.kind, expectedValue: hasValue ? Number(f.value) : null, currency: hasValue ? f.currency.toUpperCase() : null,
        expectedDate: f.date || null, ownerUserId: f.owner || null, linkedProjectId: f.project || null, commodityGroup: f.group || null, sourceTenderId: f.tender || null, syncWithLinked: f.sync && !!(f.tender || f.project), notes: f.notes || null });
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
        <Field label="Commodity or service group" hint="Helps compare like with like. Taken from the linked project if you leave it blank."><select className="u-native-select" style={inputStyle} value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}><option value="">Not set</option>{COMMODITY_GROUPS.map((g) => <option key={g} value={g}>{commodityGroupLabel(g)}</option>)}</select></Field>
        <Field label="Linked project (optional)"><select className="u-native-select" style={inputStyle} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}><option value="">Not linked</option>{detail?.projects?.items.map((p) => <option key={p.id} value={p.id}>{p.referenceNumber} · {p.title}</option>)}</select></Field>
        <Field label="Linked tender (optional)" hint="People involved in the tender are added for you."><select className="u-native-select" style={inputStyle} value={f.tender} onChange={(e) => setF({ ...f, tender: e.target.value })}><option value="">Not linked</option>{tenders.map((t) => <option key={t.id} value={t.id}>{t.referenceNumber} · {t.title}</option>)}</select></Field>
      </div>
      {(f.tender || f.project) && <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={f.sync} onChange={(e) => setF({ ...f, sync: e.target.checked })} />Keep the stage in step with the linked tender bid or project</label>}
      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60 }} maxLength={1000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" variant="primary" type="submit" disabled={busy || !f.title.trim()}>Save</Button>
        <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
