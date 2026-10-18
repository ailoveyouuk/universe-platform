# Product Database — what exists, and what is needed for completion (2026-10-18)

Goal (Lewis, 2026-10-18): a complete Product Database that is the single source of product truth and feeds the back end and every app, built to the platform's standards: GDP, QMS, Cyber Essentials Plus, audit/tracking/logging, WHO prequalification, US FDA, EU regulations. Decisions: recalls and safety alerts are in scope; registration facts are shared on the catalogue, each organisation's evidence and documents stay private to it.

## 1. What exists today

**Screens (apps/product-database)**
- Catalogue list (`/`): search, category and missing-field filters, overview tiles, data-completeness tiles, sourcing-by-country ranked tile and map, paged table.
- Side panel (opens from a row, not a page): edit name, category, HS, UNSPSC, GTIN, standard unit, manufacturer part number, expected quality documentation; read-only category attributes, price history (own organisation), own-organisation sourcing (manufacturer, supplier, status); archive/restore; "Propose amendment" for non-staff.
- `/import`: CSV import. `/products/new`: add a product. `/notifications`. Global search.

**Data (ProductMaster and related)**
- Identity: name, category path, HS, UNSPSC, GTIN, unit, canonical part number, source standard, provenance (contributing organisation and type), simulated and archived flags.
- `ProductAttributeDefinition` (per-category specification fields), `ProductPriceHistory` (insert-only, tenant), `ProductAmendment` (propose, ratify, reject; QA with `products.approve`), `ProductSourceApproval` (manufacturer plus supplier, status, review due), `ProductBatch` (batch, expiry, storage text, qualification pathway text, MA/PL number, status) and `BatchTemperatureLog`, `SupplierProduct` (supplier-published listing), `FieldChangeLog` (field-level audit), notifications.

**API**: list, search, detail, create, update (direct for staff, amendment otherwise), import, completeness and dashboard stats, price history, amendments, ratify/reject. Fully paged and indexed; ring-fenced for simulated data.

So the *identity* record, its change control and its sourcing are solid. What is thin is everything that makes a product *regulated* and *traceable*.

## 2. Gaps

**A. No full product page.** Everything lives in a side panel; no tabs, no shareable URL, no single place showing a product's whole picture.

**B. Regulatory status is only free text.** Qualification pathway and MA/PL number exist per batch as strings. There is no structured registration record for: WHO PQ (reference, listing date, status), WHO EUL, SRA/ERP approval, US FDA (510(k), PMA, NDA/ANDA, NDC, UDI-DI), EU CE/MDR/IVDR (class, notified body, certificate, EUDAMED/UDI), national registrations by country, with issue and expiry dates, status and evidence link.

**C. No product-level controlled documents.** No certificates, IFU/labelling, SDS, specifications, CoA templates, test reports or technical file with version, effective date, expiry and review cycle. (`ControlledDocument` is organisation-level.)

**D. No lifecycle or safety state.** No Draft / Active / Restricted / Discontinued / Withdrawn / Recalled status with reason and effective date. No recall or field-safety-notice record, no notification to organisations using the product, no flag on affected lines and batches.

**E. Storage and handling are unstructured.** Only a text `storageConditions` on batches. Needed per product: storage temperature class (e.g. 2–8 C, CRT, frozen), light and humidity limits, cold-chain flag, shelf life, hazard/dangerous-goods class (UN number), controlled-substance flag, shelf-life remaining rules on receipt.

**F. Identity is too thin for global trade.** Missing: INN/generic name, strength, dosage form, route, pack size and pack hierarchy (unit/inner/outer/pallet), UDI-DI, ATC, WHO EML listing, GMDN, brand, multiple GTINs and manufacturer part numbers per product (today one of each), product images, regulatory class, intended use.

**G. Change history is invisible.** `FieldChangeLog` records changes but nothing shows them on the product. No version number, no "as at date" view, no compare, no sign-off record shown.

**H. No periodic review.** No review-due date and owner on a product, no re-verification schedule for registrations and documents, no expiry warnings (the pattern exists for partner evidence; not for products).

**I. Sourcing view is shallow.** Own-organisation approvals only; no qualification evidence behind an approval, no link from approval to the manufacturer's registration or site GMP status, no batch list on the product, no usage (projects and lines) list.

**J. Reporting and export.** No export of catalogue, registrations or the product dossier (CSV/PDF), no regulatory expiry report, no "what is on the market and in good standing" view.

**K. Cross-app feed.** Other apps read name/category/identifiers only. Project lines, batches, quality approvals, supplier listings and tender/quotation features should read registration status, lifecycle, storage class and recall flags from the catalogue.

**L. Assurance and security checks specific to this app.** Not yet verified live: Product Database sign-in flow and timing, write-permission matrix for new data, audit coverage of every new write, rate limiting on import, file-upload scanning and type limits for documents (Cyber Essentials Plus relevance), retention and archive-only rules (no hard deletes).

## 3. Proposed design

