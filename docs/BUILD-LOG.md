# Universe Platform — build log

Newest first. **Rule (set by Lewis 2026-10-16): after every implemented change, add an entry here, update the
Universe project handoff doc in claude.ai, and update Claude's memory — so the platform can be rebuilt/resumed after a
disaster.** An entry says what changed, where, how it was verified, and any manual step still owed.

---

## 2026-10-18 — Pooled database: contributions are searchable by all but anonymous unless the organisation shares its identity (Lewis)

**Rule (Lewis):** every organisation agrees, as a minimum, that what it adds (projects, products, logistics, everything) goes into the pooled database, searchable by all organisations and visible in insights, and not identifiable back to the organisation unless it ticks "share with Universe database". Manufacturers, suppliers and freight forwarders are identifiable by design through the supplier directory.
**Infrastructure check (before building):** present already — the blanket `DataSharingConsent` (anonymised insights pool, ETL reads it) and the supplier directory (`SupplierProfile.isPublished`, identifiable by design). Not present for the catalogue: the product catalogue showed the contributing organisation's name to everyone, and the only "share" flag, `Partner.sharedWithUniverseRegistry`, is a partner-level field documented as not wired to anything.
**What:** `Organization.shareIdentityWithUniverse` (default false) and `ProductMaster.attributionOverride` (per-product show/hide; migration `20261018190000_contributor_visibility`). `attribution.ts` masks a contributor as "A Universe member" (id withheld) for everyone except platform staff, the contributing organisation itself, and viewers where the organisation shares (or the product overrides to show). Applied to catalogue list/search/scoped search/detail/create/update, product and family history (including who changed what), registrations (`contributedByOrganizationName`) and families. Reference data with no contributing organisation is unchanged. Admin → organisation → "Share with Universe database" checkbox (platform staff and org admins with `org.profile.manage`); Project Management add-product form has "Contributor shown to other organisations" (follow setting / show / keep anonymous). Existing contributions become anonymous to other organisations (default off) — reversible by ticking the setting.
**Verified:** type-checks; `product-contributor-visibility.test.ts`; live check after deploy. **Owed:** none (no RLS change). **Not yet covered:** projects/logistics already feed the anonymised insights pool; any other screen that shows another organisation's name for pooled data should be audited next (stakeholder registry, supplier directory excluded by design).

---

## 2026-10-18 — Project line product search: shared catalogue and the organisation's own approvals in one workflow (Lewis)

**Why:** organisations may want to compare their own approved products with the pooled catalogue, or have no approvals yet; both had to work in the same picker.
**What:** `GET /product-catalog/search-scoped?q&category&scope=ALL|APPROVED|CATALOGUE` (shared catalogue plus the caller's own source approvals, which are tenant/RLS data). ALL lists approved products first then the rest, de-duplicated; APPROVED only approved; CATALOGUE everything. Each result carries `orgApproval` (APPROVED / IN_REVIEW / REJECTED / none) and the approved sources (manufacturer, supplier). Picker (`@universe/ui`): scope chips (All / Approved by <org> / Universe catalogue) and a source tag per result. Project line form: selected product shows the tag and "Not yet approved by <org> — you can still use it" (non-blocking, per Lewis); approved sources appear as "Manufacturer via Supplier — use" chips; a single approved source is applied automatically when the line has no manufacturer/supplier yet, and the user can change it. Terminology: "Approved" (not "qualified"/"verified", which imply regulatory clearance and are reserved for step 4's per-organisation review).
**Verified:** type-checks; `product-search-scoped.test.ts` (ordering, scopes, tenant privacy); live check after deploy.
**Owed:** nothing; no schema or RLS change.

---

## 2026-10-18 — Step 3b follow-up: family-aware add/select in Project Management, linked to Product Database (Lewis)

**Why:** Project Management still created flat products ("name + category"), which would have reintroduced bundled names and duplicates. One catalogue, one way to add a product.
**What:** `POST /product-catalog` now accepts `familyId` + `variantLabel` (name derived, category/brand/INN/class inherited), `newFamilyName` (platform staff only, resolved in the controller), brand/INN/strength/dosage form/pack size, and barcodes per packaging level. Duplicates are refused with the existing product named (same GTIN anywhere, same variant label in a family, same name for a standalone product); the API client passes `existingProductId` so the UI offers "Use the existing product". Search matches name, brand, INN, GTIN and family name and returns family/variant/pack size. UI (Project Management): shared `ProductCreateForm` used by the Add Product page and the project line "add product to catalogue" panel (variant of existing family / new family (staff) / standalone); the picker shows "Variant of <family> · pack size · brand"; a selected line product shows family, variant, regulatory status and a "View or edit in Product Database" link (`NEXT_PUBLIC_PRODUCT_DATABASE_URL`, from the `PRODUCT_DATABASE_URL` repo variable). Enrichment fixes: family document lookups chunked; 48 series names so the 30,000 simulated products form 2,853 families (avg 10.5 variants), 2,151 family registrations, 827 family documents, 10,864 identifiers given packaging levels.
**Verified:** type-checks; `product-create-variants.test.ts` added; live check below.
**Owed:** none new. Non-staff organisations cannot create a new family (they add a standalone product or a variant); staff group standalone products from the Product Database.

---

## 2026-10-18 — Product Database step 3b: product families with variants (Lewis)

**Why:** product names bundled pack size, box size and a "#N" counter. Standard practice is a generic product (family) with strengths and pack sizes as variants.
**What:** new shared tables `ProductFamily` and `ProductFamilyChange` (migration `20261018170000_product_families`); `ProductMaster` gains `productFamilyId` and `variantLabel`; `ProductIdentifier` gains `packagingLevel` and `unitsPerPack` (each/inner/carton/pallet GTINs). Registrations and documents may attach to a variant or to a family (applies to all variants); compliance for a variant uses its own plus its family's registrations. Staff-only family create/edit/archive/assign (nothing deleted; every change in family history). API: `/product-catalog/families…`, `:id/family`, `:id/family/create`; shared `product-target.ts` makes registrations/documents target-aware. UI: Families list and Family page (Variants, Regulatory, Documents, History), "Variant of …" link and "Other variants" card on the product page, "Create family from this product", family-level items on the Regulatory dashboard. Enrichment (`enrichFamilies` etc.) groups simulated products into families, renames them without "#N", adds family registrations/documents and packaging levels.
**Verified:** type-checks across packages; `product-families.test.ts` added and the registration/document tests updated to the Target API; live check after deploy (below).
**Owed:** no new tenant tables, so no RLS re-run. Defender for Storage malware scanning still to be enabled by Lewis.

---

## 2026-10-17 — Maps scale to a growing data pool; benchmark seed v2; category-true product names (Lewis)

- **Why the Logistics map showed few routes:** the cohort floor (5 distinct organisations per route + mode + incoterm + commodity group) was missed by my first seed, which spread each route's few contributors over every incoterm/commodity combination; it also used only 13 origin / 12 destination countries. Seed v2 (`seedSimulatedAggregates`, hash prefix `s2`): ~30 delivery countries x ~14 origin countries, one cohort of 6-10 contributors per lane, commodity groups matching the filter list. 14,160 rows added (v1 rows left in place — no deletes; they stay below the floor). The map's arcs remain the 10 busiest routes; both Logistics maps' legends now say so (`WorldMapLegendEntry.shape = "line"`).
- **`@universe/ui` WorldMap** (all call sites): same-colour points closer than `clusterPx` (34 px) merge into one bubble (summed value, hover/tap lists biggest members, click/tap zooms in); zoom & pan (+ / − / reset buttons, drag, two-finger pinch, ctrl/cmd + wheel); bubble sizes/labels keep a constant on-screen size while zooming; value labels placed biggest-first and skipped when overlapping. Props `cluster`, `clusterPx`, `zoomable` (default on). Verified live on the Logistics map (cluster click zooms and separates points).
- **Product Database sourcing map:** now one bubble per country (size = approved sources, colour = leading category, tooltip = category split) instead of one dot per category per country; clicking a country no longer filters the catalogue.
- **Product names:** 28,525 simulated products renamed so nouns/specs fit their category (`scripts/_catalogue-naming.ts`, shared with the generator); enrichment step `fixNames` is idempotent.
- Not yet done (offered, not requested): ranked list under the map and bottom-sheet callouts on mobile; real-device check at tablet/phone widths (the built-in browser here is desktop width only).

---

## 2026-10-17 — Demo data enrichment: catalogue identifiers, sourcing, logistics & CO2 (Lewis)

Lewis, reviewing the live demo: nearly all products lacked GTIN / HS / UNSPSC / unit / country of manufacture, and most lines had no usable CO2 / distance / logistics data. No hard deletes ("let's not hard delete anything at the moment").
- `packages/db/scripts/enrich-demo-data.ts` + workflow `enrich-demo-data.yml` (DRY_RUN default true; fills NULLs only, never overwrites or deletes). Run live (dry run first):
  - Catalogue: all 30,060 simulated entries now have GTIN-13 (valid check digit, prefix 506), HS code, UNSPSC code, standard unit and manufacturer part number, by category (completeness tiles now show 0 missing).
  - Source approvals in the Demo org: 818 → 9,012 (6,650 approved) so country of manufacture is populated.
  - Logistics: every one of the 5,564 demo lines now has a `ProjectLineLogisticsMetric` (was 3,330), recomputed with the platform's `computeLogisticsMetric` (real centroid distances, GLEC-aligned factors; the generator's earlier random distances were replaced via update). 2,375 have delivery duration. Missing delivery country / mode / incoterm / line weights / manufacture countries were filled. **485 simulated projects switched from LAND to SEA** (road between continents is not credible).
- Benchmark views (Logistics routes, pricing, sourcing map) read `universe-insights`, which has no simulated rows yet. `packages/insights-db/src/simulated-aggregates.ts` (`seedSimulatedAggregates`, rows flagged `isSimulated`, synthetic source hashes, cohort floor respected, adds rows only, skips tables that already have simulated rows) + workflow `seed-demo-benchmarks.yml`. An API endpoint was tried and removed: the API's insights login is read-only by design (INSERT denied).
- Benchmarks seeded (Lewis added secret `INSIGHTS_LOAD_DATABASE_URL`; workflow `seed-demo-benchmarks`): 4,315 pricing + 6,790 logistics + 1,807 sourcing simulated rows (the "already seeded" check is now a 1,000-row threshold, since earlier test rows were flagged simulated too). Verified live: Product Database sourcing map and the Project Management global benchmark map show data.
- Realism (Lewis, same evening — 100% completeness looked unrealistic): a deterministic small share of simulated catalogue entries is left blank — GTIN 7%, HS 4%, UNSPSC 6%, unit 3%, part number 14% (live: 2,074 / 1,181 / 1,821 / 823 missing). Re-runs keep the same gaps. Workflow input `only=catalogue` re-runs just the catalogue steps.
- Known cosmetic: generated product names are noun/spec combinations (e.g. "bandage, 10 mL"), unrelated to their category.
- Verified live: completeness tiles show the gaps above; enrichment run summary above.

---

## 2026-10-17 — Ring-fence extended: everything that exists today counts as simulated (Lewis)

