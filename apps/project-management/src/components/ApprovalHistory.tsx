"use client";

import { useEffect, useState } from "react";
import type { PartnerApprovalHistorySummary } from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { CheckCircleIcon } from "@universe/ui";

const ACTION_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  REMOVED: "Removed",
  REINSTATED: "Reinstated",
};

/**
 * Backend/frontend wiring audit fix #1 (claude/backend-frontend-wiring-audit.md)
 * — GET /partners/:id/approval-history existed server-side (and in
 * api-client) with no frontend caller at all. PartnerApprovalHistory is its
 * own append-only log distinct from the generic field-level AuditHistory
 * (see PartnerApprovalHistorySummary's doc comment in packages/types):
 * it only ever records the three partner-approval-status transitions
 * (APPROVED / REMOVED / REINSTATED), each with its own reason and, where
 * relevant, the certification statement the actor typed to confirm the
 * action — the same pattern CertificationNotice uses elsewhere on this
 * page. Built as a sibling to AuditHistory.tsx (same collapsed-by-default,
 * load-on-open shape) rather than merged into it, since the two show
 * different data with different meaning, not just a different filter on
 * the same log.
 */
export function ApprovalHistory({ partnerId }: { partnerId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<PartnerApprovalHistorySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || entries !== null) return;
    apiClient
      .listPartnerApprovalHistory(partnerId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load approval history"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <section style={{ marginTop: 28 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--u-ink)",
        }}
      >
        <CheckCircleIcon size={16} /> Approval history {open ? "▾" : "▸"}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {error && <div style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{error}</div>}
          {!error && entries === null && <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Loading…</div>}
          {entries !== null && entries.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>No approval actions recorded for this stakeholder yet.</div>
          )}
          {entries !== null && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--u-radius-md)",
                    border: "1px solid var(--u-border)",
                    backgroundColor: "var(--u-surface-raised)",
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "var(--u-ink-secondary)" }}>
                    <span>
                      {e.actionByName ?? "System"} · {new Date(e.actionDate).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: "var(--u-ink)" }}>
                    <strong>{ACTION_LABELS[e.action] ?? e.action}</strong>
                  </div>
                  {e.reason && <div style={{ marginTop: 2, color: "var(--u-ink-secondary)" }}>Reason: {e.reason}</div>}
                  {e.certificationStatement && (
                    <div style={{ marginTop: 6, fontStyle: "italic", color: "var(--u-ink-secondary)" }}>
                      &ldquo;{e.certificationStatement}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
