# Go-live checklist (2026-10-28)

Nothing real (real organisations, real documents, real personal data) should be loaded until the **Gates** are ticked. Sources: ROADMAP-2026-10-26.md, ACCESSIBILITY-STANDARD.md, CRM-STANDARDS-AND-DATA-PROTECTION.md, PRODUCT-DATABASE-GAP-ANALYSIS.md, BUILD-LOG.md. "Who" says whose hands are needed. All demo data stays simulated and hidden from real organisations.

## Gates (must be done first)
| # | Item | Who | Status |
|---|---|---|---|
| 1 | Server-side app gating (`AppAccessGuard`, `@RequiresApp`) | Claude | Done 2026-10-26 |
| 2 | Microsoft Defender for Storage enabled on `universepilotdocs` (documents show "Not scanned" until then) | Lewis (portal) | Open; decided as a go-live gate |
| 3 | Replace OCDS identifier prefix `ocds-universe` with the registered one | Lewis supplies prefix, Claude applies | Open |
| 4 | Screen-reader pass (VoiceOver / NVDA) on main journeys of every app, light and dark | A person | Open |
| 5 | Database restore rehearsal: restore a .bacpac or point-in-time copy into a scratch database and open the apps against it | Lewis + Claude | Open (see Backups) |
| 6 | Gateway-level rate limiting (Front Door or API Management); the in-app limit is a stopgap | Lewis decides, Claude configures | Open (suggested) |
| 7 | Monitoring and alerts on scheduled jobs (nightly aggregation, daily activity, cert-expiry reminders, CRM review reminders, regulatory watch, pharma sync) | Claude | Done 2026-10-31: failing scheduled run opens a GitHub issue (closes itself when healthy) |
| 8 | Email for award notices, debriefs and certification expiry (in-app only today, accepted for now) | Lewis decides | Open |

## Data protection and legal (specialist review)
- LIA template, privacy notice text, DPA and breach runbook reviewed by a specialist; ICO contract and breach-reporting guidance re-checked (under review for the Data (Use and Access) Act).
- Retention: default periods, Admin review queue (tenders, contracts, complaints), own periods and complainant requests built 2026-10-31 (docs/RETENTION-SCHEDULE.md). Lewis: run `infra/sql/retention-rls.sql` after the deploy; specialist to confirm the periods.
- Cyber Essentials Plus readiness check; ISO 27001 / SOC 2 readiness assessment (P3).
- Standards guide for tenders: UNCITRAL Arts 58-68 and World Bank 5.77-5.85 and Annex III 1.1-3.4 now read (2026-10-28 and 2026-10-31); only the ISO 37001/20400 requirement text (paywalled) is unread; apply after specialist review.
- Brief for the specialist: `docs/LEGAL-REVIEW-BRIEF.md`. Identity review: `docs/IDENTITY-REVIEW.md`. Simulated-data workflow safeguards: `docs/SIMULATED-DATA-WORKFLOWS.md` (Lewis: add a required reviewer to the `demo-data-apply` environment in GitHub).

## Lewis: SQL to run after the 2026-10-31 deploys
- `infra/sql/retention-rls.sql` (retention decisions and overrides) and `infra/sql/tender-panel-rls.sql` (mini-competition panel and scores). Both idempotent; run after the migrations (they apply on deploy).
- Supplier Portal removal: delete its Azure Static Web App if one exists, remove its Entra redirect URI, and remove `SUPPLIER_PORTAL_URL` and `SWA_TOKEN_SUPPLIER_PORTAL` from GitHub.

## Access and identity
- Entra External ID (CIAM) production tenant settings, redirect URIs for all six Static Web Apps, and sign-in only for emails added to an organisation.
- Global admin accounts limited and listed; per-person app toggles reviewed.
- Production RLS SQL (`infra/sql/*.sql`) re-run by Lewis whenever new tables were added; confirm `sys.security_policies` cover every tenant table (crm-rls.sql now sixteen tables).

## Backups and restore
- Azure .bacpac exports of `universe` and `universe-insights` were submitted by Lewis on 2026-10-26 to storage account `universepilotdocs`, private container `db-backups` (baseline state). Data has changed since (CRM pipeline seeds, win/loss variety seed 2026-10-28): take a fresh pair before go-live and after any real onboarding.
- Rehearse a restore (Gate 5) and record how long it took.
- Code backups: LaCie `Universe/current` and dated folders (latest bk127); Git tag `demo-baseline-2026-10-26`.

## Operations
- Confirm the database tier (serverless pilot tier is for pilots) and auto-pause behaviour against real traffic.
- Confirm every scheduled workflow is green on its last run.
- Retire or hide simulated-data workflows (`seed-*`, `fix-*`, `load-demo-scale-data`, etc.) from anything a real operator could trigger by mistake.

## Accessibility
- CI lint and live scan clean (done each change). High-contrast mode and zoom/reflow checks by a person alongside Gate 4.

## Already settled by Lewis
No Reset sandbox (demo is ring-fenced); Defender at go-live; Supplier Portal dropped; in-app alerts only for now; Insights CSV downloads hidden; tender hardening deferred (2026-10-28).
