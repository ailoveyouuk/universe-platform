"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RegulatoryDashboard, RegulatoryRegisterPage, SafetyNoticeDashboard } from "@universe/types";
import { AlertIcon, BanIcon, Button, DownloadIcon, CalendarXIcon, CheckCircleIcon, ClipboardCheckIcon, ClockIcon, FileEditIcon, HelpCircleIcon, Pill, RefreshIcon, ShieldIcon, StatTile } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { saveExport } from "../../lib/download";

/** Regulatory dashboard (Product Database step 2, 2026-10-18): registration health across the catalogue plus this organisation's own verification queue. */
const AUTH: Record<string, string> = { WHO_PQ: "WHO PQ", WHO_EUL: "WHO EUL", FDA: "US FDA", EU_CE: "EU CE", EU_MDR: "EU MDR", EU_IVDR: "EU IVDR", EMA: "EMA", MHRA: "MHRA", SRA: "SRA", NATIONAL: "National", OTHER: "Other" };

export default function RegulatoryPage() {
  const [d, setD] = useState<RegulatoryDashboard | null>(null);
  const [sd, setSd] = useState<SafetyNoticeDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Every tile that counts a list of records filters that list in place (platform standard); null = nothing selected.
  const [sel, setSel] = useState<{ kind: "reg" | "notice"; view: string; label: string } | null>(null);
  const [selPage, setSelPage] = useState(1);
  const [reg, setReg] = useState<RegulatoryRegisterPage | null>(null);
  const [regErr, setRegErr] = useState<string | null>(null);
  useEffect(() => {
    if (!sel) { setReg(null); return; }
    let live = true;
    setReg(null); setRegErr(null);
    (sel.kind === "reg" ? apiClient.getRegulatoryRegister(sel.view, selPage, 25) : apiClient.getSafetyNoticeRegister(sel.view, selPage, 25))
      .then((r) => { if (live) setReg(r); })
      .catch((e) => { if (live) setRegErr(e instanceof Error ? e.message : "Could not load the list."); });
    return () => { live = false; };
  }, [sel, selPage]);
  const pick = (kind: "reg" | "notice", view: string, label: string) => {
    setSelPage(1);
    setSel((c) => (c && c.kind === kind && c.view === view ? null : { kind, view, label }));
  };
  const on = (kind: "reg" | "notice", view: string) => !!sel && sel.kind === kind && sel.view === view;
  useEffect(() => { apiClient.getSafetyNoticeDashboard().then(setSd).catch(() => undefined); }, []);
  useEffect(() => { apiClient.getRegulatoryDashboard().then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Could not load.")); }, []);
  const n = (v: number) => v.toLocaleString("en-GB");
  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>Regulatory status</h1>
        <Button
          variant="secondary"
          size="sm"
          disabled={exporting}
          onClick={async () => {
            setExporting(true); setErr(null);
            try { saveExport(await apiClient.exportRegistrationsCsv()); }
            catch (e) { setErr(e instanceof Error ? e.message : "Export failed."); }
            finally { setExporting(false); }
          }}
        >
          <DownloadIcon size={14} /> {exporting ? "Preparing…" : "Export registrations CSV"}
        </Button>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "6px 0 0" }}>The export covers registrations your organisation added (global admins: all). <Link href="/exports">Request a wider export.</Link></p>
      <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Registration health across the shared catalogue, and your organisation&rsquo;s verification queue.</p>
      {err && <p style={{ color: "var(--u-status-critical-text)" }}>{err}</p>}
      {!d ? !err && <p>Loading…</p> : (
        <>
          <h2 style={{ fontSize: 15, marginTop: 20 }}>Catalogue</h2>
          <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))", gap: 12 }}>
            <StatTile label="Registrations" onClick={() => pick("reg", "registrations", "Registrations")} active={on("reg", "registrations")} value={n(d.totals.registrations)} icon={<ShieldIcon size={20} />} tone="brand" />
            <StatTile label="Active" onClick={() => pick("reg", "active", "Active")} active={on("reg", "active")} value={n(d.totals.active)} icon={<CheckCircleIcon size={20} />} tone="good" />
            <StatTile label="Expiring within 90 days" onClick={() => pick("reg", "expiring", "Expiring within 90 days")} active={on("reg", "expiring")} value={n(d.totals.expiringSoon)} icon={<ClockIcon size={20} />} tone="warning" />
            <StatTile label="Expired" onClick={() => pick("reg", "expired", "Expired")} active={on("reg", "expired")} value={n(d.totals.expired)} icon={<CalendarXIcon size={20} />} tone="critical" />
            <StatTile label="Suspended or withdrawn" onClick={() => pick("reg", "suspended", "Suspended or withdrawn")} active={on("reg", "suspended")} value={n(d.totals.suspendedOrWithdrawn)} icon={<BanIcon size={20} />} tone="critical" />
            <StatTile label="Products with no registration" onClick={() => pick("reg", "none", "Products with no registration")} active={on("reg", "none")} value={n(d.totals.productsWithoutRegistration)} icon={<HelpCircleIcon size={20} />} tone="warning" />
          </div>
          <h2 style={{ fontSize: 15, marginTop: 24 }}>Your organisation</h2>
          <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))", gap: 12 }}>
            <StatTile label="Registrations awaiting your verification" onClick={() => pick("reg", "unverified", "Registrations awaiting your verification")} active={on("reg", "unverified")} value={n(d.mine.unverified)} icon={<ClipboardCheckIcon size={20} />} tone="warning" />
            <StatTile label="Re-verification overdue" onClick={() => pick("reg", "reverification", "Re-verification overdue")} active={on("reg", "reverification")} value={n(d.mine.reverificationDue)} icon={<RefreshIcon size={20} />} tone="critical" />
            <StatTile label="Documents awaiting approval" onClick={() => pick("reg", "docs-awaiting", "Documents awaiting approval")} active={on("reg", "docs-awaiting")} value={n(d.mine.documentsAwaitingApproval)} icon={<FileEditIcon size={20} />} tone="warning" />
            <StatTile label="Documents expiring within 90 days" onClick={() => pick("reg", "docs-expiring", "Documents expiring within 90 days")} active={on("reg", "docs-expiring")} value={n(d.mine.documentsExpiringSoon)} icon={<ClockIcon size={20} />} tone="warning" />
            <StatTile label="Documents expired" onClick={() => pick("reg", "docs-expired", "Documents expired")} active={on("reg", "docs-expired")} value={n(d.mine.documentsExpired)} icon={<CalendarXIcon size={20} />} tone="critical" />
            <StatTile label="Issues found" onClick={() => pick("reg", "issues", "Issues found")} active={on("reg", "issues")} value={n(d.mine.issuesFound)} icon={<AlertIcon size={20} />} tone="critical" />
          </div>
          {sd && (<>
            <h2 style={{ fontSize: 15, marginTop: 24 }}>Safety notices and recalls</h2>
            <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))", gap: 12 }}>
              <StatTile label="Open notices" onClick={() => pick("notice", "open", "Open notices")} active={on("notice", "open")} value={n(sd.totals.open)} icon={<AlertIcon size={20} />} tone="warning" />
              <StatTile label="Open critical (class I)" onClick={() => pick("notice", "critical", "Open critical (class I)")} active={on("notice", "critical")} value={n(sd.totals.critical)} icon={<BanIcon size={20} />} tone="critical" />
              <StatTile label="Awaiting your review" onClick={() => pick("notice", "review", "Awaiting your review")} active={on("notice", "review")} value={n(sd.mine.awaitingReview)} icon={<ClipboardCheckIcon size={20} />} tone="warning" />
              <StatTile label="On your project lines" onClick={() => pick("notice", "lines", "On your project lines")} active={on("notice", "lines")} value={n(sd.mine.onMyProjectLines)} icon={<ShieldIcon size={20} />} tone="critical" />
              <StatTile label="We are affected" onClick={() => pick("notice", "affected", "We are affected")} active={on("notice", "affected")} value={n(sd.mine.affected)} icon={<AlertIcon size={20} />} tone="critical" />
              <StatTile label="Closed in last 90 days" onClick={() => pick("notice", "closed", "Closed in last 90 days")} active={on("notice", "closed")} value={n(sd.totals.closedLast90Days)} icon={<CheckCircleIcon size={20} />} tone="good" />
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
          {sel && (
            <section style={{ marginTop: 20, border: "1px solid var(--u-border)", borderRadius: 8, padding: 14 }} aria-live="polite">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong>{sel.label}{reg ? ` · ${reg.total.toLocaleString("en-GB")}` : ""}</strong>
                <Button variant="secondary" size="sm" onClick={() => setSel(null)}>Clear filter</Button>
              </div>
              {regErr && <p style={{ color: "var(--u-status-critical-text)" }}>{regErr}</p>}
              {!reg && !regErr && <p>Loading…</p>}
              {reg && reg.rows.length === 0 && <p style={{ fontSize: 13 }}>Nothing in this list.</p>}
              {reg && reg.rows.length > 0 && (
                <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                  {reg.rows.map((x) => (
                    <Link key={x.id} href={x.href} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                      <strong>{x.name}</strong>
                      <span>{x.detail}</span>
                      <Pill tone={x.tone}>{x.status.toLowerCase()}</Pill>
                      {x.date && <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{new Date(x.date).toLocaleDateString("en-GB")}</span>}
                    </Link>
                  ))}
                </div>
              )}
              {reg && reg.total > 25 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <Button variant="secondary" size="sm" disabled={selPage <= 1} onClick={() => setSelPage((p) => p - 1)}>Previous</Button>
                  <span style={{ fontSize: 12 }}>Page {selPage} of {Math.ceil(reg.total / 25)}</span>
                  <Button variant="secondary" size="sm" disabled={selPage >= Math.ceil(reg.total / 25)} onClick={() => setSelPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </section>
          )}
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
