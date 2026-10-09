"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { PartnerSummary, ProductBatchSummary, ProductCatalogMatch, ProjectLineInput, ProjectLineSummary } from "@universe/types";
import { CURRENCY_OPTIONS } from "@universe/types";
import { Button, CountrySelect, CurrencySelect, ProductPicker, type ProductPickerOption } from "@universe/ui";
import { useCountries } from "../../../lib/useCountries";
import { apiClient } from "../../../lib/apiClient";

const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;
const PAYMENT_STATUSES = ["NOT_STARTED", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;
const QUALIFICATION_PATHWAYS = ["WHO_PQ", "SRA", "ERP", "ISO13485", "ISO9001", "WHOPES", "GHTF", "OTHER"] as const;
/** A project's "awarded or later" statuses — the point at which the
 * post-award fields below (client/internal PO numbers, warehouse ref,
 * collection/delivery dates, supplier payment/invoice fields) actually
 * have anything meaningful to enter. Added 2026-10-03 per Lewis: during
 * IN_PROGRESS (pre-award) there's genuinely no data for these yet, so
 * showing empty inputs for them is just noise — see isAwardedOrLater's
 * usage below. The underlying data is never hidden once it exists (a
 * line that already has these values keeps showing them even if the
 * project moves backward) — same "foreground, don't hide" convention
 * ProjectDetailView.tsx already uses for its own stage-based fields. */
const AWARDED_OR_LATER_STATUSES = ["AWARDED", "COMPLETED"] as const;

/** date input helper: an ISO datetime string -> yyyy-mm-dd for <input type="date">. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/** ProjectLineSummary (the API read shape) carries id/projectId plus a few
 * server-computed display fields (manufacturerName, supplierName,
 * productMasterName) that ProjectLineInput (the PATCH/POST body) doesn't
 * accept — main.ts's ValidationPipe runs with forbidNonWhitelisted: true, so
 * sending those straight back 400s. Spreading `existing` into the form's
 * initial state bypassed TypeScript's excess-property check (it only
 * applies to object literals, not spread expressions) and this went
 * uncaught until the Phase 1 smoke test actually tried to save an edited
 * line, 2026-09-30. Strip them explicitly here instead of relying on the
 * type system to catch it next time.*/
function toLineInput(existing: ProjectLineSummary): ProjectLineInput {
  const {
    id: _id,
    projectId: _projectId,
    manufacturerName: _manufacturerName,
    supplierName: _supplierName,
    productMasterName: _productMasterName,
    otif: _otif,
    supplierRemainingBalance: _supplierRemainingBalance,
    // Nested relation array (SupplierEnquiry rows, each with its own
    // independent add/edit lifecycle via SupplierEnquiries.tsx) — not
    // part of ProjectLineInput, same reason as the other relation/
    // display-only fields stripped here. Missing from this list is what
    // caused the "property enquiries should not exist" 400 surfaced by
    // the 2026-10-03 round 7 live smoke test (see
    // currency-conversion-and-pricing.md "Round 3").
    enquiries: _enquiries,
    // Currency conversion fields (added 2026-10-02) — server-computed,
    // display-only (see ProjectLineSummary's doc comment in
    // packages/types) — not part of ProjectLineInput, so they'd 400
    // against the API's forbidNonWhitelisted ValidationPipe the same way
    // the other display-only fields above would.
    reportingCurrencyCode: _reportingCurrencyCode,
    supplierPriceLockedAt: _supplierPriceLockedAt,
    supplierUnitPriceReportingCcy: _supplierUnitPriceReportingCcy,
    supplierTotalPriceReportingCcy: _supplierTotalPriceReportingCcy,
    salesPriceLockedAt: _salesPriceLockedAt,
    salesUnitPriceReportingCcy: _salesUnitPriceReportingCcy,
    salesTotalPriceReportingCcy: _salesTotalPriceReportingCcy,
    // Computed-only (2026-10-03 margin-based invoice build) — see
    // ProjectLine's "Margin-based client invoice build" doc comment in
    // schema.prisma. Not part of ProjectLineInput.
    productMarginAmount: _productMarginAmount,
    // Computed-only (2026-10-08 supply-chain CO2/distance feature) — see
    // LogisticsMetricSummary in packages/types. Not part of
    // ProjectLineInput; the org-private Logistics view (ApiClient.
    // getLogisticsLines) is where this is displayed/filtered, not this
    // form.
    logisticsMetric: _logisticsMetric,
    ...rest
  } = existing;
  // Decimal columns (Prisma.Decimal) come back from the API as strings (see
  // ProjectLineSummary's doc comment: "JSON has no Decimal/Date type") but
  // ProjectLineInput — the PATCH/POST body — types them as number|null, same
  // as the numOrNull() conversion this form already does for its own input
  // onChange handlers. Converting on the way IN, not just the way out,
  // avoids re-sending a string the API would reject the same way it
  // rejected the excess fields above.
  return {
    ...rest,
    supplierUnitPrice: rest.supplierUnitPrice === null ? null : Number(rest.supplierUnitPrice),
    supplierPaymentAmountTotal: rest.supplierPaymentAmountTotal === null ? null : Number(rest.supplierPaymentAmountTotal),
    supplierAmountPaid: rest.supplierAmountPaid === null ? null : Number(rest.supplierAmountPaid),
    quantityReceived: rest.quantityReceived === null ? null : Number(rest.quantityReceived),
    productMarginPercent: rest.productMarginPercent === null ? null : Number(rest.productMarginPercent),
    unitSalesPrice: rest.unitSalesPrice === null ? null : Number(rest.unitSalesPrice),
    clientPaymentAmount: rest.clientPaymentAmount === null ? null : Number(rest.clientPaymentAmount),
    grossMargin: rest.grossMargin === null ? null : Number(rest.grossMargin),
    margin: rest.margin === null ? null : Number(rest.margin),
    // Added 2026-10-08 — see weightKg's doc comment in schema.prisma.
    weightKg: rest.weightKg === null ? null : Number(rest.weightKg),
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
  projectStatus,
  manufacturers,
  suppliers,
  onSave,
  onCancel,
}: {
  existing: ProjectLineSummary | null;
  isPharma: boolean;
  /** The parent Project's status — drives the 15-field stage gate below
   * (see AWARDED_OR_LATER_STATUSES). Freight forwarder is no longer a
   * per-line concern (moved to project level 2026-10-03), so
   * freightForwarders is no longer a prop here. */
  projectStatus: string;
  manufacturers: PartnerSummary[];
  suppliers: PartnerSummary[];
  onSave: (input: ProjectLineInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectLineInput>(() => (existing ? toLineInput(existing) : {}));
  const countries = useCountries();

  // Linked batch record (Gaps 5/6, compliance-standards-gap-analysis.md —
  // added 2026-10-08) — distinct from the free-text Batch Number above,
  // which stays untouched: this links the line to a first-class
  // ProductBatch so its temperature-log history is traceable from both
  // directions. A simple search-as-you-type combobox since there's no
  // dedicated batch picker component yet (unlike ProductPicker).
  const [batchQuery, setBatchQuery] = useState("");
  const [batchOptions, setBatchOptions] = useState<ProductBatchSummary[]>([]);
  const [linkedBatchLabel, setLinkedBatchLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!form.productBatchId) {
      setLinkedBatchLabel(null);
      return;
    }
    apiClient
      .getProductBatch(form.productBatchId)
      .then((b) => setLinkedBatchLabel(b.batchNumber))
      .catch(() => setLinkedBatchLabel(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!batchQuery.trim()) {
      setBatchOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient.searchProductBatches({ batchNumber: batchQuery }).then(setBatchOptions).catch(() => setBatchOptions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [batchQuery]);

  function selectBatch(b: ProductBatchSummary) {
    update("productBatchId", b.id);
    setLinkedBatchLabel(b.batchNumber);
    setBatchQuery("");
    setBatchOptions([]);
  }

  function clearBatch() {
    update("productBatchId", null);
    setLinkedBatchLabel(null);
  }

  /** The 15 post-award fields (client/internal PO, warehouse ref,
   * collection/delivery dates, supplier payment/invoice fields) stay
   * hidden until the project reaches AWARDED — but never hidden again
   * once any of them already has a value, per the "foreground, don't
   * hide existing data" convention ProjectDetailView.tsx already uses
   * for its own stage-based fields. Added 2026-10-03 per Lewis: during
   * IN_PROGRESS there's genuinely no data for these yet. */
  const hasAnyPostAwardData = Boolean(
    existing &&
      (existing.clientPoNumber ||
        existing.clientPoReceiptDate ||
        existing.internalPoNumber ||
        existing.internalPoDatePlaced ||
        existing.warehouseReferenceNumber ||
        existing.goodsCollectedDate ||
        existing.goodsDeliveredToClientDate ||
        existing.actualDeliveryDate ||
        existing.supplierPaymentDate ||
        existing.supplierDocumentsReceivedDate ||
        existing.supplierAmountPaid ||
        existing.supplierPaymentStatus ||
        existing.clientPaymentDate ||
        existing.internalInvoiceNumber ||
        existing.internalInvoiceDate),
  );
  const isAwardedOrLater =
    (AWARDED_OR_LATER_STATUSES as readonly string[]).includes(projectStatus) || hasAnyPostAwardData;

  // Product catalog picker (added 2026-10-02) — search-or-create against
  // the shared ProductMaster catalogue, same pattern as the stakeholder
  // registry's duplicate-prevention prompt in partners/new/page.tsx. See
  // claude/product-catalog-build.md. Kept as line-form-local state (not
  // lifted into ProjectLineInput) since it's purely the search UI's own
  // working state — the only thing that ends up on the form is
  // productMasterId itself.
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductCatalogMatch[]>([]);
  const [productLabel, setProductLabel] = useState<string | null>(existing?.productMasterName ?? null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  /** Added 2026-10-09 — catalogue edit-rights + ratification workflow.
   * Only known for a product picked THIS session (the search result
   * carries the flag); an existing line reopened for editing shows no
   * warning until the product is re-selected — acceptable for a
   * non-blocking, informational badge, not worth a dedicated fetch on
   * every line load. See ProductPicker's own doc comment. */
  const [productHasPendingAmendment, setProductHasPendingAmendment] = useState(false);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient
        .searchProductCatalog(productQuery, form.productCategory ?? undefined)
        .then(setProductOptions)
        .catch(() => setProductOptions([]));
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery]);

  function handleSelectProduct(option: ProductPickerOption) {
    update("productMasterId", option.id);
    setProductLabel(option.name);
    setProductHasPendingAmendment(Boolean(option.hasPendingAmendment));
    setProductQuery("");
    setProductOptions([]);
  }

  function handleClearProduct() {
    update("productMasterId", null);
    setProductLabel(null);
    setProductHasPendingAmendment(false);
  }

  async function handleCreateProduct(name: string) {
    if (!name) return;
    setCreatingProduct(true);
    try {
      const created = await apiClient.createProductCatalogEntry({
        name,
        category: form.productCategory ?? "CONSUMABLES",
      });
      handleSelectProduct(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product to the catalogue");
    } finally {
      setCreatingProduct(false);
    }
  }

  function update<K extends keyof ProjectLineInput>(key: K, value: ProjectLineInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function numOrNull(v: string): number | null {
    return v === "" ? null : Number(v);
  }

  /** Client-side preview of ProjectsService.applyPricing's unit-price x
   * quantity arithmetic — purely cosmetic (so the "(calculated)" fields
   * don't just sit blank while editing); the API recomputes and returns
   * the authoritative figure on save, which is what's actually persisted
   * and what the reporting-currency fields above are locked against. */
  function computedTotal(unitPrice: number | null | undefined, quantity: number | null | undefined): string {
    if (unitPrice === null || unitPrice === undefined || quantity === null || quantity === undefined) return "";
    return String(Math.round(unitPrice * quantity * 100) / 100);
  }

  /** Client-side preview of a margin amount (total x percent / 100). */
  function marginAmountPreview(total: string, percent: number | null | undefined): string {
    if (total === "" || percent === null || percent === undefined) return "";
    return String(Math.round(Number(total) * (percent / 100) * 100) / 100);
  }

  /** Divides a preview total string by quantity, for a per-unit preview. */
  function perUnitPreview(total: string, quantity: number | null | undefined): string {
    if (total === "" || !quantity) return "";
    return String(Math.round((Number(total) / quantity) * 100) / 100);
  }

  /** Client-side preview of the margin-based client invoice total —
   * product total + product margin ONLY (freight moved to a separate
   * project-level charge 2026-10-03, see ProjectDetailView.tsx's Freight
   * & Logistics section — it is no longer part of any line's invoice).
   * Ignores currency conversion (same cosmetic-preview convention as
   * computedTotal); the authoritative, currency-converted figure always
   * comes back from the API on save, see ProjectsService.applyPricing's
   * "Client invoice" step. */
  function invoiceTotalPreview(): string {
    const productTotal = computedTotal(form.supplierUnitPrice, form.quantity);
    const productMargin = marginAmountPreview(productTotal, form.productMarginPercent);
    const parts = [productTotal, productMargin].filter((v) => v !== "");
    if (parts.length === 0) return "";
    return String(Math.round(parts.reduce((a, b) => a + Number(b), 0) * 100) / 100);
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
      style={{ background: "var(--u-surface-alt)", border: "1px solid var(--u-border)", borderRadius: 8, padding: 20, marginTop: 8 }}
    >
      <Section title="Item">
        <Field label="Client Product Description" span={2}>
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={form.clientProductDescription ?? ""}
            onChange={(e) => update("clientProductDescription", e.target.value)}
          />
        </Field>
        <Field label="Matched Product (shared catalogue)" span={2}>
          <ProductPicker
            query={productQuery}
            onQueryChange={setProductQuery}
            options={productOptions}
            selectedId={form.productMasterId}
            selectedLabel={productLabel}
            selectedHasPendingAmendment={productHasPendingAmendment}
            onSelect={handleSelectProduct}
            onClear={handleClearProduct}
            onCreateNew={handleCreateProduct}
            creating={creatingProduct}
            ariaLabel="Search the product catalogue"
          />
          {productHasPendingAmendment && (
            <p style={{ fontSize: 12, color: "var(--u-status-warning)", margin: "6px 0 0" }}>
              This product has a pending amendment awaiting QA/RP ratification — it can still be used on this line.
            </p>
          )}
        </Field>
        <Field label="Product Category">
          <select className="u-native-select"
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
        <Field label="Net weight (kg)">
          <input
            type="number"
            min={0}
            step="0.001"
            style={inputStyle}
            value={form.weightKg ?? ""}
            onChange={(e) => update("weightKg", numOrNull(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="Procurement">
        <Field label="Country of Manufacture">
          <CountrySelect
            value={form.countryOfManufactureCode ?? ""}
            onChange={(code) => update("countryOfManufactureCode", code || null)}
            options={countries}
            ariaLabel="Country of manufacture"
          />
        </Field>
        <Field label="Manufacturer">
          <select className="u-native-select"
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
          <select className="u-native-select"
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
        <Field label="Goods Manufactured Date">
          <input type="date" style={inputStyle} value={toDateInput(form.goodsManufacturedDate)} onChange={(e) => update("goodsManufacturedDate", e.target.value || null)} />
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
        {isAwardedOrLater && (
          <>
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
          </>
        )}
      </Section>

      <Section title="Freight & Logistics">
        <Field label="Warehouse Reference Number">
          <input style={inputStyle} value={form.warehouseReferenceNumber ?? ""} onChange={(e) => update("warehouseReferenceNumber", e.target.value || null)} />
        </Field>
        <Field label="Projected Delivery Date">
          <input type="date" style={inputStyle} value={toDateInput(form.projectedDeliveryDate)} onChange={(e) => update("projectedDeliveryDate", e.target.value || null)} />
        </Field>
        {isAwardedOrLater && (
          <>
            <Field label="Goods Collected Date">
              <input type="date" style={inputStyle} value={toDateInput(form.goodsCollectedDate)} onChange={(e) => update("goodsCollectedDate", e.target.value || null)} />
            </Field>
            <Field label="Goods Delivered to Client Date">
              <input type="date" style={inputStyle} value={toDateInput(form.goodsDeliveredToClientDate)} onChange={(e) => update("goodsDeliveredToClientDate", e.target.value || null)} />
            </Field>
            <Field label="Actual Delivery Date">
              <input type="date" style={inputStyle} value={toDateInput(form.actualDeliveryDate)} onChange={(e) => update("actualDeliveryDate", e.target.value || null)} />
            </Field>
          </>
        )}
        <Field label="Quantity Received">
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={form.quantityReceived ?? ""}
            onChange={(e) => update("quantityReceived", numOrNull(e.target.value))}
          />
        </Field>
        {/* internalOnTime / supplierOnTime / supplierInFull are
            server-computed on every save from the dates + quantityReceived
            above (see ProjectsService.computeOnTimeInFull) — no longer
            client-settable dropdowns as of 2026-10-03. Shown read-only
            here from `existing` (the last-saved value); they won't reflect
            edits made in this form until the line is saved and reloaded. */}
        <Field label="Internal On-Time (calculated)">
          <input
            style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
            value={existing?.internalOnTime === null || existing?.internalOnTime === undefined ? "—" : existing.internalOnTime ? "Yes" : "No"}
            readOnly
            disabled
          />
        </Field>
        <Field label="Supplier On-Time (calculated)">
          <input
            style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
            value={existing?.supplierOnTime === null || existing?.supplierOnTime === undefined ? "—" : existing.supplierOnTime ? "Yes" : "No"}
            readOnly
            disabled
          />
        </Field>
        <Field label="Supplier In Full (calculated)">
          <input
            style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
            value={existing?.supplierInFull === null || existing?.supplierInFull === undefined ? "—" : existing.supplierInFull ? "Yes" : "No"}
            readOnly
            disabled
          />
        </Field>
      </Section>

      <Section title="Financials">
        <Field label="Supplier Unit Price">
          <input type="number" step="0.01" style={inputStyle} value={form.supplierUnitPrice ?? ""} onChange={(e) => update("supplierUnitPrice", numOrNull(e.target.value))} />
        </Field>
        {/* Computed (unit price x quantity) server-side as of 2026-10-02 —
            no longer free-text, see ProjectsService.applyPricing. Shown
            here as a live client-side preview of the same arithmetic so
            the form doesn't look blank while editing; the authoritative
            value always comes back from the API on save. */}
        <Field label="Supplier Payment Total (calculated)">
          <input type="number" step="0.01" style={{ ...inputStyle, background: "var(--u-surface-alt)" }} value={computedTotal(form.supplierUnitPrice, form.quantity)} readOnly disabled />
        </Field>
        <Field label="Supplier Payment Currency">
          <CurrencySelect
            value={form.supplierPaymentCurrency ?? ""}
            onChange={(code) => update("supplierPaymentCurrency", code || null)}
            options={CURRENCY_OPTIONS}
            ariaLabel="Supplier payment currency"
          />
        </Field>
        {existing && existing.reportingCurrencyCode && (existing.supplierUnitPriceReportingCcy || existing.supplierTotalPriceReportingCcy) && (
          <Field label={`Supplier Price (${existing.reportingCurrencyCode}, locked ${toDateInput(existing.supplierPriceLockedAt) || "—"})`}>
            <input
              style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
              value={`Unit: ${existing.supplierUnitPriceReportingCcy ?? "—"} · Total: ${existing.supplierTotalPriceReportingCcy ?? "—"}`}
              readOnly
              disabled
            />
          </Field>
        )}
        {isAwardedOrLater && (
          <>
            <Field label="Supplier Payment Date">
              <input type="date" style={inputStyle} value={toDateInput(form.supplierPaymentDate)} onChange={(e) => update("supplierPaymentDate", e.target.value || null)} />
            </Field>
            <Field label="Supplier Documents Received Date">
              <input type="date" style={inputStyle} value={toDateInput(form.supplierDocumentsReceivedDate)} onChange={(e) => update("supplierDocumentsReceivedDate", e.target.value || null)} />
            </Field>
            <Field label="Supplier Amount Paid">
              <input type="number" step="0.01" style={inputStyle} value={form.supplierAmountPaid ?? ""} onChange={(e) => update("supplierAmountPaid", numOrNull(e.target.value))} />
            </Field>
            <Field label="Supplier Payment Status">
              <select className="u-native-select" style={inputStyle} value={form.supplierPaymentStatus ?? ""} onChange={(e) => update("supplierPaymentStatus", e.target.value || null)}>
                <option value="">Select…</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field label="Product Margin %">
          <input type="number" step="0.01" style={inputStyle} value={form.productMarginPercent ?? ""} onChange={(e) => update("productMarginPercent", numOrNull(e.target.value))} />
        </Field>
        <Field label="Product Margin Amount (calculated)">
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
            value={marginAmountPreview(computedTotal(form.supplierUnitPrice, form.quantity), form.productMarginPercent)}
            readOnly
            disabled
          />
        </Field>
        {/* Unit Sales Price / Client Payment Amount are now computed
            server-side from the margin-based invoice formula (product
            total + product margin ONLY — freight is a separate
            project-level charge as of 2026-10-03, see
            ProjectDetailView.tsx's Freight & Logistics section),
            converted to Client Payment Currency — no longer independent
            free-text entry, see ProjectsService.applyPricing's "Client
            invoice" step. Shown read-only here; invoiceTotalPreview() is
            the same cosmetic, currency-conversion-ignoring preview
            convention as computedTotal above. */}
        <Field label="Unit Sales Price (calculated)">
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
            value={perUnitPreview(invoiceTotalPreview(), form.quantity)}
            readOnly
            disabled
          />
        </Field>
        <Field label="Client Payment Amount (calculated)">
          <input type="number" step="0.01" style={{ ...inputStyle, background: "var(--u-surface-alt)" }} value={invoiceTotalPreview()} readOnly disabled />
        </Field>
        <Field label="Client Payment Currency">
          <CurrencySelect
            value={form.clientPaymentCurrency ?? ""}
            onChange={(code) => update("clientPaymentCurrency", code || null)}
            options={CURRENCY_OPTIONS}
            ariaLabel="Client payment currency"
          />
        </Field>
        {existing && existing.reportingCurrencyCode && (existing.salesUnitPriceReportingCcy || existing.salesTotalPriceReportingCcy) && (
          <Field label={`Client Invoice (${existing.reportingCurrencyCode}, locked ${toDateInput(existing.salesPriceLockedAt) || "—"})`}>
            <input
              style={{ ...inputStyle, background: "var(--u-surface-alt)" }}
              value={`Unit: ${existing.salesUnitPriceReportingCcy ?? "—"} · Total: ${existing.salesTotalPriceReportingCcy ?? "—"}`}
              readOnly
              disabled
            />
          </Field>
        )}
        {isAwardedOrLater && (
          <>
            <Field label="Client Payment Date">
              <input type="date" style={inputStyle} value={toDateInput(form.clientPaymentDate)} onChange={(e) => update("clientPaymentDate", e.target.value || null)} />
            </Field>
            <Field label="Internal Invoice Number">
              <input style={inputStyle} value={form.internalInvoiceNumber ?? ""} onChange={(e) => update("internalInvoiceNumber", e.target.value || null)} />
            </Field>
            <Field label="Internal Invoice Date">
              <input type="date" style={inputStyle} value={toDateInput(form.internalInvoiceDate)} onChange={(e) => update("internalInvoiceDate", e.target.value || null)} />
            </Field>
          </>
        )}
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
          <Field label="Linked Batch Record (traceability)">
            {linkedBatchLabel ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: "var(--u-ink)" }}>{linkedBatchLabel}</span>
                <button type="button" onClick={clearBatch} style={{ fontSize: 12, color: "var(--u-ink-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Clear
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  style={inputStyle}
                  value={batchQuery}
                  onChange={(e) => setBatchQuery(e.target.value)}
                  placeholder="Search batch number…"
                />
                {batchOptions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 5,
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      border: "1px solid var(--u-border)",
                      borderRadius: 6,
                      backgroundColor: "var(--u-surface-raised)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      maxHeight: 180,
                      overflowY: "auto",
                    }}
                  >
                    {batchOptions.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => selectBatch(b)}
                        style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "var(--u-ink)" }}
                      >
                        {b.batchNumber}
                        {b.manufacturerName ? ` — ${b.manufacturerName}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <Field label="Qualification Pathway">
            <select className="u-native-select" style={inputStyle} value={form.qualificationPathway ?? ""} onChange={(e) => update("qualificationPathway", e.target.value || null)}>
              <option value="">Select…</option>
              {QUALIFICATION_PATHWAYS.map((q) => (
                <option key={q} value={q}>
                  {q.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          {form.qualificationPathway === "ERP" && (
            <Field label="Qualification Pathway Expiry (ERP max. 12 months)">
              <input
                type="date"
                style={inputStyle}
                value={toDateInput(form.qualificationPathwayExpiryDate)}
                onChange={(e) => update("qualificationPathwayExpiryDate", e.target.value || null)}
              />
            </Field>
          )}
        </Section>
      )}

      {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : existing ? "Save Line" : "Add Line"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "var(--u-ink-secondary)", marginBottom: 8 }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{children}</div>
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
    <select className="u-native-select"
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
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontSize: 13,
};
