"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreatePartnerInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button } from "@universe/ui";

// LOGISTICS removed 2026-10-01 — folded into Freight Forwarder/Warehousing
// per Lewis's instruction (UI-only change, see partners/page.tsx's doc
// comment for why the backend enum value itself isn't touched here).
const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"] as const;

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier",
  FREIGHT_FORWARDER: "Freight Forwarder",
  WAREHOUSING: "Warehousing",
};

export default function NewPartnerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pre-selected from the Stakeholders page's "+ Add Stakeholder" menu
  // (e.g. /partners/new?role=CLIENT) — "Manufacturer / Supplier" from that
  // menu lands here with role=MANUFACTURER pre-ticked; Supplier is one
  // click away since a partner can hold both roles at once.
  const initialRole = searchParams.get("role");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [website, setWebsite] = useState("");
  const [roleTypes, setRoleTypes] = useState<string[]>(
    initialRole && (ROLE_TYPES as readonly string[]).includes(initialRole) ? [initialRole] : []
  );

  function toggleRole(role: string) {
    setRoleTypes((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (roleTypes.length === 0) {
      setError("Select at least one role.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreatePartnerInput = {
        name,
        countryCode: countryCode || undefined,
        website: website || undefined,
        roleTypes,
      };
      await apiClient.createPartner(input);
      router.push("/partners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create partner");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 560 }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: "0 0 20px" }}>
        New Stakeholder
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Company Name
          <input required style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Country Code (ISO alpha-2)
          <input
            style={inputStyle}
            maxLength={2}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
          />
        </label>

        <label>
          Website
          <input style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>

        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 16 }}>
          <legend style={{ fontWeight: 600, fontSize: 13.5, color: "var(--u-ink)" }}>Roles</legend>
          <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13 }}>
            Select every role this stakeholder plays for your organization — a company can be, e.g., both a
            Manufacturer and a Supplier.
          </p>
          {ROLE_TYPES.map((r) => (
            <label key={r} style={{ display: "block", marginBottom: 4, fontSize: 13.5, color: "var(--u-ink)" }}>
              <input type="checkbox" checked={roleTypes.includes(r)} onChange={() => toggleRole(r)} /> {ROLE_LABELS[r]}
            </label>
          ))}
        </fieldset>

        {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create Stakeholder"}
        </Button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontFamily: "var(--u-font-sans)",
};
