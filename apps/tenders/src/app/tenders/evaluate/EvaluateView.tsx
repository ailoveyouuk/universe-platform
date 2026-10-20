"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { EvalBid, EvalCriterion, EvaluationOverview } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { Card, ErrorNote, Field, Heading, Page, fmtDateTime, inputStyle } from "../../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const PHASES: [string, string][] = [["CLOSED", "Closed"], ["OPENED", "Bids opened"], ["EVALUATING", "Evaluating"], ["SCORED", "Scored"], ["AWARDED", "Awarded"]];
const ORDER = ["OPEN", "CLOSED", "OPENED", "EVALUATING", "SCORED", "AWARDED"];

/** Evaluation workspace (step 4). Issuers see everything; assigned evaluators see only what their role and conflict declaration allow. */
export function EvaluateView() {
  const id = useSearchParams().get("id") ?? "";
  const [o, setO] = useState<EvaluationOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { if (id) apiClient.tenderEvaluation(id).then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the evaluation.")); }, [id]);
  useEffect(load, [load]);
  const act = async (fn: () => Promise<EvaluationOverview | unknown>) => {
    setBusy(true); setErr(null); setProblems([]);
    try { const r = await fn(); if (r && typeof r === "object" && "phase" in r) setO(r as EvaluationOverview); else load(); return true; }
    catch (e) { const p = (e as { problems?: string[] }).problems; setErr(e instanceof Error ? e.message : "Something went wrong."); setProblems(p ?? []); return false; }
    finally { setBusy(false); }
  };

  if (!o) return <Page><ErrorNote message={err} />{!err && <div style={muted}>Loading…</div>}</Page>;
  const t = o.tender; const v = o.viewer;
  const closed = !!t.closingAt && new Date(t.closingAt).getTime() <= Date.now();
  const at = ORDER.indexOf(o.phase);

  return (
    <Page>
      <Heading title={`Evaluation · ${t.referenceNumber}`} sub={<>{t.title} · closes {fmtDateTime(t.closingAt, t.timeZone)}</>}
        actions={v.isIssuer ? <Link href={`/tenders/manage?id=${t.id}`} style={{ textDecoration: "none" }}><Button variant="secondary">Back to tender</Button></Link> : undefined} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PHASES.map(([k, l]) => <Pill key={k} tone={ORDER.indexOf(k) < at ? "good" : ORDER.indexOf(k) === at ? "brand" : "neutral"}>{l}</Pill>)}
        {t.emergencyProcurement && <Pill tone="warning">Emergency procurement</Pill>}
        {v.role && <Pill>{v.role === "CHAIR" ? "You are the chair" : "You are an evaluator"}</Pill>}
      </div>
      <ErrorNote message={err} />
      {problems.length > 0 && <Card><strong>Please resolve:</strong><ul style={{ margin: "6px 0 0" }}>{problems.map((p, i) => <li key={i} style={{ fontSize: 13.5 }}>{p}</li>)}</ul></Card>}

      {o.phase === "OPEN" && <Card><p style={{ margin: 0, ...muted }}>The tender is still open for bids. Evaluation starts after the closing time.</p></Card>}
      {o.phase === "CLOSED" && v.isIssuer && (
        <Card title="Open the bids"><p style={{ marginTop: 0, ...muted }}>The tender has closed. Opening the bids is recorded on the timeline and bidders are told.</p>
          <Button variant="primary" disabled={busy || !closed} onClick={() => act(async () => { await apiClient.openTenderBids(id); return apiClient.tenderEvaluation(id); })}>Open bids</Button></Card>
      )}

      {v.isIssuer && !t.evaluationStartedAt && o.phase !== "OPEN" && <Setup o={o} id={id} act={act} busy={busy} />}
      {v.coiRequired && t.bidsOpenedAt && <Conflict id={id} act={act} busy={busy} />}
      {v.isEvaluator && !v.coiDeclared && !t.bidsOpenedAt && <Card><p style={{ margin: 0, ...muted }}>You are assigned to evaluate this tender. Once the bids are opened you will be asked to declare any conflict of interest before you can see them.</p></Card>}

      {o.evaluators.length > 0 && t.evaluationStartedAt && (
        <Card title="Evaluators">{o.evaluators.map((e) => <div key={e.userId} style={{ fontSize: 14, padding: "3px 0" }}>{e.name} <span style={muted}>· {e.role === "CHAIR" ? "chair" : "evaluator"} · {e.coiDeclaredAt ? (e.coiNoConflict ? "no conflict declared" : `conflict declared (${e.conflictCount} bidder${e.conflictCount === 1 ? "" : "s"})`) : "declaration pending"}</span></div>)}</Card>
      )}

      {o.phase === "EVALUATING" && v.isEvaluator && v.coiDeclared && o.bids.map((b) => <BidScoring key={b.bidId} b={b} o={o} id={id} act={act} busy={busy} />)}
      {o.phase === "EVALUATING" && v.isIssuer && !v.isEvaluator && <Card><p style={{ margin: 0, ...muted }}>Evaluation is under way. Scores are private to each evaluator until the chair finalises them.</p></Card>}
      {o.phase === "EVALUATING" && v.role === "CHAIR" && (
        <Card title="Finalise scoring"><p style={{ marginTop: 0, ...muted, fontSize: 13.5 }}>When every gate is recorded and every evaluator has submitted, finalise to lock scores and rank the compliant bids. Where evaluators differ by more than 25 points, moderate that score first and give a reason.</p>
          <Button variant="primary" disabled={busy} onClick={() => act(() => apiClient.finaliseTenderScoring(id))}>Finalise scoring</Button></Card>
      )}

      {(o.phase === "SCORED" || o.phase === "AWARDED") && <Results o={o} />}
      {o.phase === "SCORED" && v.isIssuer && <AwardForm o={o} id={id} act={act} busy={busy} />}
      {o.phase === "AWARDED" && <Awarded o={o} id={id} act={act} busy={busy} />}
    </Page>
  );
}

