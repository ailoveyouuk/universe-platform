@description('Key Vault holding secrets the API needs at runtime (DB connection string, CIAM client secret). The Container App reads these via its managed identity — no secret ever sits in a Bicep parameter file or GitHub Actions log.')
param name string
param location string
param apiPrincipalId string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
  }
}

// "Key Vault Secrets User" — read-only access to secret values, nothing else.
var secretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource apiSecretsAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, apiPrincipalId, secretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleId)
    principalId: apiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output vaultUri string = keyVault.properties.vaultUri
output vaultName string = keyVault.name
