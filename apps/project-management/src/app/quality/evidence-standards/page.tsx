"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { EvidenceStandardSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, Select, Pill, ShieldIcon, PlusIcon, ChevronLeftIcon } from "@universe/ui";

const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"] as const;
const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier",
  FREIGHT_FORWARDER: "Freight Forwarder",
  WAREHOUSING: "Warehousing",
};
const CATEGORIES = ["QUALITY", "BUSINESS", "FINANCIAL", "REGULATORY", "INSURANCE", "OTHER"] as const;
const EVIDENCE_TYPES = ["DOCUMENT", "CHECK"] as const;

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
 * Evidence Standards catalog — the org-level configuration screen for
 * Gap 3's Standards & Evidence scaffolding (compliance-standards-gap-
 * analysis.md / sop-driven-quality-roadmap.md "Proposed core
 * scaffolding"). Added 2026-10-08.
 *
 * Deliberately lives here under Quality, not in the cross-tenant admin
 * app (apps/admin) — EvidenceStandardDefinition rows are per-organisation
 * data scoped by the signed-in user's own tenant (same tenantScope()
 * every other org-owned table uses), whereas apps/admin is the
 * platform-operator console for onboarding organisations and inviting
 * users across tenants (see OrganizationsPage's doc comment there). An
 * org's own compliance team configuring their own evidence catalog
 * belongs next to the rest of their own Quality Assurance screens.
 *
 * Until this catalog has rows, the approval gate wired into
 * PartnersService.update() is a no-op (nothing is "mandatory" yet) — see
 * compliance-standards-gap-analysis.md's "What still needs doing".
 */
export default function EvidenceStandardsPage() {
  const [standards, setStandards] = useState<EvidenceStandardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EvidenceStandardSummary | null>(null);

  function reload() {
    apiClient
      .listEvidenceStandards(undefined, true)
      .then((data) => {
        setStandards(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load evidence standards:", err);
        setStandards(null);
        setError("Couldn't load the evidence standards catalog. This is usually temporary — try again in a moment.");
      });
  }

  useEffect(reload, []);

  function openEdit(standard: EvidenceStandardSummary) {
    setEditing(standard);
    setShowForm(true);
  }

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
            <ShieldIcon size={22} /> Evidence Standards
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 560 }}>
            The catalog of evidence this organisation requires from its stakeholders. A mandatory standard blocks a
            stakeholder from being approved until verified evidence is on file — see each stakeholder&apos;s
            Compliance &amp; evidence section.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon size={16} />}
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          New standard
        </Button>
      </div>

      {showForm && (
        <StandardForm
          existing={editing}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            reload();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            marginBottom: 12,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "rgba(220,38,38,0.08)",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--u-ink)" }}>{error}</div>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {!error && !standards && <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}

      {standards && standards.length === 0 && (
        <div
          style={{
            padding: 24,
            borderRadius: "var(--u-radius-md)",
            border: "1px dashed var(--u-border)",
            textAlign: "center",
            color: "var(--u-ink-secondary)",
            fontSize: 14,
          }}
        >
          No evidence standards yet. Add the first one to start gating stakeholder approvals on real evidence.
        </div>
      )}

      {standards && standards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {standards.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
                borderRadius: "var(--u-radius-md)",
                border: "1px solid var(--u-border)",
                backgroundColor: "var(--u-surface-raised)",
                opacity: s.active ? 1 : 0.6,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                  {s.name}
                  {s.isMandatory && <Pill tone="warning">Mandatory</Pill>}
                  {!s.active && <Pill tone="neutral">Archived</Pill>}
                </div>
                <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                  {s.category.replace(/_/g, " ")} · {s.evidenceType === "DOCUMENT" ? "Document (issue/expiry)" : "Check (dated verification)"} ·
                  applies to {s.appliesToStakeholderTypes.map((t) => ROLE_LABELS[t] ?? t).join(", ") || "no roles"}
                  {s.requiresExpiry && s.reVerificationFrequencyMonths ? ` · re-verify every ${s.reVerificationFrequencyMonths} month(s)` : ""}
                </div>
              </div>
              <Button variant="secondary" onClick={() => openEdit(s)}>
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StandardForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: EvidenceStandardSummary | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<string>(existing?.category ?? "QUALITY");
  const [evidenceType, setEvidenceType] = useState<string>(existing?.evidenceType ?? "DOCUMENT");
  const [roleTypes, setRoleTypes] = useState<string[]>(existing?.appliesToStakeholderTypes ?? []);
  const [isMandatory, setIsMandatory] = useState(existing?.isMandatory ?? true);
  const [requiresExpiry, setRequiresExpiry] = useState(existing?.requiresExpiry ?? false);
  const [reVerificationFrequencyMonths, setReVerificationFrequencyMonths] = useState(
    existing?.reVerificationFrequencyMonths ? String(existing.reVerificationFrequencyMonths) : ""
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleRole(role: string) {
    setRoleTypes((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSubmit() {
    if (!name.trim() || roleTypes.length === 0) {
      setFormError("A name and at least one applicable stakeholder type are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name,
        description: description || undefined,
        category,
        appliesToStakeholderTypes: roleTypes,
        evidenceType,
        isMandatory,
        requiresExpiry,
        reVerificationFrequencyMonths: reVerificationFrequencyMonths ? parseInt(reVerificationFrequencyMonths, 10) : undefined,
      };
      if (existing) {
        await apiClient.updateEvidenceStandard(existing.id, { ...payload, active });
      } else {
        await apiClient.createEvidenceStandard(payload);
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save this standard");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: "var(--u-radius-lg)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        marginBottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--u-ink)" }}>
        {existing ? "Edit evidence standard" : "New evidence standard"}
      </h3>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
        Name
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GDP Wholesale Dealer's Authorisation" />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
        Description (optional)
        <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Category
          <Select
            value={category}
            onChange={setCategory}
            ariaLabel="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Evidence type
          <Select
            value={evidenceType}
            onChange={setEvidenceType}
            ariaLabel="Evidence type"
            options={EVIDENCE_TYPES.map((t) => ({ value: t, label: t === "DOCUMENT" ? "Document (issue/expiry)" : "Check (dated verification)" }))}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Re-verify every (months, optional)
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={reVerificationFrequencyMonths}
            onChange={(e) => setReVerificationFrequencyMonths(e.target.value)}
          />
        </label>
      </div>

      <div>
        <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600, marginBottom: 6 }}>Applies to</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {ROLE_TYPES.map((r) => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--u-ink)" }}>
              <input type="checkbox" checked={roleTypes.includes(r)} onChange={() => toggleRole(r)} />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--u-ink)" }}>
          <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
          Mandatory (blocks approval until verified)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--u-ink)" }}>
          <input type="checkbox" checked={requiresExpiry} onChange={(e) => setRequiresExpiry(e.target.checked)} />
          Requires an expiry date
        </label>
        {existing && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--u-ink)" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        )}
      </div>

      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{formError}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save standard"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
