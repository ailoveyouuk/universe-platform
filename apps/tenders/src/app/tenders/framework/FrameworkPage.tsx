"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CALL_OFF_STATUS_LABEL, type CallOffView, type FrameworkView, type MiniCompetitionView, type MiniInvitationView } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { emptyScheme, QuoteAssessment, ResponsesForm, SchemeEditor, SchemeSummary, draftFrom, schemeFormProblems, type ResponsesDraft } from "./QuoteScoringUi";
import { Card, ErrorNote, Field, Heading, Page, fmtDate, inputStyle } from "../../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const money = (n: number, c: string | null) => `${c ?? ""} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();
const tone = (s: string) => (s === "ACCEPTED" ? "good" : s === "DECLINED" || s === "CANCELLED" ? "critical" : "warning") as "good" | "critical" | "warning";

/** Framework agreement workspace: the price list and its hold period, price reviews, and call-offs. The owner sees every supplier; a supplier sees only its own. */
export function FrameworkPage() {
  const id = useSearchParams().get("id") ?? "";
  const [v, setV] = useState<FrameworkView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { if (id) apiClient.frameworkView(id).then(setV).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the framework.")); }, [id]);
  useEffect(load, [load]);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); load(); } catch (e) { setErr(e instanceof Error ? e.message : "That did not work."); } finally { setBusy(false); } };

  if (!v) return <Page><ErrorNote message={err} />{!err && <div style={muted}>Loading…</div>}</Page>;
  const owner = v.viewer.party === "OWNER";
  const t = v.tender;
  return (
    <Page>
      <Heading title={`Framework · ${t.referenceNumber}`} sub={t.title} actions={<Link href={owner ? `/tenders/manage?id=${t.id}` : `/bids/status?id=${t.id}`} style={{ textDecoration: "none" }}><Button variant="secondary">Back to tender</Button></Link>} />
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {t.termMonths && <Pill tone="neutral">{t.termMonths}-month term</Pill>}
        {t.method && <Pill tone="neutral">{t.method === "ROTATION" ? "Call-offs by rotation" : "Direct award to first-ranked supplier"}</Pill>}
        {t.priceHoldDays !== null && <Pill tone="neutral">Prices held {t.priceHoldDays} days from signature</Pill>}
        {owner && v.ceiling?.value != null && <Pill tone={v.ceiling.remaining! < 0 ? "critical" : "brand"}>Committed {money(v.ceiling.committed, t.currency)} of {money(v.ceiling.value, t.currency)}{v.ceiling.remaining! < 0 ? " (over the maximum)" : ""}</Pill>}
        {owner && v.ceiling?.value == null && v.ceiling && <Pill tone="neutral">Committed {money(v.ceiling.committed, t.currency)} (no maximum set)</Pill>}
        {!owner && v.committedToYou !== null && <Pill tone="brand">Orders placed with you: {money(v.committedToYou, t.currency)}</Pill>}
      </div>

      {owner && v.settings && <ApprovalLimit v={v} act={act} busy={busy} />}

      {v.contracts.length === 0 && <Card><p style={{ margin: 0, ...muted }}>{owner ? "There is no framework agreement yet. Agreements start from the contract on the tender once it is awarded and signed." : "You have no agreement on this framework."}</p></Card>}
      {v.contracts.map((c) => <Agreement key={c.contractId} v={v} c={c} owner={owner} act={act} busy={busy} />)}

      {owner && v.contracts.some((c) => c.status === "ACTIVE") && <RaiseCallOff v={v} act={act} busy={busy} onWarn={setWarn} />}
      {owner && v.contracts.filter((c) => c.status === "ACTIVE").length >= 2 && <RunCompetition v={v} act={act} busy={busy} />}
      {owner && v.miniCompetitions.length > 0 && <Card title={`Mini-competitions (${v.miniCompetitions.length})`}>{v.miniCompetitions.map((m) => <Competition key={m.id} m={m} currency={t.currency} act={act} busy={busy} onWarn={setWarn} />)}</Card>}
      {!owner && v.invitations.length > 0 && <Card title={`Invitations to quote (${v.invitations.length})`}>{v.invitations.map((i) => <Invitation key={i.id} i={i} currency={t.currency} act={act} busy={busy} />)}</Card>}
      {warn.length > 0 && <div role="status" style={{ padding: "10px 14px", border: "1px solid var(--u-status-warning)", borderRadius: "var(--u-radius-md)", fontSize: 13.5 }}>{warn.map((w, i) => <div key={i}>{w}</div>)}</div>}

      <Card title={`Call-offs (${v.callOffs.length})`}>
        {v.callOffs.length === 0 ? <p style={{ margin: 0, ...muted }}>None yet.</p> : v.callOffs.map((c) => <CallOff key={c.id} c={c} owner={owner} act={act} busy={busy} />)}
      </Card>

      {v.priceReviews.length > 0 && <Card title="Price reviews">
        {v.priceReviews.map((r) => (
          <div key={r.id} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5 }}>
            <strong>{r.description}</strong>: {r.previousPrice} to {r.proposedPrice} <Pill tone={r.status === "ACCEPTED" ? "good" : r.status === "REJECTED" ? "critical" : "warning"}>{r.status.toLowerCase()}</Pill> <span style={muted}>· {r.byYou ? "proposed by you" : "proposed by the other party"} · {fmtDate(r.createdAt)}</span>
            <div style={muted}>{r.reason}{r.responseNote ? ` · Answer: ${r.responseNote}` : ""}</div>
            {r.status === "PROPOSED" && !r.byYou && <span style={{ display: "inline-flex", gap: 8, marginTop: 6 }}><Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => apiClient.respondPriceReview(r.id, true))}>Accept</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.respondPriceReview(r.id, false))}>Reject</Button></span>}
          </div>))}
      </Card>}
    </Page>
  );
}

