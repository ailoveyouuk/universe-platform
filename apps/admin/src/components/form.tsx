"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Pill } from "@universe/ui";

/** Shared Admin form primitives (added 2026-10-16) — keeps the detail pages
 * on one consistent look using only @universe/ui tokens. */

export const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  font: "inherit",
  background: "var(--u-surface)",
  color: "var(--u-ink)",
};

export function Section({ title, hint, actions, children }: { title: string; hint?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid var(--u-border)",
        borderRadius: 10,
        padding: 20,
        marginTop: 20,
        background: "var(--u-surface)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
          {hint && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)", maxWidth: 640 }}>{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
      {label}
      {children}
      {hint && <span style={{ display: "block", fontWeight: 400, fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>{hint}</span>}
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
      {children}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const color = tone === "error" ? "var(--u-status-critical)" : tone === "success" ? "var(--u-status-good)" : "var(--u-ink-secondary)";
  return <p style={{ color, fontSize: 13, margin: "8px 0" }}>{children}</p>;
}

/** Edits a string[] as removable chips plus an add box (Enter or comma adds). */
export function TagListInput({ value, onChange, placeholder }: { value: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  function commit() {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  }
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: value.length ? 6 : 0 }}>
        {value.map((v) => (
          <span
            key={v}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 10px",
              borderRadius: 999,
              background: "var(--u-surface-alt)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(value.filter((x) => x !== v))}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)", padding: 0, fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        style={{ ...inputStyle, marginTop: 0 }}
        value={draft}
        placeholder={placeholder ?? "Type and press Enter"} aria-label={placeholder ?? "Type and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

export function statusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "var(--u-status-good)";
    case "PILOT":
    case "INVITED":
      return "var(--u-status-warning)";
    default:
      return "var(--u-ink-secondary)";
  }
}

export function StatusChip({ status }: { status: string }) {
  const tone = status === "ACTIVE" ? "good" : status === "PILOT" || status === "INVITED" ? "warning" : "neutral";
  return <Pill tone={tone}>{status === "DEACTIVATED" ? "ARCHIVED" : status}</Pill>;
}

export const ORG_TYPE_LABELS: Record<string, string> = {
  PROCUREMENT_SERVICE_AGENT: "Procurement Service Agent",
  TENDERING_PURCHASING_BODY: "Tendering & Purchasing Body",
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier / Distributor",
  FUNDER_DONOR: "Funder / Donor",
  DATA_INSIGHTS_USER: "Data / Insights User",
};

export const LEGAL_ENTITY_LABELS: Record<string, string> = {
  GOVERNMENT_AGENCY: "Government agency",
  PRIVATE_COMPANY: "Private company",
  REGISTERED_NGO: "Registered NGO / nonprofit",
  FAITH_BASED_NETWORK: "Faith-based network",
  MULTILATERAL_UN_BODY: "Multilateral / UN body",
  COOPERATIVE: "Cooperative",
  ACADEMIC_INSTITUTION: "Academic institution",
  INDIVIDUAL: "Individual",
  OTHER: "Other",
};

export const ONBOARDING_SOURCE_LABELS: Record<string, string> = {
  SELF_REFERRED: "Self-referred",
  INVITED_BY_PROCUREMENT_AGENT: "Invited by a procurement agent",
  INVITED_BY_FUNDER: "Invited by a funder",
  PLATFORM_STAFF_OUTREACH: "Platform staff outreach",
  OTHER: "Other",
};
