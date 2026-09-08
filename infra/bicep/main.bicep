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

@description('SQL admin login (server-level admin, not the app''s runtime user).')
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
  }
}

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: {
    serverName: '${namePrefix}-sql'
    databaseName: 'universe'
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
// access above applies here too. Scoped to the resource group rather than
// just the registry for simplicity — tighten to registry-only (following
// the pattern in modules/keyVault.bicep, i.e. move this assignment inside
// modules/registry.bicep) before this is used for anything beyond a pilot.
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acrPullAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.outputs.registryId, api.outputs.principalId, acrPullRoleId)
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: api.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

module projectManagementSwa 'modules/staticWebApp.bicep' = {
  name: 'projectManagementSwa'
  params: {
    name: '${namePrefix}-project-management'
    location: location
  }
}

module adminSwa 'modules/staticWebApp.bicep' = {
  name: 'adminSwa'
  params: {
    name: '${namePrefix}-admin'
    location: location
  }
}

output apiFqdn string = api.outputs.fqdn
output acrLoginServer string = registry.outputs.loginServer
output sqlServerFqdn string = sql.outputs.serverFqdn
output keyVaultName string = keyVault.outputs.vaultName
output projectManagementUrl string = projectManagementSwa.outputs.defaultHostname
output adminUrl string = adminSwa.outputs.defaultHostname
