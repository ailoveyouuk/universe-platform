@description('Container Registry holding the API service image built by GitHub Actions.')
param name string
param location string

@description('Principal (object) ID of the Container App\'s managed identity, granted AcrPull on this registry directly (not the resource group) — moved in here from main.bicep, mirroring modules/keyVault.bicep\'s own role-assignment pattern, both to tighten scope and to avoid BCP120 (a roleAssignment name can\'t be built from two different modules\' outputs together; sourcing it here, inside the module that owns the resource being granted access to, keeps it resolvable at the start of deployment).')
param apiPrincipalId string

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: name
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false // Container App pulls via managed identity, not admin credentials
  }
}

// AcrPull
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acrPullAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, apiPrincipalId, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: apiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output loginServer string = acr.properties.loginServer
output registryId string = acr.id