function ApprovalLimit({ v, act, busy }: { v: FrameworkView; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean }) {
  const s = v.settings!;
  const [limit, setLimit] = useState(String(s.individualLimit)); const [days, setDays] = useState(String(s.splitWindowDays));
  const [ccy, setCcy] = useState(s.limitCurrency ?? "");
  const [rows, setRows] = useState<{ roleId: string; limit: string }[]>(s.roleLimits.map((r) => ({ roleId: r.roleId, limit: String(r.limit) })));
  const unit = ccy.trim().toUpperCase() || v.tender.currency || "tender currency";
  const used = new Set(rows.map((r) => r.roleId));
  const spare = s.availableRoles.filter((r) => !used.has(r.id));
  const bad = limit === "" || Number(limit) < 0 || Number(days) < 1 || (ccy.trim() !== "" && !/^[A-Za-z]{3}$/.test(ccy.trim())) || rows.some((r) => r.limit === "" || Number(r.limit) < 0);
  return (
    <Card title="Approval limits" action={<Pill tone={s.confirmed ? "good" : "warning"}>{s.confirmed ? "Set by your organisation" : "Default, not yet confirmed"}</Pill>}>
      <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>A person can authorise alone up to their limit: the highest limit among the roles they hold, otherwise the default. Above it, a call-off needs a second and different authoriser who also has the authority, and awards and contracts must be done by someone with a high enough limit. Recent call-offs to the same supplier count together, so an order cannot be split to stay under the limit. Limits in a different currency from the tender are converted at the day&apos;s rate. You currently have a limit of {s.yourLimit.toLocaleString()}.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "end" }}>
        <Field label={`Default limit (${unit})`}><input type="number" min={0} style={inputStyle} value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
        <Field label="Limits are written in (currency code, optional)"><input maxLength={3} placeholder={v.tender.currency ?? "GBP"} aria-label={v.tender.currency ?? "GBP"} style={inputStyle} value={ccy} onChange={(e) => setCcy(e.target.value.toUpperCase())} /></Field>
        <Field label="Count recent orders to the same supplier over (days)"><input type="number" min={1} max={365} style={inputStyle} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 14, fontWeight: 600, fontSize: 13.5 }}>Limits by role</div>
      {rows.length === 0 && <div style={{ ...muted, fontSize: 13, margin: "4px 0 8px" }}>No role limits. Everyone uses the default.</div>}
      {rows.map((r, i) => (
        <div key={r.roleId} style={{ display: "flex", gap: 10, alignItems: "center", margin: "6px 0", flexWrap: "wrap" }}>
          <span style={{ minWidth: 180 }}>{s.availableRoles.find((x) => x.id === r.roleId)?.name ?? "Role"}</span>
          <input aria-label="Limit for this role" type="number" min={0} style={{ ...inputStyle, maxWidth: 160 }} value={r.limit} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, limit: e.target.value } : x)))} />
          <span style={muted}>{unit}</span>
          <Button size="sm" variant="secondary" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</Button>
        </div>
      ))}
      {spare.length > 0 && (
        <div style={{ margin: "8px 0" }}>
          <select aria-label="Add a role limit" style={inputStyle} value="" onChange={(e) => e.target.value && setRows([...rows, { roleId: e.target.value, limit: limit }])}>
            <option value="">Add a limit for a role…</option>
            {spare.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}
      <div style={{ marginTop: 10 }}><Button variant="secondary" disabled={busy || bad} onClick={() => act(() => apiClient.saveFrameworkSettings({ individualLimit: Number(limit), splitWindowDays: Number(days), limitCurrency: ccy.trim().toUpperCase(), roleLimits: rows.map((r) => ({ roleId: r.roleId, limit: Number(r.limit) })) }))}>{s.confirmed ? "Save" : "Confirm limits"}</Button></div>
    </Card>
  );
}

