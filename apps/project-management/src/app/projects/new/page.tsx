"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreateProjectInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";

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
 */
export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CreateProjectInput>>({});

  const isPharma = form.projectType === "PHARMACEUTICAL";

  function update<K extends keyof CreateProjectInput>(key: K, value: CreateProjectInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiClient.createProject(form as CreateProjectInput);
      router.push(`/projects/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <h1>New Project</h1>
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
          <select
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

        <fieldset style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600 }}>Project Type</legend>
          <p style={{ marginTop: 0, color: "#6B7280", fontSize: 13 }}>
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

        <label>
          Delivery Country
          <input
            style={inputStyle}
            value={form.deliveryCountry ?? ""}
            onChange={(e) => update("deliveryCountry", e.target.value)}
          />
        </label>

        <label>
          Product Category
          <select
            style={inputStyle}
            value={form.productCategory ?? ""}
            onChange={(e) => update("productCategory", e.target.value as CreateProjectInput["productCategory"])}
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
            value={form.quantity ?? ""}
            onChange={(e) => update("quantity", Number(e.target.value))}
          />
        </label>

        <label>
          Client Product Description
          <textarea
            style={{ ...inputStyle, minHeight: 80 }}
            value={form.clientProductDescription ?? ""}
            onChange={(e) => update("clientProductDescription", e.target.value)}
          />
        </label>

        {isPharma && (
          <p style={{ background: "#EFF6FF", padding: 12, borderRadius: 8, fontSize: 13 }}>
            This is a Pharmaceutical project — once created, add line items with batch number, expiry
            date, storage conditions, and MA/PL details from the project detail page.
          </p>
        )}

        {error && <p style={{ color: "#B91C1C" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{ padding: "10px 16px", alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create Project"}
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
