"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EvidenceDueForReviewSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, ClockIcon, ChevronLeftIcon, TextLink } from "@universe/ui";

const WINDOW_OPTIONS = [7, 30, 90] as const;

/**
 * Re-verification-due dashboard — the frontend for Gap 3's last
 * remaining UI-less piece (compliance-standards-gap-analysis.md's "What
 * still needs doing"). EvidenceService.listDueForReVerification already
 * existed on the backend; this pass also fixed it to return a mapped
 * EvidenceDueForReviewSummary instead of raw Prisma rows (see that
 * method's updated doc comment) before building this screen against it.
 *
 * A standard only ever shows up here once it has `reVerificationFrequencyMonths`
 * set and at least one VERIFIED record against it — until Lewis seeds
 * Unimed's own catalog with that field populated, this list will be
 * empty, same caveat as the gate itself.
 */
export default function ReVerificationDuePage() {
  const [withinDays, setWithinDays] = useState<number>(30);
  const [rows, setRows] = useState<EvidenceDueForReviewSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listEvidenceDueForReview(withinDays)
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((err) => {
        setRows(null);
        setError(err instanceof Error ? err.message : "Failed to load the re-verification dashboard");
      });
  }, [withinDays]);

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/quality" style={{ textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 14 }}>
          <ChevronLeftIcon size={14} /> Back to Quality Assurance
        </span>
      </Link>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
          <ClockIcon size={22} /> Re-verification due
        </h1>
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 560 }}>
          Verified evidence coming due (or already overdue) for re-verification, based on each standard&apos;s own
          re-verification cadence.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {WINDOW_OPTIONS.map((d) => (
          <Button key={d} variant={withinDays === d ? "primary" : "secondary"} onClick={() => setWithinDays(d)}>
            Next {d} days
          </Button>
        ))}
      </div>

      {error && <div style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{error}</div>}

      {rows !== null && rows.length === 0 && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, color: "var(--u-ink-secondary)" }}>
          Nothing is due for re-verification in this window. This is also what you&apos;ll see if no standard has a
          re-verification cadence set yet — see Evidence Standards.
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
                borderRadius: "var(--u-radius-md)",
                border: "1px solid var(--u-border)",
                backgroundColor: "var(--u-surface-raised)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
                  <Link href={`/partners/detail?id=${r.partnerId}`} style={{ textDecoration: "none" }}>
                    <TextLink as="span">{r.partnerName}</TextLink>
                  </Link>
                </div>
                <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>{r.standardName}</div>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 11px",
                  borderRadius: "var(--u-radius-pill)",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: r.isOverdue ? "rgba(220,38,38,0.1)" : "rgba(250,178,25,0.16)",
                  color: r.isOverdue ? "var(--u-status-critical)" : "#946014",
                }}
              >
                {r.isOverdue ? "Overdue" : "Due"} {new Date(r.dueDate).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
