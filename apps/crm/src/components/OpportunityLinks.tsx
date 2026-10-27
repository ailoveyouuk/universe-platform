"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CRM_PARTICIPANT_ROLE_LABELS, CRM_PARTICIPANT_ROLES, categoryLabel, type CrmOpportunity, type CrmOpportunityDelivery, type CrmOpportunityFramework, type CrmParticipantRole, type CrmRelationshipRow, type CrmTenderOption } from "@universe/types";
import { Button, Dot, MeterBar, ProgressRing } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { accentStyle } from "../lib/category";
import { Field, fmtDate, humanise, inputStyle } from "../lib/ui";

/**
 * The people and records around one opportunity (2026-10-27): the tender it is about, whether its stage follows the tender bid or project, and every stakeholder that
 * touched it with what they did. Participants from the tender and project are worked out automatically; more can be added by hand.
 */
export function OpportunityLinks({ o, canManage, onChanged, onError }: { o: CrmOpportunity; canManage: boolean; onChanged: () => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [tenders, setTenders] = useState<CrmTenderOption[] | null>(null);
  const [tenderId, setTenderId] = useState("");
  const [tq, setTq] = useState("");
  const [adding, setAdding] = useState(false);
  const [needle, setNeedle] = useState("");
  const [found, setFound] = useState<CrmRelationshipRow[]>([]);
  const [relId, setRelId] = useState("");
  const [role, setRole] = useState<CrmParticipantRole>("OTHER");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!canManage || o.sourceTenderId) return; const t = setTimeout(() => { apiClient.crmTenderOptions(tq).then(setTenders).catch(() => setTenders([])); }, 250); return () => clearTimeout(t); }, [tq, canManage, o.sourceTenderId]);
  useEffect(() => { if (!adding || needle.trim().length < 2) { setFound([]); return; } const t = setTimeout(() => { apiClient.crmRelationships({ q: needle, pageSize: 8 }).then((d) => setFound(d.items)).catch(() => setFound([])); }, 250); return () => clearTimeout(t); }, [needle, adding]);
  const run = async (fn: () => Promise<unknown>, done?: string) => { setBusy(true); onError(null); setMsg(null); try { await fn(); if (done) setMsg(done); onChanged(); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  const linked = o.sourceTenderId || o.linkedId;
  return (
    <details style={{ fontSize: 13 }}>
      <summary style={{ cursor: "pointer" }}>Links and people involved ({o.participants.length})</summary>
      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>
          {o.sourceTenderLabel ? <>Tender: <strong>{o.sourceTenderLabel}</strong>. </> : "Not linked to a tender. "}{o.linkedLabel ? <>Project: <strong>{o.linkedLabel}</strong>. </> : "Not linked to a project. "}
          {linked ? (o.syncWithLinked ? "The stage follows the linked tender bid or project." : "The stage is moved by hand.") : ""}
        </p>
        {canManage && !o.sourceTenderId && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px" }}><Field label="Find a tender"><input style={inputStyle} value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Reference or title" aria-label="Find a tender" /></Field></div>
            <div style={{ flex: "2 1 240px" }}><Field label="Link to a tender"><select className="u-native-select" style={inputStyle} value={tenderId} onChange={(e) => setTenderId(e.target.value)}><option value="">Choose a tender</option>{(tenders ?? []).map((t) => <option key={t.id} value={t.id}>{t.referenceNumber} · {t.title} ({t.issuerName})</option>)}</select></Field></div>
            <Button size="sm" variant="secondary" disabled={busy || !tenderId} onClick={() => run(() => apiClient.updateCrmOpportunity(o.id, { sourceTenderId: tenderId }), "Linked. People involved have been worked out from the tender.")}>Link</Button>
          </div>
        )}
        {canManage && linked && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={o.syncWithLinked} disabled={busy} onChange={(e) => void run(() => apiClient.updateCrmOpportunity(o.id, { syncWithLinked: e.target.checked }))} />Keep the stage in step with the linked tender bid or project</label>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.syncCrmOpportunities(o.id), "Checked the linked tender and project.")}>Check now</Button>
            {o.sourceTenderId && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.updateCrmOpportunity(o.id, { sourceTenderId: null }), "Tender link removed.")}>Remove the tender link</Button>}
          </div>
        )}
        {o.participants.length === 0 ? <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Nobody else is recorded on this opportunity yet. Link a tender or project, or add people by hand.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {CRM_PARTICIPANT_ROLES.filter((r) => o.participants.some((p) => p.role === r)).map((r) => (
              <div key={r}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", marginBottom: 4 }}>{CRM_PARTICIPANT_ROLE_LABELS[r]}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {o.participants.filter((p) => p.role === r).map((p) => (
                    <li key={p.id} style={{ ...accentStyle(p.kinds), border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "6px 10px", display: "grid", gap: 2, maxWidth: 280 }}>
                      <Link href={`/relationships?id=${p.relationshipId}`}><strong>{p.name}</strong></Link>
                      <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{p.kinds.map(categoryLabel).join(", ") || "Stakeholder"} · {p.source === "MANUAL" ? "added by hand" : `from the ${p.source === "TENDER" ? "tender" : "project"}`}{p.note ? ` · ${p.note}` : ""}</span>
                      {canManage && <button type="button" disabled={busy} onClick={() => void run(() => apiClient.removeCrmOpportunityParticipant(o.id, p.id))} style={{ justifySelf: "start", background: "none", border: 0, padding: 0, font: "inherit", fontSize: 12, color: "var(--u-link)", textDecoration: "underline", cursor: "pointer" }}>Remove</button>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {canManage && !adding && <div><Button size="sm" variant="secondary" onClick={() => setAdding(true)}>Add someone involved</Button></div>}
        {canManage && adding && (
          <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await apiClient.addCrmOpportunityParticipant(o.id, { relationshipId: relId, role, note: note || null }); setAdding(false); setNeedle(""); setRelId(""); setNote(""); }); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px" }}><Field label="Find a stakeholder"><input style={inputStyle} value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder="Type at least two letters" aria-label="Find a stakeholder" /></Field></div>
            <div style={{ flex: "1 1 200px" }}><Field label="Stakeholder"><select className="u-native-select" style={inputStyle} value={relId} onChange={(e) => setRelId(e.target.value)} required><option value="">Choose</option>{found.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></div>
            <div style={{ flex: "1 1 160px" }}><Field label="What they did"><select className="u-native-select" style={inputStyle} value={role} onChange={(e) => setRole(e.target.value as CrmParticipantRole)}>{CRM_PARTICIPANT_ROLES.map((r) => <option key={r} value={r}>{CRM_PARTICIPANT_ROLE_LABELS[r]}</option>)}</select></Field></div>
            <div style={{ flex: "1 1 160px" }}><Field label="Note (optional)"><input style={inputStyle} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
            <Button size="sm" variant="primary" type="submit" disabled={busy || !relId}>Add</Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => setAdding(false)}>Cancel</Button>
          </form>
        )}
        {o.kind === "FRAMEWORK_CALL_OFF" && <Framework id={o.id} sourceTenderId={o.sourceTenderId} />}
        {o.stage === "WON" && <Delivery id={o.id} linkedId={o.linkedId} />}
        {msg && <p role="status" style={{ margin: 0, color: "var(--u-status-good-text)" }}>{msg}</p>}
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--u-ink-secondary)" }}>Tender and project people are limited to stakeholders already in your CRM. Last updated {fmtDate(o.stageChangedAt)} (stage).</p>
      </div>
    </details>
  );
}

