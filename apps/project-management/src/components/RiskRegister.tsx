"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { RiskAssessmentSummary } from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { Button, Select, AlertIcon } from "@universe/ui";

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];
const LIKELIHOOD_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];
const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "MITIGATED", label: "Mitigated" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "CLOSED", label: "Closed" },
];

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

const textareaStyle: CSSProperties = { ...inputStyle, minHeight: 60, resize: "vertical" };

/** Pill (from @universe/ui) has no "critical" tone — see its own type —
 * so CRITICAL/HIGH severity is rendered as a plain custom-coloured span
 * instead, same convention as EvidenceStandardRow's status indicator on
 * the Partner detail page (partners/detail/page.tsx). */
function severityStyle(severity: string): { bg: string; fg: string } {
  if (severity === "CRITICAL" || severity === "HIGH") return { bg: "rgba(220,38,38,0.1)", fg: "var(--u-status-critical)" };
  if (severity === "MEDIUM") return { bg: "rgba(250,178,25,0.16)", fg: "#946014" };
  return { bg: "var(--u-surface-alt)", fg: "var(--u-ink-secondary)" };
}

/**
 * Gap 4 (compliance-standards-gap-analysis.md) — the frontend for the
 * minimal, generic risk register (RiskAssessment, already fully built on
 * the backend — see RiskAssessmentsService). One shared component,
 * embedded wherever a subject that can carry risk has a detail page
 * (Partner, Project, Batch) — subjectType/subjectId is the same
 * polymorphic-reference pair the backend already uses, so this component
 * never needs to know what kind of page it's on.
 */
export function RiskRegister({ subjectType, subjectId }: { subjectType: string; subjectId: string }) {
  const [risks, setRisks] = useState<RiskAssessmentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function load() {
    apiClient
      .listRiskAssessments(subjectType, subjectId)
      .then(setRisks)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load risk register"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectType, subjectId]);

  async function handleStatusChange(id: string, status: string) {
    try {
      await apiClient.updateRiskAssessment(id, { status });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update this risk");
    }
  }

  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertIcon size={16} /> Risk register
        </h2>
        <Button variant="secondary" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "Log a risk"}
        </Button>
      </div>

      {error && <div style={{ marginTop: 8, color: "var(--u-status-critical)", fontSize: 13 }}>{error}</div>}

      {adding && (
        <NewRiskForm
          subjectType={subjectType}
          subjectId={subjectId}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {risks !== null && risks.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>No risks logged for this record yet.</div>
        )}
        {risks?.map((r) => (
          <div
            key={r.id}
            style={{
              padding: "12px 16px",
              borderRadius: "var(--u-radius-md)",
              border: "1px solid var(--u-border)",
              backgroundColor: "var(--u-surface-raised)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>{r.title}</div>
                {r.description && <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", marginTop: 2 }}>{r.description}</div>}
                <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 4 }}>
                  Likelihood: {r.likelihood.toLowerCase()}
                  {r.mitigation ? ` — Mitigation: ${r.mitigation}` : ""}
                  {r.ownerName ? ` — Owner: ${r.ownerName}` : ""}
                  {r.reviewDate ? ` — Review by ${new Date(r.reviewDate).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 11px",
                    borderRadius: "var(--u-radius-pill)",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: severityStyle(r.severity).bg,
                    color: severityStyle(r.severity).fg,
                  }}
                >
                  {r.severity}
                </span>
                <div style={{ width: 130 }}>
                  <Select value={r.status} onChange={(v) => handleStatusChange(r.id, v)} options={STATUS_OPTIONS} ariaLabel="Risk status" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NewRiskForm({
  subjectType,
  subjectId,
  onSaved,
}: {
  subjectType: string;
  subjectId: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [likelihood, setLikelihood] = useState("MEDIUM");
  const [mitigation, setMitigation] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.createRiskAssessment({
        subjectType,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        likelihood,
        mitigation: mitigation.trim() || undefined,
        reviewDate: reviewDate || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log this risk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 16,
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
      }}
    >
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
        Title
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 10 }}>
        Description
        <textarea style={textareaStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Severity
          <Select value={severity} onChange={setSeverity} options={SEVERITY_OPTIONS} ariaLabel="Severity" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Likelihood
          <Select value={likelihood} onChange={setLikelihood} options={LIKELIHOOD_OPTIONS} ariaLabel="Likelihood" />
        </label>
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 10 }}>
        Mitigation / control plan
        <textarea style={textareaStyle} value={mitigation} onChange={(e) => setMitigation(e.target.value)} />
      </label>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 10 }}>
        Review by
        <input type="date" style={inputStyle} value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
      </label>
      {error && <div style={{ marginTop: 8, color: "var(--u-status-critical)", fontSize: 12 }}>{error}</div>}
      <div style={{ marginTop: 12 }}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Log risk"}
        </Button>
      </div>
    </div>
  );
}
