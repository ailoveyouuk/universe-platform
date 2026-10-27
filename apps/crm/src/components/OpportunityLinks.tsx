"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CRM_PARTICIPANT_ROLE_LABELS, CRM_PARTICIPANT_ROLES, categoryLabel, type CrmOpportunity, type CrmParticipantRole, type CrmRelationshipRow, type CrmTenderOption } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, fmtDate, inputStyle } from "../lib/ui";

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
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {o.participants.map((p) => (
              <li key={p.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                <strong>{CRM_PARTICIPANT_ROLE_LABELS[p.role]}</strong>
                <Link href={`/relationships?id=${p.relationshipId}`}>{p.name}</Link>
                <span style={{ color: "var(--u-ink-secondary)" }}>{p.kinds.map(categoryLabel).join(", ")}{p.source !== "MANUAL" ? ` · from the ${p.source === "TENDER" ? "tender" : "project"}` : " · added by hand"}{p.note ? ` · ${p.note}` : ""}</span>
                {canManage && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.removeCrmOpportunityParticipant(o.id, p.id))}>Remove</Button>}
              </li>
            ))}
          </ul>
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
        {msg && <p role="status" style={{ margin: 0, color: "var(--u-status-good-text)" }}>{msg}</p>}
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--u-ink-secondary)" }}>Tender and project people are limited to stakeholders already in your CRM. Last updated {fmtDate(o.stageChangedAt)} (stage).</p>
      </div>
    </details>
  );
}
