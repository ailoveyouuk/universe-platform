# Universe Platform — build log

Newest first. **Rule (set by Lewis 2026-10-16): after every implemented change, add an entry here, update the
Universe project handoff doc in claude.ai, and update Claude's memory — so the platform can be rebuilt/resumed after a
disaster.** An entry says what changed, where, how it was verified, and any manual step still owed.

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
