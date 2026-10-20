"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SCORECARD_THRESHOLDS } from "@universe/types";
import type { PartnerScorecard, ScorecardGroup, ScorecardMetric, ScorecardStatus } from "@universe/types";
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

  if (failed) return null;
  if (!sc) return <section style={{ marginTop: 28, color: "var(--u-ink-secondary)", fontSize: 13 }}>Loading performance…</section>;
  const band = BAND[sc.band];
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
          <span style={{ fontSize: 11.5, color: "var(--u-ink-secondary)" }}>
            {sc.coverage}% of the measures that apply have data{sc.bandNote ? ` · ${sc.bandNote}` : ""}
          </span>
        </div>
        {sc.headline.map((m) => (
          <StatTile key={m.key} label={m.label} value={m.display} icon={iconFor(m)} tone={toneFor(m.status)}
            indicator={{ color: STATUS_COLOR[m.status], label: STATUS_LABEL[m.status], fraction: m.score === null ? undefined : m.score / 100 }} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 16 }}>
        {GROUPS.map(([g, title]) => {
          const rows = sc.metrics.filter((m) => m.group === g);
          if (!rows.length) return null;
          return (
            <div key={g} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", backgroundColor: "var(--u-surface-alt)", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>{title}</div>
              {rows.map((m) => (
                <div key={m.key} style={{ padding: "12px 16px", borderTop: "1px solid var(--u-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
                      {m.href ? <Link href={m.href} style={{ color: "inherit", textDecoration: "none" }}>{m.label}</Link> : m.label}
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
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--u-ink-secondary)" }}>Delivery targets follow published global-health practice: {SCORECARD_THRESHOLDS.basis}.</div>
      {!sc.includesComplaints && <div style={{ marginTop: 10, fontSize: 12, color: "var(--u-ink-secondary)" }}>Complaint measures are shown only to quality roles.</div>}
    </section>
  );
}