**Sharing model (Lewis's decision):** registration *facts* (what is registered, reference, class, status, dates) live on the shared catalogue so every organisation sees the same truth, contributed through the existing amendment/ratification route. Each organisation's own *evidence* (uploaded certificates, its verification, internal notes, review decisions) is tenant-scoped and RLS-protected, as `StakeholderEvidenceRecord` already is.

New tables (all with migrations, indexes and tests):
- `ProductRegulatoryRegistration` (shared): productMasterId, authority (WHO_PQ, WHO_EUL, FDA, EU_CE, EU_MDR, EU_IVDR, MHRA, SRA, NATIONAL), scheme/pathway, reference number, class, country, holder (partner), issue date, expiry date, status, source URL; ratified like amendments; field-level audit.
- `ProductRegistrationVerification` (tenant): the organisation's own check against a registration (verified by, date, evidence, next re-verification), driving expiry warnings and gating.
- `ProductDocument` (tenant): product-level controlled documents with type, version, effective and expiry dates, review cycle, status (draft/approved/superseded/archived), file reference, approver; supersede never delete.
- `ProductSafetyNotice` (shared, ratified): recall / field safety notice / safety alert with severity, scope (batches, countries), authority reference, issue date, actions, status; creating or updating it notifies organisations that use the product and flags affected batches and lines.
- Product columns: lifecycle status, lifecycle reason and date, storage class, cold-chain flag, shelf life months, hazard class, controlled-substance flag, INN, strength, dosage form, pack size and hierarchy, regulatory class, review owner and next review due. Multiple GTINs and part numbers via child tables.
- Audit: every write through `recordFieldChanges`; read-only audit trail tab on the product; full-record JSON snapshot at each ratified version (version number).

Screens: full product page `/products/detail?id=` with tabs — Overview, Specification, Regulatory, Documents, Safety, Sourcing and batches, Usage, History — plus completeness score for regulatory data, a regulatory dashboard (expiring, missing, recalled), export (CSV/PDF dossier), and a recall banner that follows the product across apps.

Back-end and cross-app: shared `ProductComplianceStatus` computed per product (compliant / warning / blocked) from registrations, documents, lifecycle and safety notices, exposed to project lines (warn or block on blocked products), Quality approvals, batches and supplier listings.

## 4. Build order
1. Full product page and tabs on existing data; history tab; lifecycle status; storage and identity fields; completeness score.
2. Regulatory registrations (shared, ratified) plus organisation verification; expiry dashboard and notifications.
3. Product documents (controlled, versioned, file upload with type/size limits and scanning plan).
4. Safety notices and recalls with notification and flagging; compliance status feeding project lines, batches, approvals.
5. Exports, demo data for all of the above (realistic and populated), live verification, scale and security checks, docs.

Each step: tests in CI, audit coverage, no hard deletes, British English, BUILD-LOG and project docs updated.

## 5. Regulatory watch — daily cross-check against external regulators (added 2026-10-18)

Lewis: augment regulatory status with a daily check of MHRA, EU bodies, FDA, WHO etc. for recalls, regulatory blocks, export bans/hoarding and similar.

**Sources (first pass; each confirmed to publish public data, exact endpoints/terms to be verified per source at build time)**
| Source | What it gives | Access |
|---|---|---|
| openFDA (drug, device, food enforcement/recall endpoints) | US recalls and enforcement reports, device recalls | Public JSON API, key optional (rate limits) |
| MHRA (GOV.UK drug and device alerts, Drug Safety Update) | UK drug alerts, recalls, medical device alerts, safety roundups | GOV.UK content API / feeds |
| WHO Medical Product Alerts (substandard and falsified) | Global falsified/substandard alerts by product and batch | Web list, scrape/RSS-style fetch, no formal API found |
| WHO prequalification lists (medicines, vaccines, IVDs, devices) | Listing status, delisting/suspension | Downloadable lists |
| EMA (medicine data downloads, shortages, DHPCs) and EU shortages monitoring | EU authorisation changes, shortages, safety communications | Published datasets/downloads |
| EUDAMED (EU device database) | Device vigilance and field safety notices | Partly public; no confirmed open API — treat as manual/partial until verified |
| Sanctions and export-control lists (UK OFSI, EU consolidated list, OFAC) | Restricted parties/jurisdictions | Public downloadable lists |
| National export-restriction/hoarding notices | Temporary export bans on medical goods | No single feed; curated entries by platform staff, with source links |

**Design**
- Scheduled job (Azure Container Apps job or GitHub Actions cron, daily) per connector: fetch, normalise, store raw payload hash, write `RegulatoryWatchItem` rows (shared): source, source reference, authority, type (RECALL, SAFETY_ALERT, FALSIFIED_ALERT, WITHDRAWAL/SUSPENSION, SHORTAGE, EXPORT_RESTRICTION, SANCTION), severity, issue date, summary, URL, affected product text, affected batches, countries, raw hash, fetchedAt. Idempotent upserts; never deletes (superseded/closed instead).
- Matching: deterministic first (GTIN, UDI-DI, NDC, MA/PL or registration number, manufacturer name plus product name), then fuzzy candidates scored. High-confidence matches create a `ProductSafetyNotice` in PENDING-REVIEW; lower-confidence matches go to a QA triage queue. Nothing blocks a product or batch automatically on a fuzzy match; a human (QA/RP with `products.approve`) confirms, then lifecycle/compliance status updates and notifications fire. Sanctions and export restrictions are matched against manufacturers, suppliers, countries and shipping routes, and warn on project lines.
- Run log: every run records start/end, source, items fetched/new/changed, errors, so the check is auditable (GDP/QMS evidence that monitoring happened daily). Failure of a source raises a platform-staff notification; stale-source banner in the UI.
- UI: Regulatory watch tab on the product, a watch dashboard (new items, awaiting triage, sources healthy/stale), per-organisation subscription of which sources and categories alert them.
- Security/compliance: outbound-only fetches from a restricted job, response size/type limits, no execution of fetched content, source allow-list, secrets in Key Vault/GitHub secrets, audit on every status change.
- Limits to be honest about: public feeds differ in structure and can change without notice; some (WHO alerts, EUDAMED) have no stable API; matching is probabilistic so a human confirms; this supports, but does not replace, formal regulatory intelligence and legal advice.

**Build slot:** after step 4 (safety notices) as step 4b — connectors first for openFDA, MHRA, WHO PQ/alerts and sanctions lists; EMA/EUDAMED and curated export-restriction entries next.

## 6. Update 2026-10-18
- Step 1 and step 2 (registrations, per-organisation registration verification, regulatory dashboard) are built. Products are never archived from the product page: lifecycle "Discontinued" is used; archive flags remain soft and restorable, nothing is deleted.
- The per-organisation "checked and verified / not applicable / action taken" review for safety notices and potential alerts moves into step 4 and 4b, alongside the registration verification already built.
- Proposed step 3b (raised by Lewis, awaiting agreement): product family with variants. A family holds the generic product (name, category, INN, regulatory class); variants hold strength, pack size, packaging hierarchy and GTINs. Registrations and documents can attach at family or variant level. Simulated names to be regenerated without pack details or "#N".
- Step 3 (controlled product documents) built: private per organisation, versioned, four-eyes approval, expiry tracking, upload limits, malware-scan check, archive only.

## Update 2026-10-18 — step 3b delivered; plan changes

- **3b done:** product families with variants (shared catalogue); family-level registrations/documents inherited by variants; Families pages; Project Management now creates/selects products through the same family-aware form with duplicate refusal and links to the Product Database page (see BUILD-LOG, "Step 3b" and "Step 3b follow-up").
- **Step 4 (safety notices/recalls) design note:** each organisation records its own "checked / verified" review of a notice or registration (tenant table, RLS), and an unreviewed notice on a product used in a project line or approval raises a visible flag. Notices attach to a variant or a family (applies to all variants), reusing the same Target pattern as registrations and documents.
- **Known data-quality note:** the simulated catalogue has many near-identical variants (same strength and pack size, different GTIN) because the original generator reused a few specs; real data would normally differ by strength, pack size or manufacturer. Variants that differ only by supplier belong under sourcing, not as variants.

## Update 2026-10-18 — step 4 delivered

- **Step 4 done:** shared safety notices/recalls on a variant or family, each organisation's private "checked / not applicable / action taken / affected" review, compliance status (critical open notice = blocked), notifications to the QA of every organisation using the product, flags on Project Management lines, dashboard tiles, demo data and tests (see BUILD-LOG, "Product Database step 4").
- **Deferred by Lewis:** Defender for Storage malware scanning is a go-live gate, not a pilot task. Documents show "Not scanned" until enabled; it must be on before any real organisation uploads real documents.
- **Next:** step 4b (automated daily regulatory watch, advisory "potential" flags with human triage), then step 5 (exports, demo data completeness, live security and scale checks).

## Update 2026-10-18 — step 4b delivered (first pass)

- **Done:** daily watch of openFDA (devices, drugs) and MHRA / GOV.UK alerts, idempotent storage, deterministic advisory matching to real catalogue products, run log, platform-staff confirm/dismiss (confirm records a safety notice and notifies affected organisations), watch page and per-product strip, scheduled GitHub Actions workflow (see BUILD-LOG, "step 4b").
- **Still to add to the watch:** WHO medical product alerts and prequalification lists, EMA and EU shortages, EUDAMED (manual/partial), sanctions lists (OFSI, EU, OFAC) matched to manufacturers/suppliers, curated export-restriction entries, automatic closure of a confirmed notice when the source closes it, and optional per-organisation source/category subscriptions.
- **Next:** step 5 (exports of catalogue, registrations and product dossier; demo-data completeness; live security and scale checks).


**Export and hoarding restrictions (2026-10-18):** delivered. UK DHSC/MHRA list synced daily, matched to products by name/strength/form and applied to project lines by origin (supplier, manufacturer or manufacture country) and delivery country; other countries via staff-curated, source-linked entries. Remaining: verified entries for other SRA countries, licence-level matching.
