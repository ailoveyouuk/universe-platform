"use client";

import { useEffect, useState } from "react";
import type { FieldChangeLogEntry } from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { ClockIcon } from "@universe/ui";

/**
 * Gap 1 (compliance-standards-gap-analysis.md) — the frontend half of
 * the generic field-level audit trail. AuditLogService already existed
 * on the backend (GET /audit-log?tableName=&recordId=) with nowhere in
 * the UI to actually see it — this is that viewer, built as one shared
 * component so every detail page (Partner, Project, Batch, Risk
 * Assessment, ...) gets it for free rather than reinventing it each time.
 *
 * Collapsed by default — an audit trail is something a user checks when
 * they need it, not something that should push a detail page's normal
 * content down every time it's opened.
 */
export function AuditHistory({ tableName, recordId }: { tableName: string; recordId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<FieldChangeLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || entries !== null) return;
    apiClient
      .getAuditLog(tableName, recordId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audit history"));
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
        <ClockIcon size={16} /> Audit history {open ? "▾" : "▸"}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {error && <div style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{error}</div>}
          {!error && entries === null && <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Loading…</div>}
          {entries !== null && entries.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>No field changes recorded for this record yet.</div>
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
                      {e.changedByName ?? "System"} · {new Date(e.changedAt).toLocaleString()}
                      {e.source !== "API" ? ` · ${e.source}` : ""}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: "var(--u-ink)" }}>
                    <strong>{e.fieldName}</strong>: {e.oldValue ?? "—"} → {e.newValue ?? "—"}
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
