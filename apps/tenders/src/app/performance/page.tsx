"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MyPerformanceItem, SupplierPerformanceSummary } from "@universe/types";
import { Pill } from "@universe/ui";
import { BandPill, SupplierSummary } from "../../components/PerformancePanel";
import { apiClient } from "../../lib/apiClient";
import { Card, ErrorNote, Heading, Page, fmtDate } from "../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;

/** Your closed contracts and how they were recorded, plus the anonymised summary other tender owners see about you. */
export default function PerformancePage() {
  const [rows, setRows] = useState<MyPerformanceItem[] | null>(null);
  const [mine, setMine] = useState<SupplierPerformanceSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    apiClient.myPerformance().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load your performance records."));
    apiClient.me().then((m) => apiClient.supplierPerformance(m.organizationId)).then(setMine).catch(() => undefined);
  }, []);
  return (
    <Page>
      <Heading title="Performance" sub="Records of your closed contracts, as a supplier and as a tender owner." />
      <ErrorNote message={err} />
      <Card title="What other tender owners see about you">
        {mine ? <SupplierSummary s={mine} /> : <span style={muted}>Loading…</span>}
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.5, ...muted }}>Other owners see only a band and averages, and only once you have at least 3 closed contracts from 2 owners. They never see who the owners were, the feedback text or any single contract. You always see everything on your own records.</p>
      </Card>
      <Card title="Closed contracts">
        {!rows ? <span style={muted}>Loading…</span> : rows.length === 0 ? <p style={{ margin: 0, ...muted }}>No contract has been closed yet. A record is created when a tender owner closes a contract.</p> : rows.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
            <span><strong>{r.contractReference}</strong> · {r.title} <Pill tone="neutral">{r.role === "SUPPLIER" ? "You supplied" : "You owned"}</Pill> <span style={muted}>· {r.counterpartyName} · closed {fmtDate(r.closedAt)}</span></span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><BandPill band={r.band} />{r.overallScore !== null && <strong>{r.overallScore}/100</strong>}<Link href={`/${r.role === "SUPPLIER" ? "bids/status" : "tenders/manage"}?id=${r.tenderId}`}>Open</Link></span>
          </div>))}
      </Card>
    </Page>
  );
}
