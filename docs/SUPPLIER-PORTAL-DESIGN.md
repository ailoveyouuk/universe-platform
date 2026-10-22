# Supplier Portal design (draft 2026-10-22)

**Decisions (Lewis, 2026-10-22):** the portal is one home for suppliers; each supplier organisation signs in as its own tenant (own users and roles, sees only its own rows plus two-party rows shared with it). It reuses the Tenders API and screens rather than duplicating them.

## Screens (in build order)
1. **Home dashboard:** everything awaiting the supplier, in one list with counts: tender invitations and closing dates, bids in progress, call-offs to accept, mini-competition invitations, variations to respond to, evidence to acknowledge, milestones due, invoices and payments due or overdue, price reviews, quality complaints open. Each links into the right Tenders or Project Management screen.
2. **Company profile and compliance:** legal details, countries served, categories; licences, certificates (ISO 13485, WHO PQ, GMP, registrations) with expiry dates and reminders; buyers see these as eligibility evidence.
3. **Performance scorecard:** the supplier's own frozen performance records (on time in full, quality, payment, responsiveness), per buyer, with trend.
4. **Orders and delivery:** purchase orders from projects the supplier serves, shipment updates, delivery evidence, invoices and payment status (needs a supplier view of project lines; today these are buyer-only).
5. **Product offer:** products the supplier is approved to supply (source approvals), prices and lead times it has quoted.

## Reuse and new work
- Reuse: tender invitations, bids, call-offs, mini-competitions, variations, evidence, contracts, performance records (all already two-party under RLS).
- New API: `GET /supplier-portal/dashboard` (aggregates the above for the caller's organisation), profile and compliance documents endpoints, supplier view of orders.
- New schema: supplier compliance documents with expiry (new table, RLS entry in the one-paste SQL). Everything else exists.
- New app `apps/supplier-portal` (Next static export, same auth and UI packages), Azure Static Web App, AppSwitcher entry flipped from comingSoon.

## Prod steps for Lewis (when the app is first deployed)
New Static Web App resource and deployment token (`SWA_TOKEN_SUPPLIER_PORTAL`), repository variable `SUPPLIER_PORTAL_URL`, redirect URI added to the Entra app registration, `NEXT_PUBLIC_APP_URL_SUPPLIER_PORTAL` in the other apps.

## Open questions
- Should suppliers see buyer-side scores and award reasoning? Proposed: no (as today, debrief only).
- Which supplier roles are needed (admin, sales, quality, finance)? Proposed: reuse existing role templates with tenders.view/bid and a new suppliers.manage key.
