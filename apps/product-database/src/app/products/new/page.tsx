"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCT_GROUPS_NON_PHARMA, UNIT_OPTIONS, type CreateProductMasterInput } from "@universe/types";
import { Button, Select, UnitSelect } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";

const NON_PHARMA_CATEGORIES = PRODUCT_GROUPS_NON_PHARMA;

/**
 * Add Product — replicated 2026-10-14 from Project Management's
 * products/new/page.tsx (Lewis: the Product Database app's Import screen
 * had no way to add a single product one at a time, only bulk CSV — see
 * backend-frontend-wiring-audit.md/this request). Same component, same
 * backend call (POST /product-catalog via createProductCatalogEntry —
 * ProductCatalogService, apps/api/src/product-catalog/), deliberately not
 * factored into a shared package component: the two apps' "Add Product"
 * entry points differ in where they link back to on success (the
 * dashboard vs. the catalogue itself), and duplicating this one small
 * screen is cheaper than threading a shared component through two app
 * builds for a form this size. Keep the two in sync by hand if the
 * ProductMaster field set changes — see CreateProductMasterInput.
 *
 * "Contextualised" here means what the form actually asks for differs by
 * context: Pharmaceutical locks the category to PHARMACEUTICALS (with an
 * optional free-text sub-category, since ProductMaster.category supports a
 * hierarchical "Category.Subcategory" path — see its doc comment in
 * schema.prisma) and prompts for quality documentation in pharma terms
 * (WHO EML/GMP/batch-release paperwork); Non-Pharmaceutical offers the
 * other five categories and a more general documentation prompt.
 * ProductMaster has no pharma-only columns (strength/batch/expiry live on
 * ProjectLine, not the shared catalogue entry), so the contextualisation
 * is in category scoping and field guidance, not a different field set.
 */
export default function AddProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") === "PHARMACEUTICAL" ? "PHARMACEUTICAL" : "NON_PHARMACEUTICAL";
  const isPharma = context === "PHARMACEUTICAL";

  const [name, setName] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [category, setCategory] = useState<string>(isPharma ? "PHARMACEUTICALS" : "");
  const [hsCode, setHsCode] = useState("");
  const [unspscCode, setUnspscCode] = useState("");
  const [gtin, setGtin] = useState("");
  const [standardUnit, setStandardUnit] = useState("");
  const [canonicalManufacturerPartNumber, setCanonicalManufacturerPartNumber] = useState("");
  const [expectedQualityDocumentation, setExpectedQualityDocumentation] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category) {
      setError("Product name and category are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateProductMasterInput = {
        name: name.trim(),
        category: subCategory.trim() ? `${category}.${subCategory.trim()}` : category,
        hsCode: hsCode || undefined,
        unspscCode: unspscCode || undefined,
        gtin: gtin || undefined,
        standardUnit: standardUnit || undefined,
        canonicalManufacturerPartNumber: canonicalManufacturerPartNumber || undefined,
        expectedQualityDocumentation: expectedQualityDocumentation || undefined,
      };
      const result = await apiClient.createProductCatalogEntry(input);
      setCreated(result.name);
      setName("");
      setSubCategory("");
      setHsCode("");
      setUnspscCode("");
      setGtin("");
      setStandardUnit("");
      setCanonicalManufacturerPartNumber("");
      setExpectedQualityDocumentation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 640 }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: "0 0 6px" }}>
        Add Product
      </h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13.5, marginBottom: 20 }}>
        {isPharma
          ? "Adds a pharmaceutical product to the shared Universe product catalogue, available immediately to project lines, Quality Assurance approvals, and every other organisation's search."
          : "Adds a non-pharmaceutical product to the shared Universe product catalogue, available immediately to project lines, Quality Assurance approvals, and every other organisation's search."}
      </p>

      {created && (
        <div
          style={{
            background: "var(--u-surface-subtle, #F0F7F0)",
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-md, 8px)",
            padding: "10px 14px",
            fontSize: 13.5,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>
            <strong>{created}</strong> was added to the product catalogue.
          </span>
          <Button type="button" variant="secondary" onClick={() => router.push("/")}>
            Back to Catalogue
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Product Name
          <input required style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12 }}>
          <label style={{ display: "block" }}>
            <span>Category</span>
            <div style={{ marginTop: 4 }}>
              {isPharma ? (
                <input style={inputStyle} value="Pharmaceuticals" disabled />
              ) : (
                <Select
                  value={category}
                  onChange={setCategory}
                  options={NON_PHARMA_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  allLabel="Select a category"
                  ariaLabel="Product category"
                />
              )}
            </div>
          </label>
          <label>
            Sub-category <span style={{ color: "var(--u-ink-secondary)", fontWeight: 400 }}>(optional)</span>
            <input
              style={inputStyle}
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder={isPharma ? "e.g. Antibiotics" : "e.g. Cryovial"}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 12 }}>
          <label>
            HS Code
            <input style={inputStyle} value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
          </label>
          <label>
            UNSPSC Code
            <input style={inputStyle} value={unspscCode} onChange={(e) => setUnspscCode(e.target.value)} />
          </label>
          <label>
            GTIN
            <input style={inputStyle} value={gtin} onChange={(e) => setGtin(e.target.value)} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
          <label>
            Standard Unit
            <UnitSelect value={standardUnit} onChange={setStandardUnit} options={UNIT_OPTIONS} ariaLabel="Standard unit" allLabel="Not specified" />
          </label>
          <label>
            Canonical Manufacturer Part Number <span style={{ color: "var(--u-ink-secondary)", fontWeight: 400 }}>(optional)</span>
            <input style={inputStyle} value={canonicalManufacturerPartNumber} onChange={(e) => setCanonicalManufacturerPartNumber(e.target.value)} />
          </label>
        </div>

        <label style={{ display: "block" }}>
          Expected Quality Documentation
          <textarea
            style={textareaStyle}
            value={expectedQualityDocumentation}
            onChange={(e) => setExpectedQualityDocumentation(e.target.value)}
            placeholder={
              isPharma
                ? "e.g. WHO EML listing, GMP certificate, batch release certificate, Certificate of Analysis"
                : "e.g. ISO 13485, CE/MDR Declaration of Conformity, Instructions for Use"
            }
          />
        </label>

        {error && <p style={{ color: "var(--u-status-critical-text)" }}>{error}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Adding…" : "Add Product"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/")}>
            Cancel
          </Button>
        </div>
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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 72,
  resize: "vertical",
};
