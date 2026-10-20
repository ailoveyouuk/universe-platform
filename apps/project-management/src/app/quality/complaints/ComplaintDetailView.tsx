"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  COMPLAINT_ACTION_TYPES, COMPLAINT_CATEGORIES, COMPLAINT_OUTCOMES, COMPLAINT_REACTIONS, COMPLAINT_REGULATOR_DECISIONS, COMPLAINT_REMEDIES, COMPLAINT_ROOT_CAUSES,
  COMPLAINT_SEVERITIES, type ComplaintDetail, type UserOption,
} from "@universe/types";
import { Button, ChevronLeftIcon, Pill, Select } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { AuditHistory } from "../../../components/AuditHistory";
import { SeverityPill, StatusPill, cardStyle, fmtDate, fmtDateTime, inputStyle, label, muted, toOptions, Field } from "./ui";

const STEPS: [string, string][] = [["LOGGED", "Logged"], ["ACKNOWLEDGED", "Acknowledged"], ["TRIAGED", "Triaged"], ["INVESTIGATING", "Investigating"], ["RESOLVED", "Resolved"], ["CLOSED", "Closed"]];

function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><h2 style={{ fontSize: 15, margin: 0 }}>{title}</h2>{right}</div>{children}</section>;
}
function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div style={{ display: "flex", gap: 12, padding: "3px 0", fontSize: 14 }}><span style={{ ...muted, width: 170, flexShrink: 0 }}>{k}</span><span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{v ?? "—"}</span></div>;
}

