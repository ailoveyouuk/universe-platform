import type { ProjectLineInput, ProjectLineSummary } from "./index";

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
export function projectLineSummaryToInput(existing: ProjectLineSummary): ProjectLineInput {
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
    // Server-computed on every save (2026-10-03) and not on the line DTO, so sending them back 400s ("property internalOnTime should not
    // exist"): found by the 2026-10-24 live walkthrough when saving an edited line.
    internalOnTime: _internalOnTime,
    supplierOnTime: _supplierOnTime,
    supplierInFull: _supplierInFull,
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
