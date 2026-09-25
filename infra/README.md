# Universe Infrastructure

Everything here is written and ready but **not yet deployed anywhere** — it
was built without access to an Azure subscription. This is the walkthrough
for the first real deploy once one exists.

## What gets created

`infra/bicep/main.bicep` deploys one environment's worth of shared
infrastructure (see the file header for the "one environment, many tenants"
distinction — this is NOT one deployment per organization):

- Log Analytics workspace + Container Apps Environment
- Azure Container Registry (holds the API's Docker image)
- Azure SQL Server + Database (serverless tier by default — cheap idle cost
  for a pilot; see `modules/sql.bicep` to change tiers)
- Key Vault (holds the DB connection string and CIAM client secret; the API
  reads these via its own managed identity, never a stored secret)
- The API as an Azure Container App
- Two Azure Static Web Apps (Project Management, Admin)

## Prerequisites before the first deploy

1. **An Azure subscription** with an owner/contributor who can create
   resources and app registrations.
2. **A resource group** for the target environment (e.g.
   `universe-pilot-rg`) — `main.bicep` deploys into an existing resource
   group, it doesn't create one.
3. **GitHub OIDC federation**, so GitHub Actions can deploy to Azure without
   a stored client secret:
   ```bash
   # Create an app registration for GitHub Actions to authenticate as
   az ad app create --display-name "universe-github-actions"
   # note the appId (this is AZURE_CLIENT_ID)

   # Create a federated credential trusting this GitHub repo's main branch
   az ad app federated-credential create \
     --id <appId> \
     --parameters '{
       "name": "universe-main-branch",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:<org>/<repo>:ref:refs/heads/main",
       "audiences": ["api://AzureADTokenExchange"]
     }'

   # Grant it Contributor on the resource group
   az role assignment create \
     --assignee <appId> \
     --role Contributor \
     --scope /subscriptions/<sub-id>/resourceGroups/<rg-name>
   ```
4. **A Universe CIAM tenant** (Entra External ID) — see the main README's
   "Universe CIAM setup needed" section. Not required to deploy
   infrastructure, but required before the deployed apps can actually
   authenticate anyone.

## GitHub repository configuration needed

**Secrets** (Settings → Secrets and variables → Actions → Secrets):
| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | the app registration's appId, from step 3 above |
| `AZURE_TENANT_ID` | your Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | target subscription ID |
| `AZURE_RESOURCE_GROUP` | resource group name from step 2 |
| `SQL_ADMIN_PASSWORD` | a strong password — generate and store this, it's never written anywhere else |
| `SWA_TOKEN_PROJECT_MANAGEMENT` | from `main.bicep`'s `projectManagementSwa` module output, after first infra deploy |
| `SWA_TOKEN_ADMIN` | from the `adminSwa` module output, after first infra deploy |

**Variables** (same location, "Variables" tab — non-secret config):
| Variable | Value |
|---|---|
| `AZURE_CONTAINER_REGISTRY` | ACR login server, from `main.bicep`'s `acrLoginServer` output |
| `AZURE_CONTAINER_REGISTRY_NAME` | just the registry name (no `.azurecr.io`) |
| `AZURE_CONTAINER_APP_NAME` | `universe-<environmentName>-api` |
| `API_BASE_URL` | the deployed API's URL, from `main.bicep`'s `apiFqdn` output |
| `UNIVERSE_CIAM_TENANT_ID` / `UNIVERSE_CIAM_CLIENT_ID` | from the Universe CIAM app registration. Real values (2026-09-25): tenant ID `23851fd3-0682-4268-af83-338cfea80d89`, client ID `b41007bd-7a90-417f-b476-8baba3dd401f` (universe-platform-web, in the Universe Platform Entra External ID tenant) |
| `UNIVERSE_CIAM_TENANT_SUBDOMAIN` | the tenant's subdomain (before `.ciamlogin.com`/`.onmicrosoft.com`) — `universeplatform`. Required for the SPA to build the right `ciamlogin.com` authority (see `packages/auth/src/msalConfig.ts`) |
| `PROJECT_MANAGEMENT_URL` / `ADMIN_URL` | the deployed Static Web Apps' URLs |

## First deploy order

1. Run **Deploy Infrastructure** (`.github/workflows/deploy-infra.yml`,
   manually triggered) — creates everything except a running API (the
   Container App deploys with a placeholder image since no real image
   exists yet).
2. Pull the two SWA deployment tokens and the ACR/Container App names out
   of the deployment's outputs (`az deployment group show`), add them as
   the secrets/variables above.
3. Create the API's own dedicated, lower-privilege SQL user (never run
   the API against the `sqlAdminLogin` admin account day to day) using
   `infra/sql/create-app-login.sql` — fill in a freshly generated password
   in your own editor first, then run the whole script against the
   `universe` database (Azure Portal → the `universe` database resource →
   Query editor (preview), signed in as the admin login) — a *contained*
   database user, so this is the only database it touches; no separate
   step against `master` needed (the portal's Query editor doesn't expose
   one for `master` anyway). See that file's header comment for the full
   walkthrough and why `db_datareader`/`db_datawriter` (not `db_owner`) is
   enough given RLS does the real tenant-isolation enforcement.