export function ComplaintDetailView({ id }: { id: string }) {
  const [c, setC] = useState<ComplaintDetail | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { apiClient.getComplaint(id).then((d) => { setC(d); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the complaint.")); }, [id]);
  useEffect(load, [load]);
  useEffect(() => { apiClient.listUserOptions().then(setUsers).catch(() => undefined); }, []);

  /** Runs a stage call and shows the server's plain-English refusal when the rules say no. */
  const act = async (fn: () => Promise<ComplaintDetail>) => {
    setBusy(true); setErr(null);
    try { setC(await fn()); return true; } catch (e) { setErr(e instanceof Error ? e.message.replace(/^API request failed: \d+ [^—]*— /, "") : "Something went wrong."); return false; } finally { setBusy(false); }
  };
  const stage = (s: string, body?: object) => act(() => apiClient.complaintStage(id, s, body));
  const userOpts = users.map((u) => ({ value: u.id, label: `${u.forename} ${u.surname}` }));

  if (!c) return <div style={{ padding: 32 }}>{err ? <div role="alert">{err}</div> : "Loading…"}</div>;
  const can = c.can;
  const closedLike = c.status === "CLOSED" || c.status === "WITHDRAWN";
  const stepIdx = STEPS.findIndex(([s]) => s === (c.status === "ON_HOLD" ? c.heldFromStatus : c.status));

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/quality/complaints" style={{ ...muted, textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}><ChevronLeftIcon size={14} /> All complaints</Link>
      <div style={{ margin: "8px 0 16px" }}>
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>{c.referenceNumber} · {c.title}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <StatusPill status={c.status} /><SeverityPill severity={c.severity} />
          <Pill tone="neutral">{c.direction === "INBOUND_CLIENT" ? "Client complaint" : "Supply-chain complaint"}</Pill>
          {c.category && <Pill tone="neutral">{label(c.category)}</Pill>}
          {c.reopenCount > 0 && <Pill tone="warning">Reopened {c.reopenCount}×</Pill>}
          {c.overdue && <Pill tone="critical">{c.nextDueLabel} overdue</Pill>}
        </div>
      </div>

      {c.isSerious && (
        <div role="alert" style={{ ...cardStyle, borderColor: "var(--u-status-critical)", background: "color-mix(in srgb, var(--u-status-critical) 7%, var(--u-surface, #fff))" }}>
          <strong>Serious case — fast-track.</strong>{" "}
          {[c.flagPatientSafety && "possible patient harm", c.flagSuspectedFalsified && "suspected falsified or substandard product", c.flagTemperatureExcursion && "temperature excursion"].filter(Boolean).join(", ")}.
          <ul style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 14 }}>
            <li>Consider quarantining the affected batch{c.batchNumber ? ` (${c.batchNumber})` : ""} and whether a recall is needed.</li>
            <li>Consider reporting to the MHRA (Yellow Card / defective medicines reporting). Universe records the decision; a person makes the report.</li>
          </ul>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Regulator decision: <strong>{label(c.regulatorDecision)}</strong>{c.regulatorReference ? ` · ref ${c.regulatorReference}` : ""}{c.regulatorDecisionByName ? ` · ${c.regulatorDecisionByName}, ${fmtDate(c.regulatorDecisionAt)}` : ""}
            {c.regulatorDecisionReason && <div style={muted}>{c.regulatorDecisionReason}</div>}
          </div>
          {can.approve && !closedLike && <RegulatorForm busy={busy} onSave={(b) => stage("regulator", b)} />}
        </div>
      )}

      {err && <div role="alert" style={{ ...cardStyle, borderColor: "var(--u-status-critical)", color: "var(--u-status-critical)" }}>{err}</div>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {STEPS.filter(([s]) => c.direction === "INBOUND_CLIENT" || s !== "ACKNOWLEDGED").map(([s, t]) => {
          const i = STEPS.findIndex(([x]) => x === s);
          return <Pill key={s} tone={i < stepIdx ? "good" : i === stepIdx ? "brand" : "neutral"}>{t}</Pill>;
        })}
        {c.status === "ON_HOLD" && <Pill tone="warning">On hold: {c.holdReason}</Pill>}
      </div>

      <NextStep c={c} busy={busy} userOpts={userOpts} stage={stage} />

      <Card title="The complaint">
        <Row k="Received" v={`${fmtDateTime(c.receivedAt)}${c.channel ? ` by ${label(c.channel).toLowerCase()}` : ""}`} />
        <Row k="Logged by" v={c.loggedByName} />
        <Row k="Description" v={c.description} />
        <Row k={c.direction === "INBOUND_CLIENT" ? "Complainant (stakeholder)" : "Complaint about"} v={c.partnerId ? <Link href={`/partners/detail?id=${c.partnerId}`}>{c.partnerName}</Link> : "—"} />
        {can.seePersonal && <Row k="Complainant" v={[c.complainantName ?? c.contactName, c.complainantEmail, c.complainantPhone].filter(Boolean).join(" · ") || "—"} />}
        <Row k="Project" v={c.projectId ? <Link href={`/projects/detail?id=${c.projectId}`}>{c.projectLabel}</Link> : "—"} />
        <Row k="Batch" v={c.productBatchId ? <Link href={`/batches/detail?id=${c.productBatchId}`}>{c.batchNumber}</Link> : "—"} />
        <Row k="Product" v={c.productName} />
        <Row k="Owner / investigator" v={`${c.ownerName ?? "—"} / ${c.investigatorName ?? "—"}`} />
        <Row k="Deadlines" v={[c.acknowledgeDueAt && c.direction === "INBOUND_CLIENT" && `Acknowledge ${fmtDate(c.acknowledgeDueAt)}${c.acknowledgedAt ? " ✓" : ""}`, c.triageDueAt && `Triage ${fmtDate(c.triageDueAt)}${c.triagedAt ? " ✓" : ""}`, c.resolveDueAt && `Resolve ${fmtDate(c.resolveDueAt)}${c.resolvedAt ? " ✓" : ""}`].filter(Boolean).join(" · ")} />
      </Card>

      {(c.investigationStartedAt || c.outcome) && (
        <Card title="Investigation">
          <Row k="Scope" v={c.investigationScope} /><Row k="Root cause" v={`${label(c.rootCauseCategory)}${c.rootCause ? ` — ${c.rootCause}` : ""}`} />
          <Row k="Findings" v={c.findings} /><Row k="Impact (batches / lines)" v={c.impactSummary} /><Row k="Outcome" v={c.outcome ? <strong>{label(c.outcome)}</strong> : "—"} />
        </Card>
      )}

      {c.direction === "OUTBOUND_SUPPLY_CHAIN" && (
        <Card title="Partner's response" right={c.partnerResponseDueAt && !c.partnerRespondedAt ? <Pill tone="warning">Due {fmtDate(c.partnerResponseDueAt)}</Pill> : undefined}>
          {c.partnerRespondedAt && <Row k={`Responded ${fmtDate(c.partnerRespondedAt)}`} v={c.partnerResponse} />}
          {can.investigate && !closedLike && <PartnerResponseForm busy={busy} onSave={(t) => stage("partner-response", { partnerResponse: t })} />}
        </Card>
      )}

      {c.remedyType && (
        <Card title="Resolution">
          <Row k="Remedy" v={`${label(c.remedyType)}${c.remedyNotes ? ` — ${c.remedyNotes}` : ""}`} />
          <Row k="Response sent" v={fmtDate(c.responseSentAt)} /><Row k="Response summary" v={c.responseSummary} /><Row k="Their reaction" v={label(c.complainantReaction)} />
        </Card>
      )}

      <Card title="Corrective and preventive actions">
        {c.actions.length === 0 && <div style={muted}>No actions yet.</div>}
        {c.actions.map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--u-border, #eee)", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Pill tone="neutral">{label(a.type)}</Pill> {a.description}
              <div style={{ ...muted, fontSize: 12.5 }}>{a.ownerName} · due {fmtDate(a.dueDate)}{a.overdue ? " — overdue" : ""}{a.completedAt ? ` · ${label(a.status)} ${fmtDate(a.completedAt)}` : ""}{a.completionNotes ? ` · ${a.completionNotes}` : ""}</div>
            </div>
            {a.status === "OPEN" && !closedLike && <div style={{ display: "flex", gap: 6 }}>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.updateComplaintAction(id, a.id, { status: "DONE" }))}>Mark done</Button>
              {can.investigate && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.updateComplaintAction(id, a.id, { status: "CANCELLED" }))}>Cancel</Button>}
            </div>}
          </div>
        ))}
        {can.investigate && !closedLike && <ActionForm busy={busy} userOpts={userOpts} onSave={(b) => stage("actions", b)} />}
      </Card>

      {(c.status === "CLOSED" || c.status === "WITHDRAWN") && (
        <Card title={c.status === "CLOSED" ? "Closure" : "Withdrawn"}>
          <Row k="Summary" v={c.closureSummary} /><Row k="Lessons learned" v={c.lessonsLearned} /><Row k="Closed by" v={`${c.closedByName ?? "—"} on ${fmtDate(c.closedAt)}`} />
          {c.closureOverrideReason && <Row k="Same-person approval" v={c.closureOverrideReason} />}
          <Row k="Effectiveness check" v={c.effectivenessCheckedAt ? `${fmtDate(c.effectivenessCheckedAt)} — ${c.effectivenessNotes}` : c.effectivenessCheckDueAt ? `Due ${fmtDate(c.effectivenessCheckDueAt)}` : "Not scheduled"} />
          {c.status === "CLOSED" && !c.effectivenessCheckedAt && c.effectivenessCheckDueAt && can.approve && <EffectivenessForm busy={busy} onSave={(t) => stage("effectiveness", { effectivenessNotes: t })} />}
        </Card>
      )}

      <Card title="Links across the platform">
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          {c.risks.length === 0 ? <span style={muted}>No risk-register entry yet.</span> : c.risks.map((r) => <div key={r.id}><Link href="/risk-register">{r.title}</Link> <Pill tone="neutral">{label(r.severity)}</Pill> <Pill tone="neutral">{label(r.status)}</Pill></div>)}
        </div>
        {can.investigate && !closedLike && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => stage("risk", { severity: c.severity === "CRITICAL" ? "CRITICAL" : c.severity === "MAJOR" ? "HIGH" : "MEDIUM", likelihood: "MEDIUM" })}>Add to risk register</Button>
            {c.direction === "OUTBOUND_SUPPLY_CHAIN" || c.partnerId ? <>
              <Button size="sm" variant="secondary" disabled={busy || !c.outcome || c.outcome === "NOT_UPHELD"} onClick={() => stage("source-review", { action: "REVERIFY" })}>Request product source re-verification</Button>
              <Button size="sm" variant="secondary" disabled={busy || !c.outcome || c.outcome === "NOT_UPHELD"} onClick={() => confirm("Return the matching product source approval(s) to Pending until QA re-verifies them?") && stage("source-review", { action: "SUSPEND" })}>Return source approval to pending</Button>
            </> : null}
          </div>
        )}
        <div style={{ ...muted, fontSize: 12.5, marginTop: 8 }}>Upheld complaints also count against the stakeholder on the performance scorecard.</div>
      </Card>

      <Card title="Timeline">
        {can.edit && <NoteForm busy={busy} onSave={(b) => stage("notes", b)} />}
        {[...c.events].reverse().map((e) => (
          <div key={e.id} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border, #eee)", fontSize: 14 }}>
            <div><Pill tone={e.kind === "STAGE" ? "brand" : "neutral"}>{label(e.kind)}</Pill> {e.summary}</div>
            {e.body && <div style={{ ...muted, whiteSpace: "pre-wrap", marginTop: 2 }}>{e.body}</div>}
            <div style={{ ...muted, fontSize: 12 }}>{e.actorName ?? "System"} · {fmtDateTime(e.createdAt)}</div>
          </div>
        ))}
      </Card>

      <AuditHistory tableName="quality_complaints" recordId={c.id} />
    </div>
  );
}

