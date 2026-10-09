"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductAmendmentSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { Button, Pill, AlertIcon, ChevronLeftIcon, ShieldIcon } from "@universe/ui";

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontFamily: "var(--u-font-sans)",
  fontSize: 13,
  minHeight: 70,
};

/**
 * Review a single ProductAmendment — ratify it (applies the proposed
 * changes to the live ProductMaster row) or reject it (no live change,
 * with reviewer notes). Reached from the QA Queue's "Review amendment"
 * link (/quality/product-amendments?id=...) — same query-param route
 * pattern as batches/detail, partners/detail, projects/detail (Next
 * static export + dynamic-route limitation, see partners/detail's doc
 * comment). Added 2026-10-09, catalogue edit-rights + ratification
 * workflow (product-database-and-map-roadmap.md Stage 0 point 1).
 *
 * Gated server-side on `products.approve` (ProductCatalogService.
 * ratifyAmendment/rejectAmendment via assertHasPermission) — the
 * `canApprove` check here is purely cosmetic, same convention as
 * quality/page.tsx's own canApproveProducts.
 */
export default function ProductAmendmentReviewPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const me = useCurrentUser();
  const canApprove = me?.permissions.includes("products.approve") ?? false;

  const [amendment, setAmendment] = useState<ProductAmendmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    if (!id) return;
    apiClient
      .getProductAmendment(id)
      .then(setAmendment)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load this amendment"));
  }

  useEffect(reload, [id]);

  async function ratify() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.ratifyProductAmendment(id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ratify this amendment");
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.rejectProductAmendment(id, { notes: notes.trim() || undefined });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject this amendment");
    } finally {
      setSaving(false);
    }
  }

  const proposedEntries = amendment ? Object.entries(amendment.proposedChanges) : [];

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 760, margin: "0 auto" }}>
      <Link href="/quality/qa-queue" style={{ textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 14 }}>
          <ChevronLeftIcon size={14} /> Back to QA Queue
        </span>
      </Link>

      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, margin: "0 0 6px", color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
        <ShieldIcon size={20} /> Catalogue amendment
      </h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginBottom: 20 }}>
        A proposed change to a shared catalogue entry, submitted by a Project Manager / QA / RP / Admin user from
        the organisation that originally added the product. Until this is ratified or rejected, the live catalogue
        entry stays unchanged — it can still be selected onto a new project line in the meantime, with a warning.
      </p>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            marginBottom: 20,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "rgba(220,38,38,0.08)",
            fontSize: 13,
          }}
        >
          <AlertIcon size={16} />
          {error}
        </div>
      )}

      {!amendment && !error && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}

      {amendment && (
        <div
          style={{
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-lg)",
            backgroundColor: "var(--u-surface-raised)",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--u-ink)" }}>{amendment.productMasterName}</div>
              <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                Proposed by {amendment.submittedByName} ({amendment.organizationName}) on{" "}
                {new Date(amendment.submittedAt).toLocaleDateString()}
              </div>
            </div>
            <Pill tone={amendment.status === "PENDING" ? "warning" : amendment.status === "APPROVED" ? "good" : "neutral"}>
              {amendment.status}
            </Pill>
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--u-ink-secondary)", marginBottom: 6 }}>Proposed changes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {proposedEntries.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>No fields were changed.</div>
            )}
            {proposedEntries.map(([field, value]) => (
              <div
                key={field}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--u-border)",
                }}
              >
                <span style={{ color: "var(--u-ink-secondary)" }}>{field}</span>
                <span style={{ color: "var(--u-ink)", fontWeight: 600 }}>{String(value)}</span>
              </div>
            ))}
          </div>

          {amendment.status !== "PENDING" && (
            <div style={{ fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 16 }}>
              Reviewed by {amendment.reviewedByName ?? "—"} on{" "}
              {amendment.reviewedAt ? new Date(amendment.reviewedAt).toLocaleDateString() : "—"}
              {amendment.reviewNotes ? ` — "${amendment.reviewNotes}"` : ""}
            </div>
          )}

          {amendment.status === "PENDING" && canApprove && (
            <>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
                Rejection notes (optional)
                <textarea style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button variant="primary" size="sm" onClick={ratify} disabled={saving}>
                  {saving ? "Saving…" : "Ratify"}
                </Button>
                <Button variant="secondary" size="sm" onClick={reject} disabled={saving}>
                  {saving ? "Saving…" : "Reject"}
                </Button>
              </div>
            </>
          )}

          {amendment.status === "PENDING" && !canApprove && (
            <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>
              You don't have the Quality Assurance / Responsible Person permission needed to ratify or reject this.
            </p>
          )}

        </div>
      )}
    </div>
  );
}
