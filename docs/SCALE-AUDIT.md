# Scale audit — list endpoints (2026-10-17)

Target (Lewis, 2026-10-16): hundreds of accounts, thousands of users, tens of thousands of products in real use.
Method: read every controller/service that returns a collection and recorded whether it is bounded (page/limit/cursor)
or returns every matching row. "Unbounded" means fine today, a risk at target volume. Timings below are NOT measured
yet — the scale harness (next step) measures them; this is the code-level classification only.

## Already bounded
| Endpoint | How |
|---|---|
| `GET /product-catalog` | `page` / `pageSize` (default 50, max 200) |
| `GET /audit-log/feed` | cursor (`before`) + `limit` |
| `GET /notifications` | `take` |
| `GET /search` | 5 per group, min 2 chars |
| `GET /stakeholder-registry/search` | `take: 10` |
| `GET /product-catalog/search` | `take: 25` |

## Unbounded (return every matching row) — priority order for paging
Per-tenant lists grow with one organisation's size; platform-wide lists (staff) grow with the whole platform.
1. `GET /users` — platform staff see every user in every organisation (thousands). Admin users page filters in the browser.
2. `GET /organizations` — platform-wide (hundreds), plus per-row aggregates.
3. `GET /partners` — one organisation's whole partner book, with roles/details included.
4. `GET /projects` — one organisation's projects; each carries a client join. Dashboard also loads all of them.
5. `GET /contacts`, `GET /product-batches` (search), `GET /risk-assessments/all`, `GET /quality/product-approvals`, `GET /controlled-documents`, `GET /evidence/evidence-records/due-for-review`.
6. `GET /supplier-directory/search` and `/products/me`, `/leads/me`.
7. Aggregations that load every row then sum in code: `GET /projects/financial-summary` (all lines), `GET /quality/performance` and `partner-performance` (all lines), `GET /logistics-insights/*`, `GET /quality/qa-queue`, `GET /product-sourcing-insights/global`.

## Indexes
The schema has ~89 `@@index`/`@@unique` entries chosen for the pilot. Not yet validated against volume — the harness records
query plans/timings for the endpoints above and the follow-up lists the indexes to add. Global search uses `LIKE '%q%'`
matching across several tables, which cannot use an index; at tens of thousands of products it likely needs full-text search
or a prefix-match design (to be confirmed by measurement).

## Plan
1. Scale harness: deterministic generator (tagged `simulated`) loading target volume into a throwaway Azure SQL Edge in CI;
   time each endpoint's service call; report slow ones. (Lewis, 2026-10-17: the same generator will later load the live demo at full scale.)
2. Add paging/filter/sort (`{ items, total, page, pageSize }`) to the lists above in the order the measurements justify, with UI to match.
3. Add indexes the plans call for; revisit search.
4. Only then load the live demo at full scale.

## Measured results — run of 2026-10-17 (profile `full`, throwaway Azure SQL Edge, real RLS)
Dataset: 300 organisations, 3,000 users, 30,000 products, 12,000 partners (a quarter in one large organisation), 24,000+ contacts,
6,000 projects, ~22,000 lines, 6,000 batches, 4,000 risks, 40,000 audit rows. Generated in ~100–140s.
Service-level timings (database + mapping only), warm second call:

| Endpoint | Warm ms | Note |
|---|---:|---|
| `GET /partners` (largest org, ~3,000 partners) | **FAILS** | exceeded Prisma's 5s interactive-transaction timeout — a real production bug at this volume (heavy include on an unpaged list) |
| `GET /quality/performance` | 591 | 2,245 rows returned |
| `GET /users` (platform staff) | 382 (cold 1,120) | 3,000 rows returned |
| `GET /quality/qa-queue` | 363 (cold 1,861) | scans the org's work |
| `GET /contacts` | 334 (cold 1,931) | 6,090 rows returned |
| `GET /projects` | 144 (cold 621) | 1,598 rows returned |
| `GET /product-catalog` page 1 | 143 | already paged; 30,000 products |
| Global search `q=syringe` | 139 | text match across tables; watch as data grows |
| Catalogue search | 132 | |
| Financial summary | 68 | sums every line in code |
| everything else | < 35 | audit feed, org list, batches, risks, dashboard stats |

Caveats: container SQL Edge, not Azure SQL; no network/JSON/UI cost (a 3,000-row list is also a large payload and a long screen); cold times matter after
auto-pause. Not measurable in this setup: logistics global routes (needs the insights database).

## Fix order from the measurements
1. ~~Partners list (broken at volume)~~ — **done 2026-10-17**: `GET /partners/page` (server paging/search/filter/sort, slim rows), `GET /partners/overview` (DB counts + recent), `GET /partners/options` (pickers). Legacy `GET /partners` capped at 500 and deprecated. Re-measure with the harness.
2. Users, contacts, projects (Admin and PM lists) — server paging/search/sort.
3. Quality performance and QA queue — bound and/or aggregate in the database.
4. Re-run the harness, then add indexes the plans justify; revisit global search; then load the live demo at full scale.

## Re-run after partners paging (2026-10-17, full profile, same dataset size)
Partners no longer fails: legacy `GET /partners` returns the capped 500 rows in 96 ms warm / 605 ms cold (the UI now uses `/partners/page`, `/partners/overview`, `/partners/options`).
Slowest remaining (warm / cold ms): quality performance 579 / 1003 (2,245 rows, unbounded); users platform-wide 354 / 1049 (3,000 rows); QA queue 342 / 1874; contacts 304 / 1906 (6,090 rows); projects 131 / 609 (1,598 rows). Everything else is under 150 ms warm.
Done after that run: users, contacts and projects paging (see build log). Remaining: then quality performance and QA queue (bound/aggregate in the database). Indexes after that, informed by plans.

## Re-run after all list fixes and indexes (2026-10-17, full profile: 300 orgs, 3,000 users, 30,000 products, 12,000 partners, 6,000 projects, 22,464 lines)
Every list endpoint is now paged or aggregated in the database. Slowest warm timings: global search 115 ms, product catalogue page 106 ms, catalogue search 96 ms, project financial summary 56 ms, QA queue deep page 52 ms, quality performance 42 ms; everything else under 40 ms (users page 6–39 ms, partners page 13–20 ms, projects page 6–9 ms, contacts search 4 ms). Before: quality performance 579, users 354, QA queue 342, contacts 304, projects 131.
Remaining watch-list:
- `GET /partners/options` returns every partner for the pickers (3,045 rows for the largest org, 23 ms). Fine now; make it search-as-you-type if an organisation passes ~10,000 partners.
- Global search and catalogue search use `contains` (no index use); fine at 30,000 products, move to full-text search past ~100,000.
- Financial summary still sums all lines in code; fine at 22,000 lines, move to a database SUM if an organisation reaches several hundred thousand.
- Not measured: product source approvals and logistics insights (the generator creates none), the insights database, HTTP/JSON/screen cost, Azure SQL (these ran on a container). Re-measure over HTTP against the live API after the demo load.

## Live check with the loaded demo data (2026-10-17)
Real API calls from the signed-in apps against Universe Demo (3,127 users, 3,000 partners, 1,500+ projects, 5,564 lines, 818 approvals, 1,205 risks, 1,503 batches, 30,000 products), warm, 1 vCore serverless: every paged screen's main call 76–317 ms; dashboard overview tiles 406–607 ms. Unmeasured: Product Database search (separate sign-in) and cold start after SQL auto-pause. Watch-list additions: Admin Users organisation filter (loads all ~300 orgs — make search-driven past ~1,000); dashboard overview aggregates (cache if needed).
