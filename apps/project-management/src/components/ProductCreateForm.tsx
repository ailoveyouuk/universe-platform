"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { RegisterLookup } from "./RegisterLookup";
import type { CreateProductMasterInput, ProductCatalogMatch, ProductFamilySummary } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";

const LEVELS = [
  { level: "UNIT", label: "Unit / each" },
  { level: "INNER", label: "Inner pack" },
  { level: "OUTER", label: "Carton / outer" },
  { level: "PALLET", label: "Pallet" },
] as const;

export const PRODUCT_DATABASE_URL = process.env.NEXT_PUBLIC_PRODUCT_DATABASE_URL || "https://delightful-stone-0f4d11d0f.1.azurestaticapps.net";

/**
 * Add a product to the shared catalogue as a VARIANT of a family (step 3b follow-up, 2026-10-18). Same catalogue and same
 * duplicate rules as the Product Database app: pick the family (generic product), then describe the variant (strength, pack
 * size, barcodes per packaging level). Any organisation can add a variant to an existing family; only platform staff create a
 * brand-new family, so everyone else adds a standalone product that staff can later group. A duplicate is refused and the
 * existing product offered instead.
 */
export function ProductCreateForm({
  initialName = "",
  defaultCategory,
  categoryOptions,
  lockedCategory,
  onCreated,
  onUseExisting,
  onCancel,
}: {
  initialName?: string;
  defaultCategory?: string;
  categoryOptions?: string[];
  lockedCategory?: string;
  onCreated: (p: ProductCatalogMatch) => void;
  onUseExisting?: (id: string) => void;
  onCancel?: () => void;
}) {
  const me = useCurrentUser();
  const isStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const [familyQuery, setFamilyQuery] = useState(initialName);
  const [familyOptions, setFamilyOptions] = useState<ProductFamilySummary[]>([]);
  const [family, setFamily] = useState<ProductFamilySummary | null>(null);
  const [mode, setMode] = useState<"family" | "standalone" | "newFamily">("family");
  const [name, setName] = useState(initialName);
  const [newFamilyName, setNewFamilyName] = useState(initialName);
  const [variantLabel, setVariantLabel] = useState("");
  const [category, setCategory] = useState(lockedCategory ?? defaultCategory ?? "");
  const [subCategory, setSubCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [inn, setInn] = useState("");
  const [strength, setStrength] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [packSize, setPackSize] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [unspscCode, setUnspscCode] = useState("");
  const [standardUnit, setStandardUnit] = useState("");
  const [mpn, setMpn] = useState("");
  const [docs, setDocs] = useState("");
  const [contributor, setContributor] = useState<"" | "show" | "hide">("");
  const [gtins, setGtins] = useState<Record<string, { value: string; units: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "family" || family || !familyQuery.trim()) { setFamilyOptions([]); return; }
    const h = setTimeout(() => apiClient.listProductFamilies({ search: familyQuery.trim(), pageSize: 8 }).then((r) => setFamilyOptions(r.items.filter((f) => !f.isArchived))).catch(() => setFamilyOptions([])), 250);
    return () => clearTimeout(h);
  }, [familyQuery, family, mode]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setExistingId(null);
    const cat = family ? family.category : subCategory.trim() && category ? `${category}.${subCategory.trim()}` : category;
    if (!cat) { setError("Choose a category."); return; }
    if (mode === "family" && !family) { setError("Choose a family, or switch to a standalone product."); return; }
    if ((mode === "family" || mode === "newFamily") && !variantLabel.trim()) { setError("Enter a variant label, for example '500 mg, 20 tablets'."); return; }
    if (mode === "standalone" && !name.trim()) { setError("Enter a product name."); return; }
    if (mode === "newFamily" && !newFamilyName.trim()) { setError("Enter the family name."); return; }
    const identifiers = LEVELS.flatMap((l) => {
      const g = gtins[l.level];
      return g?.value.trim() ? [{ value: g.value.trim(), packagingLevel: l.level, unitsPerPack: g.units ? Number(g.units) : undefined }] : [];
    });
    const input: CreateProductMasterInput = {
      category: cat,
      ...(mode === "standalone" ? { name: name.trim() } : { variantLabel: variantLabel.trim() }),
      ...(mode === "family" && family ? { familyId: family.id } : {}),
      ...(mode === "newFamily" ? { newFamilyName: newFamilyName.trim() } : {}),
      brand: brand || undefined, inn: inn || undefined, strength: strength || undefined, dosageForm: dosageForm || undefined, packSize: packSize || undefined,
      hsCode: hsCode || undefined, unspscCode: unspscCode || undefined, standardUnit: standardUnit || undefined,
      canonicalManufacturerPartNumber: mpn || undefined, expectedQualityDocumentation: docs || undefined,
      identifiers: identifiers.length ? identifiers : undefined,
      ...(contributor ? { showContributor: contributor === "show" } : {}),
    };
    setSaving(true);
    try {
      onCreated(await apiClient.createProductCatalogEntry(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the product.");
      setExistingId((err as { existingProductId?: string }).existingProductId ?? null);
    } finally { setSaving(false); }
  }

  const label = (t: string, opt = false) => (<span>{t}{opt && <span style={{ color: "var(--u-ink-secondary)", fontWeight: 400 }}> (optional)</span>}</span>);
  const tab = (m: typeof mode, t: string) => (
    <button type="button" onClick={() => { setMode(m); setError(null); }} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, border: "1px solid var(--u-border)", background: mode === m ? "var(--u-brand-violet)" : "transparent", color: mode === m ? "#fff" : "var(--u-ink)" }}>{t}</button>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tab("family", "Variant of an existing family")}
        {isStaff && tab("newFamily", "New family")}
        {tab("standalone", "Standalone product")}
      </div>

      {mode === "family" && (
        <div>
          <label>{label("Family (generic product)")}
            <input style={inputStyle} value={family ? family.name : familyQuery} readOnly={Boolean(family)} placeholder="Search by name, brand or generic name" onChange={(e) => setFamilyQuery(e.target.value)} />
          </label>
          {family ? (
            <p style={{ fontSize: 12, margin: "6px 0 0" }}>{family.variantCount} variant{family.variantCount === 1 ? "" : "s"} · {family.category}{" "}
              <button type="button" onClick={() => { setFamily(null); setFamilyQuery(""); }} style={linkBtn}>Change</button>{" "}
              <a href={`${PRODUCT_DATABASE_URL}/families/detail?id=${family.id}`} target="_blank" rel="noreferrer" style={{ color: "var(--u-brand-violet)" }}>View in Product Database</a>
            </p>
          ) : familyOptions.length > 0 ? (
            <div style={{ border: "1px solid var(--u-border)", borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
              {familyOptions.map((f) => (
                <button key={f.id} type="button" onClick={() => { setFamily(f); setBrand(f.brand ?? ""); setInn(f.inn ?? ""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                  <strong>{f.name}</strong> <span style={{ color: "var(--u-ink-secondary)", fontSize: 11 }}>· {f.variantCount} variants · {f.category}</span>
                </button>
              ))}
            </div>
          ) : familyQuery.trim() ? (
            <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "6px 0 0" }}>No matching family. {isStaff ? "Use “New family”." : "Add it as a standalone product and platform staff will group it into a family."}</p>
          ) : null}
        </div>
      )}
      {mode === "newFamily" && <label>{label("Family name (generic product)")}<input style={inputStyle} value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="e.g. Amoxicillin capsules" /></label>}
      {mode === "standalone" && <label>{label("Product name")}<input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></label>}

      {mode !== "standalone" && (
        <label>{label("Variant label")}<input style={inputStyle} value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} placeholder="e.g. 500 mg, 20 tablets" /></label>
      )}

      {!family && (
        <div style={grid(200)}>
          <label>{label("Category")}
            {lockedCategory ? <input style={inputStyle} value={lockedCategory} disabled /> : (
              <select className="u-native-select" style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select a category</option>
                {(categoryOptions ?? []).map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            )}
          </label>
          <label>{label("Sub-category", true)}<input style={inputStyle} value={subCategory} onChange={(e) => setSubCategory(e.target.value)} /></label>
        </div>
      )}

      <div style={grid(160)}>
        <label>{label("Brand", true)}<input style={inputStyle} value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
        <label>{label("Generic name (INN)", true)}<input style={inputStyle} value={inn} onChange={(e) => setInn(e.target.value)} /></label>
        <label>{label("Strength", true)}<input style={inputStyle} value={strength} onChange={(e) => setStrength(e.target.value)} /></label>
        <label>{label("Dosage form", true)}<input style={inputStyle} value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} /></label>
        <label>{label("Pack size", true)}<input style={inputStyle} value={packSize} onChange={(e) => setPackSize(e.target.value)} placeholder="e.g. 20 tablets" /></label>
        <label>{label("Standard unit", true)}<input style={inputStyle} value={standardUnit} onChange={(e) => setStandardUnit(e.target.value)} /></label>
      </div>

      {(/pharma/i.test(lockedCategory ?? category) || family?.category.match(/pharma/i)) && <RegisterLookup term={inn || brand || (mode === "standalone" ? name : "")} onUseInn={setInn} />}

      <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 6, padding: "8px 12px" }}>
        <legend style={{ fontSize: 12.5, fontWeight: 600 }}>Barcodes (GTIN) by packaging level <span style={{ fontWeight: 400, color: "var(--u-ink-secondary)" }}>(optional)</span></legend>
        <div style={grid(220)}>
          {LEVELS.map((l) => (
            <div key={l.level} style={{ display: "flex", gap: 6 }}>
              <label style={{ flex: 1 }}>{label(l.label)}
                <input style={inputStyle} value={gtins[l.level]?.value ?? ""} onChange={(e) => setGtins({ ...gtins, [l.level]: { value: e.target.value, units: gtins[l.level]?.units ?? "" } })} />
              </label>
              {l.level !== "UNIT" && (
                <label style={{ width: 84 }}>{label("Units")}
                  <input style={inputStyle} inputMode="numeric" value={gtins[l.level]?.units ?? ""} onChange={(e) => setGtins({ ...gtins, [l.level]: { value: gtins[l.level]?.value ?? "", units: e.target.value.replace(/\D/g, "") } })} />
                </label>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <div style={grid(160)}>
        <label>{label("HS code", true)}<input style={inputStyle} value={hsCode} onChange={(e) => setHsCode(e.target.value)} /></label>
        <label>{label("UNSPSC code", true)}<input style={inputStyle} value={unspscCode} onChange={(e) => setUnspscCode(e.target.value)} /></label>
        <label>{label("Manufacturer part number", true)}<input style={inputStyle} value={mpn} onChange={(e) => setMpn(e.target.value)} /></label>
      </div>
      <label>{label("Expected quality documentation", true)}<textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={docs} onChange={(e) => setDocs(e.target.value)} placeholder="e.g. WHO PQ listing, GMP certificate, Certificate of Analysis, ISO 13485" /></label>
      <label>{label("Contributor shown to other organisations", true)}
        <select className="u-native-select" style={inputStyle} value={contributor} onChange={(e) => setContributor(e.target.value as "" | "show" | "hide")}>
          <option value="">Follow my organisation&rsquo;s setting (anonymous unless you share with Universe)</option>
          <option value="show">Show my organisation as the contributor</option>
          <option value="hide">Keep anonymous</option>
        </select>
      </label>
      <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: 0 }}>Registrations, documents and safety notices are managed on the product&rsquo;s page in the Product Database, once it is added.</p>

      {error && (
        <p style={{ color: "var(--u-status-critical)", fontSize: 13, margin: 0 }}>
          {error}{" "}
          {existingId && onUseExisting && <button type="button" onClick={() => onUseExisting(existingId)} style={linkBtn}>Use the existing product</button>}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Adding…" : "Add product"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

const inputStyle: CSSProperties = { display: "block", width: "100%", padding: 8, marginTop: 4, border: "1px solid var(--u-border)", borderRadius: 6, fontFamily: "var(--u-font-sans)", fontSize: 13.5 };
const linkBtn: CSSProperties = { background: "none", border: "none", padding: 0, color: "var(--u-brand-violet)", cursor: "pointer", font: "inherit", fontWeight: 600, textDecoration: "underline" };
const grid = (min: number): CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 12 });
