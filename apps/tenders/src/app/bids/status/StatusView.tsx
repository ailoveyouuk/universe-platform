"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { TenderStatusView } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { ContractsPanel } from "../../../components/ContractPanel";
import { Card, ErrorNote, Heading, Page, fmtDateTime, inputStyle } from "../../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const OUTCOME = { AWARDED: "Awarded", NOT_AWARDED: "Not awarded", NOT_COMPLIANT: "Not compliant" } as const;

function span(ms: number): string {
  const m = Math.floor(Math.abs(ms) / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d} day${d === 1 ? "" : "s"} ${h} h` : h > 0 ? `${h} h ${m % 60} min` : `${m} min`;
}

/** What a bidder may see about a tender after bidding: milestones and counts for everyone, scores and feedback only for their own bid. */
export function StatusView() {
  const id = useSearchParams().get("id") ?? "";
  const [s, setS] = useState<TenderStatusView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [body, setBody] = useState(""); const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const load = useCallback(() => { if (id) apiClient.tenderStatus(id).then(setS).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the status.")); }, [id]);
  useEffect(load, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!s) return <Page><ErrorNote message={err} />{!err && <div style={muted}>Loading…</div>}</Page>;
  const t = s.tender, my = s.my;
  const closeMs = t.closingAt ? new Date(t.closingAt).getTime() : null;
  const nextMs = s.next?.at ? new Date(s.next.at).getTime() : null;
  const lodge = async () => { setBusy(true); setErr(null); try { await apiClient.lodgeTenderComplaint(id, body); setBody(""); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not lodge the complaint."); } finally { setBusy(false); } };
  return (
    <Page>
      <Heading title={`Status · ${t.referenceNumber}`} sub={<>{t.title} · {t.issuerName}</>} actions={<Link href="/bids" style={{ textDecoration: "none" }}><Button variant="secondary">My bids</Button></Link>} />
      {t.emergencyProcurement && <Card><Pill tone="warning">Emergency procurement</Pill> <span style={{ fontSize: 14 }}>{t.emergencyReason}</span></Card>}
      <ErrorNote message={err} />
      <Card title="Where this tender is">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
          {s.bidsSubmitted !== null && <div><div style={{ fontSize: 26, fontWeight: 600 }}>{s.bidsSubmitted}</div><div style={{ fontSize: 13, ...muted }}>bids submitted</div></div>}
          {closeMs !== null && closeMs <= now && <div><div style={{ fontSize: 26, fontWeight: 600 }}>{span(now - closeMs)}</div><div style={{ fontSize: 13, ...muted }}>since the closing time</div></div>}
          {closeMs !== null && closeMs > now && <div><div style={{ fontSize: 26, fontWeight: 600 }}>{span(closeMs - now)}</div><div style={{ fontSize: 13, ...muted }}>until the tender closes</div></div>}
          {s.next && <div><div style={{ fontSize: 26, fontWeight: 600 }}>{nextMs ? (nextMs > now ? span(nextMs - now) : "due now") : "To be confirmed"}</div><div style={{ fontSize: 13, ...muted }}>until: {s.next.label}</div></div>}
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {s.milestones.map((m) => (
            <li key={m.key} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 14, alignItems: "baseline" }}>
              <span aria-hidden style={{ color: m.done ? "var(--u-status-good)" : "var(--u-ink-secondary)" }}>{m.done ? "●" : "○"}</span>
              <span style={{ flex: 1, fontWeight: m.done ? 600 : 400 }}>{m.label}</span>
              <span style={muted}>{m.at ? fmtDateTime(m.at, t.timeZone) : m.target ? `due ${fmtDateTime(m.target, t.timeZone)}` : "pending"}</span>
            </li>))}
        </ol>
      </Card>
      {my.bid && <Card title="Your bid"><div style={{ fontSize: 14 }}>{my.bid.status === "SUBMITTED" ? "Submitted" : my.bid.status.toLowerCase()} {my.bid.submittedAt && <>on {fmtDateTime(my.bid.submittedAt, t.timeZone)}</>}{my.bid.totalTenderCurrency !== null && <> · {t.currency} {Number(my.bid.totalTenderCurrency).toLocaleString()}</>}</div></Card>}
      {my.debrief && (
        <Card title="Your outcome">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <Pill tone={my.debrief.outcome === "AWARDED" ? "good" : my.debrief.outcome === "NOT_COMPLIANT" ? "critical" : "neutral"}>{OUTCOME[my.debrief.outcome]}</Pill>
            {my.debrief.totalScore !== null && <Pill tone="brand">Total {my.debrief.totalScore} of 100</Pill>}
            {my.debrief.rank !== null && my.debrief.bidCount !== null && <Pill>Ranked {my.debrief.rank} of {my.debrief.bidCount}</Pill>}
          </div>
          {my.debrief.lots.length > 0 && <div style={{ margin: "8px 0", fontSize: 13.5 }}><strong>By lot</strong>
            {my.debrief.lots.map((l) => <div key={l.lotNumber} style={{ padding: "4px 0" }}>Lot {l.lotNumber}{l.lotTitle ? ` · ${l.lotTitle}` : ""}: {l.bid ? `ranked ${l.rank ?? "–"} of ${l.of}${l.totalScore != null ? `, score ${l.totalScore}` : ""}; ${l.itemsAwarded} of ${l.itemsInLot} items awarded to you` : "you did not bid for this lot"}</div>)}</div>}
          {my.debrief.scores.map((c) => (
            <div key={c.criterionId} style={{ padding: "6px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
              <strong>{c.title}</strong> {c.kind === "GATE" ? <Pill tone={c.passed ? "good" : "critical"}>{c.passed ? "Passed" : "Failed"}</Pill> : <span style={muted}>{c.weight}% · score {c.score ?? "n/a"}</span>}
              {c.comment && <div style={{ ...muted, fontSize: 13 }}>{c.comment}</div>}
            </div>))}
          {my.debrief.feedback && <p style={{ marginBottom: 0, fontSize: 14 }}><strong>Feedback from the buyer:</strong> {my.debrief.feedback}</p>}
        </Card>
      )}
      {my.awards.map((a, i) => <Card key={i} title="Your award">
        <div style={{ fontSize: 14 }}>{a.reason}</div>
        {a.lines.map((l, j) => <div key={j} style={{ fontSize: 13.5, ...muted }}>{l.description}{l.sharePercent !== null ? `: ${l.sharePercent}% of the requirement` : ""}</div>)}
      </Card>)}
      {my.awards.length > 0 && <ContractsPanel tenderId={id} />}
      {(my.canComplain || my.complaints.length > 0) && (
        <Card title="Complaints">
          {t.standstillEndsAt && <p style={{ marginTop: 0, fontSize: 13.5, ...muted }}>The standstill period ends {fmtDateTime(t.standstillEndsAt, t.timeZone)}. A complaint must be lodged before then.</p>}
          {my.complaints.map((c) => <div key={c.id} style={{ padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}><div>{c.body}</div><div style={muted}><Pill>{c.status.toLowerCase()}</Pill> {c.response ?? "Awaiting a response."}</div></div>)}
          {my.canComplain && <div style={{ marginTop: 10 }}>
            <textarea aria-label="Your complaint" rows={3} style={inputStyle} placeholder="Describe your complaint about this award decision" value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ marginTop: 8 }}><Button variant="secondary" disabled={busy || body.trim().length < 10} onClick={lodge}>Lodge complaint</Button></div>
          </div>}
        </Card>
      )}
    </Page>
  );
}
