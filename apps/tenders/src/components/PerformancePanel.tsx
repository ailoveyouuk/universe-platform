"use client";

import { OrgName } from "./OrgName";
import { useEffect, useState } from "react";
import { FEEDBACK_LABELS } from "@universe/types";
import type { ContractPaymentView, QualityEvidence, PaymentPracticeSummary, PerformanceRecordView, SupplierPerformanceSummary, TenderContractView } from "@universe/types";
import { Button, Pill, Select, CollapsibleSection } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, fmtDate, inputStyle } from "../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
type Act = (fn: () => Promise<unknown>) => Promise<boolean>;
const TONE: Record<string, "good" | "warning" | "critical" | "neutral" | "brand"> = { good: "good", warning: "warning", critical: "critical", neutral: "neutral" };
export const BAND_LABEL: Record<string, string> = { STRONG: "Strong", SATISFACTORY: "Satisfactory", GOOD: "Good", WATCH: "Watch", AT_RISK: "At risk", NOT_ENOUGH_DATA: "Not enough data", INSUFFICIENT_HISTORY: "Insufficient history" };
const BAND_TONE: Record<string, "good" | "warning" | "critical" | "neutral" | "brand"> = { STRONG: "good", SATISFACTORY: "good", GOOD: "good", WATCH: "warning", AT_RISK: "critical", NOT_ENOUGH_DATA: "neutral", INSUFFICIENT_HISTORY: "neutral" };
export const BandPill = ({ band }: { band: string }) => <Pill tone={BAND_TONE[band] ?? "neutral"}>{BAND_LABEL[band] ?? band}</Pill>;
const KEYS = ["quality", "communication", "documentation", "flexibility", "wouldUseAgain"] as const;
const SCALE = ["1 Poor", "2 Below expectations", "3 Acceptable", "4 Good", "5 Excellent"];

/** Close-out form for the tender owner: outcome, note, and five-point feedback (a reason is needed for a 1 or 2). */
export function CloseContractForm({ c, busy, act }: { c: TenderContractView; busy: boolean; act: Act }) {
  const [close, setClose] = useState({ outcome: "COMPLETED", note: "" });
  const [give, setGive] = useState(true);
  const [r, setR] = useState<Record<string, number>>({ quality: 4, communication: 4, documentation: 4, flexibility: 4, wouldUseAgain: 4 });
  const [why, setWhy] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [qChecked, setQChecked] = useState(false);
  const missing = give && KEYS.some((k) => r[k] <= 2 && !(why[k] ?? "").trim());
  return (
    <CollapsibleSection title="Close the contract" level={3} bare>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>Closing creates a performance record that you and the supplier both see. It is built from the milestones and, if the supplier created its delivery project, the delivery results, using your own scorecard settings. The supplier has 14 days to reply or dispute a measure. The record cannot be edited afterwards.</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr", gap: 8 }}>
        <Select ariaLabel="Outcome" value={close.outcome} onChange={(v) => setClose({ ...close, outcome: v })} options={[{ value: "COMPLETED", label: "Completed" }, { value: "TERMINATED", label: "Terminated early" }]} />
        <input style={inputStyle} aria-label="Closing note" placeholder="Closing note (required)" value={close.note} onChange={(e) => setClose({ ...close, note: e.target.value })} />
      </div>
      <label style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="checkbox" checked={qChecked} onChange={(e) => setQChecked(e.target.checked)} /> I have reviewed quality and cold chain for this contract (with none linked above, this records "no complaints" rather than "not measured")</label>
      <label style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="checkbox" checked={give} onChange={(e) => setGive(e.target.checked)} /> Give feedback on the supplier (counts towards the record)</label>
      {give && (
        <div style={{ display: "grid", gap: 8, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12 }}>
          {KEYS.map((k) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 190px) minmax(150px, 210px) 1fr", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{FEEDBACK_LABELS[k]}</span>
              <Select ariaLabel={FEEDBACK_LABELS[k]} value={String(r[k])} onChange={(v) => setR({ ...r, [k]: Number(v) })} options={SCALE.map((l, i) => ({ value: String(i + 1), label: l }))} />
              {r[k] <= 2 ? <input style={inputStyle} aria-label={`Reason for ${FEEDBACK_LABELS[k]}`} placeholder="One-line reason (required for 1 or 2)" maxLength={300} value={why[k] ?? ""} onChange={(e) => setWhy({ ...why, [k]: e.target.value })} /> : <span />}
            </div>
          ))}
          <Field label="Comment for the supplier (optional)"><input style={inputStyle} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        </div>
      )}
      <div><Button variant="secondary" disabled={busy || !close.note.trim() || missing} onClick={() => {
        if (!window.confirm("Close this contract? This cannot be undone and creates the performance record.")) return;
        const reasons = Object.fromEntries(KEYS.filter((k) => r[k] <= 2).map((k) => [k, (why[k] ?? "").trim()]));
        void act(() => apiClient.closeTenderContract(c.id, { ...close, qualityChecked: qChecked, ...(give ? { feedback: { quality: r.quality, communication: r.communication, documentation: r.documentation, flexibility: r.flexibility, wouldUseAgain: r.wouldUseAgain, reasons, comment: comment.trim() || undefined } } : {}) }));
      }}>Close contract</Button>{missing && <span style={{ marginLeft: 10, fontSize: 13, ...muted }}>Add a reason for each rating of 1 or 2.</span>}</div>
    </CollapsibleSection>
  );
}

