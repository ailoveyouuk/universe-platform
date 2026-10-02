"use client";

import { useState } from "react";
import type { PartnerSummary, ProjectDetail, ProjectLineSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import Link from "next/link";
import { Button, TextLink } from "@universe/ui";

const RESPONSE_STATUSES = ["WAITING", "QUOTED", "DECLINED", "NO_RESPONSE"] as const;

const inputStyle = {
  padding: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 4,
  fontSize: 12,
} as const;

/**
 * Supplier Enquiries — structured RFQ tracking per line (Phase 2,
 * 2026-09-30, see backend-launch-checklist.md). The schema for this
 * (SupplierEnquiry) has existed since the 2026-09-24 rework, explicitly to
 * replace free-text RFQ notes — this is the first UI it's ever had.
 *
 * Deliberately its own small component rather than folded into LineForm:
 * enquiries have their own independent add/edit lifecycle (you log a new
 * enquiry, then come back later just to flip its status once a supplier
 * responds) rather than being part of the line's own save/cancel cycle.
 */
export function SupplierEnquiries({
  projectId,
  line,
  suppliers,
  onUpdated,
}: {
  projectId: string;
  line: ProjectLineSummary;
  suppliers: PartnerSummary[];
  onUpdated: (project: ProjectDetail) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newDateContacted, setNewDateContacted] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-row edit state for the fields that actually change after an
  // enquiry is logged: response status and the quoted price/currency once
  // a supplier comes back. Keyed by enquiry id so multiple rows could in
  // principle be mid-edit at once (not expected in practice, but harmless).
  const [editing, setEditing] = useState<Record<string, { responseStatus: string; quotedPrice: string; quotedCurrency: string }>>({});

  async function addEnquiry() {
    if (!newSupplierId) {
      setError("Select a supplier first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.createSupplierEnquiry(projectId, line.id, {
        supplierId: newSupplierId,
        dateContacted: newDateContacted || undefined,
        notes: newNotes || undefined,
      });
      onUpdated(updated);
      setAdding(false);
      setNewSupplierId("");
      setNewDateContacted("");
      setNewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log enquiry");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(enquiryId: string) {
    const e = line.enquiries.find((x) => x.id === enquiryId);
    if (!e) return;
    setEditing((prev) => ({
      ...prev,
      [enquiryId]: {
        responseStatus: e.responseStatus,
        quotedPrice: e.quotedPrice ?? "",
        quotedCurrency: e.quotedCurrency ?? "",
      },
    }));
  }

  async function saveEdit(enquiryId: string) {
    const draft = editing[enquiryId];
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateSupplierEnquiry(projectId, line.id, enquiryId, {
        responseStatus: draft.responseStatus,
        quotedPrice: draft.quotedPrice === "" ? null : Number(draft.quotedPrice),
        quotedCurrency: draft.quotedCurrency || null,
      });
      onUpdated(updated);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[enquiryId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update enquiry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--u-border)", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Supplier Enquiries ({line.enquiries.length})</p>
        {!adding && (
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            + Log Enquiry
          </Button>
        )}
      </div>

      {error && <p style={{ color: "var(--u-status-critical)", fontSize: 12, marginTop: 6 }}>{error}</p>}

      {line.enquiries.length === 0 && !adding && (
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 12, marginTop: 4 }}>No enquiries logged yet.</p>
      )}

      {line.enquiries.length > 0 && (
        <table style={{ width: "100%", marginTop: 6, fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--u-ink-secondary)" }}>
              <th style={{ fontWeight: 500, padding: "2px 6px 2px 0" }}>Supplier</th>
              <th style={{ fontWeight: 500, padding: "2px 6px" }}>Contacted</th>
              <th style={{ fontWeight: 500, padding: "2px 6px" }}>Status</th>
              <th style={{ fontWeight: 500, padding: "2px 6px" }}>Quoted Price</th>
              <th style={{ fontWeight: 500, padding: "2px 6px" }} />
            </tr>
          </thead>
          <tbody>
            {line.enquiries.map((e) => {
              const draft = editing[e.id];
              return (
                <tr key={e.id} style={{ borderTop: "1px solid var(--u-border)" }}>
                  <td style={{ padding: "4px 6px 4px 0" }}>
                    <Link href={`/partners/detail?id=${e.supplierId}`} style={{ textDecoration: "none" }}>
                      <TextLink as="span">{e.supplierName ?? "—"}</TextLink>
                    </Link>
                  </td>
                  <td style={{ padding: "4px 6px" }}>{e.dateContacted ? new Date(e.dateContacted).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "4px 6px" }}>
                    {draft ? (
                      <select className="u-native-select"
                        style={inputStyle}
                        value={draft.responseStatus}
                        onChange={(ev) => setEditing((prev) => ({ ...prev, [e.id]: { ...draft, responseStatus: ev.target.value } }))}
                      >
                        {RESPONSE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      e.responseStatus.replace(/_/g, " ")
                    )}
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    {draft ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <input
                          style={{ ...inputStyle, width: 70 }}
                          type="number"
                          value={draft.quotedPrice}
                          onChange={(ev) => setEditing((prev) => ({ ...prev, [e.id]: { ...draft, quotedPrice: ev.target.value } }))}
                        />
                        <input
                          style={{ ...inputStyle, width: 44 }}
                          maxLength={3}
                          value={draft.quotedCurrency}
                          onChange={(ev) =>
                            setEditing((prev) => ({ ...prev, [e.id]: { ...draft, quotedCurrency: ev.target.value.toUpperCase() } }))
                          }
                        />
                      </span>
                    ) : e.quotedPrice !== null ? (
                      `${e.quotedPrice} ${e.quotedCurrency ?? ""}`.trim()
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "4px 0 4px 6px", textAlign: "right" }}>
                    {draft ? (
                      <Button variant="primary" size="sm" disabled={saving} onClick={() => saveEdit(e.id)}>
                        Save
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => startEdit(e.id)}>
                        Update
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {adding && (
        <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, background: "var(--u-surface-alt)", padding: 10, borderRadius: 6 }}>
          <label style={{ fontSize: 12 }}>
            Supplier
            <select className="u-native-select" style={{ ...inputStyle, display: "block", width: "100%", marginTop: 2 }} value={newSupplierId} onChange={(e) => setNewSupplierId(e.target.value)}>
              <option value="">Select…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            Date Contacted
            <input
              type="date"
              style={{ ...inputStyle, display: "block", width: "100%", marginTop: 2 }}
              value={newDateContacted}
              onChange={(e) => setNewDateContacted(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 12, gridColumn: "span 2" }}>
            Notes
            <input
              style={{ ...inputStyle, display: "block", width: "100%", marginTop: 2 }}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </label>
          <div style={{ gridColumn: "span 2", display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" onClick={addEnquiry} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
