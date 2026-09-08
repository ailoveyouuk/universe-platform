# Universe

A multi-tenant platform — not a single-org internal tool. **Universe** (dev
codename) hosts a set of independent applications (Project Management, CRM,
Product Database Management, Tender Issuance & Management, and eventually
Admin) that each run standalone but share one Azure SQL database and one API
service as their single source of truth. Universe is a standalone platform —
not owned by or affiliated with any one customer organization. Every
organization that uses it, including whichever one pilots it first, onboards
as a fully isolated tenant with no special standing over any other, each
seeing only their own data.

This repo currently contains the **Project Management** app's initial
scaffold. Its field set started from a client's existing "Projects"
SharePoint list ("All Projects" view, pulled 2026-09-08) as a real-world
starting point, but the platform itself is being built for multiple
organizations, not as a SharePoint replica — see "Multi-tenancy" below for
what that changes structurally.

## Architecture

- **Frontend**: Next.js (React), one app per business domain, each deployed
  independently as its own Azure Static Web App.
- **Backend**: one dedicated API service (`apps/api`, NestJS) — the *only*
  thing that talks to the database. No app queries the database directly.
- **Database**: Azure SQL Database, one schema shared by every app and every
  tenant (`packages/db`, Prisma), isolated by `organizationId` on every table.
- **Auth**: Microsoft Entra External ID (CIAM) in a **dedicated "Universe"
  identity tenant** — not tied to any customer organization's own corporate
  Entra ID tenant, so no organization's identities mix with another's or
  with Universe's own operating team's directory. See "Multi-tenancy" below.
- **Repo**: Turborepo monorepo. Apps stay independently deployable even
  though they share code via `packages/*`.

See the full decision record in the "'Universe' Software Build" Claude
Project (`architecture-decisions.md`) for the reasoning behind each choice.

## Multi-tenancy

Every domain table carries an `organizationId` directly (not just reachable
via a join) — see the schema doc comment at the top of
`packages/db/prisma/schema.prisma`. Isolation is enforced in two independent
layers, on purpose:

1. **Application layer** — `apps/api/src/common/tenant-scoped.ts` is the one
   place that turns "the caller's organization" into a Prisma `where`
   clause. Every service method takes the requesting user and scopes to
   *their* organization only (see `ProjectsService`) — there's no
   `findAll()` without a caller.
2. **Database layer** — Azure SQL Row-Level Security policies per table, as
   an independent backstop against an application-layer bug. Not yet
   written (needs the real database provisioned first); tracked as an open
   item.

**User provisioning is admin-driven, not self-service — the invite-then-link
flow:**

1. A platform-staff member (or an org admin, within their own org) creates
   a `User` row via the **Admin app** (`apps/admin`) — email, forename,
   surname, organization, and role(s) all set up front. Status: `INVITED`.
   No `entraObjectId` yet — nothing has happened on the identity side.
2. The first time that exact email successfully authenticates through the
   Universe CIAM tenant, `EntraAuthGuard` (`apps/api/src/auth/entra-auth.guard.ts`)
   links the verified identity to that row by matching email, and flips
   status to `ACTIVE`.
3. Every sign-in after that is matched by `entraObjectId` — email is never
   used to look up an already-linked account again, only to perform that
   one-time link on first sign-in.
4. An identity with no matching row (by `entraObjectId` OR by
   `email` + `INVITED`) is rejected outright. There is no auto-provisioning
   path — a verified Microsoft identity is never, by itself, a reason to
   grant access. This was deliberate: a silent default-organization fallback
   is exactly how cross-tenant leaks happen.