4. Set the DB connection string INTO Key Vault directly (not through
   Bicep — secrets shouldn't pass through template parameters), built from
   the app login's credentials from step 3 (not the admin login's):
   ```bash
   az keyvault secret set --vault-name <keyVaultName> --name database-url --value "<connection string using universe_api_app>"
   ```
   (There is no CIAM client secret to set — `universe-platform-web` is a
   public SPA client (PKCE, no secret) and the API verifies tokens via
   JWKS public-key validation, not a shared secret. A
   `universe-ciam-client-secret` entry may still exist in the vault from an
   earlier design; `containerApp.bicep` no longer reads it — see that
   file's comment.)
5. Run **Deploy API** (`.github/workflows/deploy-api.yml`) — builds the
   real image and updates the Container App to run it.
6. Run **Deploy Static Web Apps** (`.github/workflows/deploy-static-web-apps.yml`).
7. Run the database migration + RLS policies + seed against the new
   database. Migrations need `CREATE TABLE`/DDL, which `universe_api_app`
   (step 3) deliberately does not have — use the **admin** login
   (`sqlAdminLogin`/`sqlAdminPassword`) for this one-off step, not the
   app's own connection string:
   ```bash
   DATABASE_URL="<admin connection string>" npm run db:migrate
   # Apply Row-Level Security — see infra/sql/row-level-security.sql and
   # infra/sql/supplier-directory-rls.sql's own headers; run both as the
   # admin login too (CREATE SECURITY POLICY is also DDL).
   DATABASE_URL="<admin connection string>" npm run seed --workspace=@universe/db
   ```
8. Provision your first real organization (see the main README's "Getting
   started" section — there is no default organization).

## Known gaps, honestly

- The Bicep templates and Dockerfile have **not been compiled or built
  anywhere** — this sandbox has no Bicep CLI, no reachable Azure endpoint,
  and no working Docker daemon. `ci.yml` and the first infra deploy are
  where these get tested for real. Expect to fix small things.
- No Azure SQL Row-Level Security policies yet (see main README,
  "Multi-tenancy") — add these right after the first deploy, before any
  real organization's data goes in.
- The SQL firewall rule allows all Azure services in (`0.0.0.0`–`0.0.0.0`,
  Azure's shorthand for "any Azure-originating traffic") — tighten to a
  VNet-integrated private endpoint before any pilot client's real data
  lands here.
- No staging environment yet — `main.bicep` takes an `environmentName`
  param specifically so a second, fully separate `staging` deploy is just
  another `az deployment group create` against a different resource group,
  whenever that's wanted.
