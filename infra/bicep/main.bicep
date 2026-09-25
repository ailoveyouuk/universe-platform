// Universe platform infrastructure. Deploys ONE environment (e.g. "pilot" or
// "prod") worth of shared infrastructure — remember every organization is a
// tenant WITHIN this, not a separate deployment (see architecture doc,
// "Multi-tenancy"). Re-run this same template for a genuinely separate
// environment (e.g. staging), each with its own resource group.
//
// Deploy with:
//   az deployment group create \
//     --resource-group <rg-name> \
//     --template-file infra/bicep/main.bicep \
//     --parameters infra/bicep/main.parameters.json \
//     --parameters sqlAdminPassword=<from a secret store, never committed>
//
// This file is written to be READY, not yet deployed anywhere — see
// infra/README.md for the full first-deploy walkthrough and prerequisites.

targetScope = 'resourceGroup'

@description('Short environment name, used to derive resource names (e.g. "pilot"). Keep lowercase, no spaces.')
param environmentName string

param location string = resourceGroup().location

@description('Region for the two Static Web Apps only. Microsoft.Web/staticSites is not offered in every region — confirmed via `az deployment group validate` that it is NOT available in uksouth (the resource group\'s own region, chosen for data residency — see Phase A of backend-launch-checklist.md), only centralus/eastus2/westus2/westeurope/eastasia. westeurope (the closest of those to the UK) was tried first but this subscription got back "RequestDisallowedByAzure... selected region is currently not accepting new customers" for it — a subscription-level restriction, not a template problem. eastus2 validated cleanly and is the default here. None of the five available regions are UK/EU, but these two Static Web Apps hold no tenant data (static frontend bundles only) — everything that does (SQL, Key Vault, Container Apps, ACR) still deploys into uksouth via the `location` param above, unaffected. Flagged to Lewis rather than silently decided — override at deploy time if a different region is preferred, or revisit if westeurope opens up on this subscription later.')
param staticWebAppLocation string = 'eastus2'

@description('SQL admin login (server-level admin, not the app\'s runtime user).')
param sqlAdminLogin string

@secure()
@description('SQL admin password. Pass at deploy time — NEVER commit this. In CI it comes from a GitHub secret.')
param sqlAdminPassword string

@description('API image to deploy. On first deploy before any image has been pushed, leave the placeholder — the deploy workflow updates the Container App with the real image after building it.')
param apiImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

var namePrefix = 'universe-${environmentName}'

// Computed rather than taken from the keyVault module's output, on purpose:
// the Container App needs this URI to set up its Key Vault secret
// references, but the Key Vault module needs the Container App's managed
// identity principalId to grant it access — a genuine circular dependency
// if wired module-output-to-module-output. Since the Key Vault's name (and
// therefore its URI) is deterministic, computing it here breaks the cycle
// at the template level. See "known bootstrapping nuance" note below.
var keyVaultName = '${namePrefix}-kv'
var keyVaultUri = 'https://${keyVaultName}.vault.azure.net/'

// Pre-provisioned ahead of this deploy (2026-09-25, see backend-launch-checklist.md
// B2's "Client secret blocked by tenant policy" note and architecture-decisions.md)
// specifically so it could be federated with the Universe CIAM App Registration
// before the Container App itself existed — a system-assigned identity can't be,
// since its principal ID isn't generated until the resource is created. Referenced
// here as `existing` rather than declared fresh: this template does not own its
// lifecycle. Name follows the same `${namePrefix}-...` convention as every other
// resource here, so it resolves correctly for any environmentName.
resource apiIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: '${namePrefix}-api-identity'
}

module logAnalytics 'modules/logAnalytics.bicep' = {
  name: 'logAnalytics'
  params: {
    name: '${namePrefix}-logs'
    location: location
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-cae'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.outputs.customerId
        sharedKey: logAnalytics.outputs.sharedKey
      }
    }
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    // ACR names must be globally unique and alphanumeric only.
    name: replace('${namePrefix}acr', '-', '')
    location: location
    // Grants AcrPull directly on this module, scoped to the registry itself
    // (not the resource group — tightened from the earlier draft per the
    // comment that used to sit on the resource-group-scoped version of this
    // assignment in this file). Sourced from the `existing` apiIdentity
    // reference above rather than `api.outputs.principalId`: a module output
    // used directly in the `name:` of a roleAssignment resource fails Bicep's
    // BCP120 check (name must be calculable at the start of deployment) when
    // it's cross-referenced from a *different* module's output in the same
    // expression — caught via `az deployment group validate` ahead of B4's
    // first real deploy, not guessed at. `apiIdentity.properties.principalId`
    // avoids the module-output chain entirely since it's already resolved
    // in this file's own scope.
    apiPrincipalId: apiIdentity.properties.principalId
  }
}

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: {
    serverName: '${namePrefix}-sql'
    databaseName: 'universe'
    insightsDatabaseName: 'universe-insights'
    location: location
    sqlAdminLogin: sqlAdminLogin
    sqlAdminPassword: sqlAdminPassword
  }
}

module api 'modules/containerApp.bicep' = {
  name: 'api'
  params: {
    name: '${namePrefix}-api'
    location: location
    containerAppsEnvironmentId: containerAppsEnvironment.id
    containerRegistryLoginServer: registry.outputs.loginServer
    apiImage: apiImage
    keyVaultUri: keyVaultUri
    userAssignedIdentityId: apiIdentity.id
    userAssignedIdentityPrincipalId: apiIdentity.properties.principalId
  }
}

// KNOWN BOOTSTRAPPING NUANCE: this module grants the Container App's
// managed identity access to the Key Vault, but Azure RBAC role
// assignments can take a couple of minutes to propagate. On a FIRST
// deploy, the Container App's first revision may fail to start (can't
// resolve its Key Vault secret refs yet) even though this template
// succeeds. If that happens, wait ~2-5 minutes and re-run the deployment
// (or `az containerapp revision restart`) — this is standard Azure RBAC
// propagation delay, not a template bug. Subsequent deploys are unaffected
// since the role assignment already exists.
module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVault'
  params: {
    name: keyVaultName
    location: location
    apiPrincipalId: api.outputs.principalId
  }
}

// AcrPull — lets the Container App's managed identity pull the API image
// without admin credentials. Same RBAC-propagation nuance as the Key Vault
// access above applies here too. Moved inside modules/registry.bicep (see
// that module's role assignment, mirroring modules/keyVault.bicep's own
// pattern) — both for the tighter registry-only scope this comment used to
// flag as a future to-do, and because it's what fixed BCP120 above.

module projectManagementSwa 'modules/staticWebApp.bicep' = {
  name: 'projectManagementSwa'
  params: {
    name: '${namePrefix}-project-management'
    location: staticWebAppLocation
  }
}

module adminSwa 'modules/staticWebApp.bicep' = {
  name: 'adminSwa'
  params: {
    name: '${namePrefix}-admin'
    location: staticWebAppLocation
  }
}

output apiFqdn string = api.outputs.fqdn
output acrLoginServer string = registry.outputs.loginServer
output sqlServerFqdn string = sql.outputs.serverFqdn
output insightsDatabaseName string = sql.outputs.insightsDatabaseName
output keyVaultName string = keyVault.outputs.vaultName
output projectManagementUrl string = projectManagementSwa.outputs.defaultHostname
output adminUrl string = adminSwa.outputs.defaultHostname