Lewis: everything in the system now is simulated (so it can serve as the benchmark/demo); a real organisation or user (anything not a demo stakeholder) must see everything except the simulated data.
- Migration `20261017200000_simulated_existing_data`: `StakeholderRegistryEntry.isSimulated`; ALL existing product-catalogue rows (61 seeded HS_CODE/WHO_EML/GS1_GTIN/INTERNAL + 30,000 SIM-SCALE), ALL 34 stakeholder-registry entries, and the 4 pilot test organisations (Meridian Health Sourcing, Pacific Rim Medical Trading, Delta Procurement Partners, Continental Supply Co) flagged simulated. Only Universe Demo (demo) remains un-flagged among organisations.
- Rule going forward: anything created from inside a demo organisation (including by platform staff switched into it) is flagged simulated — product create/import and stakeholder-registry create (`isSimulated: user.inDemoOrganization`); registry matching never merges across the flag. Real orgs/users create unflagged rows; demo contexts see both, real contexts only unflagged (catalogue, search, registry).
- **Consequence:** a brand-new real organisation starts with an empty shared catalogue and registry (the seeded HS/WHO/GTIN reference rows are hidden too, since they were part of the test batch). Reversible per row (`isSimulated`); real reference data will need importing when real onboarding starts.
- Loader dry-run now prints a read-only inventory of shared data; non-dry runs also flag users of simulated orgs. Ran: nothing further to mark.
- **Insights database ring-fence — DONE (2026-10-17):** Lewis ran `infra/sql/insights-simulated-flag.sql` on `universe-insights` (all existing aggregate rows flagged simulated). `isSimulated` added to the three aggregated_* Prisma models; `getAggregatedPricing`, `getAggregatedLogisticsRoutes`, `getAggregatedProductSourcing` and `getStakeholderRatingDistribution` take `showSimulated` (default false → `isSimulated = 0` / demo+simulated orgs excluded). `/logistics-insights/global/*` and `/product-sourcing-insights/global` pass `user.inDemoOrganization === true`. Real organisations see only real aggregates; demo organisations see both.
- Test: `ring-fence.test.ts` extended for registry search/matching. CI + deploys green.

## 2026-10-17 — Ring-fencing the demo and simulated data from real organisations

Lewis: the demo must stay in place but be fenced off from real organisations, users and data.
Already in place before this: Universe Demo's own rows are isolated by RLS; demo (Stakeholder Demo) users cannot write to shared data (`assertNotDemoUser`); sim users cannot sign in (no identity, `@sim.example`). Gaps found and closed:
- **Shared product catalogue** was open to every org, so the 30,000 SIM-SCALE products showed in real orgs' search. New `ProductMaster.isSimulated`; catalogue search/list/detail/stats and global search show them only when the request runs inside a demo organisation (`RequestUser.inDemoOrganization` — a demo member's own org, or the org platform staff switched into).
- **Anonymised benchmarks** (insights ETL, `packages/insights-db/src/aggregate-etl.ts`) now exclude `isDemo` and `isSimulated` organisations in all four consent lookups, so demo data can never feed another org's insights. (Any insights rows written earlier by a run that included the demo org are not cleaned up — none known.)
- **Admin**: new `Organization.isSimulated` and `User.isSimulated`. Organisations list, Users (page/counts), and the all-organisations Activity feed hide simulated/demo data by default; platform staff tick "Include simulated data" (Users, Organisations, Activity) to see it. Members of a demo org see their simulated colleagues as part of the demo. Admin default now shows 5 real orgs / 7 real users; ticking shows 3,127 users.
- Migration `20261017180000_simulated_flags` adds the three columns and backfills; RLS hid the user rows from the migration login (0 users flagged), so `load-demo-scale-data` now also idempotently marks simulated rows via the platform-staff context (ran: 3,120 users marked). The generator sets the flags on new data.
- Test `apps/api/test/ring-fence.test.ts` (CI). CI and deploys green. Not covered yet: Product Database app live check (needs its own sign-in).

## 2026-10-17 — Live timings with the full demo data (no code change)

Measured from the signed-in apps (browser resource timings of the real API calls, warm, 1 vCore serverless tier, UK South):
- Project Management: projects page 184 ms (+ overview 275), stakeholders page 150 (+ overview 197), quality dashboard 224 / approvals page 200 / performance page 317, QA queue 200, logistics lines page 85, risk register page 151 (+ counts 155), batches page 76. Dashboard overview tiles 406 and 607 ms (fired together on first load).
- Admin: users page 225 ms, counts 144 ms (3,127 users).
- Not measured: Product Database (needs its own sign-in — Lewis to sign in if wanted); cold start after SQL auto-pause.
Observations / watch-list: Admin Users "All organisations" filter loads all ~300 organisations as one list — fine now, make it search-driven past ~1,000; dashboard overviews are the slowest calls (aggregate over all projects/partners) — candidates for caching if demos feel slow.

## 2026-10-17 — Demo scale data LOADED into the live Universe Demo