function Agreement({ v, c, owner, act, busy }: { v: FrameworkView; c: FrameworkView["contracts"][number]; owner: boolean; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean }) {
  const [edit, setEdit] = useState<string | null>(null); const [price, setPrice] = useState(""); const [reason, setReason] = useState("");
  return (
    <Card title={`${owner ? `${c.supplierName} · ` : ""}${c.reference}`} action={<Pill tone={c.status === "ACTIVE" ? "good" : "neutral"}>{c.status.toLowerCase().replace("_", " ")}</Pill>}>
      <div style={{ fontSize: 13.5, ...muted, marginBottom: 8 }}>
        {c.endDate ? `Runs to ${fmtDate(c.endDate)}. ` : ""}{c.executedAt ? (c.holdActive ? `Prices are held until ${fmtDate(c.holdEndsAt)}.` : `The price-hold period ended on ${fmtDate(c.holdEndsAt)}. Either side can propose a change to specific items.`) : "Prices are held from signature."}
        {owner && c.rank !== null ? ` Rank ${c.rank}.` : ""} {c.callOffCount} open call-off{c.callOffCount === 1 ? "" : "s"}.
      </div>
      {c.performance.placed > 0 && (
        <div style={{ fontSize: 13.5, padding: "8px 12px", margin: "0 0 8px", background: "var(--u-surface-subtle, rgba(0,0,0,0.03))", borderRadius: "var(--u-radius-md)" }}>
          <strong>Call-off performance so far:</strong> {c.performance.placed} placed, {c.performance.accepted} accepted, {c.performance.declined} declined{c.performance.cancelled ? `, ${c.performance.cancelled} cancelled` : ""}{c.performance.awaiting ? `, ${c.performance.awaiting} waiting` : ""}
          {c.performance.acceptedShare !== null && ` · ${c.performance.acceptedShare}% of answered call-offs accepted`}{c.performance.avgResponseHours !== null && ` · answered in ${c.performance.avgResponseHours} h on average`} · {money(c.performance.valueAccepted, v.tender.currency)} accepted · {c.performance.projects} delivery project{c.performance.projects === 1 ? "" : "s"}
          {owner && (c.performance.onTimePercent !== null || c.performance.inFullPercent !== null) && <> · delivered on time {c.performance.onTimePercent ?? "n/a"}%, in full {c.performance.inFullPercent ?? "n/a"}% ({c.performance.deliveriesMeasured} lines measured)</>}
          <div style={muted}>These roll up into the agreement's performance record when it is closed.</div>
        </div>)}
      {c.items.map((it) => (
        <div key={it.tenderLineId} style={{ padding: "6px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>{it.lotNumber ? `Lot ${it.lotNumber} · ` : ""}{it.lineNumber}. {it.description}</span>
            <span><strong>{it.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong> {v.tender.currency}{it.unit ? ` per ${it.unit}` : ""}{it.price !== it.bidPrice && <span style={muted}> (bid {it.bidPrice})</span>} {it.reviewPending && <Pill tone="warning">review pending</Pill>}
              {c.status === "ACTIVE" && !c.holdActive && !it.reviewPending && <> <Button size="sm" variant="secondary" onClick={() => { setEdit(it.tenderLineId); setPrice(String(it.price)); setReason(""); }}>Propose change</Button></>}</span>
          </div>
          {edit === it.tenderLineId && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <input aria-label="Proposed unit price" type="number" min={0} step="0.0001" style={{ ...inputStyle, width: 140 }} value={price} onChange={(e) => setPrice(e.target.value)} />
              <input aria-label="Reason for the price change" style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Reason (for example input costs)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button size="sm" variant="primary" disabled={busy || !reason.trim() || !(Number(price) > 0)} onClick={() => act(async () => { await apiClient.proposePriceReview(c.contractId, { tenderLineId: it.tenderLineId, proposedPrice: Number(price), reason }); setEdit(null); })}>Send</Button>
              <Button size="sm" variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

function RaiseCallOff({ v, act, busy, onWarn }: { v: FrameworkView; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean; onWarn: (w: string[]) => void }) {
  const items = [...new Map(v.contracts.filter((c) => c.status === "ACTIVE").flatMap((c) => c.items).map((i) => [i.tenderLineId, i])).values()].sort((a, b) => a.lineNumber - b.lineNumber);
  const [qty, setQty] = useState<Record<string, string>>({}); const [notes, setNotes] = useState(""); const [by, setBy] = useState("");
  const chosen = items.filter((i) => Number(qty[i.tenderLineId]) > 0);
  return (
    <Card title="Raise a call-off">
      <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>Enter the quantity of each item you need. The supplier is chosen {v.tender.method === "ROTATION" ? "by rotation (the supplier with the fewest call-offs)" : "by rank (the first-ranked supplier for those items)"}, and the price is the agreed price shown above.</p>
      {items.map((i) => <div key={i.tenderLineId} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13.5 }}><span style={{ flex: 1 }}>{i.lineNumber}. {i.description}</span><input aria-label={`Quantity of item ${i.lineNumber}`} type="number" min={0} style={{ ...inputStyle, width: 110 }} value={qty[i.tenderLineId] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [i.tenderLineId]: e.target.value }))} /></div>)}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
        <Field label="Needed by (optional)"><input type="date" style={inputStyle} value={by} onChange={(e) => setBy(e.target.value)} /></Field>
        <Field label="Notes (optional)"><input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></Field>
      </div>
      <div style={{ marginTop: 12 }}><Button variant="primary" disabled={busy || chosen.length === 0} onClick={() => act(async () => { const r = await apiClient.raiseCallOff(v.tender.id, { lines: chosen.map((i) => ({ tenderLineId: i.tenderLineId, quantity: Number(qty[i.tenderLineId]) })), requiredBy: by || undefined, notes: notes || undefined }); onWarn(r.warnings); setQty({}); setNotes(""); setBy(""); })}>Raise call-off</Button></div>
    </Card>
  );
}

function CallOff({ c, owner, act, busy }: { c: CallOffView; owner: boolean; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span><strong>{c.reference}</strong> · {owner ? `${c.supplierName} · ` : ""}{money(c.totalValue, c.currency)} <Pill tone={tone(c.status)}>{CALL_OFF_STATUS_LABEL[c.status]}</Pill> {c.ceilingExceeded && <Pill tone="critical">Over the maximum value</Pill>}</span>
        <span style={muted}>{c.method === "ROTATION" ? "Rotation" : c.method === "MINI_COMPETITION" ? "Mini-competition" : "Direct award"}{c.requiredBy ? ` · needed by ${fmtDate(c.requiredBy)}` : ""}{c.raisedBy ? ` · raised by ${c.raisedBy}` : ""}</span>
      </div>
      {c.lines.map((l) => <div key={l.tenderLineId} style={muted}>{l.description}: {l.quantity} × {l.unitPrice} = {l.lineTotal.toLocaleString()}</div>)}
      {c.notes && <div style={muted}>Notes: {c.notes}</div>}
      {c.requiresSecondApproval && <div style={muted}>Above the approval limit (value counted with recent orders: {money(c.testedValue, c.currency)}). {c.secondApprovedAt ? "Second authorisation given." : "Needs a second, different authoriser."}</div>}
      {c.declineReason && <div style={muted}>Declined: {c.declineReason}</div>}
      {c.rejectedReason && <div style={muted}>Cancelled: {c.rejectedReason}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
        {owner && c.canApprove && <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => apiClient.approveCallOff(c.id))}>Give second authorisation</Button>}
        {owner && (c.status === "PENDING_APPROVAL" || c.status === "AWAITING_SUPPLIER") && <>
          <input aria-label="Reason" style={{ ...inputStyle, width: 220 }} placeholder="Reason (to cancel)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => act(() => c.status === "PENDING_APPROVAL" && c.canApprove ? apiClient.rejectCallOff(c.id, reason) : apiClient.cancelCallOff(c.id, reason))}>{c.status === "PENDING_APPROVAL" && c.canApprove ? "Do not approve" : "Cancel call-off"}</Button></>}
        {!owner && c.status === "AWAITING_SUPPLIER" && <>
          <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => apiClient.respondCallOff(c.id, true))}>Accept</Button>
          <input aria-label="Reason for declining" style={{ ...inputStyle, width: 220 }} placeholder="Reason (to decline)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => act(() => apiClient.respondCallOff(c.id, false, reason))}>Decline</Button></>}
        {!owner && c.status === "ACCEPTED" && !c.supplierProjectId && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.createCallOffProject(c.id))}>Create delivery project</Button>}
        {!owner && c.supplierProjectId && <Pill tone="good">Delivery project created</Pill>}
      </div>
    </div>
  );
}

const when = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const qTone = (s: string) => (s === "WON" ? "good" : s === "DECLINED" || s === "LOST" || s === "CANCELLED" ? "critical" : s === "QUOTED" ? "brand" : "warning") as "good" | "critical" | "warning" | "brand";

/** Owner: invite every framework supplier that covers the chosen items to quote at or below their framework prices. */
function RunCompetition({ v, act, busy }: { v: FrameworkView; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean }) {
  const items = [...new Map(v.contracts.filter((c) => c.status === "ACTIVE").flatMap((c) => c.items).map((i) => [i.tenderLineId, i])).values()].sort((a, b) => a.lineNumber - b.lineNumber);
  const [qty, setQty] = useState<Record<string, string>>({}); const [notes, setNotes] = useState(""); const [by, setBy] = useState(""); const [closes, setCloses] = useState("");
  const [judged, setJudged] = useState(false); const [scheme, setScheme] = useState(emptyScheme());
  const chosen = items.filter((i) => Number(qty[i.tenderLineId]) > 0);
  return (
    <Card title="Run a mini-competition">
      <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>Ask every framework supplier that covers all the items you choose (at least two) to quote. Each can match its agreed price or go lower, never higher. Quotes stay sealed from you until the closing time (or until you close quoting early), then you choose a winner and record why.</p>
      {items.map((i) => <div key={i.tenderLineId} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13.5 }}><span style={{ flex: 1 }}>{i.lineNumber}. {i.description}</span><input aria-label={`Competition quantity of item ${i.lineNumber}`} type="number" min={0} style={{ ...inputStyle, width: 110 }} value={qty[i.tenderLineId] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [i.tenderLineId]: e.target.value }))} /></div>)}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
        <Field label="Quotes close at"><input type="datetime-local" style={inputStyle} value={closes} onChange={(e) => setCloses(e.target.value)} /></Field>
        <Field label="Needed by (optional)"><input type="date" style={inputStyle} value={by} onChange={(e) => setBy(e.target.value)} /></Field>
        <Field label="Notes for suppliers (optional)"><input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></Field>
      </div>
      <label style={{ display: "block", marginTop: 12, fontSize: 13.5 }}><input type="checkbox" checked={judged} onChange={(e) => setJudged(e.target.checked)} /> Judge quotes on more than price (lead time, quality, requirements, similar contracts, references)</label>
      {judged && <SchemeEditor scheme={scheme} onChange={setScheme} />}
      <div style={{ marginTop: 12 }}><Button variant="primary" disabled={busy || chosen.length === 0 || !closes || (judged && schemeFormProblems(scheme).length > 0)} onClick={() => act(async () => { await apiClient.openMiniCompetition(v.tender.id, { lines: chosen.map((i) => ({ tenderLineId: i.tenderLineId, quantity: Number(qty[i.tenderLineId]) })), closesAt: new Date(closes).toISOString(), requiredBy: by || undefined, notes: notes || undefined, scheme: judged ? scheme : undefined }); setJudged(false); setScheme(emptyScheme()); setQty({}); setNotes(""); setBy(""); setCloses(""); })}>Invite suppliers to quote</Button></div>
    </Card>
  );
}