/** How the project behind a won opportunity is delivering. Shows no money; project prices stay in Project Management behind its financial permission. */
function Delivery({ id, linkedId }: { id: string; linkedId: string | null }) {
  const [d, setD] = useState<CrmOpportunityDelivery | null>(null);
  useEffect(() => { apiClient.crmOpportunityDelivery(id).then(setD).catch(() => setD(null)); }, [id, linkedId]);
  if (!d) return null;
  if (!d.available) return <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Delivery: {d.reason}</p>;
  const pc = (n: number | null) => (n === null ? "not recorded yet" : `${n}%`);
  return (
    <section aria-label="Delivery" style={{ borderTop: "1px solid var(--u-border)", paddingTop: 8 }}>
      <h4 style={{ margin: "0 0 4px", fontSize: 13.5 }}>Delivery</h4>
      <p style={{ margin: 0 }}>{d.project?.referenceNumber} · {d.project?.title} · {humanise(d.project?.status ?? "")}{d.project?.completionStage ? ` (${humanise(d.project.completionStage)})` : ""}</p>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start", margin: "6px 0" }}>
        <ProgressRing value={d.deliveredPercent} tone="brand" caption={`Delivered (${d.delivered} of ${d.lines} lines)`} />
        <ProgressRing value={d.onTimePercent} tone="good" caption="On time" />
        <ProgressRing value={d.inFullPercent} tone="good" caption="In full" />
        <ProgressRing value={d.otifPercent} tone="good" caption="Both (OTIF)" />
      </div>
      {d.nextDue && <p style={{ margin: 0 }}>Next delivery due {fmtDate(d.nextDue)}</p>}
      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>From the project&apos;s delivery lines in Project Management. No project prices are shown here.</p>
    </section>
  );
}