/** The frozen record for a closed contract, with the right of reply. */
export function PerformanceCard({ p, issuer, busy, act }: { p: PerformanceRecordView; issuer: boolean; busy: boolean; act: Act }) {
  const [reply, setReply] = useState({ kind: "REPLY", measureKey: "milestones", body: "" });
  const [answer, setAnswer] = useState("");
  const measured = p.measures.filter((m) => m.weight > 0);
  const label = (k: string | null) => p.measures.find((m) => m.key === k)?.label ?? k ?? "";
  return (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--u-border)", paddingTop: 14 }}>
      <CollapsibleSection title="Performance record" level={3} bare>
        <BandPill band={p.band} />
        {p.overallScore !== null && <strong style={{ fontSize: 15 }}>{p.overallScore}/100</strong>}
        <span style={{ fontSize: 13, ...muted }}>Based on {p.coverage}% of the weighting · closed {fmtDate(p.closedAt)}</span>
        {p.withdrawn && <Pill tone="critical">Withdrawn by platform staff</Pill>}
      </CollapsibleSection>
      {p.withdrawn && <p style={{ margin: "6px 0 0", fontSize: 13.5, ...muted }}>{p.withdrawnReason}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginTop: 8 }}>
          <thead><tr style={{ textAlign: "left", ...muted }}><th style={{ padding: "4px 8px 4px 0" }}>Measure</th><th>Result</th><th>Weight</th><th>Basis</th></tr></thead>
          <tbody>{p.measures.map((m) => (
            <tr key={m.key} style={{ borderTop: "1px solid var(--u-border)", verticalAlign: "top" }}>
              <td style={{ padding: "6px 8px 6px 0" }}>{m.label}</td><td><Pill tone={TONE[m.status] ?? "neutral"}>{m.display}</Pill></td><td>{m.weight || "–"}</td><td style={muted}>{m.detail}</td>
            </tr>))}</tbody>
        </table>
      </div>
      {p.feedback && (
        <div style={{ marginTop: 10, fontSize: 14 }}>
          <strong>Tender owner's feedback</strong> <span style={muted}>(average {p.feedbackAverage?.toFixed(1)} of 5)</span>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{KEYS.map((k) => <li key={k}>{FEEDBACK_LABELS[k]}: {p.feedback![k]}/5{p.feedback!.reasons?.[k] ? ` — ${p.feedback!.reasons[k]}` : ""}</li>)}</ul>
          {p.feedback.comment && <p style={{ margin: "6px 0 0" }}>“{p.feedback.comment}”</p>}
        </div>
      )}
      {p.responses.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 14 }}>Replies and disputes</strong>
          {p.responses.map((x) => (
            <div key={x.id} style={{ fontSize: 14, padding: "6px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)" }}>
              <Pill tone={x.kind === "DISPUTE" ? "warning" : x.kind === "ANSWER" ? "brand" : "neutral"}>{x.kind === "DISPUTE" ? `Dispute · ${label(x.measureKey)}` : x.kind === "ANSWER" ? "Owner's answer" : "Supplier's reply"}</Pill>
              <span style={{ marginLeft: 8 }}>{x.body}</span> <span style={{ fontSize: 12.5, ...muted }}>{fmtDate(x.createdAt)}</span>
            </div>))}
        </div>
      )}
      {p.openDisputes > 0 && !p.responses.some((x) => x.kind === "ANSWER") && <p style={{ margin: "8px 0 0", fontSize: 13.5, ...muted }}>A measure is disputed and not yet answered. It stays flagged beside the record until the owner answers.</p>}
      {!issuer && p.canRespond && !p.withdrawn && (
        <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 640 }}>
          <span style={{ fontSize: 13.5, ...muted }}>You can reply or dispute a measure until {fmtDate(p.replyDeadline)}.</span>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 180px) minmax(180px, 1fr)", gap: 8 }}>
            <Select ariaLabel="Reply type" value={reply.kind} onChange={(v) => setReply({ ...reply, kind: v })} options={[{ value: "REPLY", label: "Add a reply" }, { value: "DISPUTE", label: "Dispute a measure" }]} />
            {reply.kind === "DISPUTE" && <Select ariaLabel="Measure disputed" value={reply.measureKey} onChange={(v) => setReply({ ...reply, measureKey: v })} options={measured.map((m) => ({ value: m.key, label: m.label }))} />}
          </div>
          <textarea style={{ ...inputStyle, minHeight: 64 }} aria-label="Your response" placeholder="Your response" maxLength={2000} value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} />
          <div><Button variant="secondary" disabled={busy || !reply.body.trim()} onClick={async () => { if (await act(() => apiClient.respondToPerformance(p.id, { kind: reply.kind as "REPLY" | "DISPUTE", measureKey: reply.kind === "DISPUTE" ? reply.measureKey : undefined, body: reply.body.trim() }))) setReply({ ...reply, body: "" }); }}>Send</Button></div>
        </div>
      )}
      {issuer && p.responses.some((x) => x.kind === "DISPUTE") && (
        <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 640 }}>
          <textarea style={{ ...inputStyle, minHeight: 56 }} aria-label="Your answer to the dispute" placeholder="Your answer to the dispute" maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <div><Button variant="secondary" disabled={busy || !answer.trim()} onClick={async () => { if (await act(() => apiClient.answerPerformanceDispute(p.id, answer.trim()))) setAnswer(""); }}>Answer the dispute</Button></div>
        </div>
      )}
    </div>
  );
}

