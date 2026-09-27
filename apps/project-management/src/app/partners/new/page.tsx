"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreatePartnerInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";

const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS"] as const;

export default function NewPartnerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [website, setWebsite] = useState("");
  const [roleTypes, setRoleTypes] = useState<string[]>([]);

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
    <main style={{ padding: 32, maxWidth: 560 }}>
      <h1>New Partner</h1>
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

        <fieldset style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600 }}>Roles</legend>
          <p style={{ marginTop: 0, color: "#6B7280", fontSize: 13 }}>
            Select every role this partner plays for your organization — a company can be, e.g., both a
            Manufacturer and a Supplier.
          </p>
          {ROLE_TYPES.map((r) => (
            <label key={r} style={{ display: "block", marginBottom: 4 }}>
              <input type="checkbox" checked={roleTypes.includes(r)} onChange={() => toggleRole(r)} />{" "}
              {r.replace(/_/g, " ")}
            </label>
          ))}
        </fieldset>

        {error && <p style={{ color: "#B91C1C" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{ padding: "10px 16px", alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create Partner"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid #D1D5DB",
  borderRadius: 6,
};
