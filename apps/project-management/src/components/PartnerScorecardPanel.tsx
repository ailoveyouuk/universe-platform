"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SCORECARD_THRESHOLDS } from "@universe/types";
import type { PartnerScorecard, ScorecardGroup, ScorecardMetric, ScorecardRecordSet, ScorecardStatus } from "@universe/types";
import { AlertIcon, CheckCircleIcon, ClockIcon, GaugeIcon, Pill, ShieldIcon, StatTile } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

const STATUS_COLOR: Record<ScorecardStatus, string> = {
  good: "var(--u-status-good)", warning: "var(--u-status-warning)", critical: "var(--u-status-critical)", neutral: "var(--u-ink-secondary)",
};
const STATUS_LABEL: Record<ScorecardStatus, string> = { good: "On track", warning: "Needs attention", critical: "Action needed", neutral: "No rating" };
const BAND: Record<PartnerScorecard["band"], { label: string; tone: ScorecardStatus }> = {
  STRONG: { label: "Strong", tone: "good" }, SATISFACTORY: { label: "Satisfactory", tone: "good" }, WATCH: { label: "Watch", tone: "warning" },
  AT_RISK: { label: "At risk", tone: "critical" }, NOT_ENOUGH_DATA: { label: "Not enough data yet", tone: "neutral" },
};
const GROUPS: [ScorecardGroup, string][] = [["DELIVERY", "Delivery"], ["QUALITY", "Quality"], ["COMPLIANCE", "Compliance"], ["RESPONSIVENESS", "Responsiveness"], ["ACTIVITY", "Activity"]];

const iconFor = (m: ScorecardMetric) =>
  m.group === "DELIVERY" ? <ClockIcon size={20} /> : m.group === "QUALITY" ? <AlertIcon size={20} /> : m.group === "COMPLIANCE" ? <ShieldIcon size={20} /> : <CheckCircleIcon size={20} />;
const toneFor = (s: ScorecardStatus) => (s === "good" ? "good" : s === "warning" ? "warning" : s === "critical" ? "critical" : "neutral") as "good" | "warning" | "critical" | "neutral";

/**
 * Live performance and benchmark for one stakeholder: an overall score, the four measures that matter most right now as tiles,
 * and the full set of measures underneath. Computed on request from project lines, batches, approvals, certifications, evidence,
 * enquiries and (for quality roles only) complaints, so it is always current.
 */