Run `Load demo scale data` (seed 1, real load, 1 vCore tier, ~80 min — mostly 299 org/role creations at ~14 s each; bulk inserts took ~10 min). First attempt failed with Prisma's 5 s interactive-transaction limit during org creation (nothing but orgs written); fixed by `transactionOptions.timeout` from env `PRISMA_TX_TIMEOUT_MS` (default 5000, workflow sets 120000) in `packages/db/src/index.ts`, and the loader now resumes over leftover orgs (org creation is an upsert).
Row counts after: sim orgs 299, sim users 3,120, products 30,000; in Universe Demo: partners 3,000 (+ 6,000 contacts), projects 1,500 (+ originals), lines 5,564, logistics metrics 3,330, source approvals 818, risks 1,205, batches 1,503, audit rows 8,000.
Live check (Project Management, Universe Demo): Projects, dashboard, Stakeholders, Quality, QA queue (263 awaiting), Logistics, Risk register (1,205) and Batches all render with the new data. Hard-delete clean-up script still not written (needs Lewis's OK). Next: HTTP re-measure, agree baseline, Reset sandbox.

## 2026-10-17 — Demo scale data: richer generator, `demo` profile and guarded loader

Lewis: use the simulated scale dataset in the live demo, with product source approvals and logistics records, built so every app works on it.
- `packages/db/scripts/generate-scale-data.ts`: now generates product source approvals (PENDING/APPROVED/REJECTED, some reviews overdue), logistics metrics (~60% of lines, with mode/distance/CO2/score/band), partner country + risk tier + pending partners (QA queue), line manufacturer/supplier by role, delivery dates and on-time/in-full flags on delivered projects, project delivery country/freight mode/incoterm/forwarder, batch manufacturer + manufactured date.
- New `demo` profile (streamlined): the big portfolio (3,000 partners, 1,500 projects, ~6,000 lines, 800 approvals, 1,200 risks, 1,500 batches, 8,000 audit rows) goes into the existing Universe Demo org (`isDemo`), plus 120 extra users there; the other 299 sim orgs get users only (what Admin shows); 30,000 shared catalogue products. No portfolio data is generated for other orgs (no screen could show it).
- Markers for removal: org slug `sim-`, emails `@sim.example`, products `SIM-SCALE`, partner `normalizedName` prefix `simscale`, project ref `SIM-`, batch `SIMB`, risk title `[SIM]`.
- `packages/db/scripts/load-demo-scale-data.ts` + manual workflow `.github/workflows/load-demo-scale-data.yml` (`npm run load:demo-scale`): dry-run by default, aborts if sim data already exists, prints row counts before/after. **Manual step owed (Lewis):** add repository secret `DEMO_LOAD_DATABASE_URL`, then run the workflow dry-run first.
- No hard-delete clean-up script yet: conflicts with archive-not-delete, awaiting Lewis's explicit OK.
- Verification: typecheck; generator exercised by the Scale test workflow (small profile).

## 2026-10-17 — More unbounded lists found and paged (sourcing approvals, logistics, risk register, batches)

Adding product source approvals and logistics records to the scale data (Lewis: they must be in the demo) exposed lists the earlier test could not see because the data had none. Fixed the same way:
- **Product sourcing approvals** (Quality screen): `GET /quality/product-approvals/page` (status incl. WARNING = approved but no longer qualified, q, page); the Quality dashboard counts are now database counts (`qualifiedWhere` mirrors the qualification rule) with only the ten "needs attention" rows loaded. `GET /quality/product-approvals?productMasterId=` filters on the server (the Product Database entry panel used to download every approval and filter in the browser). Unfiltered legacy list capped at 500.
- **Logistics & CO2 lines**: `GET /logistics-insights/lines/page` returns a page plus totals (count, CO2, distance, average score) computed in the database; the tiles were previously summed in the browser from every row. Legacy route capped at 500.
- **Risk register**: `GET /risk-assessments/all/page` (q incl. subject names, status, severity, subject type, sort, dir) and `/all/counts`. Severity sorts by true rank; rows with no review date sort last; "subject" sorting groups by subject type (the subject is polymorphic). Subject names resolved for the page only. Legacy list capped at 500.
- **Batches**: `GET /batches/page`; the search used by pickers is capped at 100.
- Verified: typecheck clean in all four apps; new `apps/api/test/more-paging.test.ts`.

---

## 2026-10-17 — Quality performance and QA queue paging, plus indexes (scale fixes 4–5)

- **Partner performance:** `GET /quality/performance/page` (roleType, q, page, pageSize). One grouped SQL query per role (manufacturer, supplier, freight forwarder via project) computes line counts, on-time / in-full / OTIF percentages, average days late and supplier issue counts in the database; the page is sorted (most lines first) and cut in SQL. The old version loaded every partner and line and filtered the whole line list per partner (quadratic). Behaviour change: only partners with project-line activity get a scorecard (no more rows of zeros). Legacy `GET /quality/performance` now returns the first 500. The Quality page has paging.
- **QA queue:** `GET /quality/qa-queue/page` (category, page, pageSize): totals, oldest-in-queue and per-category counts computed in the database; items merged oldest-first from the four sources only as deep as the page needs. Screen changed from "Categorised / All" sections to category buttons with counts above one paged list. Legacy `GET /quality/qa-queue` capped at 200 per source.
- **Fix:** the Projects "Overdue" filter wrongly included projects with no due date when sorted by due date (caught by CI before release of the paging commit's follow-up).
- **Indexes** (migration `20261017140000_paging_indexes`): partners (org, archived, created) and (org, approval, archived); partner_roles (roleType, partnerId); projects (org, archived, dueDate) and (org, archived, updatedAt); users (org, status, invitedAt); contacts (org, name); evidence records (org, status, created); product source approvals (org, status, archived, created); supplier enquiries (supplier, responseStatus); product amendments (org, status, submitted).
- Scale harness now times the paged endpoints (and a deep page / search each) instead of the legacy lists.
- Verified: typecheck clean in all four apps; CI green with new tests (`list-paging`, `quality-paging`). Indexes and live behaviour not yet checked on the live apps.

---

## 2026-10-17 — Users, contacts and projects: server-side paging (scale fixes 2–3)

Same approach as partners; every screen that used an unpaged list was moved, across all three apps.
- **Users:** `GET /users/page` (page, pageSize ≤100, q, status, organizationId), `GET /users/counts` (tile counts via group-by), `GET /users/options` (names only, own organisation, any member). Legacy `GET /users` capped at 500. Admin Users screen and Admin dashboard now use them. Side fix: the project-lead, risk-owner and assign-an-action pickers in Project Management used the admin-only list, so non-admins saw only themselves; they now use `/users/options`.
- **Contacts:** `GET /contacts?q=&limit=` is search-driven (default 25, max 100). The project Team & Contacts picker is now a type-to-search box instead of preloading every contact.
- **Projects:** `GET /projects/page` (q, status incl. ACTIVE and OVERDUE groups, type, country, archived, sort, dir; no-due-date rows always last) and `GET /projects/overview` (counts excluding archived, five recent active/awarded, distinct delivery countries). Projects list and PM dashboard use them. Legacy `GET /projects` capped at 500. Behaviour change: dashboard tile counts now exclude archived projects.
- Types: `UserCounts`, `UserOption`, `ProjectOverview`. Client: `listUsersPage`, `getUserCounts`, `listUserOptions`, `listContacts(q, limit)`, `listProjectsPage`, `getProjectOverview`.
- Verified: all four apps typecheck clean; new `apps/api/test/list-paging.test.ts` (CI, RLS database). Not yet checked in the live apps.
- Next: quality performance and QA queue (aggregate/bound in the database), re-run scale test, indexes.

---

## 2026-10-17 — Partners list: server-side paging (first scale fix)

- Measured failure: `GET /partners` for a ~3,000-partner organisation exceeded the 5s transaction timeout. Fixed by moving paging, search, filters and sort into the API.
- API: `GET /partners/page` (page, pageSize ≤100, q, roleType, approval, country, risk, sort, dir → `PagedResult<PartnerListItem>`), `GET /partners/overview` (role/approval counts and five recent per category, computed in the database), `GET /partners/options` (slim picker list). Legacy `GET /partners` now capped at 500 and marked deprecated.
- Types/client: `PagedResult`, `PartnerListItem`, `PartnerOverview`, `PartnerOption`; `listPartnersPage`, `getPartnerOverview`, `listPartnerOptions`.
- Project Management: Stakeholders page, dashboard tiles, and the partner pickers (project detail, line form, supplier enquiries, batches, quality) now use the new endpoints; search is debounced.
- Verified: API and PM typecheck clean; new `apps/api/test/partners-paging.test.ts` (runs in CI against the RLS database). Re-run the scale workflow to confirm the timeout is gone.
- Scale re-run (full profile): partners no longer fails (500 capped rows, 96 ms warm). Slowest remaining: quality performance 579 ms, users (platform-wide) 354 ms, QA queue 342 ms, contacts 304 ms, projects 131 ms warm — see `docs/SCALE-AUDIT.md`.
- Next: users/contacts/projects paging, then quality performance and QA queue.

---

## 2026-10-17 — Scale audit, generator and harness (not yet run)

- `docs/SCALE-AUDIT.md`: classifies every list endpoint as bounded or unbounded at the target scale (hundreds of orgs, thousands of users, tens of thousands of products); unbounded ones are listed in priority order.
- `packages/db/scripts/generate-scale-data.ts`: deterministic generator (profiles `small`, `full`). Everything is recognisable and removable: org slugs `sim-*`, user emails `@sim.example`, shared products `sourceStandard = "SIM-SCALE"`. Decision (Lewis, 2026-10-17): the same generator will, after paging/indexing fixes, load the **live demo at full scale**; the test-only run is in a throwaway database.
- `apps/api/scale/scale.test.ts` + `vitest.scale.config.ts` + `.github/workflows/scale-test.yml` (manual "Scale test" workflow): spins up a throwaway SQL Server container, applies the real RLS, loads the dataset, times ~19 list/search/rollup calls as platform staff and as the busiest org's admin, writes `scale-report.md` (job summary + artifact). Report-only — it never fails on slowness.
- Next: run it, read the report, add paging/indexes where it points, then load the live demo.

## 2026-10-17 — Stakeholder access management in Admin (stage 3)

- API (platform-staff only): `GET /stakeholder-access` (demo organisation + everyone holding the Stakeholder Demo role) and `POST /stakeholder-access` {email, forename, surname} — ensures the role exists in the demo org, then invites the email with it (same invite-then-link sign-in as every user; they register with the email via the External ID sign-up flow).
- Admin app: new **Stakeholder access** page (platform staff only, in the nav): add by email, list with status/last sign-in, **Turn off access** (archives the account via the normal archive, optional reason, logged) and **Reinstate**.
- Not built (decision needed): **Reset sandbox** — restoring Universe Demo to a known baseline after stakeholders have edited it. Needs a defined baseline (seed script or snapshot) first. Until then, demo-org data created by stakeholders stays.
- Not yet checked live as a real stakeholder (needs a real inbox to sign up with). No migration, no RLS change.

## 2026-10-17 — Stakeholder demo: demo-organisation flag, role and shared-data write guard (stage 2)

- `Organization.isDemo` (migration `20261017120000_organization_is_demo`; the existing "Universe Demo" org is set to true by the migration).
- `RequestUser.isDemoUser` = home organisation is demo AND not platform staff (so Lewis, who is staff and based in Universe Demo, is exempt). `assertNotDemoUser` (apps/api `common/authorization.ts`) now blocks demo users from every write that reaches data shared across organisations: product catalogue create / batch import / amendment ratify, publishing to the supplier directory, selecting a supplier product (writes shared SupplierLead). Partner creation by a demo user skips the shared stakeholder registry (partner is simply not linked). Everything else a demo user does lands in the demo organisation's own tenant-isolated data.
- "Stakeholder Demo" role: `STAKEHOLDER_DEMO_PERMISSION_KEYS` / `ensureStakeholderDemoRole(orgId)` in `@universe/db` — all project (incl. financials), partner, quality, supplier/manufacturer/funder/insights permissions, but no `org.users.manage`, `org.roles.manage` or `org.profile.manage`. Refuses non-demo organisations. Not part of any default role template.
- Tests: `apps/api/test/stakeholder-demo.test.ts`. Admin UI to assign/disable it by email, plus sandbox reset, is stage 3 (not built yet).

## 2026-10-17 — Archive, never delete (stage 1 of the stakeholder-demo work)

**Platform rule (Lewis, 2026-10-17): nothing is deleted anywhere — records are archived, and removed accounts are logged.**

- Migration `20261017100000_archive_not_delete` adds `archivedAt/archivedById` to project lines, project documents, roles and organisation manufacturer sites; `removedAt/removedById` to project lead and contact links; `archivedAt/archivedById/archiveReason` to users (existing DEACTIVATED users backfilled). No RLS change.
- Project line "delete" (shipped hours earlier as a hard delete) is now `archiveLine`; the line, metrics, enquiries, price history and temperature logs all stay. Archived lines are hidden from project detail and excluded from financial rollups, partner-performance and enquiry lookups.
- Project documents and standalone documents: archived, blob kept, links from certifications/evidence/controlled documents kept; archived files can't be downloaded through normal reads.
- Roles: archive (still refused while users hold the role); archived roles hidden from lists and can't be assigned. Note: an archived role still holds its name, so the same name can't be reused in that org.
- Project leads/contacts and manufacturer sites: soft-removed; re-adding a lead/contact restores the link.
- Users: the existing "deactivate" is now presented as **Archive account** (optional reason, logged with who/when in the audit history) and **Reinstate account**; status chip reads ARCHIVED. Users were never hard-deleted; the status value stays `DEACTIVATED` in the database.
- Deliberately left as-is (replace-the-set operations whose old/new values are already written to the field-change log, not record deletions): user-role assignments, role-permission sets, organisation country presence, supplier country presence.
- Tests: `project-line-archive.test.ts` (renamed from the delete test). Not yet checked live.

## 2026-10-17 — Read-side redaction of project financials

- Users without `projects.financials.view` now get project detail with all prices, costs, margins, payments, invoice numbers/dates, price locks, reporting-currency figures and supplier-enquiry quotes blanked **server-side** (`ProjectsService.findOne` -> `redactFinancials`); `ProjectDetail.financialsRedacted` tells the UI. Quantities, dates, PO numbers and statuses stay visible.
- `GET /projects/financial-summary` and `/:id/financial-summary` now return 403 without the permission (dashboard tile and project summary simply don't show).
- Writing a financial field now needs `financials.view` **and** `financials.edit`, so a form populated from redacted (null) data can never write nulls back. UI: Financials section of the line form and freight cost block hidden when redacted; financial keys dropped from saves.
- Which roles are affected: defaults give view to Organization Admin, Project Manager and Finance; Read Only, Quality Assurance and Responsible Person are redacted.
- Test: `apps/api/test/project-financial-redaction.test.ts`. No migration, no RLS change. Not yet checked live as a redacted user (the demo users can't sign in).

## 2026-10-17 — Project line-item delete (superseded: now archive, see next-newest entry)

- `DELETE /projects/:id/lines/:lineId` (needs `projects.edit`); Delete button with inline "Yes, delete / Cancel" confirm beside Edit on each line in project detail.
- Line-owned rows (logistics metric, supplier enquiries) are deleted; price-history and temperature-log rows are kept and detached (`projectLineId` -> null). Removal is written to the field-change audit log. Tenant-scoped; another org gets 404.
- Test: `apps/api/test/project-line-delete.test.ts`. No migration, no RLS change.
- Decisions: Lewis said not to worry about re-pointing demo-user invites for now. Entra check (2026-10-17): External ID tenant `universeplatform.onmicrosoft.com` has one user flow `SignUpSignIn`, identity provider "Email with password" only, so invitees register with a password and must verify their email (example.com can't).

## 2026-10-17 — Demo users for every Universe Demo role (data change, no code)
Created through the live Admin app (Invite a User), all in **Universe Demo**, status INVITED (never signed in):
Avery Admin `demo.admin@example.com` (Organization Admin) · Morgan Manager `demo.projectmanager@example.com` (Project Manager) ·
Quinn Quality `demo.qa@example.com` (Quality Assurance) · Riley Responsible `demo.rp@example.com` (Responsible Person) ·
Finley Finance `demo.finance@example.com` (Finance) · Reese Reader `demo.readonly@example.com` (Read Only).
Universe Demo has exactly these six roles (the supplier/manufacturer/funder/insights roles only exist for orgs of those types).
Notes: they cannot sign in (example.com addresses, no Entra accounts) — they exist to be assigned to projects, actions and
risks. Notification code that targets QA reviewers only picks ACTIVE users, so Quinn/Riley will not receive review actions
while INVITED. Avery now appears as Universe Demo's support contact (first non-platform Organization Admin). To remove: Admin → Users → deactivate.

## 2026-10-17 — Global search; notifications for risk, logistics and quality
Commits `feat: Global search…` (CI/deploys green after a test-teardown fix). No migration, no new RLS.

**Global search.** `GET /search?q=` (`apps/api/src/search/`) finds projects (reference/title), stakeholders, contacts,
batches (number / product), risks (title) and shared-catalogue products (name / HS code / GTIN), 5 per group, min 2
characters. Tenant data runs inside `withTenantContext` (own organisation only); the catalogue has no tenant column and is read
directly. UI: `GlobalSearch` (`packages/ui/src/GlobalSearch.tsx`) — header icon or Ctrl/Cmd+K, debounced, grouped, arrow
keys + Enter; wired into Project Management and Product Database. Product results open the Product Database
(`/?q=<name>` pre-fills its search box). Admin's dead search icon was removed (no equivalent records there).

**Notification sources added** (all written in the event's own transaction via `createNotifications`; categories
QUALITY / LOGISTICS / RISK now exist, the UI groups by them):
- Risk: owner set or changed → action "Review risk: …" due on the review date (previous owner's action closed; moving
  the review date moves the due date); closing → open actions closed and the owner told.
- Logistics: temperature excursion logged → action for every QA reviewer (holders of `products.approve`); reviewing the log
  closes them all. Batch moved to QUARANTINED / EXPIRED / WITHDRAWN → QA reviewers notified.
- Quality: a proposed product amendment → action for QA reviewers; ratify/reject closes them and tells the submitter.
  A new stakeholder → action for holders of `partners.approve`; any approval decision closes them.
- Helpers in `notifications/notify.ts`: `usersWithPermission`, `completeActionsFor`, `rescheduleActionsFor`.
  `createNotifications` now drops any recipient who is not a member of the event's organisation (defence in depth —
  e.g. a risk `ownerId` pointing at another tenant's user raises nothing).
- Tests: `apps/api/test/notification-events-and-search.test.ts` (risk, logistics, quality events, org-membership guard, search incl.
  cross-organisation isolation).

**Still not verified live.** Remaining ideas: notify on QA-queue/evidence items and risk review dates falling due
(needs a scheduled job), per-user notification preferences, email/push delivery.

## 2026-10-16 — Notifications & per-user actions
Commits `0054af8`, `07a61db`. CI, Deploy API (applies migration) and Deploy Static Web Apps green.

**What:** account-aware in-app notifications plus a per-user "actions" (to-do) list.
- Table `notifications` (migration `20261016200000_notifications`): recipient user + organisation, optional actor, `kind`
  (PROJECT_ASSIGNED, PROJECT_STATUS_CHANGED, ACTION_ASSIGNED, ACTION_COMPLETED), `category` (PROJECT), title/body/link,
  `requiresAction` + `actionStatus` OPEN/DONE + `dueDate`, `readAt`, `completedAt`. Tenant-scoped.
- API `apps/api/src/notifications/`: `GET /notifications?filter=all|unread|actions|done`, `GET /notifications/summary`,
  `POST /notifications/read-all`, `POST /notifications/:id/{read,complete,reopen}`. Every query is pinned to
  `recipientUserId = signed-in user` AND their organisation, so one user can never see another's items.
- Events (written in the same DB transaction as the event, via `notifications/notify.ts#createNotifications`):
  adding a project lead notifies that person; a project status change notifies the project's leads (not the actor);
  `POST /projects/:id/actions` assigns an action to a colleague (same organisation only, active users only);
  completing an action notifies whoever assigned it. The actor is never notified of their own action; a self-assigned
  action is a to-do that arrives already read.
- Multi-user project assignment already existed (`ProjectLead`, `POST /projects/:id/leads`, same-organisation check) — no change needed.
- UI (`packages/ui/src/Notifications.tsx`): `NotificationBell` (header, all three apps; unread/open-action badge, red when
  something is overdue; tabs Notifications / My actions; polls every 60s), `ActionsCard` (Project Management dashboard
  "My actions" shortlist with tick-to-complete), `NotificationsView` (`/notifications` page in each app, filters + grouped
  by category). Project detail → Team & Contacts → "Assign an action" (person, text, optional due date).
- Tests: `apps/api/test/notifications.test.ts` (8 tests: targeting, actor exclusion, cross-org refusal, isolation between
  users, complete/reopen, mark-all-read, self-assign).

**Manual step done:** Lewis re-ran `infra/sql/row-level-security.sql` in the Azure Query Editor on 2026-10-16 evening (he reported it ran; the output was not reviewed by Claude), so `notifications` should now have database-level RLS in production. Not yet independently verified — a quick check is `SELECT * FROM sys.security_predicates` for `dbo.notifications`.

**Not verified live yet** (CI only). Future categories (quality, logistics, risk) just need more `createNotifications` calls.

## 2026-10-16 — Mobile drawer + support
Commit `e173052`. Slide-out nav closes (animated 260ms) when a link is tapped; backdrop fades in. Drawer footer always
shows "Need help?" (falls back to "contact your organisation's administrator" when no contacts exist) above "Powered by Universe".

## 2026-10-16 — Optional square org icon; mobile header brand
Commit `abe39b5`. `organizations.logoIconUrl` (migration `20261016180000_organization_logo_icon`); upload/remove via
`?variant=icon` (256 KB max), served at `/branding/:orgId/icon/:file`; Admin "Square icon (optional)" field; `MobileBrand`
in the ≤900px header (icon, else main logo scaled to 26px) with tiny "Powered by Universe"; icon used in the collapsed sidebar.

## 2026-10-16 — Mobile/tablet pass and header polish
Commits `f5dbf70`, `8b32404`. Wrapping header, `minmax(min(Npx,100%),1fr)` grids (no horizontal overflow at 390px),
equal-size dashboard quick-action tiles, org-switcher label hidden ≤560px.

## 2026-10-16 — Organisation branding
Commits `eeedf18`, `8776b43`. Per-org logo (blob storage, public cached `/branding/:orgId/logo/:file`), primary/secondary
colours with auto-readable text, welcome line, sign-in branding (remembered per browser), support contacts
(`GET /organizations/current/support-contacts`). Migration `20261016120000_organization_welcome_message`.
Note: SVGs with only a viewBox need an explicit height or they collapse to 0×0.

## 2026-10-16 — Platform-staff organisation switcher
Commit `eeaf2f5`. `X-Universe-Organization` header honoured only for platform staff; switcher in Project Management and
Product Database headers.

## 2026-10-16 — Admin app build-out and hardening
Commits `d2aea9f`, `04693b3`, `247c6d0`, `107a688`, `be0839f`, `a696438`, `715b924`, `f369b01`, `4876d01`.
Org detail/edit, user management, roles & permissions, global activity feed; suspension enforcement, reset sign-in,
platform-staff grant script (`npm run grant:platform-staff` in packages/db). Real bug fixed: `users.entraObjectId`
plain UNIQUE allowed only one NULL → filtered unique index (migration `20261016090000…`); the CI test DB applies it from
`infra/sql/test-filtered-unique-indexes.sql` (needs `SET QUOTED_IDENTIFIER ON`).

---

## Operating notes (current as of 2026-10-16)
- Repo `ailoveyouuk/universe-platform`, branch `main`. Claude works in a cloud checkout and **can push**; `gh` works.
  Flow: commit → `git push origin HEAD:main` → `gh run watch <id> --exit-status` for CI, Deploy API, Deploy Static Web Apps.
- Deploy API applies Prisma migrations automatically. **RLS policy changes are NOT automatic** — Lewis re-runs
  `infra/sql/row-level-security.sql` in the Azure Portal Query Editor; never give Claude the SQL password.
- `@universe/types` ships `dist/`: run `npm run build --workspace=@universe/types` after type changes.
- Live apps — Admin `orange-tree-06a3f710f.6`, Project Management `black-island-047de4e0f.5`, Product Database
  `delightful-stone-0f4d11d0f.1` (all `.azurestaticapps.net`); API on `universe-pilot-api…uksouth.azurecontainerapps.io`.
- All app data is simulated. Renewables Connect is a separate project.
- Azure: resource group `universe-platform`, subscription "RC Sub", SQL server `universe-pilot-sql`, DB `universe`
  (plus separate `universe-insights`). Branding blobs: per-org private containers `org-<orgId>` via managed identity.

## 2026-10-17 — Ranked country tiles + Stakeholders list fix
- Ranked "Top countries of manufacture / Top delivery countries" tiles (`RankedTile` in `@universe/ui`) now sit above the maps on Logistics, Global Benchmark and Product Database; clicking a row focuses the map. Deployed.
- Fixed empty Stakeholders list ("No stakeholders match these filters", 0 total): `partners/page.tsx` initialised the role/approval filters from `searchParams.get()` which returns `null` when absent, so the API was called with `roleType=null&approval=null` and matched nothing. Now falls back to `""`. Found by intercepting the page's own fetch (response was `{items:[],total:0}` with 200).

## 2026-10-17 — Ranked tile / stat tile polish, British English
- `RankedTile`: bars and rank numbers fade in even steps from full opacity (#1) to 0.4 (#5).
- `StatTile`: new `note` ("approx.") and `indicator` (coloured gauge + band label) props. Logistics totals now show compact figures (35.5M km, 8,405 t); avg efficiency shows e.g. 7.2/10 with a red/amber/yellow/green indicator (Poor/Fair/Good/Excellent).
- British English: "anonymized" → "anonymised" in the Logistics page heading. Role name "Organization Admin" left as-is (code looks it up by name; renaming needs a data migration).

## 2026-10-18 — Product Database completion, step 1: full product page and shared record
Plan and gap analysis: `docs/PRODUCT-DATABASE-GAP-ANALYSIS.md` (project doc `claude/product-database-gap-analysis.md`). Decisions (Lewis): recalls and safety notices in scope; registration facts shared on the catalogue, each organisation's evidence private; regulator watch results become *advisory* "potential" flags (recall, field safety notice, export restriction, sanctions hit etc.) that QA in each organisation reviews and records "checked and verified / not applicable / action taken" per project line (audit trail in the organisation's own data) — review sits in step 4, before the automated feeds.
- **Migration `20261018090000_product_record_fields`:** `product_master` gains lifecycle status/reason/date, storage class, cold chain, shelf life, hazard class, controlled substance, INN, strength, dosage form, brand, pack size, regulatory class, intended use, next review due, version. New shared tables `product_identifiers` (extra GTIN/MPN/UDI-DI/NDC…, deactivated never deleted) and `product_master_changes` (append-only change history).
- **Audit gap closed:** platform-staff edits to the shared catalogue were not audited (FieldChangeLog is tenant-scoped). Every applied change (staff edit, ratified amendment, import, creation) now writes `product_master_changes` (who, organisation, old/new, reason, source, amendment) and bumps `version` once per change set. Helpers in `apps/api/src/product-catalog/product-record.ts`.
- **API:** `GET /product-catalog/:id` returns the new fields, identifiers and a completeness score; `GET /:id/history`; `GET /:id/usage` (caller's organisation only). Empty string clears a text field. Global search results now link to the product page.
- **Product Database app:** new page `/products/detail?id=` with tabs Record, Regulatory (status now; registrations, documents, notices in steps 2–4), Sourcing & batches, Usage, History; edit form (staff apply directly, owning organisation proposes an amendment); list rows open the page (the old inline panel is removed). Pill gained a `critical` tone.
- **Demo data:** `enrich-demo-data` now fills the new fields on all 30,061 simulated products (about 8% of each optional field left blank) and adds 10,864 extra identifiers (second GTIN, UDI-DI for devices/diagnostics). Dry run first, then live.
- **Verified:** CI green (new `product-record.test.ts`), deploys green, product page and completeness checked live. First CI run failed only because my test used a made-up user for an amendment; fixed.
- **Next (step 2):** structured regulatory registrations (WHO PQ, FDA, EU CE/MDR/IVDR, national) with organisation verification and expiry warnings.

## 2026-10-18 — Product Database step 2: regulatory registrations
- **Migration `20261018120000_product_registrations`:** `product_regulatory_registrations` (shared: authority, scheme, reference, class, country, holder, issue/expiry dates, status, source link, verification level, contributor) and `product_registration_verifications` (per organisation, append-only, RLS). **Action for Lewis:** after the API deploy, re-run `infra/sql/row-level-security.sql` in Azure Query Editor so the verification table is protected.
- **API:** `GET/POST /product-catalog/:id/registrations`, `PATCH /product-catalog/registrations/:id`, `POST …/registrations/:id/verify`, `GET /product-catalog/regulatory/dashboard`. Adding needs `projects.edit`/`products.approve` or platform staff; verifying needs `products.approve` (a note is required for "not applicable" and "issue found"). Demo users cannot write to the shared catalogue. Every shared change writes to the product history (source REGISTRATION).
- **Compliance status:** product detail now returns `compliance` (OK / WARNING / BLOCKED with reasons) from lifecycle and registrations: blocked for recalled/withdrawn products or suspended/withdrawn registrations; warning for none, expired, expiring within 90 days, restricted or discontinued. Safety notices join in step 4. UI wording states this is not a clearance.
- **Nothing deleted:** registrations are retired with an archive flag (staff) and shown greyed, restorable. Products are no longer archived from the product page: the action is now lifecycle "Mark discontinued" / "Reinstate"; "Restore" remains only for products archived earlier. No delete endpoints exist.
- **Product Database app:** Regulatory tab (compliance banner, registrations with expiry colouring and source links, add form, per-organisation "checked and verified / not applicable / issue found" with notes and re-verify date); new `/regulatory` dashboard and nav item (catalogue totals, your verification queue, needs-attention list).
- **Demo data:** `enrich-demo-data` adds registrations to about 65% of simulated products (authorities by category; a realistic tail expired, expiring or suspended) and verifications by the demo organisation on about 40%.
- **Tests:** `product-registrations.test.ts` (sharing, private verification, permissions, compliance, archive-not-delete).

## 2026-10-18 — Product Database step 3: controlled product documents
- **Lewis ran the RLS script** for the step 2 verification table (confirmed succeeded).
- **Migration `20261018150000_product_documents`:** `product_documents` (tenant-scoped, RLS entry added to `infra/sql/row-level-security.sql`; **Lewis must re-run the script again after this deploy**). Fields: type (certificate, IFU, labelling, SDS, specification, CoA template, test report, technical file, other), title, version, status (draft / approved / superseded), effective, expiry and review-due dates, optional link to a registration, supersedes pointer, file reference, blob ETag, scan status, uploader and approver.
- **Controls:** upload limited to 25 MB and PDF, PNG, JPEG, text, CSV, Word, Excel (checked before a URL is issued and again against the stored blob at confirmation); four-eyes approval (approver must hold `products.approve` and cannot be the uploader); approving a new version marks the one it supersedes SUPERSEDED; archive only, never delete; every change written to the field audit log.
- **Malware scanning:** the API reads Microsoft Defender for Storage's scan tag on the blob at confirmation and on every download; an infected file is rejected or blocked. If Defender for Storage is not enabled on the storage account the status shows "Not scanned" (never a false "clear"). **Action for Lewis (Azure portal, storage account → Microsoft Defender for Cloud → enable malware scanning)** to make scans live.
- **App:** new Documents tab on the product page (add, open, approve, new version, archive, expiry pills); `/regulatory` gains document tiles (awaiting approval, expiring, expired).
- **Demo data:** records (no stored files) for products the demo organisation uses; some expiring or expired.
- **Tests:** `product-documents.test.ts`.
- **Raised by Lewis:** product names carry pack size and a "#N" suffix. The suffix is a simulated-data artefact; the real gap is that the catalogue is flat (no product family with variants). Proposed step 3b: product family plus variants, GTINs per packaging level, regenerate clean names. Awaiting Lewis's agreement.

## 2026-10-18 — Product Database fixes: layout, upload CORS, iconography
- **Layout:** product page and `/regulatory` now use the catalogue page's padding, so content no longer touches the side nav; long product names wrap.
- **Real upload test (live):** a PDF uploaded via the Documents tab was stored in Azure Storage, recorded as a draft ("Not scanned"), a download link was issued, and the test record archived. First attempt failed because storage CORS allowed only the Project Management origin; Lewis added the Product Database origin in the portal (Resource sharing, Blob service) and `infra/bicep` now lists both origins.
- **Iconography:** emoji that had crept into stat tiles (storage, shelf life, next review, regulatory dashboard, an import warning) replaced with Universe SVG icons; ten new icons added in the brand style (thermometer, hourglass, calendar, calendar-x, ban, help-circle, clipboard-check, refresh, file-edit, external-link) plus a check icon used by the stage tracker. No emoji remain in the apps.
- **Compliance banner:** says "Active registration on record" and lists expired registrations, rather than "good standing".

## 2026-10-18 — Product Database step 4: safety notices and recalls
- **Decision (Lewis):** Microsoft Defender for Storage is deferred to a go-live gate (documents show "Not scanned" until it is enabled; no code change needed). Step 4 proceeds.
- **Migration `20261018210000_product_safety_notices`:** `product_safety_notices` (shared: type RECALL / FIELD_SAFETY_NOTICE / SAFETY_ALERT / FALSIFIED_ALERT / SUPPLY_ALERT, severity CRITICAL/HIGH/MEDIUM/LOW, issuing authority, reference, summary, action required, affected batches, countries, issue date, OPEN/CLOSED with close reason, source link, soft-archive) attached to a variant or a family (applies to every variant, same Target pattern as registrations/documents); `product_safety_notice_reviews` (tenant-scoped, append-only: checked no impact / not applicable / action taken / affected, notes required unless "no impact"). **RLS entry added to `infra/sql/row-level-security.sql` — Lewis must re-run the script after this deploy.**
- **API:** `GET/POST /product-catalog/:id/safety-notices` and `/families/:id/safety-notices`, `PATCH /safety-notices/:id` (edit, close with a reason, reopen, archive — nothing deleted), `POST /safety-notices/:id/review`, `GET /safety-notices/dashboard`, `GET /safety-notices/flags?ids=`. Recording needs `products.approve` or platform staff; editing is limited to platform staff or the contributing organisation's QA; the contributor is masked under the pooled-database rule.
- **Compliance:** an open critical (class I) notice makes a product BLOCKED; any other open notice makes it WARNING (variant sees its family's notices; a family sees its variants'). Closing unblocks. Every change is written to the product/family change history.
- **Notifications:** saving (or reopening) an open notice alerts the QA reviewers (`products.approve`) of every organisation that uses the product on a project line or as an approved source, as an action item; simulated notices only reach the demo organisation and real ones never do.
- **Apps:** Product Database — "Safety notices and recalls" section on the Regulatory tab of products and families (record, review, close, reopen, archive); `/regulatory` dashboard gains safety tiles and a review queue. Project Management — project lines show an open-recall / safety-notice warning with the headline and a link to review it.
- **Demo data:** `enrich-demo-data` adds ~46 simulated notices (mostly closed, a handful open, two critical open recalls on products the demo organisation uses) and the demo organisation's reviews of about half the open ones. Run via the existing enrichment workflow (`only=catalogue`).
- **Tests:** `product-safety-notices.test.ts` (compliance, permissions, sharing, notification to another organisation, private review, family inheritance, close/unblock, nothing deleted).
- **Not yet:** automated daily regulator monitoring (step 4b) — an empty list is not a clearance and the UI says so.
- **2026-10-18 (later):** CI and deploys green; demo notices loaded (46 notices, 35 reviews). **Lewis re-ran the RLS script on the `universe` database and it succeeded**, so `product_safety_notice_reviews` now has database-level row-level security.

## 2026-10-18 — Product Database step 4b: daily regulatory watch
- **Migration `20261018230000_regulatory_watch`** (shared tables, no RLS needed): `regulatory_watch_items` (one row per regulator recall/alert, unique on source + reference, never deleted), `regulatory_watch_matches` (advisory match of an item to a catalogue variant: confidence, basis IDENTIFIER or NAME, PENDING / CONFIRMED / DISMISSED, reviewer, reason, linked safety notice), `regulatory_watch_runs` (the audit log: start/end, status, fetched/new/changed/matches, error).
- **Connectors** (`packages/db/src/regulatory-watch/`): openFDA device enforcement reports, openFDA drug enforcement reports, and MHRA drug/device alerts via the GOV.UK search API. Read-only, fixed host allow-list (api.fda.gov, www.gov.uk), 30 s timeout, page caps, JSON only (nothing executed). FDA class I/II/III map to critical/high/medium; MHRA class and alert type map to recall / field safety notice / safety alert. Not yet included: WHO alerts and prequalification lists (no stable API), EMA, EUDAMED, sanctions lists, curated export-restriction entries.
- **Matching** is deterministic and advisory: identifiers (GTIN, UDI-DI, NDC, part numbers, normalised so GTIN-13/14 and hyphenated NDCs line up) found in the notice's product/lot text score 95%; generic or brand name plus strength scores 60%; a name alone is not stored. Only real (non-simulated) products are matched, so simulated demo data never mixes with real regulator data. Nothing is blocked automatically.
- **Triage (platform staff only):** confirm records a safety notice through the normal route (so the QA team of every organisation using the product is notified and records its own review) and links it to the match; dismiss needs a reason. Every match is kept.
- **Daily job:** `.github/workflows/regulatory-watch.yml`, 05:17 UTC daily plus manual run (dry run by default when run by hand). First run looks back 45 days; later runs overlap two days. A failing source is logged FAILED, the other sources still run, and the job fails so GitHub notifies the repository owner. Optional repository secret `OPENFDA_API_KEY` raises the openFDA rate limit; the job uses the existing `DEMO_LOAD_DATABASE_URL` secret (the live Universe database).
- **API:** `GET /product-catalog/regulatory-watch/dashboard`, `POST …/matches/:id/confirm`, `POST …/matches/:id/dismiss`, `GET /product-catalog/:id/watch-matches`.
- **Product Database app:** new "Regulatory watch" page (source health with stale/failed flags, totals, matches awaiting review with confirm/dismiss, recent regulator items, run log); products show a "potential alert" strip above their safety notices when a match is pending. Compliance banners now say the watch is advisory and covers openFDA and MHRA only.
- **Demo data:** 12 simulated items with matches (two dismissed) and 24 run records (one simulated failure) for the demo organisation only.
- **Tests:** `regulatory-watch.test.ts` (identifier normalisation, matching rules, severity mapping, connector parsing with a fake fetch and 404 handling, host allow-list, idempotent re-runs, failed-source logging, advisory-only triage and dismissal).
- **Known limits:** matches that are pending do not yet change a product's compliance status or flag project lines (deliberate: advisory); closing of a confirmed notice when the regulator closes the item is not automatic; real matches will only appear once real (non-simulated) products with real identifiers exist.
- **Verified live (2026-10-18):** CI and deploys green; migration applied; demo watch content loaded (12 items, 24 run records). First dry run of the real job (after fixing a script import path) reached all three feeds: openFDA devices 364 items, openFDA drugs 73, MHRA alerts 18 over the 45-day look-back, no matches (expected: the catalogue holds only simulated products). The daily schedule writes for real from 05:17 UTC; nothing has been written to the live watch tables by real data yet.

## 2026-10-18 — Export and hoarding restrictions (UK list plus origin-to-destination check)
- **Why (Lewis):** the UK DHSC/MHRA list of medicines that cannot be parallel-exported or hoarded is a useful first check for organisations, and should be applied to a project line's origin and destination, with the same logic for other countries.
- **Migration `20261018240000_export_restrictions`:** `export_restrictions` (shared; restricting country, source UK_DHSC_CSV or MANUAL, medicine, strength, form, scope EXPORT/HOARDING/BOTH, restriction date, ACTIVE/REMOVED with removal date, source link, notes, simulated flag, first/last seen). Nothing is deleted: a medicine dropped from the UK list is marked REMOVED and reinstated if it returns.
- **UK feed:** the daily watch job finds the current CSV attachment through the GOV.UK content API (the file name changes with each update), parses it (quotes, CRLF, dd/mm/yyyy dates; refuses an unrecognised header) and syncs it; logged in the watch run log as `UK_EXPORT_RESTRICTIONS`. Host allow-list now includes assets.publishing.service.gov.uk.
- **Matching:** generic name (word-bounded, against INN or name), strength (must equal one of the listed strengths) and form (shares a key word). If the product record lacks a strength or form that the restriction names, the result is "check", not a match.
- **Route logic:** a line is flagged when the goods originate in the restricting country and are delivered elsewhere. Origin = supplier's country, else manufacturer's country, else the line's country of manufacture; destination = the project's delivery country. If no delivery country is set, the line shows "destination unknown, check". UK-to-UK is not flagged.
- **Other countries:** platform staff add curated entries (country, medicine, strength, form, scope, date, mandatory source link) on the Regulatory watch page; the same route logic then applies to any restricting country. No other-country entries have been seeded: each needs a verified official source.
- **API:** `GET/POST /product-catalog/export-restrictions`, `PATCH …/:restrictionId` (feed rows: notes only), `GET …/project/:projectId`, `GET /product-catalog/:id/export-restrictions`; the watch dashboard returns the list.
- **Apps:** Project Management project page shows a banner above the lines (restricted to export, or check); Product Database product page shows matched restrictions in the safety card; Regulatory watch page lists restrictions and has the staff entry form.
- **Advisory only:** the check does not replace the licence holder's legal duty (reg 43(2) Human Medicines Regulations 2012 for the UK) and does not block anything.
- **Tests:** `export-restrictions.test.ts` (CSV parsing, matching, route logic, sync with history and removal, project check by supplier country and destination, staff-only curated entries).
- **Verified live:** CI and deploys green; dry run and write run of the job fetched and stored 38 UK restrictions.
- **Known limits:** matching is by name/strength/form, not licence number; origin is inferred from partner country; manufacturer and supplier countries must be recorded; no demo restriction data.

## 2026-10-18 — Product Database step 5 (part 1): exports and product dossier
- **Catalogue CSV:** `GET /product-catalog/exports/catalogue` follows the browse screen's filters (search, category, source standard, show archived). 25 columns: identifiers, family and variant, INN, strength, form, pack size, GTIN, HS, UNSPSC, lifecycle, storage, cold chain, shelf life, controlled flag, contributor, dates. Button "Export CSV" on the catalogue page.
- **Registrations CSV:** `GET /product-catalog/exports/registrations` (optional status filter): every shared registration with authority, reference, holder, expiry, days to expiry, effective status (expired reads EXPIRED) and the calling organisation's own latest verification. Button on the Regulatory status page.
- **Product dossier:** `GET /product-catalog/:id/dossier` and a new page `/products/dossier?id=`: compliance position and completeness, identity, registrations with your verification, controlled documents (metadata only), safety notices with your review, matching export restrictions, change history. "Print or save as PDF" and "Download data (JSON)". Linked from the product page ("Product dossier").
- **Rules honoured:** simulated rows only inside a demo organisation; contributors anonymised under the pooled-database rule; verifications and reviews are only the caller's own organisation's; archived rows excluded unless asked for.
- **Safeguards:** cells that start with `=`, `+`, `-`, `@` are prefixed so spreadsheets don't run them as formulas; UTF-8 with byte-order mark; ceiling of 50,000 rows per export, with a note in the file when it is hit; every export writes an audit entry (`data_exports` in the organisation's field change log: who, what, rows, filters).
- **Decision to confirm:** any signed-in user can export what they can already see (no new permission yet). If bulk export of the pooled catalogue should need a permission (for example a new `products.export`), that is a small follow-up.
- **New icons:** download and printer, in the Universe SVG set.
- **Tests:** `product-exports.test.ts` (formula-safe cells, filters, simulated hidden, anonymised contributor, audit entry, expired status, private verification, dossier and its audit).
- **Still to do in step 5:** demo-data completeness review and live security and scale checks of the new screens.

## 2026-10-18 — Exports: catalogue protected, organisations export their own data
- **Decision (Lewis):** the shared Universe catalogue is a valuable asset, so it must not be exportable without a global admin's authorisation; organisations can export everything they themselves add.
- **Changed:** the catalogue and registrations CSV exports now return only what the caller's organisation contributed. Global admins (platform SUPER_ADMIN) export everything directly. Contributors stay anonymised in a wider export.
- **Export requests (new):** an organisation asks for a wider export of the product catalogue or registrations (optional filters, reason required, at most five waiting per organisation). All active global admins get an action notification ("Platform" group). A global admin approves or rejects on the new **Data exports** page (a rejection needs a reason); the requester is notified. An approval allows one download by the requester within seven days; the file is built at download time from current data with the requested filters. Everything is written to the field change log (`data_export_requests`: requested, decided, downloaded with row count). Requests are never deleted.
- **Own-organisation exports:** new **Data exports** page in the Product Database app (products and registrations the organisation added, stakeholders, projects, project lines), plus "Export CSV" buttons on the Stakeholders and Projects pages in Project Management. Read inside the organisation's own tenant context. Money columns (project and line costs, partner financial details) are not in these files; they stay in the app behind the financial-view permission. Each export is audited.
- **Migration `20261018250000_data_export_requests`:** `data_export_requests` (tenant-scoped). **RLS entry added to `infra/sql/row-level-security.sql` — Lewis must re-run the script in the Azure Query Editor on `universe`** (it is safe to re-run).
- **Still open:** the single-product dossier is unchanged (any signed-in user can open it for a product they can see); notifications and exports for other tables (contacts, quality records, batches, logistics) are not yet in the own-organisation exports.
- **Tests:** `data-export-requests.test.ts` (request, notification, privacy between organisations, admin-only decisions, rejection reason, one-time download by the requester only, expiry, anonymised wide file, own-organisation exports and their audit) and `product-exports.test.ts` updated for the new scoping.
- **2026-10-18 (later):** Lewis re-ran the RLS script on the `universe` database and it succeeded, so `data_export_requests` now has database-level row-level security. CI and deploys green.

## 2026-10-18 — Step 5 (part 2): demo-data completeness and ring-fence
- **Review result:** the demo already had identifiers, registrations, verifications, documents, families, packaging, safety notices and regulatory watch content. Gaps were export restrictions and export requests.
- **Added to the demo (simulated, demo organisation only):** 5 clearly labelled simulated export restrictions for pharmaceutical products that demo project lines source from a supplier in the restricting country and deliver elsewhere, so the project-line check shows real flags; 4 sample export requests (pending, approved, rejected, downloaded) so the Data exports page is populated. Loaded via the enrichment workflow (`only=catalogue`); dry run first, then live.
- **Ring-fence fixes found during the review:** simulated export restrictions are now visible only inside a demo organisation (list, product check, project check, watch page); restrictions added by staff acting in the demo are flagged simulated; export requests made in the demo never notify the real global admins and are invisible to them outside the demo (an admin acting inside the demo can decide them); a real admin cannot decide a demo request or the reverse.
- **Fix:** the new enrichment step queried 3,000 product IDs at once and hit the SQL parameter limit on the first dry run; now chunked.
- **Tests:** `data-export-requests.test.ts` covers the demo ring-fence.
- **Still to do in step 5:** live security and scale checks of the new screens (needs the Product Database tab signed in).

## 2026-10-18 — Projects can have several delivery countries
- **Change:** the New Project form and the project header editor now take several delivery countries (new searchable multi-select with removable chips; the first is the primary). The project page lists them all.
- **Storage:** new `projects.deliveryCountryCodes` (migration `20261018260000_project_delivery_countries`, existing projects backfilled with their one country). `deliveryCountryCode` is kept and always equals the first country, so older readers still work.
- **Follows through:** the Projects list country filter and dashboard countries tile count every destination; the export-restriction check on project lines runs once per destination; the own-organisation projects CSV lists all countries (semicolon-separated); changes are audited.
- **Known limit:** the CO2/distance figure for a project line still uses the primary (first) country only. Per-line destinations would be the proper next step.
- **Tests:** `delivery-countries.test.ts` (normalising, storage format, fall-back for older rows, exact-match filter). No manual step: no new tenant table, so no RLS change.

## 2026-10-18 — Dashboard: Delivery countries tile opens a per-country view
- **Change:** clicking the "Delivery countries" tile on the Project Management dashboard now opens a panel (it used to jump to the Projects list). Each delivery country is a card in the Universe palette (violet, magenta, green, amber, orange, grey, cycled) showing live and total project counts and its five most recent/active projects, each linking to the project; "View all" opens the Projects list filtered to that country. The panel has a country filter box and a "Live projects only" switch.
- **How "recent/active" is ranked:** live projects (identified, in progress, submitted, awarded) first, then by most recent update, then finished ones to fill up to five. Archived projects are excluded. A project with several delivery countries appears under each.
- **API:** `GET /projects/country-overview` (two queries: one light ranking scan, one fetch of at most five projects per country; tenant-scoped).
- **Tests:** `project-country-overview.test.ts` (counts per destination, live first, five-project cap, archived excluded, no cross-organisation leakage).

## 2026-10-19 — Fix: Logistics & CO2 stakeholder ratings stuck on "Loading…"
- **Cause:** `getStakeholderRatingDistribution` loaded every logistics row (with its project line) of every contributing organisation into memory and averaged in code. In the demo that is thousands of rows, so the request ran past the gateway timeout and the section never left "Loading…". (The `universe-insights` `isSimulated` columns were also confirmed present: Lewis ran `infra/sql/insights-simulated-flag.sql` on 2026-10-19, and the routes data and map load.)
- **Fix:** averages are now computed in the database per organisation (grouped by project, manufacturer and supplier, plus one overall figure), and merged in code. Same result (a band per entity, minimum cohort size still applies); `AVG` is cast to float so scores are not truncated.
- **2026-10-19 (later): rating section redesigned.** "Stakeholders by efficiency/CO2-impact rating" is now four standard stat tiles (Projects, Manufacturers, Suppliers, Procuring organisations), each with one large average score out of 10 and the usual subtle colour indicator (red/amber/yellow/green band, label such as "Good · 996 rated", and a thin gauge). The per-band listings ("996 at ~8-10/10…") are gone. The API now returns one summary per category (`StakeholderRatingSummary`: average of the entities' own average scores to one decimal, band, entities rated); a category with fewer entities than the minimum group size is omitted. Endpoint path unchanged (`GET /logistics-insights/global/stakeholder-ratings`), response shape changed; this page was its only reader.
- **2026-10-19 (later still): the rating call was still too slow after the first fix** (live check: the request had not finished after 30 seconds while the routes call took 0.2 s). The earlier version looped over every consenting organisation, one tenant transaction each; the demo has hundreds of simulated organisations. It is now four set-based queries in a single platform-staff context (projects, manufacturers, suppliers, procuring organisations), each returning only the count and the average-of-averages. Real organisations still see only consented, non-demo, non-simulated organisations; demo organisations see every consenting organisation.

## 2026-10-19 — Per-line destinations, carry-over on "Add line", complete demo pricing
- **Per-line destination:** a project line can name which of the project's delivery countries it goes to (`project_lines.destinationCountryCode`, migration `20261019130000_project_line_destination`; blank = the project's first/primary country). The line form shows the picker only when the project has more than one country, limited to those countries. The API refuses a destination that is not one of the project's countries.
- **What uses it:** the distance/CO2/efficiency figure for the line, the export-restriction check (a line with its own destination is checked against that country only; otherwise against every project country), and the own-organisation project-lines CSV (new "Destination country" column).
- **Fix found on the way:** changing a project's delivery countries, freight mode or incoterm never recomputed its lines' distance and CO2. It now does, and any line destination that is no longer one of the project's countries is cleared (nothing deleted).
- **Add line carries over steady details:** adding a line pre-fills from the project's latest line: destination, supplier, manufacturer, country of manufacture, supplier and client currency, product margin, client and internal PO details, GAD and supplier GAD, warehouse reference, qualification pathway and its expiry. Not carried: product, quantity, prices, weight, batch and delivery dates. A note lists what was pre-filled with a "Clear pre-filled" button, and a single approved source on a newly picked product still overrides the carried supplier/manufacturer.
- **Demo pricing completed (simulated, demo organisation only):** `enrich-demo-data` has a pricing step (also runnable alone: only = pricing). Dry run: 5,551 lines and 1,506 projects to fill. It fills blanks only, using the service's own rules: supplier total (native and base currency, locked to the latest stored rate), product margin % and amount, client invoice (base, client currency, unit sales price), supplier payment status/amount paid/dates (paid in full when completed, part-paid when awarded), internal invoice number/date, and per project freight cost, insured value (110% of product value), insurance premium, additional cost, total, freight margin and invoice amount. Records keep their existing updated dates so dashboard "recent" lists do not shift.
- **Tests:** `project-line-destination.test.ts` (accepts own countries, refuses others, clears when the project stops delivering there).
- **Step 5 live checks done:** Data exports page, the dossier and the catalogue page load without errors, all calls 200 and under one second.

## 2026-10-19 — Own-organisation exports extended
- **New exports (own additions only, tenant-scoped, audited like the others):** contacts, product batches, logistics and CO2 figures per line, stakeholder certifications, quality evidence records and the risk register. Buttons: Stakeholders page (contacts, certifications), Batches, Quality (certifications, evidence), Risk Register, Logistics & CO2, and cards on the Product Database "Data exports" page. The shared list of export types lives in `@universe/types` (`ORGANISATION_EXPORT_ENTITIES`) so the API and screens cannot drift.
- **Tests:** `organisation-exports-more.test.ts` (batches and risks exported for the caller only; unknown type refused).
- **Not included (deliberately):** controlled documents and uploaded files (only records; files stay in storage), anything with money columns.

## 2026-10-19 — Export-restriction and safety-notice follow-ups
- **Restriction lifted, people told:** when an export restriction stops applying (it leaves the daily UK list, or staff mark a manual entry REMOVED), the leads of every open project (identified, in progress, submitted, awarded) with a matching product line get a LOGISTICS notification linking to the project, asking them to re-run the export check. Matching is by generic name, strength and form, as with the project check. One notification per lead per restriction and project; a failure never blocks the sync or the change. Code: `packages/db/src/regulatory-watch/restriction-lifted.ts`.
- **Safety-notice to-dos close themselves:** when an organisation records its review, the "check this notice" to-do is completed for everyone in that organisation; when a notice is closed it is completed for every organisation. The notices themselves are never deleted.
- **Single-product dossier — decision:** left open to anyone who can already see the product. It bundles only what that person can already view on screen (contributors anonymised, own organisation's reviews only), is limited to one product, and every download is audited. The bulk catalogue and registration exports stay restricted to the caller's own contributions unless a global admin. Revisit if an organisation asks to limit it.
- **Tests:** `export-restriction-lifted.test.ts` (open projects only, once per restriction and project, leads only); the safety-notice test now checks the to-do is completed on review.
- **Demo pricing result (2026-10-19):** the real run filled 5,551 lines and 1,506 projects (about 28 minutes). Live check on a demo project: product cost, freight cost, margin and subtotal now show; line payment balances are set. Cosmetic fix: the "remaining" balance on a line is now shown to two decimals (it had shown a floating-point tail such as 12224.310000000001).

## 2026-10-19 — Days counter stops at zero; per-stage dashboard tiles on project detail
- **Fix:** "Days remaining for submission" (project detail and the Days Left column in the list) no longer goes negative; it stops at 0 once the due date is reached. The tile also says whether the date is today or has passed.
- **Stage dashboard:** a row of tiles (the platform's usual tile design) at the top of project detail, different for each stage, built from data already captured (nothing new stored); money tiles are hidden without financial permission. Identification: days to submission, due date, client, destination(s), lines scoped, project leads. In progress: days to submission, due date, lines priced, supplier enquiries (awaiting/quoted), quoted value, gross margin, compliance flags. Submitted: submitted date, days awaiting decision (amber after 30), bid value, margin, client, destinations, compliance flags. Awarded: order value, lines delivered, next delivery (late/this week), on-time-in-full %, supplier payments due, client invoiced/paid, compliance flags. Completed: final value, margin, OTIF %, fully settled lines, cycle time, closeout stage and report, transport CO2e. Unawarded/declined/cancelled: outcome date, time in pipeline, value at stake, client, cancellation reason. Code: `apps/project-management/src/app/projects/detail/StageDashboard.tsx`.
- **Refined (same day):** at most four tiles per stage, most relevant first, and none for Identification (no data yet). In progress: days to submission (due date shown beneath), lines priced, quoted value, margin (swapped for compliance flags when any exist). Submitted: awaiting decision, bid value, margin, compliance flags. Awarded: lines delivered, next delivery, on-time-in-full, supplier payments due. Completed: final value, margin, on-time-in-full, closeout. Unawarded/declined/cancelled: outcome date, time in pipeline, value at stake, reason or client. Colours use only the Universe status tokens (good, warning, critical) and tile tones.

## 2026-10-19 — Shelf life on the product page; Product Database demo-data review
- **Shelf life, clarified:** the tile is the product's standard shelf life (a fixed attribute in months), now labelled "Standard shelf life". Actual expiry belongs to batches.
- **Tile now reads the batches:** it shows the next in-date batch expiry (amber within 90 days) and how many batches need attention; red when any batch has expired. Uses the organisation's own batches only.
- **Batch checks against the standard:** the Sourcing & batches table has a "Life left" column (share of the batch's own life still ahead) with flags: Expired; Shorter than standard (its manufacture-to-expiry life is more than a month under the product's standard); Under 25% of life left. Withdrawn batches are not flagged. Code: `products/detail/batchLife.ts`.
- **Product Database demo-data review:** registrations are deliberately present on about 65% of simulated products, so "No registration recorded" is a realistic state, and export restrictions already match demo medicines to the UK list. No further seeding needed; step 5 is closed.
- **Next:** Tender Issuance & Management; design proposal at `docs/TENDER-APP-DESIGN.md` (decisions pending).

## 2026-10-19 — Tender app, step 1a: data model and database security
- **Design:** `docs/TENDER-APP-DESIGN.md` (v3) agreed with Lewis: issuer and participant views of one tender; eligibility is explained, not hidden; shortlist and saved criteria; issuer builder and adaptive dashboard; external e-signature section for contracts; public teaser designed in (flag only) for version 2; performance ratings deferred to the next round.
- **Tables (migration `20261019150000_tenders_step1a`):** tenders, tender_lines, tender_criteria, tender_eligibility_rules, tender_invitations, tender_documents, tender_clarifications, tender_questions, tender_participations, tender_eligibility_checks, tender_shortlists, tender_saved_searches, tender_events (the shared append-only timeline). Bids, scoring, awards and contracts arrive in later steps with their own migrations.
- **Database security (`infra/sql/tender-rls.sql`, new):** drafts are private to the issuer; a published tender is readable by every registered organisation (or only invited ones for invited-only tenders); lines, criteria, rules, documents and public clarifications follow the parent tender's visibility; participation, eligibility checks and questions are readable by the owner and the issuer only; the timeline can be appended by either party and read by both; only owners write their own rows; shortlists and saved searches are private. A two-party predicate also takes a release time, which step 3 uses to seal bids until closing at the database level.
- **Needs Lewis (production):** after the migration deploys, run `infra/sql/tender-rls.sql` against the live database (same way as `supplier-directory-rls.sql`). CI applies it automatically; the scale-test workflow does too.
- **Tests:** `apps/api/test/tender-isolation.test.ts` (draft privacy, published and invited-only visibility, children follow parent, no-session sees nothing, participants cannot write issuer rows, two-party reads, forged timeline entries refused).


## 2026-10-19: Tender app step 1b (permissions, API, eligibility)

- **Production:** `rls.TenderAccessPolicy` applied to the live `universe` database by Lewis (step 1a script).
- **Permissions:** `tenders.view`, `tenders.issue`, `tenders.bid`, `tenders.evaluate`, `tenders.award` added to the seed, to the Organization Admin, Project Manager (view, bid), Supplier Admin and Manufacturer Admin (view, bid) templates and to the Stakeholder Demo role. Existing organisations: run `npm run backfill:tender-permissions --workspace=@universe/db` (idempotent; needs the production `DATABASE_URL`). New notification category `TENDER`.
- **API (`apps/api/src/tenders`):** issuer endpoints (create, edit, lines, criteria, eligibility rules, invitations, publish with readiness checks, cancel, my tenders, dashboard) and participant endpoints (every published tender with eligibility chips and filters, tender view with live requirement checklist, express interest and withdraw, shortlist, saved searches, "tenders for you").
- **Eligibility (`eligibility.ts`, pure and unit-tested):** rule types organisation type, country, category, qualification, exclusion; each rule is Met, Not met or Needs evidence with a plain action; outcome Eligible, Almost eligible (one or two fixable gaps) or Not eligible; invitation allows bidding, exclusion overrides it. Checked against the registry (organisation, countries of operation, supplier products, manufacturer profile), never self-declared. The result at the time of opt-in is recorded in `tender_eligibility_checks`.
- **Lifecycle rules:** publish needs title, a line, a closing date at least 12 hours ahead, criteria, scored weights totalling 100, invitations for invited-only. After publication content is locked; only dates can move, and the closing date only later (participants are notified).
- **Demo ring-fence:** a demo organisation's tender is never visible to real organisations (published as invited-only to other demo organisations); real saved-search alerts are skipped for demo tenders.
- **Alerts:** invited organisations and saved-search matches are notified on publication; issuers are notified of new interest.
- **Not yet:** screens (steps 2 and 3), sealed bids (step 3), documents upload, clarification Q and A endpoints, bid counts on the dashboard (`bidsReceived` is null until step 3).

## 2026-10-19: Tender app step 2, issuer screens (new app `apps/tenders`)

- **New Static Web App "Tender Issuance"** (`apps/tenders`, same shell, sign-in and design system as Product Database). Routes: Dashboard (adaptive tiles: open, drafts, closing within 7 days, interested organisations, needs attention; closing-soon and interest lists; recent tenders), My tenders (status chips with counts, search), Tender builder, Manage tender, Notifications.
- **Builder:** six sections that each save on their own: Overview (type, visibility, delivery countries, dates, bid validity, accepted upload formats, typed-answer allowance, terms), Items (from the product catalogue or free text, with quantity, destination, required registration, shelf-life and cold-chain needs), Criteria (pass/fail gates and weighted criteria with a live total of 100), Who can bid (organisation type, country, category, qualification rules, each with the plain-language message bidders will see), Invitations (search registered organisations), Review and publish (a checklist that mirrors the server's publish checks).
- **Manage page:** stage tiles (at most four; none for drafts): open tenders show time left, organisations interested, invited, and questions-close countdown; closed or evaluating tenders show interest, evaluation due, award due and scored criteria. Tabs for summary, participants (with further invitations while open) and the append-only timeline. Dates can be extended (closing date only later); cancelling needs a reason and tells interested organisations.
- **API addition:** `GET /tenders/organisations?q=` (invitation search; a demo organisation only sees other demo organisations).
- **Infra (needs Lewis):** Bicep module `tendersSwa` and a `tenders` job in deploy-static-web-apps.yml, skipped until the `TENDERS_URL` repository variable is set. Steps: run Deploy infra; set secret `SWA_TOKEN_TENDERS` and variable `TENDERS_URL`; add the new URL as a redirect URI on the CIAM app registration; then flip "tender-issuance" to available in `AppSwitcher.tsx` with the hostname.
- **Not yet:** participant screens, discovery, sealed bids (step 3); clarification Q and A screens; document upload on a tender.

## 2026-10-19: Tender step 2 follow-ups and walkthrough

- **Tenders app live** at https://jolly-ground-0378d7b0f.4.azurestaticapps.net (SWA `universe-pilot-tenders`); infra deployed, secret, variable and redirect URI set by Lewis; AppSwitcher entry "tender-issuance" now available.
- **Permissions backfill:** manual workflow `backfill-tender-permissions.yml` (`dry_run` defaults to true) grants tenders.* permissions to existing roles by role name. Dry run: 1,291 additive grants across 304 organisations. The real run is for Lewis to trigger with dry_run unticked.
- **Walkthrough fixes:** create-draft redirect (stale closure), request normalisers so the API's strict validation does not reject extra fields or decimal strings, country clearing. Manage page now states that a simulated tender is visible only to invited demonstration organisations.
- **Walkthrough result:** created, itemised, scored (Price 60 / Quality 40 plus a WHO PQ gate), rule-restricted, reviewed and published TND-2026-0001 in the demo organisation; test data, to be cancelled and cleared with the sandbox baseline.
- **Known minor:** step pills for Invitations and Who can bid show "done" even when empty (optional steps); to tidy.

## 2026-10-19: Tender compliance round (from the standards gap analysis)

- **Shared lists consolidated** in `@universe/types`: `INCOTERMS` (+ names; Project Management logistics pages, project detail and the projects DTO now import it), `UNIT_OPTIONS` (common count, pack, metric and imperial units; "Other" lets a user type one), `QUALIFICATION_OPTIONS` (adds WHO Listed Authority, GMP inspection by PQ/SRA/PIC/S, national marketing authorisation, GDP, MQAS, ISO 17025), `EXCLUSION_GROUNDS`, `SCREENING_LISTS`/`SCREENING_OUTCOMES`. New `UnitSelect` in `@universe/ui`. Tender currency, Incoterm, unit and an item's required registration are now pickers, not free text.
- **Clarifications:** bidders ask (API now, bidder screens in step 3), the issuer answers to everyone without naming the asker (editable published wording), or posts its own clarification; participants are notified.
- **Addenda:** formal change notices with optional later closing date; participants notified and asked to acknowledge; issuer sees who has not.
- **Bidder declarations:** integrity pledge and exclusion declaration recorded at opt-in (each switchable per tender, on by default); declared grounds flag the participant for the issuer.
- **Screening log:** issuer records that it screened a participant against chosen sanctions/debarment lists (date, result, notes). Universe does not run the check. Private to the issuer.
- **Standstill (off by default):** per tender, default 8 working days; enforced at award in step 4. **Public notice (off by default):** unauthenticated `/notices` page and `GET /public/notices`; never for simulated tenders; shows only title, items, criteria, dates, issuer name.
- **Time zones:** each tender has an IANA zone; dates are entered and shown in it with the UTC time alongside.
- **Audit chain:** every tender event is hash-chained (SHA-256 over previous hash + content), written in a platform-staff context so both parties' events join one chain; issuer can verify the timeline from the Timeline tab. Limitation: removing the most recent entries cannot be detected by the chain alone.
- **Currency** is now required to publish (bids are compared in it). FX at submission (spot rate) and evaluator conflict declarations/scoring arrive with bids in steps 3 and 4.
- **Prod steps for Lewis:** the API deploy applies migration `20261019210000_tender_compliance`; then re-run `infra/sql/tender-rls.sql` (idempotent) in the Azure SQL query editor so the three new tables get policies.

## 2026-10-19: Tender bids and the participant screens (step 3)

- **Bids:** one per organisation per tender, owned by the bidder, read by the issuer as counterparty (two-party RLS). Tables `TenderBid`, `TenderBidLine`, `TenderBidResponse`, `TenderBidFile` (migration `20261019230000_tender_bids`).
- **Sealing:** the issuer sees only a count of submitted bids until the closing time; listing and file download are refused before it. Opening bids and opening a bid file are written to the hash-chained timeline. The seal is enforced in the API, not by the database.
- **FX:** prices are in the bidder's currency; on submit the total is converted to the tender currency using the latest daily reference (ECB-based) rate, stored with the bid (rate, date, both totals). If no rate exists the bid is blocked with a message.
- **Completeness checklist** (`bid-completeness.ts`): currency chosen, every item priced or marked not-bidding (at least one priced), lead time and country of origin, every required criterion answered in the format asked, addenda acknowledged, validity confirmed. Editing a submitted bid returns it to draft. Withdrawal allowed until closing.
- **Files:** direct-to-storage upload through a short-lived write link, checked against the tender's accepted types and size; recorded after upload.
- **Screens (tenders app):** Find tenders (chips, filters, tenders for you, saved searches, shortlist), tender view (eligibility checklist, items, criteria, Q&A, addenda acknowledge, interest with pledge and exclusion declaration), bid builder, My bids, issuer Bids tab and a Bids received dashboard tile. Navigation now depends on permissions.
- **Prod steps for Lewis:** after the API deploy applies the migration, re-run the regenerated one-paste RLS SQL so the four bid tables get policies.
- **Not yet:** evaluation, award, contracts (steps 4 to 7). Qualification evidence for newly added codes is still not tied to registry fields.

## 2026-10-20: Bid templates and tender-currency pricing

- **Currency:** bids are priced in the tender's currency (shown fixed, with a note that any later conversion is an indicative daily reference rate). The conversion code remains but only applies to a tender with no currency.
- **Locked templates (alternative to the online form):** the platform generates a financial offer workbook (.xlsx: items locked; unit price, lead time, country of origin dropdown, manufacturer, remarks, validity and notes open; totals computed) and a technical offer document (.docx: one answer box per criterion) from the tender's items and criteria. A hidden stamp ties each file to its tender. Upload reads the file into the same draft bid; if any value is invalid or the file is not this tender's template, nothing is changed and the bidder gets the reasons, with advice to amend and retry or use the online form. Blank cells are accepted (the checklist still shows what is missing). Toggle per tender (`allowTemplateSubmission`, on by default; locked after publication). Migration `20261020010000_tender_template_submission`.
- Sheet protection is a convenience; everything is validated on upload. Certificates and other documents are still uploaded as files.

## 2026-10-20: Evaluation and award (step 4)

- **Criteria:** Price and Lead time are calculated (best compliant offer 100, others proportional); Quality and other criteria are scored by evaluators; pass/fail gates. Issuer sets weights per tender and they auto-rebalance to total 100.
- **Toggles on every tender build:** emergency procurement and single evaluator, each needing a reason to publish. Otherwise at least two evaluators and one chair.
- **Flow:** open bids (explicit, on the timeline) → assign evaluators → conflict declaration before seeing bids (conflicted bidders hidden) → start → gates → private scores with reasons, locked on submit → chair moderation (spread over 25 needs a reason) → finalise and rank.
- **Award:** multiple suppliers, per-line shares (max 100% per line), compliance and screening prerequisites, standstill in working days (weekends only excluded; waivable only for emergency procurement). Debriefs released to every bidder: own scores, rank, feedback only. Bidders can lodge complaints during standstill; issuer responds.
- **Participant status page** (`/bids/status`): milestones, bids submitted, time since closing, countdown to next stage, own debrief/award/complaints; others stay anonymous.
- Migration `20261020120000_tender_evaluation_award`. **Prod step for Lewis:** re-run the regenerated one-paste RLS SQL (bid and step-4 tables) before any real data.
- **Known gaps:** assigned evaluators are not yet notified; partial bids compare on priced lines only; no public holidays in standstill; evaluator submitted counts in the overview show 0.
- **Audit follow-up (2026-10-20):** publication now freezes a full snapshot of the tender (details, items, criteria, eligibility rules, invitations) inside the hash-chained PUBLISHED event; closing-date extensions record old and new values; other timetable changes after publication are logged (`TIMETABLE_CHANGED`). Tenders are never deleted. Assigned evaluators now receive a notification linking to the evaluation page. Not captured: individual edits made while a tender is still a draft (only the state at publication is frozen).
- **Deploy fix (2026-10-20):** since the bids commit (37ec9a0) the API container had failed to start (Nest could not resolve `TenderBidsService`'s dependencies because its constructor typed them as `Pick<...>`, which erases the class at runtime). Azure kept routing to the previous healthy revision (the 19 Oct compliance round), so Deploy API showed green while none of the bid, template, evaluation or award endpoints were live, and the Tenders app got "property ... should not exist" errors. Fixed by using the real classes. CI now builds the real Nest module graph from the compiled output (`apps/api/scripts/check-wiring.cjs`) so this cannot pass silently again. Found during the live walkthrough.
