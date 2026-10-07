"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductBatchDetail } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, Select, Pill, TextLink, GridIcon, AlertIcon, ChevronLeftIcon } from "@universe/ui";
import { AuditHistory } from "../../../components/AuditHistory";
import { RiskRegister } from "../../../components/RiskRegister";

const STATUS_OPTIONS = ["ACTIVE", "QUARANTINED", "EXPIRED", "WITHDRAWN"] as const;

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontFamily: "var(--u-font-sans)",
  fontSize: 13,
};

/**
 * Batch detail — Gaps 5/6. Query-param route (/batches/detail?id=...),
 * same reasoning as partners/detail and projects/detail (Next static
 * export + dynamic-route limitation — see partners/detail's doc comment).
 * Added 2026-10-08.
 */
export default function BatchDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [batch, setBatch] = useState<ProductBatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  function reload() {
    if (!id) return;
    apiClient
      .getProductBatch(id)
      .then(setBatch)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load this batch"));
  }

  useEffect(reload, [id]);

  async function handleStatusChange(status: string) {
    if (!id) return;
    setStatusSaving(true);
    try {
      await apiClient.updateProductBatch(id, { status });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleReviewLog(logId: string) {
    try {
      await apiClient.reviewBatchTemperatureLog(logId, {});
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review this log");
    }
  }

  if (!id) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>No batch specified.</main>;
  if (error && !batch) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>{error}</main>;
  if (!batch) return <main style={{ padding: 32, color: "var(--u-ink-secondary)" }}>Loading…</main>;

  const unreviewedExcursions = batch.temperatureLogs.filter((l) => l.hasExcursion && !l.reviewed);

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 860, margin: "0 auto" }}>
      <Link href="/batches" style={{ textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 14 }}>
          <ChevronLeftIcon size={14} /> Back to Batches
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--u-radius-md)",
              backgroundColor: "var(--u-accent-magenta-tint)",
              color: "var(--u-brand-violet)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <GridIcon size={22} />
          </span>
          <div>
            <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>{batch.batchNumber}</h1>
            <div style={{ fontSize: 13, color: "var(--u-ink-secondary)", marginTop: 4 }}>
              {batch.manufacturerName ?? "No manufacturer set"}
              {batch.productMasterName ? ` — ${batch.productMasterName}` : ""}
            </div>
          </div>
        </div>
        <div style={{ width: 180 }}>
          <Select
            value={batch.status}
            onChange={handleStatusChange}
            ariaLabel="Batch status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
          />
        </div>
      </div>

      {unreviewedExcursions.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            marginTop: 16,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "rgba(220,38,38,0.08)",
            fontSize: 13,
            color: "var(--u-ink)",
          }}
        >
          <AlertIcon size={16} />
          {unreviewedExcursions.length} unreviewed temperature excursion{unreviewedExcursions.length > 1 ? "s" : ""} on this batch.
        </div>
      )}

      {error && <div style={{ marginTop: 12, color: "var(--u-status-critical)", fontSize: 13 }}>{error}</div>}

      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <InfoCard label="Manufactured">{batch.manufacturedDate ? new Date(batch.manufacturedDate).toLocaleDateString() : "—"}</InfoCard>
        <InfoCard label="Expiry">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "—"}</InfoCard>
        <InfoCard label="Storage conditions">{batch.storageConditions ?? "—"}</InfoCard>
        <InfoCard label="Qualification pathway">
          {batch.qualificationPathway ?? "—"}
          {batch.qualificationPathwayExpiryDate ? ` (expires ${new Date(batch.qualificationPathwayExpiryDate).toLocaleDateString()})` : ""}
        </InfoCard>
        <InfoCard label="MA/PL number">{batch.maPl ?? "—"}</InfoCard>
        <InfoCard label="Notes">{batch.notes ?? "—"}</InfoCard>
      </div>

      {batch.projectLines.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", marginBottom: 10 }}>Shipped on</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batch.projectLines.map((line) => (
              <Link key={line.id} href={`/projects/detail?id=${line.projectId}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--u-radius-md)",
                    border: "1px solid var(--u-border)",
                    backgroundColor: "var(--u-surface-raised)",
                    fontSize: 13,
                  }}
                >
                  <TextLink as="span">{line.projectReferenceNumber}</TextLink>
                  {line.clientName ? ` — ${line.clientName}` : ""}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>Temperature log</h2>
          <Button variant="secondary" onClick={() => setShowLogForm((v) => !v)}>
            {showLogForm ? "Cancel" : "Add reading"}
          </Button>
        </div>

        {showLogForm && (
          <AddTemperatureLogForm
            batchId={batch.id}
            onSaved={() => {
              setShowLogForm(false);
              reload();
            }}
          />
        )}

        {batch.temperatureLogs.length === 0 ? (
          <div style={{ padding: "12px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, color: "var(--u-ink-secondary)" }}>
            No readings logged yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batch.temperatureLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 16px",
                  borderRadius: "var(--u-radius-md)",
                  border: log.hasExcursion ? "1px solid var(--u-status-critical)" : "1px solid var(--u-border)",
                  backgroundColor: log.hasExcursion ? "rgba(220,38,38,0.06)" : "var(--u-surface-raised)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--u-ink)" }}>
                    {new Date(log.recordedAt).toLocaleString()}
                    {log.loggerReference ? ` — ${log.loggerReference}` : ""}
                  </div>
                  {log.readingSummary && <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>{log.readingSummary}</div>}
                  {log.hasExcursion && log.excursionNotes && (
                    <div style={{ fontSize: 12, color: "var(--u-status-critical)", marginTop: 2 }}>Excursion: {log.excursionNotes}</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {log.hasExcursion && <Pill tone={log.reviewed ? "neutral" : "warning"}>{log.reviewed ? "Reviewed" : "Needs review"}</Pill>}
                  {log.hasExcursion && !log.reviewed && (
                    <Button variant="secondary" onClick={() => handleReviewLog(log.id)}>
                      Mark reviewed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <RiskRegister subjectType="PRODUCT_BATCH" subjectId={batch.id} />
      <AuditHistory tableName="product_batches" recordId={batch.id} />
    </main>
  );
}

function AddTemperatureLogForm({ batchId, onSaved }: { batchId: string; onSaved: () => void }) {
  const [loggerReference, setLoggerReference] = useState("");
  const [readingSummary, setReadingSummary] = useState("");
  const [hasExcursion, setHasExcursion] = useState(false);
  const [excursionNotes, setExcursionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.addBatchTemperatureLog(batchId, {
        loggerReference: loggerReference || undefined,
        readingSummary: readingSummary || undefined,
        hasExcursion,
        excursionNotes: hasExcursion ? excursionNotes || undefined : undefined,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add this reading");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        marginBottom: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Data-logger reference
          <input style={inputStyle} value={loggerReference} onChange={(e) => setLoggerReference(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Reading summary
          <input style={inputStyle} value={readingSummary} onChange={(e) => setReadingSummary(e.target.value)} placeholder="e.g. 2–8°C maintained throughout transit" />
        </label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--u-ink)" }}>
        <input type="checkbox" checked={hasExcursion} onChange={(e) => setHasExcursion(e.target.checked)} />
        This reading recorded a temperature excursion
      </label>
      {hasExcursion && (
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Excursion notes
          <input style={inputStyle} value={excursionNotes} onChange={(e) => setExcursionNotes(e.target.value)} />
        </label>
      )}
      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      <div>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save reading"}
        </Button>
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--u-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--u-ink)" }}>{children}</div>
    </div>
  );
}