const PAY_TONE: Record<string, "good" | "warning" | "critical" | "neutral"> = { PAID_ON_TIME: "good", PAID_LATE: "warning", OVERDUE: "critical", OPEN: "neutral" };
const PAY_LABEL: Record<string, string> = { PAID_ON_TIME: "Paid on time", PAID_LATE: "Paid late", OVERDUE: "Overdue", OPEN: "Open" };

/** Manual payment log. Organisations keep their own finance systems, so either party records invoices and when they were paid. */
export function PaymentLog({ c, busy, act }: { c: TenderContractView; busy: boolean; act: Act }) {
  const [f, setF] = useState({ reference: "", amount: "", dueDate: "", invoiceDate: "" });
  const rows: ContractPaymentView[] = c.payments;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <CollapsibleSection title="Payment log" level={3}>
      <p style={{ margin: "4px 0 8px", fontSize: 13.5, lineHeight: 1.5, ...muted }}>Kept by hand: Universe does not connect to either party's finance system. Either side can log an invoice and mark it paid. Settled invoices feed the anonymised payment-practice summary other suppliers see for the tender owner.</p>
      {rows.length === 0 && <p style={{ margin: 0, fontSize: 14, ...muted }}>No payments logged yet.</p>}
      {rows.map((p) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--u-border)", fontSize: 14, flexWrap: "wrap" }}>
          <span><strong>{p.reference}</strong> · {p.amount?.toLocaleString()} {p.currency ?? ""} · due {fmtDate(p.dueDate)}{p.paidDate ? ` · paid ${fmtDate(p.paidDate)}` : ""} <Pill tone={PAY_TONE[p.status]}>{PAY_LABEL[p.status]}</Pill><span style={{ fontSize: 12.5, ...muted }}> · logged by {p.recordedBy}</span></span>
          {!p.paidDate && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.updateContractPayment(c.id, p.id, { paidDate: today }))}>Mark paid today</Button>}
        </div>))}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 10, maxWidth: 760, alignItems: "end" }}>
        <Field label="Invoice reference"><input style={inputStyle} maxLength={100} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
        <Field label={`Amount${c.currency ? ` (${c.currency})` : ""}`}><input style={inputStyle} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Due date"><input style={inputStyle} type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        <Button variant="secondary" disabled={busy || !f.reference.trim() || !f.dueDate || !(Number(f.amount) >= 0) || f.amount === ""} onClick={async () => { if (await act(() => apiClient.addContractPayment(c.id, { reference: f.reference.trim(), amount: Number(f.amount), dueDate: f.dueDate }))) setF({ reference: "", amount: "", dueDate: "", invoiceDate: "" }); }}>Log invoice</Button>
      </div>
    </CollapsibleSection>
  );
}

