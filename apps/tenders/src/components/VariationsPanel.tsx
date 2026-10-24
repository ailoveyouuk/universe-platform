"use client";

import { useState } from "react";
import type { ContractVariationView, TenderContractView } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, fmtDate, inputStyle } from "../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const TONE = { PROPOSED: "warning", ACCEPTED: "good", REJECTED: "critical", WITHDRAWN: "neutral" } as const;
const money = (n: number | null, c: string | null) => (n == null ? "n/a" : `${c ?? ""} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim());

/**
 * Variations to a signed contract (step 7 part 3). Either party proposes; the other must accept before the contract changes. Nothing is edited
 * in place: each variation keeps the previous value, the reason, who answered and when, and is on the tender's timeline.
 */
export function VariationsSection({ c, busy, act }: { c: TenderContractView; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<boolean> }) {
  const active = c.status === "ACTIVE";
  const waiting = c.variations.some((v) => v.status === "PROPOSED");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", reason: "", newTotalValue: "", newEndDate: "", termsAmendment: "" });
  const valid = f.title.trim().length >= 2 && f.reason.trim().length >= 5 && (f.newTotalValue !== "" || f.newEndDate !== "" || f.termsAmendment.trim() !== "");
  return (
    <div>
      <h3 style={{ margin: "18px 0 6px", fontSize: 14 }}>Variations {c.variations.length > 0 && <Pill tone="neutral">{c.variations.length}</Pill>}</h3>
      <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5, ...muted }}>After signature the contract changes only through a variation. Either party proposes a change to the value, the end date or the terms with a reason; it applies only when the other party accepts. Every step is on the timeline.</p>
      {c.variations.length === 0 && <div style={{ fontSize: 13.5, ...muted }}>None yet.</div>}
      {c.variations.map((v) => <Variation key={v.id} v={v} currency={c.currency} busy={busy} act={act} />)}
      {active && !waiting && !open && <div style={{ marginTop: 8 }}><Button variant="secondary" onClick={() => setOpen(true)}>Propose a variation</Button></div>}
      {active && waiting && <div style={{ fontSize: 13, marginTop: 6, ...muted }}>One variation is waiting for an answer. Another can be proposed once it is answered or withdrawn.</div>}
      {active && open && (
        <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 640 }}>
          <Field label="Title"><input style={inputStyle} value={f.title} maxLength={300} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Reason"><input style={inputStyle} value={f.reason} maxLength={1000} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            <Field label={`New contract value (now ${money(c.totalValue, c.currency)})`}><input type="number" min={0} style={inputStyle} value={f.newTotalValue} onChange={(e) => setF({ ...f, newTotalValue: e.target.value })} /></Field>
            <Field label={`New end date (now ${c.endDate ? fmtDate(c.endDate) : "not set"})`}><input type="date" style={inputStyle} value={f.newEndDate} onChange={(e) => setF({ ...f, newEndDate: e.target.value })} /></Field>
          </div>
          <Field label="Amendment to the terms (optional)"><textarea style={{ ...inputStyle, minHeight: 70 }} value={f.termsAmendment} maxLength={8000} onChange={(e) => setF({ ...f, termsAmendment: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" disabled={busy || !valid} onClick={async () => { if (await act(() => apiClient.proposeContractVariation(c.id, { title: f.title.trim(), reason: f.reason.trim(), newTotalValue: f.newTotalValue !== "" ? Number(f.newTotalValue) : undefined, newEndDate: f.newEndDate ? new Date(f.newEndDate).toISOString() : undefined, termsAmendment: f.termsAmendment.trim() || undefined }))) { setOpen(false); setF({ title: "", reason: "", newTotalValue: "", newEndDate: "", termsAmendment: "" }); } }}>Send for the other party to accept</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Variation({ v, currency, busy, act }: { v: ContractVariationView; currency: string | null; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<boolean> }) {
  const [note, setNote] = useState("");
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5 }}>
      <div><strong>Variation {v.number}: {v.title}</strong> <Pill tone={TONE[v.status]}>{v.status.toLowerCase()}</Pill> <span style={muted}>· proposed by {v.byYou ? "you" : v.proposedBy ?? "the other party"} on {fmtDate(v.createdAt)}</span></div>
      <div style={muted}>Reason: {v.reason}</div>
      {v.newTotalValue != null && <div>Value: {money(v.previousTotalValue, currency)} to <strong>{money(v.newTotalValue, currency)}</strong></div>}
      {v.newEndDate && <div>End date: {v.previousEndDate ? fmtDate(v.previousEndDate) : "not set"} to <strong>{fmtDate(v.newEndDate)}</strong></div>}
      {v.termsAmendment && <div style={{ whiteSpace: "pre-wrap" }}>Terms: {v.termsAmendment}</div>}
      {v.respondedAt && <div style={muted}>{v.status === "ACCEPTED" ? "Accepted" : v.status === "REJECTED" ? "Rejected" : "Withdrawn"} on {fmtDate(v.respondedAt)}{v.responseNote ? `: ${v.responseNote}` : ""}{v.appliedAt ? " · applied to the contract" : ""}</div>}
      {(v.canRespond || v.canWithdraw) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
          {v.canRespond && <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => apiClient.respondContractVariation(v.id, true, note || undefined))}>Accept and apply</Button>}
          <input aria-label="Reason" style={{ ...inputStyle, width: 240 }} placeholder={v.canRespond ? "Reason (to reject)" : "Reason (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />
          {v.canRespond && <Button size="sm" variant="secondary" disabled={busy || !note.trim()} onClick={() => act(() => apiClient.respondContractVariation(v.id, false, note))}>Reject</Button>}
          {v.canWithdraw && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.withdrawContractVariation(v.id, note))}>Withdraw</Button>}
        </div>)}
    </div>
  );
}