type Act = (fn: () => Promise<unknown>) => Promise<boolean>;

function Setup({ o, id, act, busy }: { o: EvaluationOverview; id: string; act: Act; busy: boolean }) {
  const [cands, setCands] = useState<{ id: string; name: string; email: string }[]>([]);
  const [sel, setSel] = useState<Record<string, "CHAIR" | "EVALUATOR" | undefined>>(Object.fromEntries(o.evaluators.map((e) => [e.userId, e.role])));
  useEffect(() => { apiClient.evaluatorCandidates(id).then(setCands).catch(() => undefined); }, [id]);
  const chosen = Object.entries(sel).filter(([, r]) => r).map(([userId, role]) => ({ userId, role: role! }));
  return (
    <Card title="Evaluators">
      <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>{o.tender.allowSingleEvaluator ? `A single evaluator is allowed on this tender (${o.tender.singleEvaluatorReason}).` : "Assign at least two evaluators and one chair."} Each must declare any conflict of interest before seeing the bids.</p>
      {cands.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "4px 0", fontSize: 14 }}>
          <input type="checkbox" aria-label={`Assign ${c.name}`} checked={!!sel[c.id]} onChange={(e) => setSel((s) => ({ ...s, [c.id]: e.target.checked ? "EVALUATOR" : undefined }))} />
          <span style={{ minWidth: 200 }}>{c.name} <span style={muted}>{c.email}</span></span>
          {sel[c.id] && <label style={{ fontSize: 13 }}><input type="radio" name="chair" checked={sel[c.id] === "CHAIR"} onChange={() => setSel((s) => Object.fromEntries(Object.entries(s).map(([k, r]) => [k, r ? (k === c.id ? "CHAIR" : "EVALUATOR") : undefined])))} /> Chair</label>}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="secondary" disabled={busy || chosen.length === 0} onClick={() => act(() => apiClient.setTenderEvaluators(id, chosen))}>Save evaluators</Button>
        <Button variant="primary" disabled={busy || !o.canStart} onClick={() => act(() => apiClient.startTenderEvaluation(id))}>Start evaluation</Button>
      </div>
      {o.startProblems.length > 0 && <ul style={{ margin: "10px 0 0", fontSize: 13, ...muted }}>{o.startProblems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
    </Card>
  );
}

function Conflict({ id, act, busy }: { id: string; act: Act; busy: boolean }) {
  const [none, setNone] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [pick, setPick] = useState<string[]>([]); const [notes, setNotes] = useState("");
  useEffect(() => { apiClient.evaluationBidders(id).then(setOrgs).catch(() => undefined); }, [id]);
  return (
    <Card title="Conflict of interest declaration">
      <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>You cannot see any bid until you have made this declaration. Bids from organisations you declare a conflict with stay hidden from you.</p>
      <label style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="radio" name="coi" checked={none === true} onChange={() => setNone(true)} /> I have no conflict of interest with any bidder.</label>
      <label style={{ display: "flex", gap: 8, fontSize: 14, marginTop: 6 }}><input type="radio" name="coi" checked={none === false} onChange={() => setNone(false)} /> I have a conflict with one or more bidders.</label>
      {none === false && <div style={{ marginLeft: 24, marginTop: 8 }}>
        {orgs.map((g) => <label key={g.id} style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="checkbox" checked={pick.includes(g.id)} onChange={(e) => setPick((p) => e.target.checked ? [...p, g.id] : p.filter((x) => x !== g.id))} /> {g.name}</label>)}
        <textarea aria-label="Nature of the conflict" rows={3} style={{ ...inputStyle, marginTop: 8 }} placeholder="Briefly describe the conflict" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>}
      <div style={{ marginTop: 12 }}><Button variant="primary" disabled={busy || none === null} onClick={() => act(() => apiClient.declareEvaluatorConflict(id, { noConflict: none === true, conflictedOrganisationIds: pick, notes }))}>Submit declaration</Button></div>
    </Card>
  );
}

function BidScoring({ b, o, id, act, busy }: { b: EvalBid; o: EvaluationOverview; id: string; act: Act; busy: boolean }) {
  const gates = o.criteria.filter((c) => c.kind === "GATE");
  const manual = o.criteria.filter((c) => c.kind === "SCORED" && c.metric === "MANUAL");
  const [vals, setVals] = useState<Record<string, { score: string; rationale: string }>>(Object.fromEntries(manual.map((c) => [c.id, { score: b.mine[c.id]?.score?.toString() ?? "", rationale: b.mine[c.id]?.rationale ?? "" }])));
  const [gnotes, setGnotes] = useState<Record<string, string>>({});
  const locked = b.mySubmitted;
  const isChair = o.viewer.role === "CHAIR";
  const [mod, setMod] = useState<Record<string, { score: string; rationale: string }>>(Object.fromEntries(manual.map((c) => [c.id, { score: b.moderated[c.id]?.score?.toString() ?? "", rationale: b.moderated[c.id]?.rationale ?? "" }])));
  const payload = () => manual.filter((c) => vals[c.id]?.score !== "").map((c) => ({ criterionId: c.id, score: Number(vals[c.id]!.score), rationale: vals[c.id]!.rationale }));
  return (
    <Card title={b.organizationName ?? "Bidder"}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Pill tone="brand">{o.tender.currency} {b.total?.toLocaleString()}</Pill>
        {b.avgLeadDays !== null && <Pill>{b.avgLeadDays} days average lead time</Pill>}
        {b.partial && <Pill tone="warning">Partial bid: not every item priced</Pill>}
        {b.failedGate && <Pill tone="critical">Failed a gate</Pill>}
      </div>
      {gates.map((g) => { const r = b.gates[g.id]; return (
        <div key={g.id} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
          <strong>Gate: {g.title}</strong> {r && <Pill tone={r.passed ? "good" : "critical"}>{r.passed ? "Passed" : "Failed"}</Pill>}
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <input aria-label={`Note for ${g.title}`} style={{ ...inputStyle, maxWidth: 360 }} placeholder="Note (required if failed)" value={gnotes[g.id] ?? r?.notes ?? ""} onChange={(e) => setGnotes((n) => ({ ...n, [g.id]: e.target.value }))} />
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.recordTenderGate(id, { bidId: b.bidId, criterionId: g.id, passed: true, notes: gnotes[g.id] }))}>Pass</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.recordTenderGate(id, { bidId: b.bidId, criterionId: g.id, passed: false, notes: gnotes[g.id] }))}>Fail</Button>
          </div>
        </div>); })}
      {o.criteria.filter((c) => c.kind === "SCORED" && c.metric !== "MANUAL").map((c) => <div key={c.id} style={{ padding: "6px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>{c.title} <span style={muted}>(calculated, {c.weight}%)</span>: {b.compliant ? (b.calculated[c.id] ?? "n/a") : "after gates are passed"}</div>)}
      {manual.map((c) => (
        <div key={c.id} style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)" }}>
          <strong style={{ fontSize: 14 }}>{c.title}</strong> <span style={muted}>{c.weight}%</span>
          {locked && <Pill tone="good">Submitted</Pill>}
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, marginTop: 6 }}>
            <Field label="Score (0 to 100)"><input type="number" min={0} max={100} disabled={locked} style={inputStyle} value={vals[c.id]?.score ?? ""} onChange={(e) => setVals((x) => ({ ...x, [c.id]: { ...x[c.id]!, score: e.target.value } }))} /></Field>
            <Field label="Reason"><textarea rows={2} disabled={locked} style={inputStyle} value={vals[c.id]?.rationale ?? ""} onChange={(e) => setVals((x) => ({ ...x, [c.id]: { ...x[c.id]!, rationale: e.target.value } }))} /></Field>
          </div>
          {isChair && (
            <div style={{ marginTop: 8, padding: 10, border: "1px dashed var(--u-border)", borderRadius: "var(--u-radius-md)", fontSize: 13.5 }}>
              <strong>Moderation (chair)</strong>
              {(b.others?.[c.id] ?? []).map((x, i) => <div key={i} style={muted}>{x.evaluator}: {x.score} · {x.rationale}</div>)}
              <div style={muted}>Average {b.proposed[c.id] ?? "pending"}{b.spreadFlag[c.id] ? " · evaluators differ widely: moderate and give a reason" : ""}</div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 10, marginTop: 6, alignItems: "end" }}>
                <input type="number" aria-label="Agreed score" min={0} max={100} style={inputStyle} value={mod[c.id]?.score ?? ""} onChange={(e) => setMod((x) => ({ ...x, [c.id]: { ...x[c.id]!, score: e.target.value } }))} />
                <input aria-label="Reason for agreed score" style={inputStyle} placeholder="Reason" value={mod[c.id]?.rationale ?? ""} onChange={(e) => setMod((x) => ({ ...x, [c.id]: { ...x[c.id]!, rationale: e.target.value } }))} />
                <Button size="sm" variant="secondary" disabled={busy || mod[c.id]?.score === ""} onClick={() => act(() => apiClient.moderateTenderScore(id, { bidId: b.bidId, criterionId: c.id, score: Number(mod[c.id]!.score), rationale: mod[c.id]!.rationale }))}>Save</Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!locked && manual.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Button variant="secondary" disabled={busy} onClick={() => act(() => apiClient.saveTenderScores(id, { bidId: b.bidId, scores: payload() }))}>Save draft scores</Button>
        <Button variant="primary" disabled={busy} onClick={() => act(() => apiClient.saveTenderScores(id, { bidId: b.bidId, scores: payload(), submit: true }))}>Submit scores (locks them)</Button>
      </div>}
    </Card>
  );
}

function Results({ o }: { o: EvaluationOverview }) {
  const scored = o.criteria.filter((c: EvalCriterion) => c.kind === "SCORED");
  const rows = [...o.bids].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return (
    <Card title="Results" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead><tr style={{ textAlign: "left", ...muted }}><th>Rank</th><th>Bidder</th><th>Price ({o.tender.currency})</th>{scored.map((c) => <th key={c.id}>{c.title} ({c.weight}%)</th>)}<th>Total</th></tr></thead>
        <tbody>{rows.map((b) => (
          <tr key={b.bidId} style={{ borderTop: "1px solid var(--u-border)" }}>
            <td>{b.rank ?? "–"}</td><td>{b.organizationName}{!b.compliant && <> <Pill tone="critical">Not compliant</Pill></>}{b.partial && <> <Pill tone="warning">Partial</Pill></>}</td>
            <td>{b.total?.toLocaleString()}</td>{scored.map((c) => <td key={c.id}>{b.scores[c.id] ?? "–"}</td>)}<td><strong>{b.totalScore ?? "–"}</strong></td>
          </tr>))}</tbody>
      </table>
    </Card>
  );
}

function AwardForm({ o, id, act, busy }: { o: EvaluationOverview; id: string; act: Act; busy: boolean }) {
  const compliant = o.bids.filter((b) => b.compliant).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [share, setShare] = useState<Record<string, string>>({});   // key: bidId|lineId
  const [waive, setWaive] = useState(false);
  const chosen = compliant.filter((b) => sel[b.bidId]);
  const body = () => ({
    awards: chosen.map((b) => ({ bidId: b.bidId, reason: reason[b.bidId] ?? "", lines: b.pricedLineIds.map((l) => ({ tenderLineId: l, sharePercent: Number(share[`${b.bidId}|${l}`] ?? 100) })).filter((l) => l.sharePercent > 0) })),
    feedback: o.bids.filter((b) => feedback[b.bidId]).map((b) => ({ bidId: b.bidId, text: feedback[b.bidId]! })), waiveStandstill: waive || undefined,
  });
  return (
    <Card title="Award">
      <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>Select every supplier you are awarding. For a framework or a split award, give each supplier a share of each item (shares of one item must not exceed 100%). A sanctions and debarment screening must be recorded for each awarded supplier first (Screening tab on the tender).</p>
      {compliant.map((b) => (
        <div key={b.bidId} style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)" }}>
          <label style={{ display: "flex", gap: 8, fontSize: 14 }}><input type="checkbox" checked={!!sel[b.bidId]} onChange={(e) => setSel((s) => ({ ...s, [b.bidId]: e.target.checked }))} /> <strong>#{b.rank} {b.organizationName}</strong> <span style={muted}>score {b.totalScore} · {o.tender.currency} {b.total?.toLocaleString()}</span></label>
          {sel[b.bidId] && <div style={{ marginLeft: 24, marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {b.pricedLineIds.map((l) => <div key={l} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><span style={{ flex: 1 }}>{o.lines.find((x) => x.id === l)?.description}</span><input type="number" aria-label="Share of item (%)" min={0} max={100} style={{ ...inputStyle, width: 90 }} value={share[`${b.bidId}|${l}`] ?? "100"} onChange={(e) => setShare((s) => ({ ...s, [`${b.bidId}|${l}`]: e.target.value }))} /> %</div>)}
            <input aria-label="Reason for award" style={inputStyle} placeholder="Reason for this award (recorded)" value={reason[b.bidId] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [b.bidId]: e.target.value }))} />
          </div>}
        </div>
      ))}
      <div style={{ marginTop: 12, fontWeight: 600, fontSize: 14 }}>Feedback for the debriefs (optional)</div>
      {o.bids.map((b) => <input key={b.bidId} aria-label={`Feedback for ${b.organizationName}`} style={{ ...inputStyle, marginTop: 6 }} placeholder={`Feedback for ${b.organizationName}`} value={feedback[b.bidId] ?? ""} onChange={(e) => setFeedback((f) => ({ ...f, [b.bidId]: e.target.value }))} />)}
      {o.tender.standstillEnabled && o.tender.emergencyProcurement && <label style={{ display: "flex", gap: 8, fontSize: 13.5, marginTop: 12 }}><input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} /> Waive the standstill period (emergency procurement)</label>}
      <div style={{ marginTop: 14 }}><Button variant="primary" disabled={busy || chosen.length === 0 || chosen.some((b) => !(reason[b.bidId] ?? "").trim())} onClick={() => act(() => apiClient.awardTender(id, body()))}>Record award and release outcomes</Button></div>
    </Card>
  );
}

