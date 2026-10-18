"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RegulatoryDashboard, SafetyNoticeDashboard } from "@universe/types";
import { AlertIcon, BanIcon, CalendarXIcon, CheckCircleIcon, ClipboardCheckIcon, ClockIcon, FileEditIcon, HelpCircleIcon, Pill, RefreshIcon, ShieldIcon, StatTile } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";

/** Regulatory dashboard (Product Database step 2, 2026-10-18): registration health across the catalogue plus this organisation's own verification queue. */
const AUTH: Record<string, string> = { WHO_PQ: "WHO PQ", WHO_EUL: "WHO EUL", FDA: "US FDA", EU_CE: "EU CE", EU_MDR: "EU MDR", EU_IVDR: "EU IVDR", EMA: "EMA", MHRA: "MHRA", SRA: "SRA", NATIONAL: "National", OTHER: "Other" };

export default function RegulatoryPage() {
  const [d, setD] = useState<RegulatoryDashboard | null>(null);
  const [sd, setSd] = useState<SafetyNoticeDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { apiClient.getSafetyNoticeDashboard().then(setSd).catch(() => undefined); }, []);
  useEffect(() => { apiClient.getRegulatoryDashboard().then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Could not load.")); }, []);
  const n = (v: number) => v.toLocaleString("en-GB");
  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>Regulatory status</h1>
      <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Registration health across the shared catalogue, and your organisation&rsquo;s verification queue.</p>
      {err && <p style={{ color: "var(--u-status-critical)" }}>{err}</p>}
      {!d ? !err && <p>Loading…</p> : (
        <>
          <h2 style={{ fontSize: 15, marginTop: 20 }}>Catalogue</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <StatTile label="Registrations" value={n(d.totals.registrations)} icon={<ShieldIcon size={20} />} tone="brand" />
            <StatTile label="Active" value={n(d.totals.active)} icon={<CheckCircleIcon size={20} />} tone="good" />
            <StatTile label="Expiring within 90 days" value={n(d.totals.expiringSoon)} icon={<ClockIcon size={20} />} tone="warning" />
            <StatTile label="Expired" value={n(d.totals.expired)} icon={<CalendarXIcon size={20} />} tone="critical" />
            <StatTile label="Suspended or withdrawn" value={n(d.totals.suspendedOrWithdrawn)} icon={<BanIcon size={20} />} tone="critical" />
            <StatTile label="Products with no registration" value={n(d.totals.productsWithoutRegistration)} icon={<HelpCircleIcon size={20} />} tone="warning" />
          </div>
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Your organisation</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <StatTile label="Registrations awaiting your verification" value={n(d.mine.unverified)} icon={<ClipboardCheckIcon size={20} />} tone="warning" />
            <StatTile label="Re-verification overdue" value={n(d.mine.reverificationDue)} icon={<RefreshIcon size={20} />} tone="critical" />
            <StatTile label="Documents awaiting approval" value={n(d.mine.documentsAwaitingApproval)} icon={<FileEditIcon size={20} />} tone="warning" />
            <StatTile label="Documents expiring within 90 days" value={n(d.mine.documentsExpiringSoon)} icon={<ClockIcon size={20} />} tone="warning" />
            <StatTile label="Documents expired" value={n(d.mine.documentsExpired)} icon={<CalendarXIcon size={20} />} tone="critical" />
            <StatTile label="Issues found" value={n(d.mine.issuesFound)} icon={<AlertIcon size={20} />} tone="critical" />
          </div>
          {sd && (<>
            <h2 style={{ fontSize: 15, marginTop: 24 }}>Safety notices and recalls</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <StatTile label="Open notices" value={n(sd.totals.open)} icon={<AlertIcon size={20} />} tone="warning" />
              <StatTile label="Open critical (class I)" value={n(sd.totals.critical)} icon={<BanIcon size={20} />} tone="critical" />
              <StatTile label="Awaiting your review" value={n(sd.mine.awaitingReview)} icon={<ClipboardCheckIcon size={20} />} tone="warning" />
              <StatTile label="On your project lines" value={n(sd.mine.onMyProjectLines)} icon={<ShieldIcon size={20} />} tone="critical" />
              <StatTile label="We are affected" value={n(sd.mine.affected)} icon={<AlertIcon size={20} />} tone="critical" />
              <StatTile label="Closed in last 90 days" value={n(sd.totals.closedLast90Days)} icon={<CheckCircleIcon size={20} />} tone="good" />
            </div>
            {sd.items.length > 0 && (
              <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                {sd.items.map((x) => (
                  <Link key={x.id} href={x.productMasterId ? `/products/detail?id=${x.productMasterId}` : `/families/detail?id=${x.productFamilyId}`} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "8px 12px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", textDecoration: "none", color: "inherit", fontSize: 13 }}>
                    <strong>{x.productName}</strong>
                    <span>{x.title}</span>
                    <Pill tone={x.severity === "CRITICAL" ? "critical" : "warning"}>{x.severity.toLowerCase()}</Pill>
                    {x.needsReview && <Pill tone="critical">needs your review</Pill>}
                  </Link>
                ))}
              </div>
            )}
          </>)}
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Needs attention</h2>
          {d.attention.length === 0 ? <p style={{ fontSize: 13 }}>Nothing expiring soon or suspended.</p> : (
            <div style={{ display: "grid", gap: 6 }}>
              {d.attention.map((a) => (
                <Link key={a.registrationId} href={a.productMasterId ? `/products/detail?id=${a.productMasterId}` : `/families/detail?id=${a.productFamilyId}`} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "8px 12px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", textDecoration: "none", color: "inherit", fontSize: 13 }}>
                  <strong>{a.productName}</strong>
                  <span>{AUTH[a.authority] ?? a.authority} {a.referenceNumber}</span>
                  <Pill tone={a.effectiveStatus === "ACTIVE" ? "warning" : "critical"}>{a.effectiveStatus === "ACTIVE" ? `expires in ${a.daysToExpiry} days` : a.effectiveStatus.toLowerCase()}</Pill>
                </Link>
              ))}
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 20 }}>Shows recorded registrations and notices only. The daily regulatory watch (openFDA, MHRA) is advisory; see Regulatory watch.</p>
        </>
      )}
    </main>
  );
}
