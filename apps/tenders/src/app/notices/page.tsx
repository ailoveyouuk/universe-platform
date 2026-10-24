"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicNoticeRecord } from "@universe/types";
import { INCOTERM_NAMES, type IncotermCode } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { STATUS_LABEL, TYPE_LABEL, fmtDateTime } from "../../lib/ui";

/**
 * Public tender notices (2026-10-19). No sign-in: anyone can read the notices issuers chose to publish. Only title, items, award
 * criteria, dates and the issuer's name are shown; bidder data, documents and contact details never appear here.
 */
function Notices() {
  const id = useSearchParams()?.get("id") ?? "";
  const [list, setList] = useState<PublicNoticeRecord[] | null>(null);
  const [one, setOne] = useState<PublicNoticeRecord | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setErr(null);
    if (id) apiClient.getPublicNotice(id).then(setOne).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the notice."));
    else apiClient.listPublicNotices().then(setList).catch((e) => setErr(e instanceof Error ? e.message : "Could not load notices."));
  }, [id]);

  const box = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "18px 20px" } as const;
  const muted = { color: "var(--u-ink-secondary)" } as const;
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "var(--u-font-sans)", color: "var(--u-ink)", backgroundColor: "var(--u-surface)", minHeight: "100vh" }}>
      <p style={{ margin: 0, fontSize: 13, ...muted }}>Universe · Public tender notices</p>
      <h1 style={{ fontFamily: "var(--u-font-display)", margin: "6px 0 20px" }}>{id ? "Tender notice" : "Open and recent tender notices"}</h1>
      {err && <div role="alert" style={{ ...box, color: "var(--u-status-critical-text)" }}>{err}</div>}
      {!id && list && list.length === 0 && <div style={{ ...box, ...muted }}>No public notices at the moment.</div>}
      {!id && list?.map((n) => (
        <a key={n.id} href={`/notices?id=${n.id}`} style={{ ...box, display: "block", marginBottom: 12, textDecoration: "none", color: "inherit" }}>
          <strong>{n.referenceNumber} {n.title}</strong>
          <div style={{ fontSize: 13.5, ...muted, marginTop: 4 }}>{n.issuerName} · {TYPE_LABEL[n.tenderType]} · {STATUS_LABEL[n.status]} · Closes {fmtDateTime(n.closingAt, n.timeZone)}</div>
        </a>
      ))}
      {id && one === null && <div style={{ ...box, ...muted }}>This notice is not available.</div>}
      {id && one && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={box}>
            <h2 style={{ margin: "0 0 6px", fontFamily: "var(--u-font-display)", fontSize: 20 }}>{one.referenceNumber} {one.title}</h2>
            <div style={{ fontSize: 13.5, ...muted }}>Issued by {one.issuerName} · {TYPE_LABEL[one.tenderType]} · {STATUS_LABEL[one.status]}</div>
            {one.summary && <p style={{ lineHeight: 1.55 }}>{one.summary}</p>}
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: 0, fontSize: 14 }}>
              <dt style={muted}>Published</dt><dd style={{ margin: 0 }}>{fmtDateTime(one.publishedAt, one.timeZone)}</dd>
              <dt style={muted}>Closes</dt><dd style={{ margin: 0 }}>{fmtDateTime(one.closingAt, one.timeZone)}</dd>
              {one.deliveryCountryCodes && <><dt style={muted}>Delivery countries</dt><dd style={{ margin: 0 }}>{one.deliveryCountryCodes.split(",").filter(Boolean).join(", ")}</dd></>}
              {one.currency && <><dt style={muted}>Currency</dt><dd style={{ margin: 0 }}>{one.currency}</dd></>}
              {one.incoterm && <><dt style={muted}>Incoterm</dt><dd style={{ margin: 0 }}>{one.incoterm}{INCOTERM_NAMES[one.incoterm as IncotermCode] ? `: ${INCOTERM_NAMES[one.incoterm as IncotermCode]}` : ""}</dd></>}
            </dl>
          </div>
          <div style={box}>
            <h3 style={{ margin: "0 0 8px" }}>Items</h3>
            {one.lines.map((l, i) => <div key={i} style={{ padding: "6px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14 }}>{l.description}{l.quantity ? <span style={muted}> · {l.quantity} {l.unit ?? ""}</span> : null}</div>)}
          </div>
          <div style={box}>
            <h3 style={{ margin: "0 0 8px" }}>How bids will be assessed</h3>
            {one.criteria.map((c, i) => <div key={i} style={{ padding: "4px 0", fontSize: 14 }}>{c.kind === "GATE" ? "Pass or fail" : `${Number(c.weight)}%`}: {c.title}</div>)}
          </div>
          <p style={{ fontSize: 13.5, ...muted }}>To take part, an eligible organisation must be registered on Universe. Sign in at the Universe tender portal to see the full requirements.</p>
        </div>
      )}
    </main>
  );
}

export default function PublicNoticesPage() {
  return <Suspense fallback={null}><Notices /></Suspense>;
}
