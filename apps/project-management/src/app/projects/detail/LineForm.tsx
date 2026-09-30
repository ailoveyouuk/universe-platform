"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import type { PartnerSummary, ProjectLineInput, ProjectLineSummary } from "@universe/types";

const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const FREIGHT_MODES = ["AIR", "SEA", "LAND"] as const;

/** date input helper: an ISO datetime string -> yyyy-mm-dd for <input type="date">. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/** ProjectLineSummary (the API read shape) carries id/projectId plus a few
 * server-computed display fields (manufacturerName, supplierName,
 * freightForwarderName) that ProjectLineInput (the PATCH/POST body) doesn't
 * accept — main.ts's ValidationPipe runs with forbidNonWhitelisted: true, so
 * sending those straight back 400s. Spreading `existing` into the form's
 * initial state bypassed TypeScript's excess-property check (it only
 * applies to object literals, not spread expressions) and this went
 * uncaught until the Phase 1 smoke test actually tried to save an edited
 * line, 2026-09-30. Strip them explicitly here instead of relying on the
 * type system to catch it next time.*/
function toLineInput(existing: ProjectLineSummary): ProjectLineInput {
  const { id: _id, projectId: _projectId, manufacturerName: _manufacturerName, supplierName: _supplierName, freightForwarderName: _freightForwarderName, ...rest } = existing;
  // Decimal columns (Prisma.Decimal) come back from the API as strings (see
  // ProjectLineSummary's doc comment: "JSON has no Decimal/Date type") but
  // ProjectLineInput — the PATCH/POST body — types them as number|null, same
  // as the numOrNull() conversion this form already does for its own input
  // onChange handlers. Converting on the way IN, not just the way out,
  // avoids re-sending a string the API would reject the same way it
  // rejected the excess fields above.
  return {
    ...rest,
    freightCost: rest.freightCost === null ? null : Number(rest.freightCost),
    supplierUnitPrice: rest.supplierUnitPrice === null ? null : Number(rest.supplierUnitPrice),
    supplierPaymentAmountTotal: rest.supplierPaymentAmountTotal === null ? null : Number(rest.supplierPaymentAmountTotal),
    supplierPaymentStatusPercent: rest.supplierPaymentStatusPercent === null ? null : Number(rest.supplierPaymentStatusPercent),
    unitSalesPrice: rest.unitSalesPrice === null ? null : Number(rest.unitSalesPrice),
    clientPaymentAmount: rest.clientPaymentAmount === null ? null : Number(rest.clientPaymentAmount),
    grossMargin: rest.grossMargin === null ? null : Number(rest.grossMargin),
    margin: rest.margin === null ? null : Number(rest.margin),
  };
}

/**
 * One line item's full editable form — procurement, freight & logistics,
 * financials, and (conditionally) the pharma batch block. Used both inline
 * for "add a new line" (existing=null) and "edit this line" (existing set).
 * Kept as one flat form rather than a wizard — Universe's real users are
 * comfortable with the dense, all-fields-visible SharePoint sheets this
 * replaces, per the schema's own design intent.
 */