const amt = (v: number | null, c: string | null) => (v === null ? "not shown" : new Intl.NumberFormat("en-GB", { style: c ? "currency" : "decimal", currency: c ?? undefined, maximumFractionDigits: 0 }).format(v));
/** The framework behind a call-off opportunity. The issuer sees the ceiling and every call-off; a supplier sees only its own. */
function Framework({ id, sourceTenderId }: { id: string; sourceTenderId: string | null }) {
  const [d, setD] = useState<CrmOpportunityFramework | null>(null);
  useEffect(() => { apiClient.crmOpportunityFramework(id).then(setD).catch(() => setD(null)); }, [id, sourceTenderId]);
  if (!d) return null;
  if (!d.available) return <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Framework: {d.reason}</p>;
  const owner = d.viewer === "OWNER", c = d.tender?.currency ?? null;
  return (
    <section aria-label="Framework agreement" style={{ borderTop: "1px solid var(--u-border)", paddingTop: 8 }}>
      <h4 style={{ margin: "0 0 4px", fontSize: 13.5 }}>Framework agreement</h4>
      <p style={{ margin: 0 }}>{d.tender?.referenceNumber} · {d.tender?.title}</p>
      {owner && d.ceiling !== null ? (
        <MeterBar used={d.committed} max={d.ceiling} ariaLabel={`Framework ceiling ${amt(d.ceiling, c)}, committed ${amt(d.committed, c)}`}>
          <p style={{ margin: 0 }}>{amt(d.committed, c)} committed of {amt(d.ceiling, c)} · <strong>{amt(d.unused, c)} unused</strong>{d.usedPercent !== null ? ` · ${d.usedPercent}% used` : ""}</p>
        </MeterBar>
      ) : <p style={{ margin: "4px 0 0" }}>{owner ? "No ceiling set." : `Your call-offs committed: ${amt(d.committed, c)}. The ceiling is only shown to the issuer.`}</p>}
      <p style={{ margin: "4px 0 0" }}>{owner ? "Call-offs" : "Your call-offs"}: {d.callOffCount} open ({d.accepted} accepted, {d.awaiting} awaiting approval or the supplier)</p>
      <p style={{ margin: 0 }}>{d.expiresAt ? <><Dot colour={d.daysLeft !== null && d.daysLeft < 90 ? "var(--u-status-warning)" : "var(--u-status-good)"} /> Expires {fmtDate(d.expiresAt)}{d.daysLeft !== null ? (d.daysLeft >= 0 ? `, ${d.daysLeft} days left` : `, ended ${-d.daysLeft} days ago`) : ""}</> : "No end date recorded"}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>From the framework in Tenders, in its own currency (not converted). Committed counts call-offs awaiting approval, awaiting the supplier or accepted.</p>
    </section>
  );
}
