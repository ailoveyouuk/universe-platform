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
