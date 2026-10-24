"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CURRENCY_OPTIONS } from "@universe/types";
import type { TenderBidWorkspace } from "@universe/types";
import { Button, CountrySelect, CurrencySelect, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { fileToBase64, saveBase64File } from "../../../lib/download";
import { Card, ErrorNote, Field, Heading, Page, fmtDateTime, inputStyle } from "../../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
type Line = TenderBidWorkspace["lines"][number];
const num = (s: string) => (s.trim() === "" ? null : s.trim());

/** The bid workspace (2026-10-19): prices per item in the bidder's own currency, typed or uploaded answers, a live checklist, save / submit / withdraw. */
export function BidBuilder() {
  const id = useSearchParams().get("id") ?? "";
  const countries = useCountries();
  const [ws, setWs] = useState<TenderBidWorkspace | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [ccy, setCcy] = useState(""); const [valid, setValid] = useState(false); const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const tplRef = useRef<HTMLInputElement>(null); const tplKind = useRef<"financial" | "technical">("financial");
  const fileRef = useRef<HTMLInputElement>(null); const fileFor = useRef<string | null>(null);

  const adopt = useCallback((w: TenderBidWorkspace) => {
    setWs(w); setLines(w.lines); setTexts(Object.fromEntries(w.criteria.map((c) => [c.id, c.text ?? ""]))); setCcy(w.bid.bidCurrency ?? w.tender.currency ?? ""); setValid(w.bid.validityConfirmed); setNotes(w.bid.notes ?? ""); setDirty(false);
  }, []);
  useEffect(() => { if (id) apiClient.getTenderBid(id).then(adopt).catch((e) => setErr(e instanceof Error ? e.message : "Could not load your bid.")); }, [id, adopt]);

  const payload = () => ({
    bidCurrency: ccy || null, validityConfirmed: valid, notes: notes || null,
    lines: lines.map((l) => ({ tenderLineId: l.tenderLineId, noBid: l.noBid, unitPrice: l.noBid ? null : num(l.unitPrice ?? "") === null ? null : Number(l.unitPrice), leadTimeDays: l.noBid || l.leadTimeDays === null || Number.isNaN(l.leadTimeDays) ? null : Number(l.leadTimeDays), countryOfOrigin: l.noBid ? null : l.countryOfOrigin, manufacturerName: l.manufacturerName || null, remarks: l.remarks || null })),
    responses: Object.entries(texts).map(([criterionId, text]) => ({ criterionId, text: text || null })),
  });
  const run = async (fn: () => Promise<TenderBidWorkspace | void>, ok?: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try { const w = await fn(); if (w) adopt(w); if (ok) setMsg(ok); return true; }
    catch (e) { const r = (e as { problems?: string[] }).problems; setErr(e instanceof Error ? e.message + (r?.length ? `: ${r.join("; ")}` : "") : "Something went wrong."); return false; }
    finally { setBusy(false); }
  };
  const save = () => run(() => apiClient.saveTenderBid(id, payload()), "Draft saved.");
  const submit = async () => {
    if (!(await run(() => apiClient.saveTenderBid(id, payload())))) return;
    setBusy(true);
    try { const r = await apiClient.submitTenderBid(id); adopt(await apiClient.getTenderBid(id)); setMsg(`Bid submitted.${r.fxRate && ws?.tender.currency && ccy !== ws.tender.currency ? ` Converted to ${ws.tender.currency} at ${Number(r.fxRate).toFixed(4)} (${r.fxRateDate?.slice(0, 10)}).` : ""}`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not submit."); } finally { setBusy(false); }
  };
  const upd = (i: number, p: Partial<Line>) => { setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l))); setDirty(true); };
  const getTemplate = async (kind: "financial" | "technical") => { setErr(null); try { saveBase64File(await apiClient.downloadTenderBidTemplate(id, kind)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not create the template."); } };
  const pickTemplate = (kind: "financial" | "technical") => { tplKind.current = kind; tplRef.current?.click(); };
  const onTemplate = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setErr(null); setMsg(null); setProblems([]);
    try {
      const r = await apiClient.uploadTenderBidTemplate(id, tplKind.current, f.name, await fileToBase64(f));
      if (r.accepted && r.workspace) { adopt(r.workspace); setMsg(`${tplKind.current === "financial" ? "Financial" : "Technical"} offer read into your draft. Check it below, then submit.`); }
      else setProblems(r.problems);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not read the file."); } finally { setBusy(false); if (tplRef.current) tplRef.current.value = ""; }
  };
  const pick = (criterionId: string | null) => { fileFor.current = criterionId; fileRef.current?.click(); };
  const onFile = async (f: File | undefined) => { if (!f) return; await run(async () => { if (dirty) await apiClient.saveTenderBid(id, payload()); return apiClient.uploadTenderBidFile(id, f, fileFor.current); }, "File added."); if (fileRef.current) fileRef.current.value = ""; };

  if (!ws) return <Page><Heading title="Bid" /><ErrorNote message={err} />{!err && <div style={muted}>Loading…</div>}{err && <Link href="/discover">Back to Find tenders</Link>}</Page>;
  const submitted = ws.bid.status === "SUBMITTED";
  const locked = !ws.open;
  const total = lines.filter((l) => !l.noBid).reduce((s, l) => s + (Number(l.unitPrice) || 0) * Number(l.quantity ?? 1), 0);
  const tenderCcy = ws.tender.currency;

  return (
    <Page>
      <Heading title={`Bid · ${ws.tender.referenceNumber}`} sub={<>{ws.tender.title} · {ws.tender.issuerName} · closes {fmtDateTime(ws.tender.closingAt, ws.tender.timeZone)}</>}
        actions={<><Link href={`/discover/view?id=${id}`} style={{ textDecoration: "none" }}><Button variant="secondary">Tender details</Button></Link>{submitted && !locked && <Button variant="secondary" disabled={busy} onClick={() => run(async () => { await apiClient.withdrawTenderBid(id); return apiClient.getTenderBid(id); }, "Bid withdrawn.")}>Withdraw bid</Button>}</>} />
      <ErrorNote message={err} />
      {msg && <div role="status" style={{ padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-good)", fontSize: 13.5 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Pill tone={submitted ? "good" : ws.bid.status === "WITHDRAWN" ? "neutral" : "warning"}>{submitted ? "Submitted" : ws.bid.status === "WITHDRAWN" ? "Withdrawn" : "Draft"}</Pill>
        {locked && <Pill tone="critical">Not accepting bids</Pill>}
        {submitted && ws.bid.totalTenderCurrency && <Pill tone="brand">{tenderCcy} {Number(ws.bid.totalTenderCurrency).toLocaleString()}{ws.bid.bidCurrency !== tenderCcy ? ` (rate ${Number(ws.bid.fxRate).toFixed(4)}, ${ws.bid.fxRateDate?.slice(0, 10)})` : ""}</Pill>}
      </div>
      {submitted && !locked && <p style={{ margin: 0, fontSize: 13.5, ...muted }}>Your bid is sealed. Changing anything puts it back to draft, and you will need to submit again before the closing time.</p>}

      <Card title="Currency and validity">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 14 }}>
          {tenderCcy ? (
            <Field label="Currency of your prices" hint={`Prices must be given in ${tenderCcy}, the currency set by the tender owner. Any later conversion for reporting uses a daily reference rate and is indicative only, not a guaranteed or transaction rate.`}>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center" }}>{tenderCcy}</div>
            </Field>
          ) : (
            <Field label="Currency of your prices" hint="This tender has no currency set. Pick the currency of your prices.">
              <CurrencySelect value={ccy} onChange={(c) => { setCcy(c); setDirty(true); }} options={CURRENCY_OPTIONS} ariaLabel="Bid currency" />
            </Field>
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}><input type="checkbox" checked={valid} disabled={locked} onChange={(e) => { setValid(e.target.checked); setDirty(true); }} /> <span>My bid remains valid for {ws.tender.bidValidityDays ?? "the required number of"} days after the closing date.</span></label>
        </div>
      </Card>

      {ws.tender.allowTemplateSubmission && !locked && (
        <Card title="Prefer to work offline? Use the templates">
          <input ref={tplRef} type="file" hidden accept=".xlsx,.docx" onChange={(e) => onTemplate(e.target.files?.[0])} />
          <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>Download a locked template made from this tender's items and criteria, complete the shaded cells, and upload it. Your draft is filled in for you to check. Documents such as certificates are still uploaded below. You can mix the templates and the online form.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 14 }}>
            <div><strong style={{ fontSize: 14 }}>Financial offer (Excel)</strong><div style={{ display: "flex", gap: 8, marginTop: 6 }}><Button size="sm" variant="secondary" disabled={busy} onClick={() => getTemplate("financial")}>Download</Button><Button size="sm" variant="primary" disabled={busy} onClick={() => pickTemplate("financial")}>Upload completed</Button></div></div>
            {ws.tender.allowTextSubmission && <div><strong style={{ fontSize: 14 }}>Technical offer (Word)</strong><div style={{ display: "flex", gap: 8, marginTop: 6 }}><Button size="sm" variant="secondary" disabled={busy} onClick={() => getTemplate("technical")}>Download</Button><Button size="sm" variant="primary" disabled={busy} onClick={() => pickTemplate("technical")}>Upload completed</Button></div></div>}
          </div>
          {problems.length > 0 && (
            <div role="alert" style={{ marginTop: 14, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-critical)", fontSize: 13.5 }}>
              <strong>This file was not accepted, and your draft has not been changed.</strong> Please amend the following and upload it again:
              <ul style={{ margin: "6px 0" }}>{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
              If the problem persists, please use the online form on this page instead.
            </div>
          )}
        </Card>
      )}

      <Card title="Prices">
        {lines.map((l, i) => ({ l, i })).sort((a, b) => (a.l.lotNumber ?? 0) - (b.l.lotNumber ?? 0) || a.l.lineNumber - b.l.lineNumber).map(({ l, i }, pos, arr) => (
          <div key={l.tenderLineId} style={{ padding: "12px 0", borderTop: pos ? "1px solid var(--u-border)" : "none" }}>
            {l.lotNumber !== null && arr[pos - 1]?.l.lotNumber !== l.lotNumber && (() => {
              const inLot = lines.filter((x) => x.lotNumber === l.lotNumber); const allOut = inLot.every((x) => x.noBid);
              return (
                <div style={{ background: "var(--u-surface-sunken, rgba(127,127,127,0.08))", borderRadius: "var(--u-radius-md)", padding: "8px 12px", margin: "0 0 10px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>Lot {l.lotNumber}{l.lotTitle ? ` · ${l.lotTitle}` : ""} <span style={{ fontWeight: 400, ...muted }}>({inLot.length} item{inLot.length === 1 ? "" : "s"}; price all of them to bid for this lot)</span></strong>
                  <label style={{ display: "flex", gap: 6, fontSize: 13 }}><input type="checkbox" disabled={locked} checked={allOut} onChange={(e) => { setLines((ls) => ls.map((x) => (x.lotNumber === l.lotNumber ? { ...x, noBid: e.target.checked } : x))); setDirty(true); }} /> Not bidding for this lot</label>
                </div>
              );
            })()}
            <div style={{ fontSize: 14 }}><strong>{l.lineNumber}. {l.description}</strong> <span style={muted}>{l.quantity} {l.unit}{l.destinationCountryCode ? ` · to ${l.destinationCountryCode}` : ""}</span></div>
            <label style={{ display: "flex", gap: 6, fontSize: 13, margin: "6px 0" }}><input type="checkbox" disabled={locked} checked={l.noBid} onChange={(e) => upd(i, { noBid: e.target.checked })} /> I am not bidding for this item</label>
            {!l.noBid && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <Field label={`Unit price (${ccy || "currency"})`}><input type="number" min="0" step="0.0001" disabled={locked} style={inputStyle} value={l.unitPrice ?? ""} onChange={(e) => upd(i, { unitPrice: e.target.value })} /></Field>
                <Field label="Lead time (days)"><input type="number" min="0" disabled={locked} style={inputStyle} value={l.leadTimeDays ?? ""} onChange={(e) => upd(i, { leadTimeDays: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
                <Field label="Country of origin"><CountrySelect value={l.countryOfOrigin ?? ""} onChange={(c) => upd(i, { countryOfOrigin: c || null })} options={countries} /></Field>
                <Field label="Manufacturer (optional)"><input disabled={locked} style={inputStyle} value={l.manufacturerName ?? ""} onChange={(e) => upd(i, { manufacturerName: e.target.value })} /></Field>
              </div>
            )}
          </div>
        ))}
        <div style={{ borderTop: "1px solid var(--u-border)", paddingTop: 10, fontWeight: 600 }}>Total: {ccy} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
      </Card>

      <Card title="Your responses">
        <input ref={fileRef} type="file" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <p style={{ marginTop: 0, fontSize: 13, ...muted }}>Accepted files: {ws.tender.acceptedFileTypes ?? "any"}, up to {ws.tender.maxFileSizeMb ?? 25} MB each.</p>
        {ws.criteria.map((c) => (
          <div key={c.id} style={{ padding: "12px 0", borderTop: "1px solid var(--u-border)" }}>
            <div style={{ fontSize: 14 }}><strong>{c.title}</strong> {c.isMandatory ? <Pill tone="warning">Required</Pill> : <Pill>Optional</Pill>} <Pill tone="neutral">{c.kind === "GATE" ? "Pass or fail" : `${c.weight}%`}</Pill></div>
            {c.description && <div style={{ fontSize: 13, ...muted, margin: "4px 0" }}>{c.description}</div>}
            {c.responseFormat !== "UPLOAD" && ws.tender.allowTextSubmission && <textarea aria-label={`Answer: ${c.title}`} rows={4} disabled={locked} style={{ ...inputStyle, marginTop: 6 }} value={texts[c.id] ?? ""} onChange={(e) => { setTexts((t) => ({ ...t, [c.id]: e.target.value })); setDirty(true); }} />}
            {c.responseFormat !== "TEXT" && (
              <div style={{ marginTop: 8 }}>
                {c.files.map((f) => (
                  <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, padding: "3px 0" }}>
                    <button type="button" style={{ border: "none", background: "none", padding: 0, color: "var(--u-accent)", cursor: "pointer" }} onClick={async () => { const r = await apiClient.tenderBidFileUrl(id, f.id); window.open(r.downloadUrl, "_blank", "noopener"); }}>{f.fileName}</button>
                    {!locked && <button type="button" aria-label={`Remove ${f.fileName}`} style={{ border: "none", background: "none", cursor: "pointer", ...muted }} onClick={() => run(() => apiClient.removeTenderBidFile(id, f.id))}>✕</button>}
                  </div>
                ))}
                {!locked && <Button size="sm" variant="secondary" disabled={busy} onClick={() => pick(c.id)}>Upload a file</Button>}
              </div>
            )}
          </div>
        ))}
        <Field label="Anything else the evaluators should know (optional)" wide><textarea rows={3} disabled={locked} style={inputStyle} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} /></Field>
      </Card>

      <Card title="Before you submit">
        {ws.addenda.some((a) => a.requiresAcknowledgement && !a.acknowledged) && <p style={{ marginTop: 0, fontSize: 13.5 }}>Acknowledge addenda on the <Link href={`/discover/view?id=${id}`}>tender page</Link>.</p>}
        {ws.checklist.map((c, i) => <div key={i} style={{ fontSize: 14, padding: "3px 0" }}><span aria-hidden style={{ color: c.ok ? "var(--u-status-good-text)" : "var(--u-status-warning-text)", fontWeight: 700 }}>{c.ok ? "✓" : "○"}</span> {c.label}</div>)}
        {dirty && <p style={{ fontSize: 13, ...muted }}>You have unsaved changes. The checklist updates when you save.</p>}
        {!locked && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Button variant="secondary" disabled={busy} onClick={save}>Save draft</Button>
            <Button variant="primary" disabled={busy || (!dirty && !ws.canSubmit) || submitted && !dirty} onClick={submit}>{submitted ? "Re-submit bid" : "Submit bid"}</Button>
          </div>
        )}
      </Card>
    </Page>
  );
}