export function PartnerScorecardPanel({ partnerId }: { partnerId: string }) {
  const [sc, setSc] = useState<PartnerScorecard | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { apiClient.getPartnerScorecard(partnerId).then(setSc).catch(() => setFailed(true)); }, [partnerId]);
  // Click a tile or a measure to see the records it is built from.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [recs, setRecs] = useState<ScorecardRecordSet | null>(null);
  const [recsErr, setRecsErr] = useState(false);
  const pick = (m: ScorecardMetric) => {
    if (openKey === m.key) { setOpenKey(null); setRecs(null); return; }
    setOpenKey(m.key); setRecs(null); setRecsErr(false);
    apiClient.getScorecardRecords(partnerId, m.key).then(setRecs).catch(() => setRecsErr(true));
  };

  if (failed) return null;
  if (!sc) return <section style={{ marginTop: 28, color: "var(--u-ink-secondary)", fontSize: 13 }}>Loading performance…</section>;
  const band = BAND[sc.scoreBand];
  const bandColor = STATUS_COLOR[band.tone];

  return (
    <section style={{ marginTop: 28 }} aria-label="Performance and benchmarking">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}><GaugeIcon size={16} /> Performance &amp; benchmarking</h2>
        <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>Live from project, batch, quality and compliance records</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={{ padding: "18px 20px", borderRadius: "var(--u-radius-lg)", border: `1px solid ${bandColor}`, backgroundColor: "var(--u-surface-raised)", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Overall score</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 40, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>{sc.overallScore ?? "—"}</span>
            {sc.overallScore !== null && <span style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>/ 100</span>}
          </span>
          <span aria-hidden style={{ display: "block", height: 6, borderRadius: 999, backgroundColor: "var(--u-surface-alt)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${sc.overallScore ?? 0}%`, backgroundColor: bandColor }} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: bandColor }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: bandColor }} />{band.label}
          </span>
          {sc.attention.length > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--u-status-critical)" }}>
              <AlertIcon size={13} /> {sc.attention.length} measure{sc.attention.length === 1 ? "" : "s"} need{sc.attention.length === 1 ? "s" : ""} attention: {sc.attention.join(", ").toLowerCase()}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: "var(--u-ink-secondary)" }}>
            {sc.coverage}% of the measures that apply have data
          </span>
        </div>
        {sc.headline.map((m) => (
          <StatTile key={m.key} label={m.label} value={m.display} icon={iconFor(m)} tone={toneFor(m.status)} active={openKey === m.key} onClick={() => pick(m)}
            indicator={{ color: STATUS_COLOR[m.status], label: STATUS_LABEL[m.status], fraction: m.score === null ? undefined : m.score / 100 }} />
        ))}
      </div>

      {openKey && (
        <div role="region" aria-live="polite" aria-label="Records behind the selected measure" style={{ marginBottom: 16, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", backgroundColor: "var(--u-surface-alt)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--u-ink)" }}>{recs ? `${recs.title} (${recs.total})` : "Loading records…"}</span>
            <button type="button" onClick={() => { setOpenKey(null); setRecs(null); }} style={{ border: 0, background: "none", color: "var(--u-ink-secondary)", cursor: "pointer", fontSize: 12.5, font: "inherit" }}>Close</button>
          </div>
          {recsErr && <div style={{ padding: 16, fontSize: 13, color: "var(--u-status-critical)" }}>Could not load the records.</div>}
          {recs && recs.rows.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>{recs.note ?? "No records for this measure yet."}</div>}
          {recs && recs.rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{recs.columns.map((c) => <th key={c} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>{c}</th>)}</tr></thead>
                <tbody>
                  {recs.rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--u-border)", backgroundColor: r.flag === "critical" ? "var(--u-status-critical-tint, transparent)" : undefined }}>
                      {r.cells.map((c, i) => (
                        <td key={i} style={{ padding: "8px 12px", color: i === r.cells.length - 1 && r.flag ? STATUS_COLOR[r.flag] : "var(--u-ink)", fontWeight: i === r.cells.length - 1 && r.flag ? 600 : 400 }}>
                          {i === 0 && r.href ? <Link href={r.href} style={{ color: "inherit" }}>{c}</Link> : c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(recs.total > recs.rows.length || recs.note) && <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--u-ink-secondary)" }}>{recs.total > recs.rows.length ? `Showing ${recs.rows.length} of ${recs.total}. ` : ""}{recs.note}</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 16 }}>
        {GROUPS.map(([g, title]) => {
          const rows = sc.metrics.filter((m) => m.group === g);
          if (!rows.length) return null;
          return (
            <div key={g} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", backgroundColor: "var(--u-surface-alt)", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>{title}</div>
              {rows.map((m) => (
                <div key={m.key} role="button" tabIndex={0} aria-pressed={openKey === m.key} onClick={() => pick(m)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(m); } }} style={{ padding: "12px 16px", borderTop: "1px solid var(--u-border)", cursor: "pointer", backgroundColor: openKey === m.key ? "var(--u-accent-magenta-tint)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
                      {m.label}
                      {m.weight > 0 && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: "var(--u-ink-secondary)" }}>weight {m.weight}</span>}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: STATUS_COLOR[m.status] }}>{m.display}</span>
                  </div>
                  {m.score !== null && (
                    <span aria-hidden style={{ display: "block", height: 4, borderRadius: 999, backgroundColor: "var(--u-surface-alt)", overflow: "hidden", margin: "8px 0 6px" }}>
                      <span style={{ display: "block", height: "100%", width: `${Math.max(3, m.score)}%`, backgroundColor: STATUS_COLOR[m.status] }} />
                    </span>
                  )}
                  <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: m.score === null ? 4 : 0 }}>{m.detail}</div>
                  {m.benchmark && <div style={{ marginTop: 4 }}><Pill tone="neutral">{m.benchmark}</Pill></div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {sc.trend.some((t) => t.deliveries > 0 || (t.complaints ?? 0) > 0) && (
        <div style={{ marginTop: 16, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", backgroundColor: "var(--u-surface-alt)", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Trend by quarter</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ textAlign: "left", color: "var(--u-ink-secondary)", fontSize: 12 }}><th style={{ padding: "8px 16px" }}>Quarter</th><th style={{ padding: "8px 16px" }}>On-time delivery</th><th style={{ padding: "8px 16px" }}>Deliveries</th>{sc.includesComplaints && <th style={{ padding: "8px 16px" }}>New complaints</th>}</tr></thead>
              <tbody>
                {sc.trend.map((t) => (
                  <tr key={t.period} style={{ borderTop: "1px solid var(--u-border)" }}>
                    <td style={{ padding: "8px 16px" }}>{t.period}</td>
                    <td style={{ padding: "8px 16px", minWidth: 180 }}>
                      {t.onTimePercent === null ? "—" : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span aria-hidden style={{ display: "inline-block", width: 90, height: 6, borderRadius: 999, backgroundColor: "var(--u-surface-alt)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${Math.max(3, t.onTimePercent)}%`, backgroundColor: t.onTimePercent >= 90 ? STATUS_COLOR.good : t.onTimePercent >= 75 ? STATUS_COLOR.warning : STATUS_COLOR.critical }} /></span>
                          {t.onTimePercent}%
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 16px" }}>{t.deliveries}</td>
                    {sc.includesComplaints && <td style={{ padding: "8px 16px" }}>{t.complaints ?? "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--u-ink-secondary)" }}>Delivery targets follow published global-health practice: {SCORECARD_THRESHOLDS.basis}.</div>
      {!sc.includesComplaints && <div style={{ marginTop: 10, fontSize: 12, color: "var(--u-ink-secondary)" }}>Complaint measures are shown only to quality roles.</div>}
    </section>
  );
}