/** The anonymised aggregate for a supplier: a band and averages only, and only once enough history exists. */
export function SupplierSummary({ s }: { s: SupplierPerformanceSummary }) {
  if (!s.sufficient) return <span style={{ fontSize: 13.5, ...muted }}><BandPill band="INSUFFICIENT_HISTORY" /> fewer than 3 closed contracts from 2 owners</span>;
  return <span style={{ fontSize: 13.5 }}><BandPill band={s.band} /> {s.contracts} contracts from {s.owners} owners · milestones met {s.milestonesMetPercent ?? "–"}% · on time {s.onTimePercent ?? "–"}% · in full {s.inFullPercent ?? "–"}%</span>;
}

/** Evaluation panel for the tender owner: each bidder's anonymised past performance on the platform. */
export function PastPerformance({ bidders }: { bidders: { organizationId: string; organizationName: string | null }[] }) {
  const [rows, setRows] = useState<Record<string, SupplierPerformanceSummary>>({});
  useEffect(() => { bidders.forEach((b) => apiClient.supplierPerformance(b.organizationId).then((s) => setRows((r) => ({ ...r, [b.organizationId]: s }))).catch(() => undefined)); }, [bidders.map((b) => b.organizationId).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <p style={{ margin: 0, fontSize: 13.5, ...muted }}>Aggregates of closed contracts on Universe across all tender owners. Individual owners, feedback and contracts are never shown, and nothing appears until there are at least 3 contracts from 2 owners.</p>
      {bidders.map((b) => <div key={b.organizationId} style={{ fontSize: 14 }}><strong><OrgName id={b.organizationId} name={b.organizationName} /></strong> {rows[b.organizationId] ? <SupplierSummary s={rows[b.organizationId]} /> : <span style={muted}>Loading…</span>}</div>)}
    </div>
  );
}

/** A supplier-facing line about an owner's payment practice (anonymised across their suppliers). */
export function OwnerPaymentPractice({ ownerId }: { ownerId: string }) {
  const [s, setS] = useState<PaymentPracticeSummary | null>(null);
  useEffect(() => { apiClient.ownerPaymentPractice(ownerId).then(setS).catch(() => setS(null)); }, [ownerId]);
  if (!s) return null;
  return <span style={{ fontSize: 13.5, ...muted }}>{s.sufficient ? `Payment practice: ${s.paidOnTimePercent}% of ${s.payments} logged invoices paid by the due date (average ${s.averageDaysLate} days late).` : "Payment practice: not enough logged invoices yet to show."}</span>;
}

/** Owner: tie your own quality complaints and temperature logs to this contract so the performance record can measure them. */
export function QualityLinks({ c, busy, act }: { c: TenderContractView; busy: boolean; act: Act }) {
  const [ev, setEv] = useState<QualityEvidence | null>(null);
  const [cs, setCs] = useState<Set<string>>(new Set());
  const [ls, setLs] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const apply = (e: QualityEvidence) => { setEv(e); setCs(new Set(e.complaints.filter((x) => x.linked).map((x) => x.id))); setLs(new Set(e.logs.filter((x) => x.linked).map((x) => x.id))); };
  useEffect(() => { if (open && !ev) apiClient.contractQualityEvidence(c.id).then(apply).catch((e) => setErr(e instanceof Error ? e.message : "Could not load.")); }, [open, ev, c.id]);
  const toggle = (set: Set<string>, id: string, fn: (s: Set<string>) => void) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); fn(n); };
  return (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--u-border)", paddingTop: 14 }}>
      <CollapsibleSection title="Quality and cold-chain evidence" level={3} bare>
        <Button size="sm" variant="secondary" onClick={() => setOpen(!open)}>{open ? "Hide" : "Link complaints and temperature logs"}</Button>
      </CollapsibleSection>
      <p style={{ margin: "4px 0 0", fontSize: 13.5, lineHeight: 1.5, ...muted }}>Tie your own complaints and temperature logs to this contract. At close only counts go into the record (how many, upheld, serious, excursions); the supplier never sees your complaint text. Only you can see these links.</p>
      {open && (
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          {err && <span style={{ color: "var(--u-status-critical-text)", fontSize: 13.5 }}>{err}</span>}
          {!ev ? <span style={muted}>Loading…</span> : (
            <>
              <strong style={{ fontSize: 14 }}>Complaints</strong>
              {!ev.canComplaints ? <span style={{ fontSize: 13.5, ...muted }}>You need the quality complaints permission to link complaints.</span> : ev.complaints.length === 0 ? <span style={{ fontSize: 13.5, ...muted }}>No complaints to link.</span> : ev.complaints.map((x) => (
                <label key={x.id} style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="checkbox" checked={cs.has(x.id)} onChange={() => toggle(cs, x.id, setCs)} /><span><strong>{x.reference}</strong> {x.title} <span style={muted}>· {x.outcome ? x.outcome.replace("_", " ").toLowerCase() : x.status.toLowerCase()}{x.serious ? " · serious" : ""}</span></span></label>))}
              <strong style={{ fontSize: 14 }}>Temperature logs</strong>
              {ev.logs.length === 0 ? <span style={{ fontSize: 13.5, ...muted }}>No temperature logs to link.</span> : ev.logs.map((x) => (
                <label key={x.id} style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="checkbox" checked={ls.has(x.id)} onChange={() => toggle(ls, x.id, setLs)} /><span>Batch <strong>{x.batchNumber}</strong> · {fmtDate(x.recordedAt)} <span style={muted}>· {x.excursion ? "excursion" : "no excursion"}{x.summary ? ` · ${x.summary.slice(0, 80)}` : ""}</span></span></label>))}
              <div><Button variant="secondary" disabled={busy || ev.locked} onClick={async () => { try { apply(await apiClient.setContractQualityLinks(c.id, { complaintIds: [...cs], temperatureLogIds: [...ls] })); setErr(null); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } }}>Save links</Button></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