export function LineForm({
  existing,
  isPharma,
  manufacturers,
  suppliers,
  freightForwarders,
  onSave,
  onCancel,
}: {
  existing: ProjectLineSummary | null;
  isPharma: boolean;
  manufacturers: PartnerSummary[];
  suppliers: PartnerSummary[];
  freightForwarders: PartnerSummary[];
  onSave: (input: ProjectLineInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectLineInput>(() => (existing ? toLineInput(existing) : {}));

  function update<K extends keyof ProjectLineInput>(key: K, value: ProjectLineInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function numOrNull(v: string): number | null {
    return v === "" ? null : Number(v);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save line");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 20, marginTop: 8 }}
    >
      <Section title="Item">
        <Field label="Client Product Description" span={2}>
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={form.clientProductDescription ?? ""}
            onChange={(e) => update("clientProductDescription", e.target.value)}
          />
        </Field>
        <Field label="Product Category">
          <select
            style={inputStyle}
            value={form.productCategory ?? ""}
            onChange={(e) => update("productCategory", e.target.value || null)}
          >
            <option value="">Select…</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={form.quantity ?? ""}
            onChange={(e) => update("quantity", numOrNull(e.target.value))}
          />
        </Field>
        <Field label="Country of Manufacture (ISO)">
          <input
            style={inputStyle}
            maxLength={2}
            value={form.countryOfManufactureCode ?? ""}
            onChange={(e) => update("countryOfManufactureCode", e.target.value.toUpperCase() || null)}
          />
        </Field>
      </Section>

      <Section title="Procurement">
        <Field label="Manufacturer">
          <select
            style={inputStyle}
            value={form.manufacturerId ?? ""}
            onChange={(e) => update("manufacturerId", e.target.value || null)}
          >
            <option value="">—</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Supplier">
          <select
            style={inputStyle}
            value={form.supplierId ?? ""}
            onChange={(e) => update("supplierId", e.target.value || null)}
          >
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Incoterm">
          <select style={inputStyle} value={form.incoterm ?? ""} onChange={(e) => update("incoterm", e.target.value || null)}>
            <option value="">—</option>
            {INCOTERMS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Client PO Number">
          <input style={inputStyle} value={form.clientPoNumber ?? ""} onChange={(e) => update("clientPoNumber", e.target.value || null)} />
        </Field>
        <Field label="Client PO Receipt Date">
          <input
            type="date"
            style={inputStyle}
            value={toDateInput(form.clientPoReceiptDate)}
            onChange={(e) => update("clientPoReceiptDate", e.target.value || null)}
          />
        </Field>
        <Field label="Internal PO Number">
          <input style={inputStyle} value={form.internalPoNumber ?? ""} onChange={(e) => update("internalPoNumber", e.target.value || null)} />
        </Field>
        <Field label="Internal PO Date Placed">
          <input
            type="date"
            style={inputStyle}
            value={toDateInput(form.internalPoDatePlaced)}
            onChange={(e) => update("internalPoDatePlaced", e.target.value || null)}
          />
        </Field>
        <Field label="GAD">
          <input type="date" style={inputStyle} value={toDateInput(form.gad)} onChange={(e) => update("gad", e.target.value || null)} />
        </Field>
        <Field label="Supplier GAD">
          <input
            type="date"
            style={inputStyle}
            value={toDateInput(form.supplierGad)}
            onChange={(e) => update("supplierGad", e.target.value || null)}
          />
        </Field>
      </Section>

      <Section title="Freight & Logistics">
        <Field label="Freight Forwarder">
          <select
            style={inputStyle}
            value={form.freightForwarderId ?? ""}
            onChange={(e) => update("freightForwarderId", e.target.value || null)}
          >
            <option value="">—</option>
            {freightForwarders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Freight Mode">
          <select style={inputStyle} value={form.freightMode ?? ""} onChange={(e) => update("freightMode", e.target.value || null)}>
            <option value="">—</option>
            {FREIGHT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Freight Cost">
          <input
            type="number"
            step="0.01"
            style={inputStyle}
            value={form.freightCost ?? ""}
            onChange={(e) => update("freightCost", numOrNull(e.target.value))}
          />
        </Field>
        <Field label="Freight Currency">
          <input maxLength={3} style={inputStyle} value={form.freightCurrency ?? ""} onChange={(e) => update("freightCurrency", e.target.value.toUpperCase() || null)} />
        </Field>
        <Field label="Warehouse Reference Number">
          <input style={inputStyle} value={form.warehouseReferenceNumber ?? ""} onChange={(e) => update("warehouseReferenceNumber", e.target.value || null)} />
        </Field>
        <Field label="Goods Collected Date">
          <input type="date" style={inputStyle} value={toDateInput(form.goodsCollectedDate)} onChange={(e) => update("goodsCollectedDate", e.target.value || null)} />
        </Field>
        <Field label="Goods Manufactured Date">
          <input type="date" style={inputStyle} value={toDateInput(form.goodsManufacturedDate)} onChange={(e) => update("goodsManufacturedDate", e.target.value || null)} />
        </Field>
        <Field label="Goods Delivered to Client Date">
          <input type="date" style={inputStyle} value={toDateInput(form.goodsDeliveredToClientDate)} onChange={(e) => update("goodsDeliveredToClientDate", e.target.value || null)} />
        </Field>
        <Field label="Promised Delivery Date">
          <input type="date" style={inputStyle} value={toDateInput(form.promisedDeliveryDate)} onChange={(e) => update("promisedDeliveryDate", e.target.value || null)} />
        </Field>
        <Field label="Actual Delivery Date">
          <input type="date" style={inputStyle} value={toDateInput(form.actualDeliveryDate)} onChange={(e) => update("actualDeliveryDate", e.target.value || null)} />
        </Field>
        <Field label="Internal On-Time">
          <Checkbox checked={form.internalOnTime} onChange={(v) => update("internalOnTime", v)} />
        </Field>
        <Field label="Supplier On-Time">
          <Checkbox checked={form.supplierOnTime} onChange={(v) => update("supplierOnTime", v)} />
        </Field>
        <Field label="Supplier In Full">
          <Checkbox checked={form.supplierInFull} onChange={(v) => update("supplierInFull", v)} />
        </Field>
      </Section>

      <Section title="Financials">
        <Field label="Supplier Unit Price">
          <input type="number" step="0.01" style={inputStyle} value={form.supplierUnitPrice ?? ""} onChange={(e) => update("supplierUnitPrice", numOrNull(e.target.value))} />
        </Field>
        <Field label="Supplier Payment Total">
          <input type="number" step="0.01" style={inputStyle} value={form.supplierPaymentAmountTotal ?? ""} onChange={(e) => update("supplierPaymentAmountTotal", numOrNull(e.target.value))} />
        </Field>
        <Field label="Supplier Payment Currency">
          <input maxLength={3} style={inputStyle} value={form.supplierPaymentCurrency ?? ""} onChange={(e) => update("supplierPaymentCurrency", e.target.value.toUpperCase() || null)} />
        </Field>
        <Field label="Supplier Payment Date">
          <input type="date" style={inputStyle} value={toDateInput(form.supplierPaymentDate)} onChange={(e) => update("supplierPaymentDate", e.target.value || null)} />
        </Field>
        <Field label="Supplier Documents Received Date">
          <input type="date" style={inputStyle} value={toDateInput(form.supplierDocumentsReceivedDate)} onChange={(e) => update("supplierDocumentsReceivedDate", e.target.value || null)} />
        </Field>
        <Field label="Supplier Payment Status %">
          <input type="number" step="0.01" style={inputStyle} value={form.supplierPaymentStatusPercent ?? ""} onChange={(e) => update("supplierPaymentStatusPercent", numOrNull(e.target.value))} />
        </Field>
        <Field label="Unit Sales Price">
          <input type="number" step="0.01" style={inputStyle} value={form.unitSalesPrice ?? ""} onChange={(e) => update("unitSalesPrice", numOrNull(e.target.value))} />
        </Field>
        <Field label="Client Payment Amount">
          <input type="number" step="0.01" style={inputStyle} value={form.clientPaymentAmount ?? ""} onChange={(e) => update("clientPaymentAmount", numOrNull(e.target.value))} />
        </Field>
        <Field label="Client Payment Currency">
          <input maxLength={3} style={inputStyle} value={form.clientPaymentCurrency ?? ""} onChange={(e) => update("clientPaymentCurrency", e.target.value.toUpperCase() || null)} />
        </Field>
        <Field label="Client Payment Date">
          <input type="date" style={inputStyle} value={toDateInput(form.clientPaymentDate)} onChange={(e) => update("clientPaymentDate", e.target.value || null)} />
        </Field>
        <Field label="Internal Invoice Number">
          <input style={inputStyle} value={form.internalInvoiceNumber ?? ""} onChange={(e) => update("internalInvoiceNumber", e.target.value || null)} />
        </Field>
        <Field label="Internal Invoice Date">
          <input type="date" style={inputStyle} value={toDateInput(form.internalInvoiceDate)} onChange={(e) => update("internalInvoiceDate", e.target.value || null)} />
        </Field>
        <Field label="Gross Margin">
          <input type="number" step="0.01" style={inputStyle} value={form.grossMargin ?? ""} onChange={(e) => update("grossMargin", numOrNull(e.target.value))} />
        </Field>
        <Field label="Margin %">
          <input type="number" step="0.01" style={inputStyle} value={form.margin ?? ""} onChange={(e) => update("margin", numOrNull(e.target.value))} />
        </Field>
      </Section>

      {isPharma && (
        <Section title="Pharma Batch Details">
          <Field label="Strength">
            <input style={inputStyle} value={form.strength ?? ""} onChange={(e) => update("strength", e.target.value || null)} />
          </Field>
          <Field label="Form">
            <input style={inputStyle} value={form.form ?? ""} onChange={(e) => update("form", e.target.value || null)} />
          </Field>
          <Field label="Pack Size">
            <input style={inputStyle} value={form.packSize ?? ""} onChange={(e) => update("packSize", e.target.value || null)} />
          </Field>
          <Field label="Batch Number">
            <input style={inputStyle} value={form.batchNumber ?? ""} onChange={(e) => update("batchNumber", e.target.value || null)} />
          </Field>
          <Field label="Expiry Date">
            <input type="date" style={inputStyle} value={toDateInput(form.expiryDate)} onChange={(e) => update("expiryDate", e.target.value || null)} />
          </Field>
          <Field label="Storage Conditions">
            <input style={inputStyle} value={form.storageConditions ?? ""} onChange={(e) => update("storageConditions", e.target.value || null)} />
          </Field>
          <Field label="Data Logger Reference">
            <input style={inputStyle} value={form.dataLoggerReference ?? ""} onChange={(e) => update("dataLoggerReference", e.target.value || null)} />
          </Field>
          <Field label="Data Logger Report Reviewed">
            <Checkbox checked={form.dataLoggerReportReviewed} onChange={(v) => update("dataLoggerReportReviewed", v)} />
          </Field>
          <Field label="Excursion Review" span={2}>
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.excursionReview ?? ""} onChange={(e) => update("excursionReview", e.target.value || null)} />
          </Field>
          <Field label="Customer Approved">
            <Checkbox checked={form.customerApproved} onChange={(v) => update("customerApproved", v)} />
          </Field>
          <Field label="RP Approved">
            <Checkbox checked={form.rpApproved} onChange={(v) => update("rpApproved", v)} />
          </Field>
          <Field label="MA/PL Number">
            <input style={inputStyle} value={form.maPl ?? ""} onChange={(e) => update("maPl", e.target.value || null)} />
          </Field>
        </Section>
      )}

      {error && <p style={{ color: "#B91C1C" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" disabled={saving} style={{ padding: "8px 16px" }}>
          {saving ? "Saving…" : existing ? "Save Line" : "Add Line"}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: "8px 16px" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "#6B7280", marginBottom: 8 }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, span, children }: { label: string; span?: number; children: React.ReactNode }) {
  return (
    <label style={{ gridColumn: span ? `span ${span}` : undefined, fontSize: 13 }}>
      {label}
      {children}
    </label>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  return (
    <select
      style={inputStyle}
      value={checked === null || checked === undefined ? "" : checked ? "true" : "false"}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "true")}
    >
      <option value="">—</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 6,
  marginTop: 2,
  border: "1px solid #D1D5DB",
  borderRadius: 6,
  fontSize: 13,
};
