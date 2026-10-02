"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ProductCatalogMatch, ProductCatalogDetail, UpdateProductMasterInput } from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { Button, Pagination, Pill, SearchInput, Select, TextLink, type PageSize } from "@universe/ui";

/**
 * Product Database Management — Catalogue screen. Added 2026-10-03, the
 * first dedicated browse/search/edit screen for the shared ProductMaster
 * catalogue (`@universe/ui`'s ProductPicker only ever shows a 25-row
 * typeahead inline inside other apps' forms — see product-catalog-build.md
 * — nothing until now has let anyone look at the catalogue itself end to
 * end). Deliberately server-paginated via ProductCatalogService.list()
 * rather than the client-side-filter-everything pattern
 * apps/project-management/src/app/partners/page.tsx uses: that pattern
 * fetches every row up front, which is fine for one tenant's own
 * stakeholders but not for a catalogue every organisation on the platform
 * contributes to and that reference-data importers (see /import) can grow
 * into the thousands.
 *
 * Click a row to expand an inline edit panel underneath it (not a
 * separate /products/detail route — the field set is small enough that a
 * full page navigation would be more friction than it's worth for what is
 * mostly quick corrections to an imported or picker-created row).
 */
const CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "LABORATORY"] as const;
const SOURCE_STANDARDS = ["INTERNAL", "HS_CODE", "WHO_EML", "UNSPSC", "GS1_GTIN"] as const;

export default function ProductCatalogPage() {
  const [items, setItems] = useState<ProductCatalogMatch[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sourceStandard, setSourceStandard] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .listProductCatalog({
        q: search || undefined,
        category: category || undefined,
        sourceStandard: sourceStandard || undefined,
        page: page + 1,
        pageSize: pageSize === "all" ? 200 : pageSize,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the product catalogue"))
      .finally(() => setLoading(false));
  }, [search, category, sourceStandard, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / (pageSize === "all" ? 200 : pageSize)));

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>Product Catalogue</h1>
          <p style={{ color: "var(--u-ink-secondary)", marginTop: 6, fontSize: 14 }}>
            The shared ProductMaster catalogue — every product any organisation on Universe has added, picked, or imported. Browse,
            search, and correct entries here; new entries are usually added inline from a project line, Quality approval, or the{" "}
            <Link href="/import" style={{ textDecoration: "none" }}>
              <TextLink as="span">reference-data importer</TextLink>
            </Link>.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by product name…" />
        <Select
          value={category}
          onChange={(v) => { setCategory(v); setPage(0); }}
          options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))}
          allLabel="All categories"
          ariaLabel="Filter by category"
        />
        <Select
          value={sourceStandard}
          onChange={(v) => { setSourceStandard(v); setPage(0); }}
          options={SOURCE_STANDARDS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
          allLabel="All sources"
          ariaLabel="Filter by source standard"
        />
      </div>

      {error && <p style={{ color: "var(--u-status-critical)", marginTop: 16 }}>{error}</p>}
      {!items && !error && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}

      {items && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--u-border)" }}>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Name</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Category</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>HS Code</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>UNSPSC</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>GTIN</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Added by</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onSaved={() => { setExpandedId(null); load(); }}
                />
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, color: "var(--u-ink-secondary)", textAlign: "center" }}>
                    No catalogue entries match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={total}
          />
        </>
      )}
    </main>
  );
}

function ProductRow({
  product,
  expanded,
  onToggle,
  onSaved,
}: {
  product: ProductCatalogMatch;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: expanded ? "none" : "1px solid var(--u-border)", cursor: "pointer" }}
        className="u-card-hover"
      >
        <td style={{ padding: 8, fontWeight: 600 }}>{product.name}</td>
        <td style={{ padding: 8 }}>
          <Pill tone="neutral">{product.category}</Pill>
        </td>
        <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.hsCode ?? "—"}</td>
        <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.unspscCode ?? "—"}</td>
        <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.gtin ?? "—"}</td>
        <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.addedByOrganizationName ?? "—"}</td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: "1px solid var(--u-border)" }}>
          <td colSpan={6} style={{ padding: "4px 8px 16px" }}>
            <ProductEditPanel productId={product.id} onSaved={onSaved} onCancel={onToggle} />
          </td>
        </tr>
      )}
    </>
  );
}

function ProductEditPanel({ productId, onSaved, onCancel }: { productId: string; onSaved: () => void; onCancel: () => void }) {
  const [detail, setDetail] = useState<ProductCatalogDetail | null>(null);
  const [form, setForm] = useState<UpdateProductMasterInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getProductCatalogEntry(productId)
      .then((d) => {
        setDetail(d);
        setForm({
          name: d.name,
          category: d.category,
          hsCode: d.hsCode ?? "",
          unspscCode: d.unspscCode ?? "",
          gtin: d.gtin ?? "",
          standardUnit: d.standardUnit ?? "",
          canonicalManufacturerPartNumber: d.canonicalManufacturerPartNumber ?? "",
          expectedQualityDocumentation: d.expectedQualityDocumentation ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load entry"));
  }, [productId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateProductCatalogEntry(productId, form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!detail) {
    return <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>{error ?? "Loading…"}</p>;
  }

  const fieldStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: "var(--u-radius-md)",
    border: "1px solid var(--u-border)",
    fontSize: 13.5,
    width: "100%",
  };

  return (
    <div
      style={{
        border: "1px solid var(--u-border)",
        borderRadius: "var(--u-radius-lg)",
        backgroundColor: "var(--u-surface-raised)",
        padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
      }}
    >
      <Field label="Name">
        <input style={fieldStyle} value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </Field>
      <Field label="Category">
        <input style={fieldStyle} value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
      </Field>
      <Field label="HS Code">
        <input style={fieldStyle} value={form.hsCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, hsCode: e.target.value }))} />
      </Field>
      <Field label="UNSPSC Code">
        <input style={fieldStyle} value={form.unspscCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, unspscCode: e.target.value }))} />
      </Field>
      <Field label="GTIN">
        <input style={fieldStyle} value={form.gtin ?? ""} onChange={(e) => setForm((f) => ({ ...f, gtin: e.target.value }))} />
      </Field>
      <Field label="Standard Unit">
        <input style={fieldStyle} value={form.standardUnit ?? ""} onChange={(e) => setForm((f) => ({ ...f, standardUnit: e.target.value }))} />
      </Field>
      <Field label="Canonical Manufacturer Part Number">
        <input
          style={fieldStyle}
          value={form.canonicalManufacturerPartNumber ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, canonicalManufacturerPartNumber: e.target.value }))}
        />
      </Field>
      <Field label="Expected Quality Documentation" span>
        <textarea
          style={{ ...fieldStyle, minHeight: 60 }}
          value={form.expectedQualityDocumentation ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, expectedQualityDocumentation: e.target.value }))}
        />
      </Field>

      {error && (
        <p style={{ gridColumn: "1 / -1", color: "var(--u-status-critical)", fontSize: 13, margin: 0 }}>{error}</p>
      )}

      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, span, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}
