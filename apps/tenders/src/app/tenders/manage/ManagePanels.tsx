"use client";

import { OrgName } from "../../../components/OrgName";
import { useEffect, useState } from "react";
import { EXCLUSION_GROUNDS, SCREENING_LISTS, SCREENING_OUTCOMES } from "@universe/types";
import type { IssuerBidRecord, TenderChainCheck, TenderDetailForIssuer } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { Card, ErrorNote, Field, fmtDate, fmtDateTime, fromLocalInput, inputStyle, toLocalInput } from "../../../lib/ui";

const groundLabel = (v: string) => EXCLUSION_GROUNDS.find((g) => g.value === v)?.label ?? v;
const listLabel = (v: string) => SCREENING_LISTS.find((l) => l.value === v)?.label ?? v;
const outcomeLabel = (v: string) => SCREENING_OUTCOMES.find((o) => o.value === v)?.label ?? v;
const muted = { color: "var(--u-ink-secondary)" } as const;

function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); onDone(); return true; } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); return false; } finally { setBusy(false); } };
  return { busy, err, run };
}

/** Participants with the declarations each made when expressing interest, and whether the issuer has recorded a screening. */
export function ParticipantsPanel({ d }: { d: TenderDetailForIssuer }) {
  const screened = new Set(d.screenings.map((s) => s.screenedOrganisationId));
  return (
    <Card title="Organisations that have expressed interest">
      {d.participants.length === 0 ? <p style={{ margin: 0, ...muted }}>None yet. Eligible organisations see this tender in their list; invite more below.</p> : d.participants.map((p, i) => (
        <div key={p.organizationId} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong><OrgName id={p.organizationId} name={p.organizationName} /></strong>
            <span style={muted}>Interested {fmtDate(p.optedInAt)}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {d.tender.requireIntegrityPledge && <Pill tone={p.integrityPledgeAt ? "good" : "warning"}>{p.integrityPledgeAt ? "Integrity pledge accepted" : "No integrity pledge"}</Pill>}
            {d.tender.requireExclusionDeclaration && (p.exclusionDeclaredAt ? (p.exclusionNoGrounds ? <Pill tone="good">Declares no exclusion grounds</Pill> : <Pill tone="critical">Declares exclusion grounds</Pill>) : <Pill tone="warning">No exclusion declaration</Pill>)}
            <Pill tone={screened.has(p.organizationId) ? "good" : "neutral"}>{screened.has(p.organizationId) ? "Screened" : "Not yet screened"}</Pill>
          </div>
          {p.exclusionGrounds.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
              <div>{p.exclusionGrounds.map(groundLabel).join("; ")}</div>
              {p.exclusionExplanation && <div style={muted}>{p.exclusionExplanation}</div>}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

/** Questions from bidders (visible only to the issuer) and the clarifications published to everyone. */
export function QuestionsPanel({ d, onChanged }: { d: TenderDetailForIssuer; onChanged: () => void }) {
  const open = d.tender.status === "PUBLISHED";
  const unanswered = d.questions.filter((q) => !q.answered);
  const [answers, setAnswers] = useState<Record<string, { answer: string; text: string }>>({});
  const [own, setOwn] = useState({ question: "", answer: "" });
  const act = useAction(onChanged);
  return (
    <>
      <Card title={`Questions received (${unanswered.length} waiting)`}>
        <ErrorNote message={act.err} />
        <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>Your answer is published to every participant without saying who asked. Edit the question text if it identifies the asker.</p>
        {d.questions.length === 0 && <p style={{ margin: 0, ...muted }}>No questions yet.</p>}
        {d.questions.map((q, i) => {
          const a = answers[q.id] ?? { answer: "", text: q.question };
          return (
            <div key={q.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={muted}>From {q.askedByOrganisation ?? "an organisation"} · {fmtDateTime(q.askedAt)}</span><Pill tone={q.answered ? "good" : "warning"}>{q.answered ? "Answered" : "Waiting"}</Pill></div>
              {q.answered ? <p style={{ margin: "6px 0 0" }}>{q.question}</p> : open ? (
                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  <Field label="Question as published"><textarea style={{ ...inputStyle, minHeight: 56 }} value={a.text} onChange={(e) => setAnswers({ ...answers, [q.id]: { ...a, text: e.target.value } })} /></Field>
                  <Field label="Your answer"><textarea style={{ ...inputStyle, minHeight: 70 }} value={a.answer} onChange={(e) => setAnswers({ ...answers, [q.id]: { ...a, answer: e.target.value } })} /></Field>
                  <div><Button disabled={!a.answer.trim() || act.busy} onClick={() => act.run(() => apiClient.answerTenderQuestion(d.tender.id, q.id, { answer: a.answer, publishedQuestion: a.text }))}>Publish answer to all</Button></div>
                </div>
              ) : <p style={{ margin: "6px 0 0" }}>{q.question}</p>}
            </div>
          );
        })}
      </Card>
      {open && (
        <Card title="Publish a clarification">
          <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>Tell everyone something without waiting to be asked.</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Topic or question"><textarea style={{ ...inputStyle, minHeight: 50 }} value={own.question} onChange={(e) => setOwn({ ...own, question: e.target.value })} /></Field>
            <Field label="Clarification"><textarea style={{ ...inputStyle, minHeight: 70 }} value={own.answer} onChange={(e) => setOwn({ ...own, answer: e.target.value })} /></Field>
            <div><Button disabled={own.question.trim().length < 5 || !own.answer.trim() || act.busy} onClick={async () => { if (await act.run(() => apiClient.postTenderClarification(d.tender.id, own))) setOwn({ question: "", answer: "" }); }}>Publish to all</Button></div>
          </div>
        </Card>
      )}
      <Card title={`Published clarifications (${d.clarifications.length})`}>
        {d.clarifications.length === 0 && <p style={{ margin: 0, ...muted }}>Nothing published yet.</p>}
        {d.clarifications.map((c, i) => <div key={c.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14, lineHeight: 1.5 }}><div style={muted}>{fmtDateTime(c.answeredAt)}</div><strong>{c.question}</strong><div>{c.answer}</div></div>)}
      </Card>
    </>
  );
}

/** Formal changes to a published tender, each with who has and has not acknowledged it. */
export function AddendaPanel({ d, onChanged }: { d: TenderDetailForIssuer; onChanged: () => void }) {
  const t = d.tender; const zone = t.timeZone;
  const [f, setF] = useState({ title: "", body: "", requiresAcknowledgement: true, newClosingAt: "" });
  const act = useAction(onChanged);
  return (
    <>
      {t.status === "PUBLISHED" && (
        <Card title="Issue an addendum">
          <ErrorNote message={act.err} />
          <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>Use an addendum for any change bidders must know about. Every participant is notified, and you can see who has acknowledged it. Items, criteria and rules cannot change after publication; cancel and reissue if they must.</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Title"><input style={inputStyle} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={300} /></Field>
            <Field label="What has changed"><textarea style={{ ...inputStyle, minHeight: 90 }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            <Field label="New closing date (optional)" hint={`In ${zone ?? "your browser's time zone"}. Can only be later than the current date.`}><input type="datetime-local" style={inputStyle} value={f.newClosingAt} onChange={(e) => setF({ ...f, newClosingAt: e.target.value })} /></Field>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.requiresAcknowledgement} onChange={(e) => setF({ ...f, requiresAcknowledgement: e.target.checked })} /> Ask participants to acknowledge it</label>
            <div><Button disabled={!f.title.trim() || !f.body.trim() || act.busy} onClick={async () => { if (await act.run(() => apiClient.createTenderAddendum(t.id, { title: f.title, body: f.body, requiresAcknowledgement: f.requiresAcknowledgement, newClosingAt: fromLocalInput(f.newClosingAt, zone) }))) setF({ title: "", body: "", requiresAcknowledgement: true, newClosingAt: "" }); }}>Issue addendum</Button></div>
          </div>
        </Card>
      )}
      <Card title={`Addenda issued (${d.addenda.length})`}>
        {d.addenda.length === 0 && <p style={{ margin: 0, ...muted }}>None.</p>}
        {d.addenda.map((a, i) => (
          <div key={a.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>Addendum {a.number}: {a.title}</strong><span style={muted}>{fmtDateTime(a.createdAt, zone)}</span></div>
            <div>{a.body}</div>
            {a.newClosingAt && <div style={muted}>New closing date: {fmtDateTime(a.newClosingAt, zone)}</div>}
            {a.requiresAcknowledgement && <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><Pill tone={(a.outstanding?.length ?? 0) === 0 ? "good" : "warning"}>{a.acknowledgedBy ?? 0} acknowledged</Pill>{(a.outstanding?.length ?? 0) > 0 && <span style={{ fontSize: 13, ...muted }}>Waiting for {a.outstanding!.join(", ")}</span>}</div>}
          </div>
        ))}
      </Card>
    </>
  );
}

/** The issuer's record that it screened participants against sanctions and debarment lists. Universe does not run the check. */
export function ScreeningPanel({ d, onChanged }: { d: TenderDetailForIssuer; onChanged: () => void }) {
  const orgs = [...new Map([...d.participants.map((p) => [p.organizationId, p.organizationName] as const), ...d.invitations.map((i) => [i.invitedOrganizationId, i.organizationName] as const)]).entries()];
  const [f, setF] = useState({ organisationId: "", lists: [] as string[], outcome: "CLEAR", notes: "", screenedOn: toLocalInput(new Date().toISOString()).slice(0, 10) });
  const act = useAction(onChanged);
  const toggle = (v: string) => setF((p) => ({ ...p, lists: p.lists.includes(v) ? p.lists.filter((x) => x !== v) : [...p.lists, v] }));
  return (
    <>
      <Card title="Record a screening">
        <ErrorNote message={act.err} />
        <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>Screen participants against the sanctions and debarment lists your organisation requires, then record it here. Universe does not perform the check; this entry is your audit record that it was done, when, against what, and with what result. The screened organisation cannot see it.</p>
        {orgs.length === 0 ? <p style={{ margin: 0, ...muted }}>Nobody to screen yet. Participants and invited organisations appear here.</p> : (
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Organisation"><Select value={f.organisationId} onChange={(v) => setF({ ...f, organisationId: v })} allLabel="Choose an organisation" options={orgs.map(([id, name]) => ({ value: id, label: name ?? "Organisation" }))} /></Field>
            <Field label="Lists you screened against">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>{SCREENING_LISTS.map((l) => <label key={l.value} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.lists.includes(l.value)} onChange={() => toggle(l.value)} /> {l.label}</label>)}</div>
            </Field>
            <Field label="Result"><Select value={f.outcome} onChange={(v) => setF({ ...f, outcome: v })} options={SCREENING_OUTCOMES.map((o) => ({ value: o.value, label: o.label }))} /></Field>
            <Field label="Date screened"><input type="date" style={inputStyle} value={f.screenedOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, screenedOn: e.target.value })} /></Field>
            <Field label="Notes (optional)" hint="For example the reference of any match you reviewed."><textarea style={{ ...inputStyle, minHeight: 56 }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <div><Button disabled={!f.organisationId || f.lists.length === 0 || !f.screenedOn || act.busy} onClick={async () => { if (await act.run(() => apiClient.recordTenderScreening(d.tender.id, { organisationId: f.organisationId, lists: f.lists, outcome: f.outcome, notes: f.notes || undefined, screenedOn: new Date(`${f.screenedOn}T12:00:00Z`).toISOString() }))) setF({ ...f, organisationId: "", lists: [], notes: "" }); }}>Record screening</Button></div>
          </div>
        )}
      </Card>
      <Card title={`Screenings recorded (${d.screenings.length})`}>
        {d.screenings.length === 0 && <p style={{ margin: 0, ...muted }}>None yet.</p>}
        {d.screenings.map((s, i) => (
          <div key={s.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>{s.organisationName ?? "Organisation"}</strong><Pill tone={s.outcome === "CLEAR" ? "good" : s.outcome === "EXCLUDED" ? "critical" : "warning"}>{outcomeLabel(s.outcome)}</Pill></div>
            <div style={muted}>Screened {fmtDate(s.screenedOn)} against {s.lists.map(listLabel).join("; ")}</div>
            {s.notes && <div>{s.notes}</div>}
          </div>
        ))}
      </Card>
    </>
  );
}

/** Checks the timeline's hash chain and says whether any entry has been altered or removed. */
export function VerifyTimeline({ id }: { id: string }) {
  const [res, setRes] = useState<TenderChainCheck | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() { setBusy(true); setErr(null); try { setRes(await apiClient.verifyTenderTimeline(id)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not verify."); } finally { setBusy(false); } }
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "0 0 12px" }}>
      <Button size="sm" variant="ghost" onClick={go} disabled={busy}>{busy ? "Checking…" : "Verify timeline integrity"}</Button>
      {res && (res.ok ? <Pill tone="good">{res.events} chained entries verified, none altered</Pill> : <Pill tone="critical">Integrity check failed{res.brokenAt ? ` at entry ${res.brokenAt}` : ""}</Pill>)}
      {err && <span style={{ fontSize: 13, color: "var(--u-status-critical-text)" }}>{err}</span>}
    </div>
  );
}

/** Bids: only a count while the tender is open; the contents open at the closing time, and every opening is written to the timeline. */
export function BidsPanel({ d }: { d: TenderDetailForIssuer }) {
  const t = d.tender;
  const closed = !!t.closingAt && new Date(t.closingAt).getTime() <= Date.now();
  const [count, setCount] = useState<number | null>(null);
  const [bids, setBids] = useState<IssuerBidRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { apiClient.tenderBidCount(t.id).then(setCount).catch(() => undefined); }, [t.id]);
  const open = async () => { setErr(null); try { await apiClient.openTenderBids(t.id); setBids(await apiClient.listTenderBids(t.id)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the bids."); } };
  const file = async (fileId: string) => { try { const r = await apiClient.issuerTenderBidFileUrl(t.id, fileId); window.open(r.downloadUrl, "_blank", "noopener"); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the file."); } };
  if (t.status === "DRAFT") return <Card title="Bids"><p style={{ margin: 0, ...muted }}>Bids arrive once the tender is published.</p></Card>;
  return (
    <Card title={`Bids${count !== null ? ` (${count} submitted)` : ""}`}>
      <ErrorNote message={err} />
      {!closed ? <p style={{ margin: 0, lineHeight: 1.5, ...muted }}>Bids are sealed. You can see how many have been submitted, but not who bid or what they offered, until {fmtDateTime(t.closingAt, t.timeZone)}.</p> : !bids ? (
        <div><p style={{ marginTop: 0, ...muted }}>The tender has closed. Opening the bids is recorded on the tender timeline.</p><div style={{ display: "flex", gap: 8 }}><Button variant="primary" onClick={open} disabled={count === 0}>Open bids</Button><a href={`/tenders/evaluate?id=${t.id}`} style={{ textDecoration: "none" }}><Button variant="secondary">Evaluation and award</Button></a></div></div>
      ) : bids.length === 0 ? <p style={{ margin: 0, ...muted }}>No bids were submitted.</p> : bids.map((b, i) => (
        <div key={b.bidId} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>{i + 1}. <OrgName id={b.organizationId} name={b.organizationName} /></strong>
            <span>{t.currency} {Number(b.totalTenderCurrency ?? 0).toLocaleString()}{b.bidCurrency !== t.currency && b.bidCurrency ? <span style={muted}> ({b.bidCurrency} {Number(b.totalBidCurrency).toLocaleString()} at {Number(b.fxRate).toFixed(4)}, {b.fxRateDate?.slice(0, 10)})</span> : null}</span>
          </div>
          <button type="button" onClick={() => setOpenId(openId === b.bidId ? null : b.bidId)} style={{ border: "none", background: "none", padding: 0, color: "var(--u-accent)", cursor: "pointer", fontSize: 13 }}>{openId === b.bidId ? "Hide details" : "Show details"}</button>
          {openId === b.bidId && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              {b.lines.map((l) => <div key={l.tenderLineId} style={{ fontSize: 13.5 }}>{l.lineNumber}. {l.description}: {l.noBid ? <em>not bidding</em> : <>{b.bidCurrency} {l.unitPrice} per {l.unit} · {l.leadTimeDays} days · origin {l.countryOfOrigin}{l.manufacturerName ? ` · ${l.manufacturerName}` : ""}</>}</div>)}
              {b.responses.map((r) => (
                <div key={r.criterionId} style={{ fontSize: 13.5 }}><strong>{r.criterionTitle}</strong>{r.text && <div style={{ whiteSpace: "pre-wrap" }}>{r.text}</div>}{r.files.map((f) => <div key={f.id}><button type="button" onClick={() => file(f.id)} style={{ border: "none", background: "none", padding: 0, color: "var(--u-accent)", cursor: "pointer" }}>{f.fileName}</button></div>)}</div>
              ))}
              {b.notes && <div style={{ fontSize: 13.5 }}><strong>Notes:</strong> {b.notes}</div>}
              <div style={muted}>Valid for {b.validityDays} days · submitted {fmtDateTime(b.submittedAt, t.timeZone)}</div>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
