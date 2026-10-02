"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreateProjectInput, CreateProjectLineInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { Button, CountrySelect } from "@universe/ui";

const CATEGORY_OPTIONS = ["PROCUREMENT", "TECHNICAL_ASSISTANCE"] as const;
const PROJECT_TYPE_OPTIONS = ["PHARMACEUTICAL", "NON_PHARMACEUTICAL"] as const;
const PRODUCT_CATEGORY_OPTIONS = [
  "CONSUMABLES",
  "DEVICES",
  "REAGENTS",
  "EQUIPMENT",
  "PHARMACEUTICALS",
  "LABORATORY",
] as const;

/**
 * Project intake form. Project Type (Pharmaceutical / Non-Pharmaceutical) is
 * asked FIRST, right after the basics — it's not a SharePoint field, it's new
 * for Universe, and it drives whether the pharma-only line item fields
 * (batch, expiry, storage conditions, MA/PL, etc.) show up later in the
 * project's line items step. Non-pharma projects skip that entirely.
 *
 * Updated 2026-09-24, schema rework: Project is now a header only — the
 * "what's being procured" fields (product description/category/quantity)
 * live on ProjectLine, so this form collects them into a nested `firstLine`
 * object rather than flat top-level fields. See CreateProjectLineInput.
 */
export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CreateProjectInput>>({});
  const countries = useCountries();

  const isPharma = form.projectType === "PHARMACEUTICAL";

  function update<K extends keyof CreateProjectInput>(key: K, value: CreateProjectInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine<K extends keyof CreateProjectLineInput>(key: K, value: CreateProjectLineInput[K]) {
    setForm((prev) => ({ ...prev, firstLine: { ...prev.firstLine, [key]: value } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiClient.createProject(form as CreateProjectInput);
      router.push(`/projects/detail?id=${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: "0 0 20px" }}>New Project</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Reference Number
          <input
            required
            style={inputStyle}
            value={form.referenceNumber ?? ""}
            onChange={(e) => update("referenceNumber", e.target.value)}
          />
        </label>

        <label>
          Project Title
          <input
            required
            style={inputStyle}
            value={form.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>

        <label>
          Category
          <select className="u-native-select"
            required
            style={inputStyle}
            value={form.category ?? ""}
            onChange={(e) => update("category", e.target.value as CreateProjectInput["category"])}
          >
            <option value="" disabled>
              Select…
            </option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600 }}>Project Type</legend>
          <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13 }}>
            Determines whether pharma-specific fields (batch number, expiry, storage conditions, MA/PL, etc.)
            are required on this project's line items.
          </p>
          {PROJECT_TYPE_OPTIONS.map((t) => (
            <label key={t} style={{ display: "block", marginBottom: 4 }}>
              <input
                type="radio"
                name="projectType"
                required
                checked={form.projectType === t}
                onChange={() => update("projectType", t)}
              />{" "}
              {t === "PHARMACEUTICAL" ? "Pharmaceutical" : "Non-Pharmaceutical"}
            </label>
          ))}
        </fieldset>

        <label style={{ display: "block" }}>
          <span>Delivery Country</span>
          <div style={{ marginTop: 4 }}>
            <CountrySelect
              value={form.deliveryCountryCode ?? ""}
              onChange={(code) => update("deliveryCountryCode", code)}
              options={countries}
              ariaLabel="Delivery country"
            />
          </div>
        </label>

        <label>
          Donor Reference
          <input
            style={inputStyle}
            value={form.donorReference ?? ""}
            onChange={(e) => update("donorReference", e.target.value)}
          />
        </label>

        <label>
          Product Category
          <select className="u-native-select"
            style={inputStyle}
            value={form.firstLine?.productCategory ?? ""}
            onChange={(e) => updateLine("productCategory", e.target.value)}
          >
            <option value="">Select…</option>
            {PRODUCT_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          Due Date
          <input
            type="date"
            style={inputStyle}
            value={form.dueDate ?? ""}
            onChange={(e) => update("dueDate", e.target.value)}
          />
        </label>

        <label>
          Quantity
          <input
            type="number"
            min={1}
            style={inputStyle}
            value={form.firstLine?.quantity ?? ""}
            onChange={(e) => updateLine("quantity", Number(e.target.value))}
          />
        </label>

        <label>
          Client Product Description
          <textarea
            style={{ ...inputStyle, minHeight: 80 }}
            value={form.firstLine?.clientProductDescription ?? ""}
            onChange={(e) => updateLine("clientProductDescription", e.target.value)}
          />
        </label>

        {isPharma && (
          <p style={{ background: "var(--u-accent-magenta-tint)", padding: 12, borderRadius: 8, fontSize: 13 }}>
            This is a Pharmaceutical project — once created, add line items with batch number, expiry
            date, storage conditions, and MA/PL details from the project detail page.
          </p>
        )}

        {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create Project"}
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
};