**Platform staff** (Universe's own operating team, running the pilot) get
cross-tenant visibility via a separate `platformStaffRole` field on `User`
(`SUPPORT` / `SUPER_ADMIN`), not by "belonging" to every organization. Any
code path that reads across organizations must be a distinct,
explicitly-named method — never a tenant-scoping parameter that happens to
be optional on the same method regular users call.

### Assumptions made, pending confirmation

These were default choices made to keep moving rather than block on every
detail — flag anything that should change:

- **Taxonomies are global for now.** Status, Category, Incoterm, Freight
  Mode, and Product Category are the same fixed enum values for every
  organization. Upgrading any one of these to per-organization custom values
  later is a schema change (turning an enum into a lookup table scoped by
  `organizationId`), not a full rewrite — but it's not free, so worth
  confirming before more UI is built on top of the fixed lists.
- **One organization per user.** A person belongs to exactly one tenant.
  Platform-operator staff who need to work across multiple pilot
  organizations do so via `platformStaffRole`, not by having memberships in
  several orgs.
- **Onboarding is platform-operator-provisioned only during the pilot** — no
  self-service organization signup yet. `createOrganizationWithDefaultRoles()`
  in `packages/db/src/organizations.ts` is the current provisioning path —
  every organization goes through it identically; there is no default org.

## Structure

```
apps/
  api/                    NestJS API service — the shared backend
  project-management/     Next.js app — Project Management
  admin/                  Next.js app — invite users, manage organizations
packages/
  db/                     Prisma schema + client (the shared, multi-tenant data model)
  types/                  Shared TypeScript types (API DTOs)
  auth/                   MSAL config (Universe CIAM tenant) + token verification
  api-client/             Typed fetch client every app uses to call the API
  ui/                     Shared React components (e.g. StatusBadge)
```

## The Admin app

`apps/admin` is where organizations get onboarded and users get invited —
see the invite-then-link flow above. Two pages so far:

- `/users/invite` — the invite form. Platform staff see an organization
  picker (they can invite into any tenant); an org admin sees their own
  organization locked in, matching what the API would accept from them
  anyway. Role checkboxes are populated from whichever organization is
  selected, via `GET /organizations/:id/roles`.
- `/users` — every user visible to the caller (all of them for platform
  staff, just their own org for everyone else), with invitation status,
  role(s), and a deactivate action.

Organization creation itself (`POST /organizations`) is platform-staff-only
— matches the "platform-operator-provisioned onboarding" decision — and isn't wired
into the Admin app UI yet; it's exercised via
`createOrganizationWithDefaultRoles()` in `packages/db/src/organizations.ts`
for now.

## Data model

`packages/db/prisma/schema.prisma` is the single source of truth for the
schema. Highlights beyond multi-tenancy (above):

- **Organization** — the tenant root. Every Client, Project, User, and
  org-scoped Role hangs off one.
- **Project** — core record, mapped from the SharePoint list's main fields,
  now organization-scoped and with `referenceNumber` unique per-organization
  (two different tenants can both have a "PROJ-001").
- **ProjectType** (`PHARMACEUTICAL` / `NON_PHARMACEUTICAL`) — a **new**
  field, not in SharePoint. Captured early in intake; drives whether the
  pharma-specific line item fields are shown/required. Kept deliberately
  distinct from the existing **Category** field (`PROCUREMENT` /
  `TECHNICAL_ASSISTANCE`), which is a straight carry-over from SharePoint —
  don't conflate the two.
- **ProjectProcurement / ProjectFinancials / ProjectLogistics** — 1:1 detail
  tables, split out from the flat SharePoint columns by function.
- **ProjectLineItem** — 1:many. The per-batch pharma fields (strength, form,
  pack size, batch number, expiry, storage conditions, data logger, MA/PL,
  customer/RP approval) live here rather than on Project, since a project can
  legitimately have more than one product/batch.
- **Client / Contact** — one organization's own customers/counterparties.
  Never shared across organizations.
- `Days Remaining for Submission` is **not stored** — the old SharePoint
  column stored it and it regularly broke (`#NUM!` errors visible in the live
  list). It's computed server-side from `dueDate` in `ProjectsService`
  instead, so it can never go stale or error out.
- **Role / Permission** — Role is now organization-scoped (a role belongs to
  one org, or is a platform-level template); Permission stays a global
  catalog of what *can* be granted.

### Open questions to confirm before the schema is finalized

- **GAD** / **Supplier GAD** — exact meaning unconfirmed (Goods Arrival
  Date?). Currently modeled as nullable dates in `ProjectProcurement`.
- **Goods Manufactured** — SharePoint data showed numeric/blank values here;
  currently modeled as a nullable date (`goodsManufacturedDate`) in
  `ProjectLogistics`. Confirm whether this should instead be a boolean
  ("has manufacturing started/finished") or something else.
- **Project Checklist / Project Issues / Project Closeout Report** — these
  were file/list links in SharePoint. Modeled generically as
  `ProjectDocument` rows with a `url`; decide whether documents should live
  in Azure Blob Storage (recommended long-term) or continue pointing at
  SharePoint initially.

## Getting started (local development)

This scaffold was built in a sandboxed environment with no access to the npm
registry, so dependencies have **not** been installed or build-verified yet.
Run these steps in your own environment:

```bash
npm install

# Copy and fill in environment variables (Azure SQL connection string,
# Universe CIAM app registration values)
cp .env.example .env

# Generate the Prisma client and run the first migration
npm run db:generate
npm run db:migrate

# Seed the permission catalog (no organization is created by this — see below)
npm run seed --workspace=@universe/db

# Provision your first organization (there is no default/house org) — run
# this once per organization you want to exist, e.g. from packages/db:
#   npx tsx -e "import('./src/organizations').then(m => m.createOrganizationWithDefaultRoles({ name: 'Acme Health', slug: 'acme-health' })).then(console.log)"
# Then invite yourself as its first user directly via Prisma Studio
# (npm run studio --workspace=@universe/db) until the Admin app's own
# organization-creation page exists — see "Not yet built" below.

# Run everything (API on :4000, Project Management app on :3000, Admin app on :3001)
npm run dev
```

### Universe CIAM (Entra External ID) setup needed

1. Provision a **dedicated Entra External ID (CIAM) tenant** for Universe —
   not an App Registration inside any customer organization's existing
   corporate Entra ID tenant. This is the tenant every organization's users
   (Universe's own platform-operator staff included) sign into.
2. Register one App Registration in that CIAM tenant, shared by every
   Universe frontend app (not one per app) — this is what lets a user signed
   into one app already be signed into the others.
3. Add a SPA platform redirect URI per app (e.g. `http://localhost:3000`,
   and the deployed Static Web App URL later).
4. Expose an API scope for the NestJS API service and set
   `UNIVERSE_CIAM_API_AUDIENCE` accordingly.
5. Fill `UNIVERSE_CIAM_TENANT_ID`, `UNIVERSE_CIAM_CLIENT_ID` (and the
   `NEXT_PUBLIC_` equivalents for the frontend) into `.env`.
6. Decide, and configure, how external organizations' users actually sign
   in through this CIAM tenant (federating to each client's own Microsoft
   365 tenant vs. CIAM-managed accounts) — not yet decided, tracked below.

Without a CIAM tenant configured, the API's auth guard falls back to a
permissive local-dev stub (see `apps/api/src/auth/entra-auth.guard.ts`) so
you can run the app before SSO is wired up — **do not deploy that fallback
as-is**, and note it does NOT auto-create users even in the fallback path.

## What's built vs. what's next

**Built in this pass:**
- Multi-tenant Prisma schema: `Organization` as tenant root,
  `organizationId` on every domain table, org-scoped `Role`, `User` with an
  `INVITED` → `ACTIVE` → `DEACTIVATED` lifecycle
- NestJS API: `Projects` module (list/get/create) tenant-scoped via
  `CurrentUser` + `tenantScope()`; `Users` module (invite/list/deactivate);
  `Organizations` module (create/list/roles); `/me`; Entra auth guard
  rewritten for the invite-then-link flow, no auto-provisioning
- Next.js Project Management app: home page, projects list, new-project
  intake form (Project Type branch built in)
- Next.js **Admin app**: invite-a-user form (org-aware picker) and a users
  list with deactivate
- Shared packages: db, types, auth, api-client, ui

**Not yet built (next passes):**
- Azure SQL Row-Level Security policies (the database-layer half of tenant
  isolation — see "Multi-tenancy" above)
- Automated tests specifically proving cross-tenant access is blocked
  (should exist before any pilot client's data is real), and tests for the
  invite-then-link flow itself (right email links, wrong email rejected,
  deactivated stays rejected)
- Organization creation UI in the Admin app (API exists, not wired into a page yet)
- Decision + setup for how external organizations authenticate through the
  Universe CIAM tenant (federation vs. CIAM-managed accounts)
- Project detail page beyond the summary fields (procurement, financials,
  logistics tabs; line item management for pharma projects)
- Edit/delete flows for projects
- Client & Contact management UI
- CI/CD (GitHub Actions → Azure Static Web Apps + App Service)
- Actual Azure resource provisioning (Bicep/Terraform)
- Data migration script from the SharePoint list into this schema
