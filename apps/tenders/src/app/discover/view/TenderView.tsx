"use client";

import { OwnerPaymentPractice } from "../../../components/PerformancePanel";
import { DocumentList } from "../../../components/TenderDocuments";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EXCLUSION_GROUNDS, INCOTERM_NAMES, qualificationLabel } from "@universe/types";
import type { TenderParticipantView } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { CHIP_LABEL, CHIP_TONE, Card, ErrorNote, Heading, Page, STATUS_LABEL, TYPE_LABEL, fmtDateTime, inputStyle } from "../../../lib/ui";

const PM_URL = process.env.NEXT_PUBLIC_APP_URL_PROJECT_MANAGEMENT ?? "https://black-island-047de4e0f.5.azurestaticapps.net";
const muted = { color: "var(--u-ink-secondary)" } as const;
const STATUS_ICON = { MET: "✓", NOT_MET: "✗", NEEDS_EVIDENCE: "?" } as const;

/** What a participant sees of a tender: eligibility explained, the requirements, Q&A, addenda, and the interest declaration. */
export function TenderView() {
  const id = useSearchParams().get("id") ?? "";
  const [v, setV] = useState<TenderParticipantView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [pledge, setPledge] = useState(false); const [noGrounds, setNoGrounds] = useState<boolean | null>(null); const [grounds, setGrounds] = useState<string[]>([]); const [expl, setExpl] = useState("");
  const [question, setQuestion] = useState("");
  const [proj, setProj] = useState<{ projectId: string; referenceNumber: string; status: string } | null>(null);

  const load = useCallback(() => { if (id) apiClient.viewTender(id).then(setV).catch((e) => setErr(e instanceof Error ? e.message : "Could not load this tender.")); }, [id]);
  useEffect(load, [load]);
  useEffect(() => { if (id) apiClient.getMyTenderProject(id).then(setProj).catch(() => undefined); }, [id, v?.participation?.status]);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); load(); return true; } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); return false; } finally { setBusy(false); } };

  if (!v) return <Page><ErrorNote message={err} />{!err && <div style={muted}>Loading…</div>}</Page>;
  const t = v.tender;
  const open = (t.effectiveStatus ?? t.status) === "PUBLISHED";
  const participating = !!v.participation && v.participation.status !== "WITHDRAWN";
  const outstanding = v.addenda.filter((a) => a.requiresAcknowledgement && !a.acknowledged);

  const submitInterest = async () => {
    const ok = await run(() => apiClient.expressTenderInterest(id, {
      integrityPledge: t.requireIntegrityPledge ? pledge : undefined,
      exclusion: t.requireExclusionDeclaration ? { noGrounds: noGrounds === true, grounds: noGrounds === false ? grounds : [], explanation: noGrounds === false ? expl : undefined } : undefined,
    }));
    if (ok) setDialog(false);
  };
  const declOk = (!t.requireIntegrityPledge || pledge) && (!t.requireExclusionDeclaration || noGrounds === true || (noGrounds === false && grounds.length > 0 && expl.trim().length > 0));

  return (
    <Page>
      <Heading title={`${t.referenceNumber} · ${t.title}`} sub={<>{t.issuerName} · {TYPE_LABEL[t.tenderType]} · {STATUS_LABEL[t.effectiveStatus ?? t.status]}</>}
        actions={<>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => (v.shortlisted ? apiClient.unshortlistTender(id) : apiClient.shortlistTender(id)))}>{v.shortlisted ? "Remove from shortlist" : "Shortlist"}</Button>
          {participating && <Link href={`/bids/edit?id=${id}`} style={{ textDecoration: "none" }}><Button variant="primary">{open ? "Open my bid" : "View my bid"}</Button></Link>}
        </>} />
      <ErrorNote message={err} />
      <div><OwnerPaymentPractice ownerId={t.organizationId} /></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{v.eligibility.chips.map((c) => <Pill key={c} tone={CHIP_TONE[c] ?? "neutral"}>{CHIP_LABEL[c] ?? c}</Pill>)}</div>

      {t.summary && <Card><p style={{ margin: 0, lineHeight: 1.6 }}>{t.summary}</p></Card>}

      <Card title="Can your organisation bid?">
        {v.eligibility.items.length === 0 ? <p style={{ margin: 0, ...muted }}>This tender has no eligibility requirements{v.eligibility.invited ? "; you have also been invited." : "."}</p> : v.eligibility.items.map((i) => (
          <div key={i.ruleId} style={{ display: "flex", gap: 10, padding: "8px 0", fontSize: 14 }}>
            <span aria-hidden style={{ fontWeight: 700, color: i.status === "MET" ? "var(--u-status-good-text)" : i.status === "NOT_MET" ? "var(--u-status-critical-text)" : "var(--u-status-warning-text)" }}>{STATUS_ICON[i.status]}</span>
            <div><div>{i.requirement}{!i.required && <span style={muted}> (optional)</span>}</div>{i.action && <div style={{ fontSize: 13, ...muted }}>{i.action}</div>}</div>
          </div>
        ))}
      </Card>

      <Card title="Key dates and terms">
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
          <dt style={muted}>Questions until</dt><dd style={{ margin: 0 }}>{fmtDateTime(t.clarificationDeadline, t.timeZone)}</dd>
          <dt style={muted}>Closes</dt><dd style={{ margin: 0 }}>{fmtDateTime(t.closingAt, t.timeZone)}</dd>
          <dt style={muted}>Currency</dt><dd style={{ margin: 0 }}>{t.currency ?? "Not specified"}</dd>
          <dt style={muted}>Incoterm</dt><dd style={{ margin: 0 }}>{t.incoterm ? `${t.incoterm}: ${INCOTERM_NAMES[t.incoterm as keyof typeof INCOTERM_NAMES] ?? ""}` : "Not specified"}</dd>
          <dt style={muted}>Bid validity</dt><dd style={{ margin: 0 }}>{t.bidValidityDays ? `${t.bidValidityDays} days` : "Not specified"}</dd>
          {t.standstillEnabled && <><dt style={muted}>Standstill</dt><dd style={{ margin: 0 }}>{t.standstillWorkingDays} working days between award notice and contract</dd></>}
        </dl>
        {t.termsAndConditions && <p style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.55, marginBottom: 0 }}>{t.termsAndConditions}</p>}
      </Card>

      <Card title="Items required">
        {v.lines.map((l) => (
          <div key={l.id} style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
            <strong>{l.lineNumber}. {l.description}</strong> <span style={muted}>{l.quantity} {l.unit}{l.destinationCountryCode ? ` · to ${l.destinationCountryCode}` : ""}</span>
            <div style={{ fontSize: 13, ...muted }}>{[l.requiredRegistration && `Registration: ${qualificationLabel(l.requiredRegistration)}`, l.minShelfLifePercent && `Minimum ${l.minShelfLifePercent}% shelf life on delivery`, l.coldChainRequired && "Cold chain required", l.specification].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </Card>

      <Card title="How bids are judged">
        {v.criteria.map((c) => <div key={c.id} style={{ padding: "6px 0", fontSize: 14 }}><strong>{c.title}</strong> <Pill tone={c.kind === "GATE" ? "warning" : "brand"}>{c.kind === "GATE" ? "Pass or fail" : `${c.weight}%`}</Pill>{c.description && <div style={{ fontSize: 13, ...muted }}>{c.description}</div>}</div>)}
      </Card>

      {v.addenda.length > 0 && (
        <Card title="Addenda">
          {v.addenda.map((a) => (
            <div key={a.id} style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
              <strong>Addendum {a.number}: {a.title}</strong><div style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{a.body}</div>
              {a.newClosingAt && <div style={muted}>New closing time: {fmtDateTime(a.newClosingAt, t.timeZone)}</div>}
              {a.requiresAcknowledgement && (a.acknowledged ? <Pill tone="good">Acknowledged</Pill> : participating ? <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => apiClient.acknowledgeTenderAddendum(id, a.id))}>Acknowledge</Button> : <Pill tone="warning">Express interest to acknowledge</Pill>)}
            </div>
          ))}
          {outstanding.length > 0 && participating && <p style={{ marginBottom: 0, fontSize: 13, ...muted }}>You must acknowledge these before you can submit a bid.</p>}
        </Card>
      )}

      {v.documents.length > 0 && <Card title="Tender documents"><DocumentList tenderId={id} documents={v.documents} /></Card>}

      <Card title="Questions and clarifications">
        {v.clarifications.length === 0 ? <p style={{ marginTop: 0, ...muted }}>No clarifications have been published.</p> : v.clarifications.map((c) => (
          <div key={c.id} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}><strong>Q: {c.question}</strong><div style={{ marginTop: 4 }}>{c.answer}</div></div>
        ))}
        {open && participating && (
          <div style={{ marginTop: 14 }}>
            <textarea aria-label="Your question" rows={3} style={inputStyle} placeholder="Ask the tender owner a question. Answers are published to everyone without naming you." value={question} onChange={(e) => setQuestion(e.target.value)} />
            <div style={{ marginTop: 8 }}><Button variant="secondary" disabled={busy || question.trim().length < 5} onClick={async () => { if (await run(() => apiClient.askTenderQuestion(id, question.trim()))) setQuestion(""); }}>Send question</Button></div>
          </div>
        )}
        {v.myQuestions.length > 0 && <div style={{ marginTop: 12, fontSize: 13, ...muted }}>Your questions awaiting an answer: {v.myQuestions.map((q) => `“${q.question}”`).join("; ")}</div>}
      </Card>

      {(

        <Card title="Your project">
          {proj ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Pill tone="brand">{proj.status.replace(/_/g, " ").toLowerCase()}</Pill>
              <a href={`${PM_URL}/projects/detail?id=${proj.projectId}`} style={{ fontSize: 14 }}>Open {proj.referenceNumber} in Project Management</a>
              <span style={{ flex: "1 1 220px", fontSize: 13, ...muted }}>Kept up to date as you bid, and as the tender is awarded or closed.</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button variant="secondary" disabled={busy} onClick={async () => { const ok = await run(async () => { const r = await apiClient.trackTenderAsProject(id); setProj(await apiClient.getMyTenderProject(id)); return r; }); if (!ok) return; }}>Track as a project</Button>
              <span style={{ flex: "1 1 220px", fontSize: 13, ...muted }}>Creates a Project Management project for this tender. Expressing interest creates one automatically.</span>
            </div>
          )}
        </Card>
      )}

      {open && (
        <Card title="Take part">
          {participating ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Pill tone="good">You have expressed interest</Pill>
              <Link href={`/bids/edit?id=${id}`} style={{ textDecoration: "none" }}><Button variant="primary">Start or continue your bid</Button></Link>
              <Button variant="secondary" disabled={busy} onClick={() => run(() => apiClient.withdrawTenderInterest(id))}>Withdraw interest</Button>
            </div>
          ) : !v.eligibility.canBid ? <p style={{ margin: 0, ...muted }}>Your organisation does not currently meet the requirements above, so you cannot take part yet.</p>
            : !dialog ? <Button variant="primary" onClick={() => setDialog(true)}>Express interest</Button> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
                {t.requireIntegrityPledge && <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} /> <span>On behalf of my organisation I pledge not to engage in fraud, corruption, collusion or any other prohibited practice in connection with this tender.</span></label>}
                {t.requireExclusionDeclaration && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Exclusion declaration</div>
                    <label style={{ display: "flex", gap: 8 }}><input type="radio" name="ex" checked={noGrounds === true} onChange={() => setNoGrounds(true)} /> None of the exclusion grounds apply to my organisation.</label>
                    <label style={{ display: "flex", gap: 8, marginTop: 6 }}><input type="radio" name="ex" checked={noGrounds === false} onChange={() => setNoGrounds(false)} /> One or more grounds apply.</label>
                    {noGrounds === false && (
                      <div style={{ marginLeft: 24, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        {EXCLUSION_GROUNDS.map((g) => <label key={g.value} style={{ display: "flex", gap: 8 }}><input type="checkbox" checked={grounds.includes(g.value)} onChange={(e) => setGrounds((x) => e.target.checked ? [...x, g.value] : x.filter((y) => y !== g.value))} /> {g.label}</label>)}
                        <textarea aria-label="Explanation" rows={3} style={inputStyle} placeholder="Explain, including any corrective steps taken" value={expl} onChange={(e) => setExpl(e.target.value)} />
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}><Button variant="primary" disabled={busy || !declOk} onClick={submitInterest}>Confirm interest</Button><Button variant="secondary" onClick={() => setDialog(false)}>Cancel</Button></div>
              </div>
            )}
        </Card>
      )}
    </Page>
  );
}
