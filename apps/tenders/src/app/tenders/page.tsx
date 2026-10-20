"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { TenderListItem } from "@universe/types";
import { Button, Pill, PlusIcon, SearchInput } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { Card, ErrorNote, Heading, Page, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, fmtDate } from "../../lib/ui";

const FILTERS = [["", "All"], ["DRAFT", "Drafts"], ["PUBLISHED", "Open"], ["CLOSED", "Closed"], ["EVALUATING", "Evaluating"], ["AWARDED", "Awarded"], ["CANCELLED", "Cancelled"]] as const;

export default function TendersPage() {
  const [rows, setRows] = useState<TenderListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  // Extra views reached from the home-page tiles: closing (published, closing within 7 days), interest (published with interest), attention (overdue evaluation or award).
  const [view, setView] = useState("");

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s) setStatus(s);
    const v = new URLSearchParams(window.location.search).get("view");
    if (v) setView(v);
    apiClient.listMyTenders().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load tenders."));
  }, []);

  const inView = (t: TenderListItem) => {
    if (!view) return true;
    const st = t.effectiveStatus ?? t.status;
    const now = Date.now();
    if (view === "closing") return st === "PUBLISHED" && !!t.closingAt && new Date(t.closingAt).getTime() - now <= 7 * 86400000;
    if (view === "bids") return (t.bidsReceived ?? 0) > 0;
    if (view === "interest") return st === "PUBLISHED" && t.interestedOrganisations > 0;
    if (view === "attention") return (st === "CLOSED" || st === "EVALUATING") && ((!!t.evaluationDueAt && new Date(t.evaluationDueAt).getTime() < now) || (!!t.awardDueAt && new Date(t.awardDueAt).getTime() < now));
    return true;
  };
  const shown = useMemo(() => (rows ?? []).filter((t) => (!status || (t.effectiveStatus ?? t.status) === status) && inView(t) && (!q || `${t.referenceNumber} ${t.title}`.toLowerCase().includes(q.toLowerCase()))), [rows, status, q, view]);
  const count = (s: string) => (rows ?? []).filter((t) => !s || (t.effectiveStatus ?? t.status) === s).length;

  return (
    <Page>
      <Heading title="My tenders" actions={<Link href="/tenders/builder" style={{ textDecoration: "none" }}><Button variant="primary" icon={<PlusIcon size={16} />}>New tender</Button></Link>} />
      <ErrorNote message={err} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {FILTERS.map(([v, label]) => (
          <button key={v} type="button" onClick={() => { setStatus(v); setView(""); }} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }} aria-pressed={status === v}>
            <Pill tone={status === v ? "brand" : "neutral"}>{label} {count(v)}</Pill>
          </button>
        ))}
        <div style={{ marginLeft: "auto", minWidth: 220 }}><SearchInput value={q} onChange={setQ} placeholder="Search reference or title" /></div>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {!rows && !err && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>Loading…</div>}
        {rows && shown.length === 0 && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>No tenders match.</div>}
        {shown.map((t, i) => { const st = t.effectiveStatus ?? t.status; return (
          <Link key={t.id} href={st === "DRAFT" ? `/tenders/builder?id=${t.id}` : `/tenders/manage?id=${t.id}`} className="u-card-hover" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, padding: "14px 20px", borderTop: i ? "1px solid var(--u-border)" : "none", textDecoration: "none", color: "var(--u-ink)" }}>
            <div style={{ minWidth: 0 }}>
              <div><strong>{t.referenceNumber}</strong> {t.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", marginTop: 3 }}>{TYPE_LABEL[t.tenderType]} · Closes {fmtDate(t.closingAt)}{t.isSimulated ? " · Simulated" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{st === "PUBLISHED" && <Pill>{t.interestedOrganisations} interested</Pill>}<Pill tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Pill></div>
          </Link>); })}
      </Card>
    </Page>
  );
}
