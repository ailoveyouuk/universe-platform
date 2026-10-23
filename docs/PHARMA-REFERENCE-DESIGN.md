# Pharmaceutical reference register (built 2026-10-23, slice 1)

**Why (Lewis):** connect pharmaceutical entries in the Product Database to legitimate regulator source data, and use it to improve search and filtering.

## Sources
| Source | What | Access | Licence |
|---|---|---|---|
| EMA medicines data table | 2,754 EU medicine records (2,357 human, 397 veterinary): product number, name, INN, active substance, ATC code, pharmacotherapeutic group, indication, status (authorised, withdrawn, refused, lapsed, opinion), generic, biosimilar, orphan, holder, authorisation date, EPAR page URL. Refreshed nightly by EMA. | `https://www.ema.europa.eu/en/documents/report/medicines-output-medicines-report_en.xlsx` | Reuse permitted, commercial and non-commercial, if EMA is acknowledged as the source (EMA legal notice). Official text prevails. |
| MHRA Windsor Framework category lists 1 and 2 | 21,715 UK marketing authorisations (PL numbers): holder, product name, active substance(s), legal status (POM, P, GSL), category. Links change at each update, so the loader discovers them from the GOV.UK content API. | `gov.uk/api/content/government/publications/category-lists-following-implementation-of-the-windsor-framework/category-lists-of-products` | Open Government Licence v3.0. |

## What was built
- Tables `pharma_references` (one row per EMA product number or MHRA PL number) and `pharma_reference_runs` (evidence of each sync). Global reference data: no tenant column, no RLS, read by every signed-in user. Nothing is deleted; rows missing from a later file get `removedAt` and are revived if they return. A file that would remove more than 40% of a source is refused (guards against a truncated download).
- Parsers and sync in `packages/db/src/pharma-reference`, weekly GitHub workflow `sync-pharma-reference` (Mondays, dry run by default when started by hand). Fixed host allow-list.
- API `GET /pharma-reference/search` (q, source, atc, status, type), `/summary` (counts, last sync, attribution text), `/:id`.
- `ATC_SCOPE` in `@universe/types`: ATC prefixes to the pharmaceutical supplier-scope subcategories (J01 antibiotics, P01B antimalarials, J04/J05 HIV, TB and hepatitis, J07 vaccines, N02 pain, G03 maternal and contraceptives, A10 endocrine, and so on). `scopeSubsForProduct` now accepts `atcCode`, so a product linked to a register entry is placed by ATC, which fixes the weakness of name-term matching.

## Limits to be honest about
- MHRA files are the Windsor Framework category lists, not a full export of the UK register, and carry no patient leaflet (PIL) or SmPC text. PIL and SmPC links can be added as link-outs to the MHRA products site; scraping it is not planned.
- EMA covers centrally authorised EU medicines. Many medicines bought for low and middle income countries are authorised nationally or WHO prequalified, so they will not appear. WHO prequalification data is deliberately not a source until WHO permission is given (see ProductSourceStandard). EMA also publishes "medicines for use outside the EU" (EU-M4all) opinions in the same download page, which suits global health and is a candidate for slice 3.
- The register is a pointer to the official entry; it is not the authorised product information, and Universe displays the attribution text from `/summary` wherever register data is shown.

## Slice 2 (built 2026-10-23: links, leaflets, filters)
Product to register links with confirm/reject, leaflet links (EMA PDF and page, MHRA search link-out, hand-entered fallback), branded source pills, and register filters in the catalogue. See BUILD-LOG. Remaining from the original proposal: register browser page, member-state product information URLs, EMA outside-EU sheet.

## Slice 2 (original proposal)
1. Suggested links from catalogue pharmaceutical products to register entries (match on INN or active substance, then strength and form from the name), with the same human confirm or reject step as the regulatory watch; a confirmed link stores `atcCode` and the register reference on the product.
2. Product Database search and filters: ATC class, "listed in EMA / MHRA", authorisation status, generic, biosimilar, orphan; a "verified against register" badge and a link to the official page on the product page.
3. A register browser page (search, filter, attribution) and use of ATC to place suppliers' pharmaceutical scope.
4. Product information: link to the EPAR page; add member-state product information URLs (EMA publishes a spreadsheet) later.

## Slice 3 (2026-10-23)
Filtered CSV export, `/register` browser, PM lite views, and the simulated ringfence (`ProductPharmaLink.isSimulated`; register search/summary/panel exclude simulated links for viewers outside demo orgs). Demo linking script `link:demo-pharma` links simulated Pharmaceuticals to the best EMA/MHRA entry per generic name + dosage form; always flagged simulated, decided by "Simulated demo data". Accuracy limits: matches are by name/form, not licence-exact.
