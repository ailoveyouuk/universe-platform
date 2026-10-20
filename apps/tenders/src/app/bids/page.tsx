"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MyBidItem } from "@universe/types";
import { Pill } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { Card, ErrorNote, Heading, Page, STATUS_LABEL, fmtDateTime } from "../../lib/ui";

const BID_TONE = { DRAFT: "warning", SUBMITTED: "good", WITHDRAWN: "neutral", NONE: "neutral" } as const;

export default function MyBidsPage() {
  const [rows, setRows] = useState<MyBidItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { apiClient.myTenderBids().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load your bids.")); }, []);
  return (
    <Page>
      <Heading title="My bids" sub="Drafts and submitted bids. Submitted bids stay sealed until the tender closes." />
      <ErrorNote message={err} />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {!rows && !err && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>Loading…</div>}
        {rows?.length === 0 && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>You have no bids yet. <Link href="/discover">Find a tender</Link>, express interest, then start your bid.</div>}
        {rows?.map((b, i) => (
          <Link key={b.tenderId} href={`/bids/edit?id=${b.tenderId}`} style={{ display: "block", textDecoration: "none", color: "var(--u-ink)", padding: "14px 20px", borderTop: i ? "1px solid var(--u-border)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><strong>{b.referenceNumber}</strong> {b.title}<div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{b.issuerName} · {STATUS_LABEL[b.tenderStatus]} · closes {fmtDateTime(b.closingAt, b.timeZone)}</div></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{b.status === "SUBMITTED" && <Link href={`/bids/status?id=${b.tenderId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 13 }}>Status</Link>}{b.totalBidCurrency && <span style={{ fontSize: 13 }}>{b.bidCurrency} {Number(b.totalBidCurrency).toLocaleString()}</span>}<Pill tone={BID_TONE[b.status]}>{b.status === "DRAFT" ? "Draft" : b.status === "SUBMITTED" ? "Submitted" : "Withdrawn"}</Pill></div>
            </div>
          </Link>
        ))}
      </Card>
    </Page>
  );
}
