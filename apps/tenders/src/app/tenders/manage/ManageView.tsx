"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { TenderDetailForIssuer, TenderStatus } from "@universe/types";
import { AlertIcon, Button, CalendarIcon, CheckCircleIcon, ClockIcon, GridIcon, Pill, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { tenderTiles } from "../../../lib/stageTiles";
import { Card, EVENT_LABEL, ErrorNote, Field, Heading, Page, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, VISIBILITY_LABEL, fmtDate, fmtDateTime, fromLocalInput, inputStyle, toLocalInput } from "../../../lib/ui";
import { Invitations, describeRule } from "../builder/BuilderView";

type Tab = "summary" | "participants" | "timeline";
const ICONS: Record<string, React.ReactNode> = { closes: <CalendarIcon size={18} />, interest: <GridIcon size={18} />, invited: <CheckCircleIcon size={18} />, clar: <ClockIcon size={18} />, lines: <GridIcon size={18} />, eval: <ClockIcon size={18} />, award: <CalendarIcon size={18} />, criteria: <CheckCircleIcon size={18} /> };

/** An issuer's page for a published tender (2026-10-19): stage tiles, details, who is interested, and the audit timeline. */
export function ManageView() {
  const id = useSearchParams()?.get("id") ?? "";
  const [d, setD] = useState<TenderDetailForIssuer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("summary");

  const load = useCallback(async () => {
    try { const x = await apiClient.getMyTender(id); if (x.tender.status === "DRAFT") { window.location.href = `/tenders/builder?id=${id}`; return; } setD(x); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not load the tender."); }
  }, [id]);
  useEffect(() => { if (id) void load(); }, [id, load]);

  if (!id) return <Page><ErrorNote message="No tender selected." /></Page>;
  if (!d) return <Page><ErrorNote message={err} />{!err && <div style={{ color: "var(--u-ink-secondary)" }}>Loading…</div>}</Page>;
  const t = d.tender; const st = (t.effectiveStatus ?? t.status) as TenderStatus;
  const tiles = tenderTiles(d, st);

  return (
    <Page>
      <Heading
        title={`${t.referenceNumber} ${t.title}`}
        sub={<span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Pill tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Pill>{TYPE_LABEL[t.tenderType]} · Closes {fmtDateTime(t.closingAt)}{t.isSimulated && <Pill>Simulated</Pill>}</span>}
        actions={<Link href="/tenders" style={{ textDecoration: "none" }}><Button variant="ghost">All tenders</Button></Link>}
      />
      <ErrorNote message={err} />
      {st === "CANCELLED" && t.cancelledReason && <Card><strong>Cancelled.</strong> {t.cancelledReason}</Card>}
      {tiles.length > 0 && <StatTileGrid>{tiles.map((x) => <StatTile key={x.key} label={x.label} value={x.value} icon={ICONS[x.key] ?? <AlertIcon size={18} />} tone={x.tone} note={x.note} indicator={x.indicator} />)}</StatTileGrid>}

      <div style={{ display: "flex", gap: 6 }}>
        {([["summary", "Summary"], ["participants", `Participants (${d.participants.length})`], ["timeline", "Timeline"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}><Pill tone={tab === k ? "brand" : "neutral"}>{label}</Pill></button>
        ))}
      </div>

      {tab === "summary" && (
        <>
          {st === "PUBLISHED" && <Dates d={d} onSaved={load} />}
          <Card title="Details">
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: 0, fontSize: 13.5 }}>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Visibility</dt><dd style={{ margin: 0 }}>{t.isSimulated ? "Simulated: only invited demonstration organisations can see it" : VISIBILITY_LABEL[t.visibility]}</dd>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Published</dt><dd style={{ margin: 0 }}>{fmtDateTime(t.publishedAt)}</dd>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Questions close</dt><dd style={{ margin: 0 }}>{fmtDateTime(t.clarificationDeadline)}</dd>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Evaluation due</dt><dd style={{ margin: 0 }}>{fmtDate(t.evaluationDueAt)}</dd>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Award due</dt><dd style={{ margin: 0 }}>{fmtDate(t.awardDueAt)}</dd>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Delivery countries</dt><dd style={{ margin: 0 }}>{(t.deliveryCountryCodes ?? "").split(",").filter(Boolean).join(", ") || "Not set"}</dd>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Bid format</dt><dd style={{ margin: 0 }}>{t.acceptedFileTypes ?? "any"} up to {t.maxFileSizeMb ?? 25} MB{t.allowTextSubmission ? ", typed answers allowed" : ""}</dd>
            </dl>
            {t.summary && <p style={{ lineHeight: 1.55, fontSize: 14, marginBottom: 0 }}>{t.summary}</p>}
          </Card>
          <Card title={`Items (${d.lines.length})`}>
            {d.lines.map((l, i) => <div key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 13.5 }}><strong>{l.description}</strong> <span style={{ color: "var(--u-ink-secondary)" }}>{[l.quantity && `${l.quantity} ${l.unit ?? ""}`.trim(), l.destinationCountryCode, l.requiredRegistration, l.coldChainRequired && "cold chain"].filter(Boolean).join(" · ")}</span></div>)}
          </Card>
          <Card title="Criteria and eligibility">
            {d.criteria.map((c, i) => <div key={i} style={{ fontSize: 13.5, padding: "4px 0" }}>{c.kind === "GATE" ? <Pill>Gate</Pill> : <Pill tone="brand">{Number(c.weight)}%</Pill>} {c.title}</div>)}
            <div style={{ marginTop: 12, borderTop: "1px solid var(--u-border)", paddingTop: 12, fontSize: 13.5 }}>{d.rules.length === 0 ? "No eligibility rules: every registered organisation may bid." : d.rules.map((r, i) => <div key={i} style={{ padding: "3px 0" }}>{r.isRequired ? "Required: " : "Advisory: "}{describeRule(r)}</div>)}</div>
          </Card>
          {["PUBLISHED"].includes(st) && <Cancel id={t.id} onDone={load} />}
        </>
      )}

      {tab === "participants" && (
        <>
          <Card title="Organisations that have expressed interest">
            {d.participants.length === 0 ? <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>None yet. Eligible organisations see this tender in their list; invite more below.</p> : d.participants.map((p, i) => <div key={p.organizationId} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14 }}><strong>{p.organizationName ?? "Organisation"}</strong><span style={{ color: "var(--u-ink-secondary)" }}>Interested {fmtDate(p.optedInAt)}</span></div>)}
          </Card>
          {st === "PUBLISHED" && <Invitations detail={d} onSaved={load} />}
        </>
      )}

      {tab === "timeline" && (
        <Card title="Timeline">
          <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13.5 }}>An append-only record of what happened on this tender. Entries cannot be edited or removed.</p>
          {d.events.map((e, i) => <div key={e.id} style={{ display: "grid", gridTemplateColumns: "150px 150px 1fr", gap: 12, padding: "9px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 13.5 }}><span style={{ color: "var(--u-ink-secondary)" }}>{fmtDateTime(e.createdAt)}</span><span><Pill>{EVENT_LABEL[e.kind] ?? e.kind}</Pill></span><span>{e.summary}</span></div>)}
        </Card>
      )}
      
    </Page>
  );
}

