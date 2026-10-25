# Insights margin audit (2026-10-25)

Rule (Lewis): anything fed into Insights is a cost price, before any margin, for goods, freight and services alike. This audit lists every place a margin can exist and whether it can reach Insights or any other cross-organisation view.

## Where margin-bearing figures exist (all private to the organisation that owns them)
| Where | Fields | Margin-bearing? | Reaches Insights? |
|---|---|---|---|
| Project line, supplier side | `supplierUnitPrice`, `supplierPaymentAmountTotal`, `supplierUnitPriceReportingCcy`, `supplierTotalPriceReportingCcy` | No: pre-margin cost | Yes, `supplierUnitPrice` only (the price pipeline) |
| Project line, client side | `unitSalesPrice`, `clientPaymentAmount`, `salesUnitPriceReportingCcy`, `salesTotalPriceReportingCcy`, `grossMargin`, `margin`, `productMarginPercent`, `productMarginAmount` | Yes | No |
| Project, freight cost | `freightCost`, `freightInsuranceCost`, `freightAdditionalCost`, `freightTotalCost`, `freightTotalCostReportingCcy` | No: pre-margin cost | No (no freight price is fed to Insights at all) |
| Project, freight sale | `freightMarginPercent`, `freightMarginAmount`, `freightInvoiceAmountReportingCcy` | Yes | No |
| Supplier enquiry | `quotedPrice` | A supplier's quote to the buyer (selling price) | No |
| Tender bids and awards | bid `unitPrice`, totals, framework price, call-off, price reviews, variations | Yes, a supplier's selling price to the issuer | No (visible to the issuer and bidder by design; not aggregated) |
| Product price history | `ProductPriceHistory.unitPrice` | Unlabelled (neither cost nor sale); written only by seed scripts | No longer read by the pipeline |

## What feeds Insights, and what it contains
- **Prices:** `supplierUnitPrice` and its currency (cost, pre-margin). Enforced by `apps/api/test/insights-cost-only.test.ts`, which also fails if any insights-database table gains a margin, sales, invoice, client or markup column.
- **Logistics:** distance, CO2, duration, efficiency score, mode, incoterm, commodity group. No money field exists in the table.
- **Sourcing:** category and country of manufacture only.
- **Stakeholder ratings:** scores only.
- **Simulated demo rows (8,231 price rows):** generated at source (cost) level; no real-organisation rows exist yet.

## How tender and framework money moves into projects (checked)
Bid projects and framework call-offs write `unitSalesPrice` / `clientPayment*` (the sales side), never `supplierUnitPrice`, so a bid price or framework price cannot enter the price pool through those routes.

## Residual risks and recommendations
1. **Typed entry:** `supplierUnitPrice` is typed by users. Nothing stops someone entering a margin-inclusive figure. Recommend a clear field label ("What the supplier or manufacturer charges you, before any margin") in Project Management.
2. **`ProductPriceHistory`:** still shown on the product page for an organisation's own records, and ambiguous. Recommend relabelling it "Recorded price (your organisation)" or retiring it.
3. **Tender market (slice 3):** a bid or awarded price is a supplier's selling price and includes that supplier's margin. Recommend slice 3 shows counts, competition, timing and value bands only, and no unit prices; if prices are wanted, treat them as "price paid" and keep them out of the cost-price views.
4. **Freight cost insight (future):** if added, use `freightTotalCost` only (never any freight margin or invoice field), and the same test list applies.