type StageFn = (s: string, body?: object) => Promise<boolean>;

/** Shows only the form for the stage the complaint is in, so there is always one obvious next step. */
function NextStep({ c, busy, userOpts, stage }: { c: ComplaintDetail; busy: boolean; userOpts: { value: string; label: string }[]; stage: StageFn }) {
  const can = c.can;
  if (c.status === "ON_HOLD") return can.investigate ? <Card title="On hold"><Button variant="primary" disabled={busy} onClick={() => stage("resume")}>Resume</Button></Card> : null;
  if (c.status === "CLOSED" || c.status === "WITHDRAWN") return can.approve ? <Card title="Closed"><ReasonButton label="Reopen" busy={busy} onGo={(r) => stage("reopen", { reason: r })} /></Card> : null;
  return (
    <>
      {c.status === "LOGGED" && c.direction === "INBOUND_CLIENT" && can.edit && (
        <Card title="Next: acknowledge the complainant" right={<span style={muted}>Due {fmtDate(c.acknowledgeDueAt)}</span>}>
          <p style={{ ...muted, fontSize: 14, marginTop: 0 }}>Confirm you have told the complainant their complaint was received.</p>
          <Button variant="primary" disabled={busy} onClick={() => stage("acknowledge")}>Mark as acknowledged</Button>
        </Card>
      )}
      {(c.status === "LOGGED" || c.status === "ACKNOWLEDGED") && can.investigate && <TriageForm c={c} busy={busy} userOpts={userOpts} onSave={(b) => stage("triage", b)} />}
      {(c.status === "TRIAGED" || c.status === "INVESTIGATING") && can.investigate && <InvestigationForm c={c} busy={busy} userOpts={userOpts} onSave={(b) => stage("investigation", b)} />}
      {c.status === "INVESTIGATING" && c.investigationCompletedAt && can.investigate && <ResolveForm busy={busy} onSave={(b) => stage("resolve", b)} />}
      {c.status === "RESOLVED" && can.approve && <CloseForm c={c} busy={busy} onSave={(b) => stage("close", b)} />}
      {c.status === "RESOLVED" && !can.approve && <Card title="Waiting for approval"><span style={muted}>Someone with the “approve closure” permission needs to close this.</span></Card>}
      {can.investigate && <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <ReasonButton label="Put on hold" busy={busy} onGo={(r) => stage("hold", { reason: r })} />
        {can.approve && <ReasonButton label="Withdraw" busy={busy} onGo={(r) => stage("withdraw", { reason: r })} />}
      </div>}
    </>
  );
}

