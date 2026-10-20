"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TenderDashboard, TenderListItem } from "@universe/types";
import { AlertIcon, Button, CalendarIcon, CheckCircleIcon, ClockIcon, FileEditIcon, GridIcon, Pill, PlusIcon, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { Card, ErrorNote, Heading, Page, STATUS_LABEL, STATUS_TONE, daysUntil, fmtDate } from "../lib/ui";

/**
 * Issuer dashboard (2026-10-19). Tiles adapt to what the organisation actually has: a portfolio of drafts, open tenders, tenders
 * closing soon, response, and what is overdue. Bid counts join once sealed bids exist (build step 3).
 */
export default function TenderDashboardPage() {
  const me = useCurrentUser();
  const canIssue = (me?.platformStaffRole ?? "NONE") !== "NONE" || !!me?.permissions.includes("tenders.issue");
  const [d, setD] = useState<TenderDashboard | null>(null);
  const [recent, setRecent] = useState<TenderListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!canIssue) return;
    Promise.all([apiClient.tenderDashboard(), apiClient.listMyTenders()]).then(([a, b]) => { setD(a); setRecent(b.slice(0, 6)); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the dashboard."));
  }, [canIssue]);

  if (!canIssue) {
    return (
      <Page>
        <Heading title="Tender Issuance" />
        <Card><p style={{ margin: 0, color: "var(--u-ink-secondary)", lineHeight: 1.6 }}>Your role does not include issuing tenders. <Link href="/discover">Find tenders</Link> you can bid on, or see <Link href="/bids">your bids</Link>. Ask an organisation administrator for the Tender issuing permission if you need to publish tenders.</p></Card>
      </Page>
    );
  }

  const attention = d ? d.attention.overdueEvaluation + d.attention.overdueAward + d.attention.unansweredQuestions : 0;
  return (
    <Page>
      <Heading title="Tender Issuance" sub="Build, publish and manage your organisation's tenders." actions={<Link href="/tenders/builder" style={{ textDecoration: "none" }}><Button variant="primary" icon={<PlusIcon size={16} />}>New tender</Button></Link>} />
      <ErrorNote message={err} />
      {!d && !err && <div style={{ color: "var(--u-ink-secondary)" }}>Loading…</div>}
      {d && (
        <>
          <StatTileGrid>
            <Link href="/tenders?status=PUBLISHED" style={{ textDecoration: "none" }}><StatTile label="Open tenders" value={d.totals.open} icon={<CheckCircleIcon size={18} />} tone="good" /></Link>
            <Link href="/tenders?status=DRAFT" style={{ textDecoration: "none" }}><StatTile label="Drafts" value={d.totals.draft} icon={<FileEditIcon size={18} />} tone="neutral" /></Link>
            <Link href="/tenders?status=PUBLISHED&view=closing" style={{ textDecoration: "none" }}><StatTile label="Closing within 7 days" value={d.closingSoon.length} icon={<CalendarIcon size={18} />} tone={d.closingSoon.length ? "warning" : "neutral"} /></Link>
            <StatTile label="Bids received" value={d.bidsReceived ?? 0} icon={<CheckCircleIcon size={18} />} tone="brand" note="Sealed until each tender closes" />
            <Link href="/tenders?status=PUBLISHED&view=interest" style={{ textDecoration: "none" }}><StatTile label="Interested organisations" value={d.totalInterested} icon={<GridIcon size={18} />} tone="brand" note={d.openWithNoInterest ? `${d.openWithNoInterest} open with none yet` : undefined} /></Link>
            {attention > 0 && <Link href="/tenders?view=attention" style={{ textDecoration: "none" }}><StatTile label="Needs attention" value={attention} icon={<AlertIcon size={18} />} tone="critical" note={[d.attention.overdueEvaluation && `${d.attention.overdueEvaluation} evaluation overdue`, d.attention.overdueAward && `${d.attention.overdueAward} award overdue`, d.attention.unansweredQuestions && `${d.attention.unansweredQuestions} questions`].filter(Boolean).join(", ")} /></Link>}
          </StatTileGrid>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
            <Card title="Closing soon">
              {d.closingSoon.length === 0 ? <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Nothing closes in the next seven days.</p> : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {d.closingSoon.map((t) => { const n = daysUntil(t.closingAt) ?? 0; return (
                    <li key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Link href={`/tenders/manage?id=${t.id}`} style={{ color: "var(--u-ink)", textDecoration: "none", minWidth: 0 }}><strong>{t.referenceNumber}</strong> <span style={{ color: "var(--u-ink-secondary)" }}>{t.title}</span></Link>
                      <span style={{ display: "flex", gap: 6, flexShrink: 0 }}><Pill tone={n <= 2 ? "critical" : "warning"} icon={<ClockIcon size={12} />}>{n <= 0 ? "Today" : `${n}d`}</Pill><Pill>{t.interested} interested</Pill></span>
                    </li>); })}
                </ul>
              )}
            </Card>
            <Card title="Interest in open tenders">
              {d.interestPerOpenTender.length === 0 ? <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>No tenders are open. Publish a draft to start receiving interest.</p> : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {d.interestPerOpenTender.map((t) => (
                    <li key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <Link href={`/tenders/manage?id=${t.id}`} style={{ color: "var(--u-ink)", textDecoration: "none" }}>{t.referenceNumber} <span style={{ color: "var(--u-ink-secondary)" }}>{t.title}</span></Link>
                      <Pill tone={t.interested ? "good" : "warning"}>{t.interested}</Pill>
                    </li>))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Recent tenders" action={<Link href="/tenders" style={{ fontSize: 13, color: "var(--u-brand-violet)" }}>All tenders</Link>}>
            {!recent || recent.length === 0 ? <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>You have not created a tender yet. Start with a draft: lines, criteria and who can bid are set step by step.</p> : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recent.map((t) => { const st = (t.effectiveStatus ?? t.status); return (
                  <Link key={t.id} href={st === "DRAFT" ? `/tenders/builder?id=${t.id}` : `/tenders/manage?id=${t.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid var(--u-border)", textDecoration: "none", color: "var(--u-ink)", flexWrap: "wrap" }}>
                    <span><strong>{t.referenceNumber}</strong> {t.title}</span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--u-ink-secondary)", fontSize: 13 }}>Closes {fmtDate(t.closingAt)} <Pill tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Pill></span>
                  </Link>); })}
              </div>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}
