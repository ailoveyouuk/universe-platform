"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { PartnerSummary, ProductBatchSummary, ProductCatalogMatch } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { Button, Select, SearchInput, Pill, TextLink, GridIcon, PlusIcon, ProductPicker, type ProductPickerOption } from "@universe/ui";

const STATUS_OPTIONS = ["", "ACTIVE", "QUARANTINED", "EXPIRED", "WITHDRAWN"] as const;

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
 * Batches — Gaps 5/6 (compliance-standards-gap-analysis.md), full
 * batch-level traceability. Added 2026-10-08, reached from the Quality
 * Assurance page ("Batches" button) since it's the same GDP cold-chain/
 * traceability remit — see sop-driven-quality-roadmap.md "Full
 * batch-level traceability for pharma projects".
 */
export default function BatchesPage() {
  const [batches, setBatches] = useState<ProductBatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchNumberQuery, setBatchNumberQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("");
  const [showForm, setShowForm] = useState(false);

  function reload() {
    apiClient
      .searchProductBatches({ batchNumber: batchNumberQuery || undefined, status: statusFilter || undefined })
      .then((data) => {
        setBatches(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load product batches:", err);
        setBatches(null);
        setError("Couldn't load batches. This is usually temporary — try again in a moment.");
      });
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchNumberQuery, statusFilter]);

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <GridIcon size={22} /> Batches
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 560 }}>
            Every place a batch was manufactured, shipped, and kept in spec — one record per real-world batch,
            linkable from any project line.
          </p>
        </div>
        <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setShowForm((v) => !v)}>
          New batch
        </Button>
      </div>

      {showForm && (
        <NewBatchForm
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <SearchInput value={batchNumberQuery} onChange={setBatchNumberQuery} placeholder="Search by batch number…" />
        </div>
        <div style={{ width: 200 }}>
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as (typeof STATUS_OPTIONS)[number])}
            allLabel="All statuses"
            ariaLabel="Filter by status"
            options={STATUS_OPTIONS.filter(Boolean).map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
          />
        </div>
      </div>

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

      {!error && !batches && <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}

      {batches && batches.length === 0 && (
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
          No batches recorded yet.
        </div>
      )}

      {batches && batches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {batches.map((b) => (
            <Link key={b.id} href={`/batches/detail?id=${b.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: "var(--u-radius-md)",
                  border: "1px solid var(--u-border)",
                  backgroundColor: "var(--u-surface-raised)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
                    <TextLink as="span">{b.batchNumber}</TextLink>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                    {b.manufacturerName ?? "No manufacturer set"}
                    {b.expiryDate ? ` — expires ${new Date(b.expiryDate).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <Pill tone={b.status === "ACTIVE" ? "good" : b.status === "QUARANTINED" ? "warning" : "neutral"}>{b.status}</Pill>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewBatchForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [batchNumber, setBatchNumber] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductCatalogMatch[]>([]);
  const [productId, setProductId] = useState("");
  const [productLabel, setProductLabel] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [manufacturers, setManufacturers] = useState<PartnerSummary[]>([]);
  const [manufacturerId, setManufacturerId] = useState("");
  const [manufacturedDate, setManufacturedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [storageConditions, setStorageConditions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listPartners("MANUFACTURER").then(setManufacturers).catch(() => setManufacturers([]));
  }, []);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient.searchProductCatalog(productQuery).then(setProductOptions).catch(() => setProductOptions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [productQuery]);

  function handleSelectProduct(option: ProductPickerOption) {
    setProductId(option.id);
    setProductLabel(option.name);
    setProductQuery("");
    setProductOptions([]);
  }

  function handleClearProduct() {
    setProductId("");
    setProductLabel(null);
  }

  async function handleCreateProduct(name: string) {
    if (!name) return;
    setCreatingProduct(true);
    try {
      const created = await apiClient.createProductCatalogEntry({ name, category: "CONSUMABLES" });
      handleSelectProduct(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add product to the catalogue");
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleSubmit() {
    if (!batchNumber.trim()) {
      setFormError("A batch number is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.createProductBatch({
        batchNumber,
        productMasterId: productId || undefined,
        manufacturerId: manufacturerId || undefined,
        manufacturedDate: manufacturedDate || undefined,
        expiryDate: expiryDate || undefined,
        storageConditions: storageConditions || undefined,
      });
      onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create batch");
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
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--u-ink)" }}>New batch</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Batch number
          <input style={inputStyle} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Product (optional)
          <ProductPicker
            query={productQuery}
            onQueryChange={setProductQuery}
            options={productOptions}
            selectedId={productId}
            selectedLabel={productLabel}
            onSelect={handleSelectProduct}
            onClear={handleClearProduct}
            onCreateNew={handleCreateProduct}
            creating={creatingProduct}
            placeholder="Start typing a product name…"
            ariaLabel="Search the product catalogue"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Manufacturer (optional)
          <Select
            value={manufacturerId}
            onChange={setManufacturerId}
            allLabel="Select a manufacturer"
            ariaLabel="Manufacturer"
            options={manufacturers.map((m) => ({ value: m.id, label: m.name }))}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Manufactured date
          <input type="date" style={inputStyle} value={manufacturedDate} onChange={(e) => setManufacturedDate(e.target.value)} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Expiry date
          <input type="date" style={inputStyle} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Storage conditions
          <input style={inputStyle} value={storageConditions} onChange={(e) => setStorageConditions(e.target.value)} placeholder="e.g. 2–8°C" />
        </label>
      </div>

      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{formError}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save batch"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
