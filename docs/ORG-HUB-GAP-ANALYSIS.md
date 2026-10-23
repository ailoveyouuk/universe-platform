# Organisation hub in Admin: what exists and what is missing (2026-10-23)

Decision (Lewis, 2026-10-23): Admin is the central hub for an organisation's details, assets and people; the profile is edited there and represented read-only throughout Universe. Project Management stays focused on its core work. Universe Demo is an ordinary organisation that happens to be flagged demo.

## Already built (reuse as is)

**Backend (`apps/api/src/organizations`, `supplier-directory`, `audit-log`)**
- Organisation record: name, slug, status, type, legal name and entity type, country of registration, registration number, website, primary contact, onboarding source, notes, brand (logo, icon, colours, welcome message), contributor visibility. `GET/PATCH /organizations/:id`.
- Countries of operation: `GET/PUT :id/country-presence`.
- Type detail profiles (get/upsert): procurement agent, tendering body, funder, data/insights user. Permission `org.profile.manage`.
- Manufacturer sites (list/add/archive).
- Data-sharing consent (read-only).
- Roles list, users (invite, archive, reinstate), cross-organisation access grants.
- Supplier directory API: `profile/me` get/put, publish/unpublish, countries, supplier products, leads, search, public `profile/:organizationId`. Tables `SupplierProfile`, `SupplierCountryPresence`, `SupplierProduct`, `ManufacturerProfile`.
- Activity feed (`/audit-log/feed`) and per-record audit history.
- Supplier scope taxonomy and category-to-HS mapping (`packages/types`).

**Frontend (Admin)**
- `/organizations` list, `/organizations/new`, `/organizations/detail`: one long page with sections (details and brand, countries, category profile, manufacturing sites, contributor visibility, consent, audit history).
- Users, invite user, roles, performance records, activity, stakeholder access (platform staff only).

## Gaps

**Frontend**
1. No hub structure: the organisation page is one long scroll and Users, Roles, Performance and Activity are separate menu items that need filtering. Needs tabs (Profile, Scope and certifications, Users, Roles, Performance, Activity) and a "my organisation" landing for non-platform admins.
2. No UI at all for the supplier directory profile (description, contacts, principal manufacturers, licence, warehousing, years in operation, publish/unpublish) although the API exists.
3. No scope-of-supply editor (taxonomy exists, nothing stores or edits a supplier's chosen subcategories).
4. No certifications editor for the organisation itself.
5. No read-only shared organisation card for use elsewhere, and no "Edit profile" link into Admin.
6. Network directory (the old Supplier Portal slot) not built.
7. Manufacturer profile (WHO PQ, SRA approvals, registrations, capacity, local manufacturer flag) has a table but no API route or screen.

**Backend and schema**
1. Scope of supply: new table (organisation, scope subcategory id), with RLS; derived "demonstrated scope" (source approvals, bids, contracts, delivered lines) is a read-only query.
2. Organisation certifications with expiry: new table (organisation, standard, reference, issuer, issued, expiry, status, document), with RLS. Existing `StakeholderEvidenceRecord` is per stakeholder (partner), not per organisation, so it cannot be reused directly; its standards catalogue (`EvidenceStandardDefinition`) can.
3. Other facets: services, Incoterms handled, delivers-to countries, funders/programmes, size bands. Countries partly covered by `SupplierCountryPresence` and country-presence; the rest new fields on `SupplierProfile` or a small facet table.
4. Manufacturer profile endpoints (get/put) and a shared "organisation card" read endpoint safe for other organisations to call (public fields only, respecting `shareIdentityWithUniverse`).
5. Search across scope, country, certification (issuers, donors find suppliers; suppliers see matched tenders).
6. Permission: reuse `org.profile.manage`; decide whether certifications need their own key.

## Proposed build order
1. Hub shell: tabs, my-organisation landing, Stakeholder access under platform staff (done), existing sections moved into the Profile tab. No schema.
2. Supplier directory profile editor on the Profile tab (API exists).
3. Manufacturer profile endpoints and editor.
4. Scope and certifications (two new tables, RLS entries in the one-paste SQL, editors, derived demonstrated scope).
5. Shared organisation card plus "Edit profile" link, used in Project Management, Tenders, Product Database.
6. Network directory and two-way search.

## Prod steps for Lewis
Re-run the regenerated RLS one-paste SQL after step 4 (two new tenant tables).

## Status (2026-10-23, end of day)
All six build steps are done and live: hub shell, directory profile editor, manufacturer profile, scope of supply and certifications (with derived demonstrated scope), shared read-only organisation card with "Edit profile" into Admin, and the network directory (Find suppliers in Tenders) with scope-aware Find tenders. Production RLS for the new tables (`manufacturer-profiles-rls.sql`, `org-scope-certifications-rls.sql`) has been run by Lewis (results 3 and 6).

Open follow-ups:
- Demonstrated scope uses tender bids and awards only; product source approvals need partners linked to organisations.
- Organisation card is wired into Tenders only; Project Management and Product Database have no organisation-level names yet.
- No saved supplier searches or alerts; the Supplier Portal app itself is unchanged.
- Certificates hold details only, with no document upload yet; certification expiry has no reminder notifications yet.
- Standing rule: every new section gets a four-tile drilldown dashboard and full-depth filters (see BUILD-LOG 2026-10-23).
