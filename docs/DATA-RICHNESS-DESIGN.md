# Data richness hints — design (2026-10-27, requested by Lewis)

**Goal.** At every touch point where the front end is not being fed all the data it could be, say so quietly, say what filling it in would improve, and link straight to the exact field or the filtered list that fixes it. For real live use, this guides people to maximum value from the platform.

## Pattern (shared across apps)
- **`DataGap`** (`@universe/types`): `key, label, benefit, count, total, href, fixLabel`. `count` of `total` records are missing it; `href` is a direct link to the list (filtered to the missing records) or to one record with `?focus=<field>`.
- **`DataHints`** (`@universe/ui`): a collapsed, dashed note, "Make this richer: n ways to improve this". Text in normal ink; amber dot only as a marker; vanishes when nothing is missing.
- **Server computes gaps** (counts on the organisation's own records only; no money; nothing from other organisations). Each app exposes `GET <app>/data-gaps?scope=…`.
- **Fix lands on the field:** list filters (`?gap=noValue`) for many records, `?id=<record>&focus=<field>` for one (inputs carry `data-field`). Where the field lives in another app, link there.
- **Fix in place** wherever the screen has no editor yet (CRM opportunities: "Add the missing details").

## Pilot (CRM, shipped)
Overview, Pipeline, Portfolio notes; opportunity gaps (value, date, group, owner, link; few closed); stakeholder gaps (country, owner, review date, summary); `gap` filters on opportunities and relationships; in-place completion on each opportunity; per-stakeholder hints with focus links.

## Roll-out plan (one app per step; each reuses the pattern)
1. **Project Management:** projects missing delivery dates, line dates (on-time flags can't compute), received quantity (in-full can't compute), supplier or manufacturer, stakeholder country, contacts, certificates; effect on OTIF, supplier scorecards, the Portfolio and delivery view.
2. **Tenders:** tenders missing evaluation criteria weights, framework ceiling or term, publication fields; effect on scoring, framework call-off views, public notice.
3. **Product database:** products missing codes, categories, manufacturer, regulatory fields; effect on search, catalogue analysis, pharma reference.
4. **Supplier portal and Insights:** profile completeness (certificates, countries, products) and which insights cannot be calculated or are low-confidence for lack of data.
5. **Admin:** users without roles, organisations without branding or currency; effect on notifications and reporting.
6. **Platform:** one place listing all gaps for the signed-in organisation (a "data health" page) with the same links.

## Rules
- Counts only, own organisation, respect permissions (a gap on something the person cannot edit is shown without a fix link or not at all).
- Never nag: collapsed by default, no badges on navigation, nothing blocks work.
- Each gap says what it improves in plain words; each fix is one click from the field.
- Accessibility: tokens only, no colour-only meaning, keyboard and screen reader friendly (it is a `details` element).
- Remote apps that do not yet support `?focus` link to the record; implement `data-field` + the focus effect as each app is done (Project Management `focus=country` is not wired yet).

## Roll-out status (2026-10-27, later)
- **One service for the other apps:** `GET /data-health?app=…` (`DataHealthService`) counts gaps on the organisation's own records for Project Management (projects, lines, stakeholders), Tenders (closing date, criteria, countries, summary, framework ceiling and term), Product database (GTIN, HS, UNSPSC, unit, storage, brand) and Admin (people with no role, invited but not signed in, organisation profile). Each app is shown only to people who can use it.
- **UI:** shared `DataHealthNote` (in `@universe/ui`) on each app's Overview, and an Admin "Data health" page listing every app the person can use. Every note ends with a subtle "Source:" line saying where the counts come from.
- **Fix links:** Project Management project list filters by `?gap=` (client, due date, country, lead, line manufacturer, supplier, received quantity, supplier agreed date, price). Tenders, Product database and Admin links go to the relevant list or the record (a single tender links to its builder; the organisation profile links to its editor).
- **Still to do:** Insights data-coverage note (which lenses are low-confidence for lack of data), `?focus=<field>` support so a link can land on the exact input in PM, Tenders and Product database, and `gap` filters on the Tenders and Product database lists.