function Awarded({ o, id, act, busy }: { o: EvaluationOverview; id: string; act: Act; busy: boolean }) {
  const [resp, setResp] = useState<Record<string, { status: "UPHELD" | "REJECTED" | "RESOLVED"; text: string }>>({});
  return (
    <>
      <Card title="Awards">
        {o.awards.map((a) => <div key={a.awardId} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}><strong>{a.organizationName}</strong> <span style={muted}>· {a.reason}</span>
          {a.lines.map((l) => <div key={l.tenderLineId} style={{ fontSize: 13, ...muted }}>{o.lines.find((x) => x.id === l.tenderLineId)?.description}: {l.sharePercent}%</div>)}</div>)}
        <p style={{ marginBottom: 0, fontSize: 13.5, ...muted }}>{o.tender.standstillEnabled ? (o.tender.standstillEndsAt ? `Standstill ends ${fmtDateTime(o.tender.standstillEndsAt, o.tender.timeZone)}. Contracts can be signed after that, once any complaint is answered.` : "The standstill was waived (emergency procurement).") : "No standstill period applies."}</p>
      </Card>
      {o.viewer.isIssuer && <Card title={`Complaints (${o.complaints.length})`}>
        {o.complaints.length === 0 ? <p style={{ margin: 0, ...muted }}>None received.</p> : o.complaints.map((c) => (
          <div key={c.id} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
            <div>{c.body}</div>
            {c.status === "OPEN" ? (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <textarea aria-label="Your response" rows={2} style={{ ...inputStyle, flex: 1, minWidth: 240 }} placeholder="Your response" value={resp[c.id]?.text ?? ""} onChange={(e) => setResp((r) => ({ ...r, [c.id]: { status: r[c.id]?.status ?? "REJECTED", text: e.target.value } }))} />
                {(["UPHELD", "REJECTED", "RESOLVED"] as const).map((s) => <Button key={s} size="sm" variant="secondary" disabled={busy || !(resp[c.id]?.text ?? "").trim()} onClick={() => act(() => apiClient.respondTenderComplaint(id, c.id, { status: s, response: resp[c.id]!.text }))}>{s === "UPHELD" ? "Uphold" : s === "REJECTED" ? "Reject" : "Resolve"}</Button>)}
              </div>
            ) : <div style={muted}><Pill>{c.status.toLowerCase()}</Pill> {c.response}</div>}
          </div>))}
      </Card>}
    </>
  );
}
