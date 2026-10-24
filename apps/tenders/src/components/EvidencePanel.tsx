"use client";

import { useRef, useState } from "react";
import { EVIDENCE_KIND_LABELS, EVIDENCE_KINDS, type EvidenceView, type TenderContractView } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, fmtDate, inputStyle } from "../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;

/**
 * Evidence on a contract (step 7 part 3). Each item is a logged record (type, date, reference, what it relates to) that may carry a file; the
 * file's SHA-256 fingerprint goes onto the tender's tamper-evident timeline. Records are never edited: the other party acknowledges them, and the
 * party that logged one can withdraw it with a reason.
 */
export function EvidenceSection({ c, busy, act, setErr }: { c: TenderContractView; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<boolean>; setErr: (m: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "DELIVERY_NOTE", title: "", description: "", reference: "", evidenceDate: new Date().toISOString().slice(0, 10), link: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const targets = [
    ...c.milestones.map((m) => ({ key: `MILESTONE:${m.id}`, label: `Milestone: ${m.title}` })),
    ...c.payments.map((p) => ({ key: `PAYMENT:${p.id}`, label: `Payment: ${p.reference}` })),
    ...c.variations.map((v) => ({ key: `VARIATION:${v.id}`, label: `Variation ${v.number}: ${v.title}` })),
  ];
  const canLog = c.status !== "DRAFT";
  const openFile = async (id: string) => { try { const r = await apiClient.evidenceFileUrl(id); window.open(r.downloadUrl, "_blank", "noopener"); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the file."); } };
  return (
    <div>
      <h3 style={{ margin: "18px 0 6px", fontSize: 14 }}>Evidence {c.evidence.length > 0 && <Pill tone="neutral">{c.evidence.filter((e) => !e.withdrawnAt).length}</Pill>}</h3>
      <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5, ...muted }}>Log delivery notes, inspection reports, certificates, invoices and similar records here rather than sending loose files. Each is dated, typed and linked to what it proves; a file's fingerprint is written to the audit timeline, so it cannot be swapped unnoticed. The other party can acknowledge it.</p>
      {c.evidence.length === 0 && <div style={{ fontSize: 13.5, ...muted }}>None logged yet.</div>}
      {c.evidence.map((e) => <Evidence key={e.id} e={e} busy={busy} act={act} onOpen={() => openFile(e.id)} />)}
      {canLog && !open && <div style={{ marginTop: 8 }}><Button variant="secondary" onClick={() => setOpen(true)}>Log evidence</Button></div>}
      {!canLog && <div style={{ fontSize: 13, ...muted }}>Evidence can be logged once the contract has been sent for signature.</div>}
      {canLog && open && (
        <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            <Field label="Type"><Select ariaLabel="Evidence type" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={EVIDENCE_KINDS.map((k) => ({ value: k, label: EVIDENCE_KIND_LABELS[k] }))} /></Field>
            <Field label="Date of the evidence"><input type="date" style={inputStyle} value={f.evidenceDate} onChange={(e) => setF({ ...f, evidenceDate: e.target.value })} /></Field>
          </div>
          <Field label="Title"><input style={inputStyle} value={f.title} maxLength={300} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            <Field label="Reference number (for example the delivery note or invoice number)"><input style={inputStyle} value={f.reference} maxLength={200} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
            <Field label="Relates to"><Select ariaLabel="Relates to" value={f.link} onChange={(v) => setF({ ...f, link: v })} options={[{ value: "", label: "The contract as a whole" }, ...targets.map((t) => ({ value: t.key, label: t.label }))]} /></Field>
          </div>
          <Field label="Description (optional)"><input style={inputStyle} value={f.description} maxLength={2000} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="File (optional if you give a reference number)"><input ref={fileRef} type="file" style={inputStyle} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" disabled={busy || f.title.trim().length < 2} onClick={async () => {
              const file = fileRef.current?.files?.[0] ?? null;
              if (!file && !f.reference.trim()) { setErr("Attach a file or give a reference number."); return; }
              const [linkType, linkId] = f.link ? f.link.split(":") : [undefined, undefined];
              if (await act(() => apiClient.addContractEvidence(c.id, file, { kind: f.kind, title: f.title.trim(), description: f.description.trim() || undefined, reference: f.reference.trim() || undefined, evidenceDate: new Date(f.evidenceDate).toISOString(), linkType, linkId }))) {
                setOpen(false); setF({ ...f, title: "", description: "", reference: "", link: "" }); if (fileRef.current) fileRef.current.value = "";
              }
            }}>{busy ? "Working…" : "Log evidence"}</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Evidence({ e, busy, act, onOpen }: { e: EvidenceView; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<boolean>; onOpen: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5, opacity: e.withdrawnAt ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span><strong style={{ textDecoration: e.withdrawnAt ? "line-through" : "none" }}>{e.title}</strong> <Pill tone="neutral">{EVIDENCE_KIND_LABELS[e.kind] ?? e.kind}</Pill> {e.acknowledgedAt && <Pill tone="good">Acknowledged</Pill>} {e.withdrawnAt && <Pill tone="critical">Withdrawn</Pill>}</span>
        {e.fileName && !e.withdrawnAt && <Button size="sm" variant="secondary" onClick={onOpen}>Open file</Button>}
      </div>
      <div style={muted}>{fmtDate(e.evidenceDate)}{e.reference ? ` · ref ${e.reference}` : ""}{e.linkLabel ? ` · ${e.linkLabel}` : ""} · logged by {e.recordedByYou ? "you" : e.recordedBy ?? "the other party"} on {fmtDate(e.recordedAt)}{e.acknowledgedAt ? ` · acknowledged by ${e.acknowledgedBy ?? "the other party"} on ${fmtDate(e.acknowledgedAt)}` : ""}</div>
      {e.description && <div style={muted}>{e.description}</div>}
      {e.fileName && <div style={{ ...muted, fontSize: 12.5 }}>{e.fileName}{e.fileSizeBytes ? ` · ${(e.fileSizeBytes / 1024).toFixed(0)} KB` : ""}{e.sha256 ? ` · SHA-256 ${e.sha256.slice(0, 16)}…` : ""}</div>}
      {e.withdrawnReason && <div style={muted}>Withdrawn: {e.withdrawnReason}</div>}
      {(e.canAcknowledge || e.canWithdraw) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
          {e.canAcknowledge && <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => apiClient.acknowledgeEvidence(e.id))}>Acknowledge</Button>}
          {e.canWithdraw && <><input aria-label="Reason for withdrawing" style={{ ...inputStyle, width: 240 }} placeholder="Reason (to withdraw)" value={reason} onChange={(x) => setReason(x.target.value)} /><Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => act(() => apiClient.withdrawEvidence(e.id, reason))}>Withdraw</Button></>}
        </div>)}
    </div>
  );
}
