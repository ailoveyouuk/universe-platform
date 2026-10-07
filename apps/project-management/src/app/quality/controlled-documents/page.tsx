"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { ControlledDocumentSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, Pill, Select, DocumentIcon, PlusIcon, ChevronLeftIcon } from "@universe/ui";

const CATEGORIES = ["QUALITY_MANUAL", "SOP", "POLICY", "WORK_INSTRUCTION", "OTHER"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_MANUAL: "Quality Manual",
  SOP: "SOP",
  POLICY: "Policy",
  WORK_INSTRUCTION: "Work Instruction",
  OTHER: "Other",
};

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
 * Controlled Documents register — Gap 7 (compliance-standards-gap-
 * analysis.md), the only item left in that whole analysis that was
 * completely untouched until this pass. Version-controls an
 * organisation's own SOPs/policies: a new version can reference the one
 * it supersedes, and "current" is just "nothing supersedes it" — see
 * ControlledDocument's doc comment in schema.prisma.
 *
 * Deliberately lives under Quality, same reasoning as Evidence Standards
 * next to it — this is per-organisation configuration/content, not a
 * cross-tenant admin concern.
 */
export default function ControlledDocumentsPage() {
  const [docs, setDocs] = useState<ControlledDocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [supersedeTarget, setSupersedeTarget] = useState<ControlledDocumentSummary | null>(null);

  function reload() {
    apiClient
      .listControlledDocuments()
      .then((data) => {
        setDocs(data);
        setError(null);
      })
      .catch((err) => {
        setDocs(null);
        setError(err instanceof Error ? err.message : "Failed to load the controlled-document register");
      });
  }

  useEffect(reload, []);

  // Group by title so each document's version history renders together,
  // newest first within the group.
  const groups = new Map<string, ControlledDocumentSummary[]>();
  (docs ?? []).forEach((d) => {
    const key = d.title;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/quality" style={{ textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 14 }}>
          <ChevronLeftIcon size={14} /> Back to Quality Assurance
        </span>
      </Link>

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <DocumentIcon size={22} /> Controlled Documents
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 560 }}>
            This organisation&apos;s own SOPs and policies, version-controlled: who approved the current version,
            when it took effect, and what it superseded.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon size={16} />}
          onClick={() => {
            setSupersedeTarget(null);
            setShowForm(true);
          }}
        >
          New document
        </Button>
      </div>

      {showForm && (
        <DocumentForm
          supersedes={supersedeTarget}
          onSaved={() => {
            setShowForm(false);
            setSupersedeTarget(null);
            reload();
          }}
          onCancel={() => {
            setShowForm(false);
            setSupersedeTarget(null);
          }}
        />
      )}

      {error && <div style={{ color: "var(--u-status-critical)", fontSize: 13, marginTop: 12 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {docs !== null && docs.length === 0 && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, color: "var(--u-ink-secondary)" }}>
            No controlled documents recorded yet.
          </div>
        )}
        {Array.from(groups.entries()).map(([title, versions]) => {
          const current = versions.find((v) => v.isCurrent) ?? versions[0];
          const history = versions.filter((v) => v.id !== current.id);
          return (
            <div key={title} style={{ borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface-raised)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
                    {title} <span style={{ color: "var(--u-ink-secondary)", fontWeight: 400 }}>v{current.version}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                    {CATEGORY_LABELS[current.category] ?? current.category}
                    {current.effectiveDate ? ` — effective ${new Date(current.effectiveDate).toLocaleDateString()}` : ""}
                    {current.approvedByName ? ` — approved by ${current.approvedByName}` : " — not yet approved"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Pill tone={current.approvedById ? "good" : "warning"}>{current.approvedById ? "Approved" : "Pending approval"}</Pill>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSupersedeTarget(current);
                      setShowForm(true);
                    }}
                  >
                    New version
                  </Button>
                </div>
              </div>
              {history.length > 0 && (
                <div style={{ padding: "0 16px 12px", fontSize: 12, color: "var(--u-ink-secondary)" }}>
                  Earlier versions: {history.map((v) => `v${v.version}`).join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentForm({
  supersedes,
  onSaved,
  onCancel,
}: {
  supersedes: ControlledDocumentSummary | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(supersedes?.title ?? "");
  const [category, setCategory] = useState<string>(supersedes?.category ?? "SOP");
  const [version, setVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim() || !version.trim()) {
      setError("Title and version are both required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.createControlledDocument({
        title: title.trim(),
        category,
        version: version.trim(),
        effectiveDate: effectiveDate || undefined,
        supersedesId: supersedes?.id,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save this document");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        marginBottom: 8,
      }}
    >
      {supersedes && (
        <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginBottom: 10 }}>
          New version of &ldquo;{supersedes.title}&rdquo; (currently v{supersedes.version}).
        </div>
      )}
      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Title
          <input style={inputStyle} value={title} disabled={Boolean(supersedes)} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Category
          <div style={{ marginTop: 4, opacity: supersedes ? 0.6 : 1, pointerEvents: supersedes ? "none" : "auto" }}>
            <Select
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
              ariaLabel="Category"
            />
          </div>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Version
          <input style={inputStyle} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 2.0" />
        </label>
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 10, maxWidth: 240 }}>
        Effective date
        <input type="date" style={inputStyle} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
      </label>
      {error && <div style={{ marginTop: 8, color: "var(--u-status-critical)", fontSize: 12 }}>{error}</div>}
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