function Dates({ d, onSaved }: { d: TenderDetailForIssuer; onSaved: () => void }) {
  const t = d.tender;
  const [v, setV] = useState({ closingAt: toLocalInput(t.closingAt), clarificationDeadline: toLocalInput(t.clarificationDeadline), evaluationDueAt: toLocalInput(t.evaluationDueAt), awardDueAt: toLocalInput(t.awardDueAt) });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null); setNote(null);
    try { await apiClient.updateTender(t.id, { closingAt: fromLocalInput(v.closingAt) ?? undefined, clarificationDeadline: fromLocalInput(v.clarificationDeadline) ?? undefined, evaluationDueAt: fromLocalInput(v.evaluationDueAt) ?? undefined, awardDueAt: fromLocalInput(v.awardDueAt) ?? undefined }); setNote("Dates updated. Interested organisations are told if the closing date moved."); onSaved(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not update."); } finally { setBusy(false); }
  }
  return (
    <Card title="Dates">
      <ErrorNote message={err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Field label="Closing date" hint="Can only be moved later."><input type="datetime-local" style={inputStyle} value={v.closingAt} onChange={(e) => setV({ ...v, closingAt: e.target.value })} /></Field>
        <Field label="Questions close"><input type="datetime-local" style={inputStyle} value={v.clarificationDeadline} onChange={(e) => setV({ ...v, clarificationDeadline: e.target.value })} /></Field>
        <Field label="Evaluation due"><input type="datetime-local" style={inputStyle} value={v.evaluationDueAt} onChange={(e) => setV({ ...v, evaluationDueAt: e.target.value })} /></Field>
        <Field label="Award due"><input type="datetime-local" style={inputStyle} value={v.awardDueAt} onChange={(e) => setV({ ...v, awardDueAt: e.target.value })} /></Field>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Update dates"}</Button>{note && <span style={{ fontSize: 13, color: "var(--u-status-good)" }}>{note}</span>}</div>
    </Card>
  );
}

function Cancel({ id, onDone }: { id: string; onDone: () => void }) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function go() { setBusy(true); setErr(null); try { await apiClient.cancelTender(id, reason.trim()); onDone(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not cancel."); setBusy(false); } }
  if (!open) return <div><Button variant="danger" onClick={() => setOpen(true)}>Cancel this tender</Button></div>;
  return (
    <Card title="Cancel tender">
      <ErrorNote message={err} />
      <p style={{ marginTop: 0, fontSize: 13.5, color: "var(--u-ink-secondary)" }}>Interested organisations are told and shown your reason. This cannot be undone.</p>
      <Field label="Reason"><textarea style={{ ...inputStyle, minHeight: 70 }} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Button variant="danger" disabled={!reason.trim() || busy} onClick={go}>{busy ? "Cancelling…" : "Cancel tender"}</Button><Button variant="ghost" onClick={() => setOpen(false)}>Keep tender</Button></div>
    </Card>
  );
}