function ReasonButton({ label: text, busy, onGo }: { label: string; busy: boolean; onGo: (reason: string) => void }) {
  const [open, setOpen] = useState(false); const [r, setR] = useState("");
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{text}</Button>;
  return <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><input autoFocus value={r} onChange={(e) => setR(e.target.value)} placeholder="Reason (recorded)" style={{ ...inputStyle, width: 280 }} /><Button size="sm" variant="primary" disabled={busy || !r.trim()} onClick={() => { onGo(r.trim()); setOpen(false); setR(""); }}>{text}</Button><Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button></div>;
}

function TriageForm({ c, busy, userOpts, onSave }: { c: ComplaintDetail; busy: boolean; userOpts: { value: string; label: string }[]; onSave: (b: object) => void }) {
  const [category, setCategory] = useState(c.category ?? ""); const [severity, setSeverity] = useState(c.severity ?? ""); const [owner, setOwner] = useState(c.ownerId ?? ""); const [inv, setInv] = useState(c.investigatorId ?? "");
  return (
    <Card title="Next: triage" right={<span style={muted}>Due {fmtDate(c.triageDueAt)}</span>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 16px" }}>
        <Field label="Category"><Select value={category} onChange={setCategory} options={toOptions(COMPLAINT_CATEGORIES)} allLabel="Choose…" ariaLabel="Category" /></Field>
        <Field label="Severity" hint={c.isSerious ? "Serious cases are always critical" : undefined}><Select value={c.isSerious ? "CRITICAL" : severity} onChange={setSeverity} options={toOptions(COMPLAINT_SEVERITIES)} allLabel="Choose…" ariaLabel="Severity" /></Field>
        <Field label="Owner"><Select value={owner} onChange={setOwner} options={userOpts} allLabel="Choose…" ariaLabel="Owner" /></Field>
        <Field label="Investigator"><Select value={inv} onChange={setInv} options={userOpts} allLabel="Same as owner" ariaLabel="Investigator" /></Field>
      </div>
      <Button variant="primary" disabled={busy || !category || !(severity || c.isSerious) || !owner} onClick={() => onSave({ category, severity: c.isSerious ? "CRITICAL" : severity, ownerId: owner, investigatorId: inv || owner })}>Save triage</Button>
    </Card>
  );
}

function InvestigationForm({ c, busy, userOpts, onSave }: { c: ComplaintDetail; busy: boolean; userOpts: { value: string; label: string }[]; onSave: (b: object) => void }) {
  const [s, setS] = useState({ investigationScope: c.investigationScope ?? "", rootCauseCategory: c.rootCauseCategory ?? "", rootCause: c.rootCause ?? "", findings: c.findings ?? "", impactSummary: c.impactSummary ?? "", outcome: c.outcome ?? "", investigatorId: c.investigatorId ?? "" });
  const set = (k: keyof typeof s) => (v: string) => setS((p) => ({ ...p, [k]: v }));
  const done = !!c.investigationCompletedAt;
  return (
    <Card title={done ? "Investigation (completed — edit if needed)" : "Next: investigate"}>
      <Field label="Investigator"><Select value={s.investigatorId} onChange={set("investigatorId")} options={userOpts} allLabel="Me" ariaLabel="Investigator" /></Field>
      <Field label="Scope — what is being examined"><textarea value={s.investigationScope} onChange={(e) => set("investigationScope")(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 16px" }}>
        <Field label="Root-cause category"><Select value={s.rootCauseCategory} onChange={set("rootCauseCategory")} options={toOptions(COMPLAINT_ROOT_CAUSES)} allLabel="Choose…" ariaLabel="Root cause" /></Field>
        <Field label="Outcome"><Select value={s.outcome} onChange={set("outcome")} options={toOptions(COMPLAINT_OUTCOMES)} allLabel="Choose…" ariaLabel="Outcome" /></Field>
      </div>
      <Field label="Root cause"><textarea value={s.rootCause} onChange={(e) => set("rootCause")(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></Field>
      <Field label="Findings"><textarea value={s.findings} onChange={(e) => set("findings")(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} /></Field>
      <Field label="Impact — batches and lines affected"><textarea value={s.impactSummary} onChange={(e) => set("impactSummary")(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="secondary" disabled={busy} onClick={() => onSave(clean(s))}>Save progress</Button>
        <Button variant="primary" disabled={busy || !s.outcome || !s.rootCauseCategory || !s.findings.trim()} onClick={() => onSave({ ...clean(s), complete: true })}>Complete investigation</Button>
      </div>
    </Card>
  );
}
const clean = (s: Record<string, string>) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== ""));

function ResolveForm({ busy, onSave }: { busy: boolean; onSave: (b: object) => void }) {
  const [remedy, setRemedy] = useState(""); const [notes, setNotes] = useState(""); const [sent, setSent] = useState(""); const [summary, setSummary] = useState(""); const [reaction, setReaction] = useState("");
  return (
    <Card title="Next: resolve">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 16px" }}>
        <Field label="Remedy"><Select value={remedy} onChange={setRemedy} options={toOptions(COMPLAINT_REMEDIES)} allLabel="Choose…" ariaLabel="Remedy" /></Field>
        <Field label="Response sent on"><input type="date" value={sent} onChange={(e) => setSent(e.target.value)} style={inputStyle} /></Field>
        <Field label="Their reaction"><Select value={reaction} onChange={setReaction} options={toOptions(COMPLAINT_REACTIONS)} allLabel="Not known yet" ariaLabel="Reaction" /></Field>
      </div>
      <Field label="Remedy details"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: 56 }} /></Field>
      <Field label="What we told them"><textarea value={summary} onChange={(e) => setSummary(e.target.value)} style={{ ...inputStyle, minHeight: 56 }} /></Field>
      <Button variant="primary" disabled={busy || !remedy} onClick={() => onSave(clean({ remedyType: remedy, remedyNotes: notes, responseSentAt: sent ? new Date(sent).toISOString() : "", responseSummary: summary, complainantReaction: reaction }))}>Mark resolved</Button>
    </Card>
  );
}

function CloseForm({ c, busy, onSave }: { c: ComplaintDetail; busy: boolean; onSave: (b: object) => void }) {
  const [summary, setSummary] = useState(""); const [lessons, setLessons] = useState(""); const [check, setCheck] = useState(""); const [override, setOverride] = useState("");
  const open = c.actions.filter((a) => a.status === "OPEN").length;
  return (
    <Card title="Next: approve closure">
      {open > 0 && <div style={{ color: "var(--u-status-warning)", marginBottom: 8 }}>{open} action{open > 1 ? "s are" : " is"} still open and must be completed or cancelled first.</div>}
      <Field label="Closure summary"><textarea value={summary} onChange={(e) => setSummary(e.target.value)} style={{ ...inputStyle, minHeight: 70 }} /></Field>
      <Field label="Lessons learned"><textarea value={lessons} onChange={(e) => setLessons(e.target.value)} style={{ ...inputStyle, minHeight: 56 }} /></Field>
      <Field label="Check the fix worked on" hint="Optional date for an effectiveness check"><input type="date" value={check} onChange={(e) => setCheck(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} /></Field>
      <Field label="If you investigated this yourself — reason you are approving it" hint="Normally someone other than the investigator approves closure."><input value={override} onChange={(e) => setOverride(e.target.value)} style={inputStyle} /></Field>
      <Button variant="primary" disabled={busy || !summary.trim()} onClick={() => onSave(clean({ closureSummary: summary, lessonsLearned: lessons, effectivenessCheckDueAt: check ? new Date(check).toISOString() : "", overrideReason: override }))}>Close complaint</Button>
    </Card>
  );
}

function RegulatorForm({ busy, onSave }: { busy: boolean; onSave: (b: object) => void }) {
  const [open, setOpen] = useState(false); const [d, setD] = useState("UNDER_CONSIDERATION"); const [r, setR] = useState(""); const [ref, setRef] = useState("");
  if (!open) return <div style={{ marginTop: 8 }}><Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Record reporting decision</Button></div>;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 16px" }}>
        <Field label="Decision"><Select value={d} onChange={setD} options={toOptions(COMPLAINT_REGULATOR_DECISIONS)} ariaLabel="Decision" /></Field>
        <Field label="Regulator's reference (if reported)"><input value={ref} onChange={(e) => setRef(e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Reason for the decision"><input value={r} onChange={(e) => setR(e.target.value)} style={inputStyle} /></Field>
      <Button size="sm" variant="primary" disabled={busy || !r.trim()} onClick={() => { onSave({ decision: d, reason: r.trim(), reference: ref.trim() || undefined }); setOpen(false); }}>Save decision</Button>
    </div>
  );
}

function PartnerResponseForm({ busy, onSave }: { busy: boolean; onSave: (t: string) => void }) {
  const [t, setT] = useState("");
  return <div><textarea value={t} onChange={(e) => setT(e.target.value)} placeholder="Record what the partner said" style={{ ...inputStyle, minHeight: 56, marginBottom: 8 }} /><Button size="sm" variant="secondary" disabled={busy || !t.trim()} onClick={() => { onSave(t.trim()); setT(""); }}>Record response</Button></div>;
}

function EffectivenessForm({ busy, onSave }: { busy: boolean; onSave: (t: string) => void }) {
  const [t, setT] = useState("");
  return <div style={{ marginTop: 8 }}><textarea value={t} onChange={(e) => setT(e.target.value)} placeholder="Did the fix work? What did you check?" style={{ ...inputStyle, minHeight: 56, marginBottom: 8 }} /><Button size="sm" variant="primary" disabled={busy || !t.trim()} onClick={() => onSave(t.trim())}>Record effectiveness check</Button></div>;
}

function ActionForm({ busy, userOpts, onSave }: { busy: boolean; userOpts: { value: string; label: string }[]; onSave: (b: object) => void }) {
  const [type, setType] = useState<string>("CORRECTIVE"); const [d, setD] = useState(""); const [owner, setOwner] = useState(""); const [due, setDue] = useState("");
  return (
    <div style={{ borderTop: "1px solid var(--u-border, #eee)", paddingTop: 12, marginTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 16px" }}>
        <Field label="Type"><Select value={type} onChange={setType} options={toOptions(COMPLAINT_ACTION_TYPES)} ariaLabel="Action type" /></Field>
        <Field label="Owner"><Select value={owner} onChange={setOwner} options={userOpts} allLabel="Choose…" ariaLabel="Owner" /></Field>
        <Field label="Due"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Action"><input value={d} onChange={(e) => setD(e.target.value)} style={inputStyle} placeholder="What must be done" /></Field>
      <Button size="sm" variant="secondary" disabled={busy || !d.trim() || !owner || !due} onClick={() => { onSave({ type, description: d.trim(), ownerId: owner, dueDate: new Date(due).toISOString() }); setD(""); setDue(""); }}>Add action</Button>
    </div>
  );
}

function NoteForm({ busy, onSave }: { busy: boolean; onSave: (b: object) => void }) {
  const [kind, setKind] = useState("NOTE"); const [t, setT] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <Select value={kind} onChange={setKind} options={[{ value: "NOTE", label: "Note" }, { value: "COMMUNICATION_OUT", label: "Sent to them" }, { value: "COMMUNICATION_IN", label: "Received from them" }]} ariaLabel="Entry type" />
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Add to the timeline…" style={{ ...inputStyle, flex: 1, minWidth: 220 }} maxLength={500} />
      <Button size="sm" variant="secondary" disabled={busy || !t.trim()} onClick={() => { onSave({ kind, summary: t.trim() }); setT(""); }}>Add</Button>
    </div>
  );
}