function Competition({ m, currency, act, busy, onWarn }: { m: MiniCompetitionView; currency: string | null; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean; onWarn: (w: string[]) => void }) {
  const [reason, setReason] = useState(""); const [pick, setPick] = useState("");
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span><strong>{m.reference}</strong> <Pill tone={m.status === "AWARDED" ? "good" : m.status === "CANCELLED" ? "critical" : m.sealed ? "warning" : "brand"}>{m.status === "OPEN" ? (m.sealed ? "Quoting open, sealed" : "Quoting closed") : m.status.toLowerCase()}</Pill></span>
        <span style={muted}>{m.sealed ? `Closes ${when(m.closesAt)}` : `Closed ${when(m.closesAt)}`} · {m.invited} invited · {m.quotesReceived} quote{m.quotesReceived === 1 ? "" : "s"} received</span>
      </div>
      {m.lines.map((l) => <div key={l.tenderLineId} style={muted}>{l.description}: {l.quantity}</div>)}
      {m.scheme && <SchemeSummary scheme={m.scheme} />}
      {m.sealed && <div style={muted}>Quotes are sealed until the closing time. You can see how many have arrived, not who or what they are.</div>}
      {!m.sealed && m.quotes.map((q) => (
        <div key={q.id} style={{ padding: "6px 0", borderTop: "1px dotted var(--u-border)" }}>
          {m.status === "OPEN" && q.status === "QUOTED" && (!m.scheme || (q.ranking?.eligible && q.ranking.manualMissing.length === 0)) && <label style={{ marginRight: 8 }}><input type="radio" name={`pick-${m.id}`} checked={pick === q.id} onChange={() => setPick(q.id)} /> </label>}
          <strong>{q.supplierName}</strong> <Pill tone={qTone(q.status)}>{q.status === "INVITED" ? "no answer" : q.status.toLowerCase()}</Pill> {q.totalValue != null && <strong>{money(q.totalValue, currency)}</strong>}
          {q.lines.filter((l) => l.quotedPrice != null).map((l) => <div key={l.tenderLineId} style={muted}>{l.description}: {l.quotedPrice} (framework {l.frameworkPrice}){l.leadTimeDays != null ? ` · ${l.leadTimeDays} days` : ""}</div>)}
          {m.scheme && q.status !== "DECLINED" && q.status !== "INVITED" && <QuoteAssessment scheme={m.scheme} responses={q.responses} scores={q.scores} ranking={q.ranking} canScore={m.status === "OPEN"} busy={busy} onScore={(criterion, score, reason) => act(() => apiClient.scoreMiniQuote(q.id, { criterion, score, reason }))} />}
          {q.quoteNotes && <div style={muted}>Note: {q.quoteNotes}</div>}{q.declineReason && <div style={muted}>Declined: {q.declineReason}</div>}
        </div>))}
      {m.awardReason && <div style={muted}>Why the winner was chosen: {m.awardReason}</div>}{m.cancelReason && <div style={muted}>Cancelled: {m.cancelReason}</div>}
      {m.status === "OPEN" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
        {m.sealed && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.closeMiniCompetition(m.id))}>Close quoting now</Button>}
        <input aria-label="Reason" style={{ ...inputStyle, width: 260 }} placeholder={m.canAward ? "Why this supplier won (recorded)" : "Reason (to cancel)"} value={reason} onChange={(e) => setReason(e.target.value)} />
        {m.canAward && <Button size="sm" variant="primary" disabled={busy || !pick || reason.trim().length < 5} onClick={() => act(async () => { const r = await apiClient.awardMiniCompetition(m.id, { quoteId: pick, reason }); onWarn(r.warnings); })}>Award the call-off</Button>}
        <Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => act(() => apiClient.cancelMiniCompetition(m.id, reason))}>Cancel competition</Button>
      </div>}
    </div>
  );
}

