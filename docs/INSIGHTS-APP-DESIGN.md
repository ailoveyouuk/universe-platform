# Universe Insights app: design (option A, dedicated app)

Decided by Lewis 2026-10-25: a dedicated Insights app, because of strong demand. This document is the plan to agree before building. All figures in the demo are simulated.

## What it is
A read-only app for anyone who wants to see how global-health procurement is behaving, without seeing who did what. Every number comes from the separate anonymised insights database (own connection string, no organisation identifiers, hashed contributor markers, minimum cohort of 5 distinct contributors before anything is shown). It never shows a single organisation's data, and it never writes to the tenant database.

## Who uses it
- Funders and donors, tendering bodies and procurement agents: price benchmarks, market depth, supplier landscape.
- Suppliers and manufacturers: where demand and competition are.
- Data / insights users (organisation type DATA_INSIGHTS_USER): the main audience, no operational apps needed.
- Stakeholder demo users: see the simulated data only (existing ring-fence).
Access is by a new permission `insights.view`, granted by role; organisations that hold the Data / Insights role (or any other role, now that organisations can hold several) get it. Wider downloads stay behind the global-admin export request rule already in place.

## Screens
1. Overview: headline tiles (median price movement, busiest corridors, tenders in the market, average bids per tender), each linking to its section.
2. Prices: pick a product group or product family; median, range and trend by month, by destination region, by Incoterm and pack size. Uses `AggregatedProductPrice`.
3. Sourcing: where products are made and by how many sources, concentration (how many manufacturers per group), shown on the existing map component. Uses `AggregatedProductSourcing`.
4. Logistics and CO2: corridors, transport mode mix, lead time, CO2 per tonne-km, efficiency bands. Uses `AggregatedLogisticsMetric`; the Project Management global view moves its depth here and keeps a short link.
5. Tender market (new data): tenders published and closed per month, by group and region; average number of bids; time from publish to award; share awarded by tender type; framework use. 
6. Supplier landscape (new data, from public directory profiles): counts of suppliers and manufacturers by group, country and certification (for example WHO prequalified, GMP). Aggregates only; named profiles stay in Find suppliers.
7. Methodology and data quality: plain-language description of anonymisation, the cohort floor, how fresh the data is, and a "why can't I see this" explanation when a cohort is too small.
Every chart has a table equivalent below it, text summaries, and works at phone width.

## Data work needed
- Existing: pricing, logistics, sourcing aggregates and their ETL jobs and read endpoints (`/product-sourcing-insights/global`, `/logistics-insights/global/*`; pricing is read through the product catalogue).
- New aggregate table `AggregatedTenderMarket` (month, group, destination region, tender type, bids received, days to award, awarded flag, sourceHash of the issuer, isSimulated). Fed by an ETL step run alongside the others, for consenting organisations only, with the same hash approach.
- New aggregate table `AggregatedSupplierLandscape` (group, country, certification flag, count) rebuilt from published directory profiles.
- New API module `insights` with narrow read endpoints, each enforcing the cohort floor and the simulated ring-fence in one shared function so no endpoint can forget it.
- Simulated data: backfill the tender market table from the 60-odd simulated tenders, bids and awards; extend benchmark seeds so every product group has at least five simulated contributors per month for 12 months, which also makes the cohort floor visible in the demo (some views deliberately show "not enough contributors yet").

## Build order
1. Slice 1: app shell on the shared UI (app switcher entry goes live), `insights.view` permission, API module with the shared cohort/ring-fence guard, Prices and Sourcing screens, methodology page, accessibility scan.
2. Slice 2: Logistics and CO2 screen, Overview tiles, phone layout pass.
3. Slice 3: Tender market data model, ETL and screen; simulated backfill.
4. Slice 4: Supplier landscape; saved views and in-app alerts for chosen products (no email for now).
Each slice is deployed, live-tested in both themes, logged and backed up before the next starts.

## Decisions I need from you
1. Hosting: a new Azure Static Web App for Insights (as the other apps), which needs its deploy token added as a repository secret like the others. Is that fine, or do you want me to ask for the resource to be created first?
2. Who gets `insights.view` by default: all organisation members, or only certain roles?
3. Is it right that the Tender market and Supplier landscape screens are in scope, or do you want pricing, sourcing and logistics only for the first release?
