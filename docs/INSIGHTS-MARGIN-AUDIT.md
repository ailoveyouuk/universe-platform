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

## Decisions (Lewis, 2026-10-25)
- **Tender bid prices:** not important. Slice 3 (tender market) shows counts, competition, timing and value bands only; no unit or bid prices. Closes recommendation 3.
- **Cost prices are the pricing that matters:** goods, freight and services, anonymised, and their history, down to as much detail as the data allows. Price movement is therefore a first-class view (see the Commodities lens).
- **Price history (what exists and how it is used):** `ProductPriceHistory` is not read, because nothing in the apps writes it and it is unlabelled. The same history already exists, verified as cost, in the dated supplier price on each project line (`supplierUnitPrice` with `supplierPriceLockedAt`), which the pipeline reads month by month. The Commodities lens turns it into a like-for-like movement index (same product group, specification, region made and region delivered, so a change in what was bought is not mistaken for a price change), with at least five organisations and three matching items behind every month. Granularity today: product group, then region made, then region delivered (specification is part of "like for like" once real attributes exist).
- **Services:** the catalogue group "Logistics and Services" (packaging goods) flows through the same cost pipeline; there is no separate service price field in the data model, so freight is the remaining gap.
- **Freight cost (next):** `Project.freightTotalCost` (pre-margin) with mode, incoterm and the weight on the project's lines gives a cost per tonne by mode and lane. It needs one new anonymised table and pipeline step, planned with the Distances lens (cost per tonne-kilometre). The same test list applies.