/** Supplier: its own invitation only. Quote at or below the framework price for every item before the deadline; it can be replaced until then. */
function Invitation({ i, currency, act, busy }: { i: MiniInvitationView; currency: string | null; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean }) {
  const [price, setPrice] = useState<Record<string, string>>(() => Object.fromEntries(i.lines.map((l) => [l.tenderLineId, l.quotedPrice != null ? String(l.quotedPrice) : ""])));
  const [lead, setLead] = useState<Record<string, string>>(() => Object.fromEntries(i.lines.map((l) => [l.tenderLineId, l.leadTimeDays != null ? String(l.leadTimeDays) : ""])));
  const [notes, setNotes] = useState(i.quoteNotes ?? ""); const [reason, setReason] = useState("");
  const [draft, setDraft] = useState<ResponsesDraft | null>(() => (i.scheme ? draftFrom(i.scheme, i.responses) : null));
  const needLead = !!i.scheme && i.scheme.weights.leadTime > 0;
  const ready = i.lines.every((l) => Number(price[l.tenderLineId]) > 0 && Number(price[l.tenderLineId]) <= l.frameworkPrice && (!needLead || lead[l.tenderLineId] !== ""));
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--u-border)", fontSize: 13.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span><strong>{i.reference}</strong> <Pill tone={qTone(i.status)}>{i.status === "INVITED" ? "awaiting your quote" : i.status.toLowerCase()}</Pill> {i.totalValue != null && <strong>{money(i.totalValue, currency)}</strong>}</span>
        <span style={muted}>{i.open ? `Closes ${when(i.closesAt)}` : `Closed ${when(i.closesAt)}`}{i.requiredBy ? ` · needed by ${fmtDate(i.requiredBy)}` : ""}</span>
      </div>
      {i.requestNotes && <div style={muted}>Notes from the buyer: {i.requestNotes}</div>}
      {i.scheme && <SchemeSummary scheme={i.scheme} />}
      {i.lines.map((l) => (
        <div key={l.tenderLineId} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
          <span style={{ flex: 1, minWidth: 200 }}>{l.description}: {l.quantity} <span style={muted}>(your framework price {l.frameworkPrice})</span></span>
          {i.open ? <>
            <input aria-label={`Quote for ${l.description}`} type="number" min={0} step="0.0001" max={l.frameworkPrice} style={{ ...inputStyle, width: 120 }} value={price[l.tenderLineId] ?? ""} onChange={(e) => setPrice((p) => ({ ...p, [l.tenderLineId]: e.target.value }))} />
            <input aria-label={`Lead time in days for ${l.description}`} type="number" min={0} style={{ ...inputStyle, width: 110 }} placeholder={needLead ? "Days (required)" : "Days (optional)"} value={lead[l.tenderLineId] ?? ""} onChange={(e) => setLead((p) => ({ ...p, [l.tenderLineId]: e.target.value }))} />
          </> : <span>{l.quotedPrice ?? "no quote"}</span>}
        </div>))}
      {i.open && i.scheme && draft && <ResponsesForm scheme={i.scheme} draft={draft} onChange={setDraft} />}
      {i.open && <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
          <input aria-label="Quote notes" style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          <Button size="sm" variant="primary" disabled={busy || !ready} onClick={() => act(() => apiClient.submitMiniQuote(i.id, { lines: i.lines.map((l) => ({ tenderLineId: l.tenderLineId, quotedPrice: Number(price[l.tenderLineId]), leadTimeDays: lead[l.tenderLineId] ? Number(lead[l.tenderLineId]) : undefined })), notes: notes || undefined, responses: draft ?? undefined }))}>{i.status === "QUOTED" ? "Replace my quote" : "Submit quote"}</Button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
          <input aria-label="Reason for not quoting" style={{ ...inputStyle, width: 260 }} placeholder="Reason (to decline to quote)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => act(() => apiClient.declineMiniQuote(i.id, reason))}>Decline to quote</Button>
        </div>
      </>}
      {i.declineReason && <div style={muted}>You declined: {i.declineReason}</div>}
    </div>
  );
}
