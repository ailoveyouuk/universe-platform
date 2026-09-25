@description('Key Vault holding secrets the API needs at runtime (DB connection string, CIAM client secret). The Container App reads these via its managed identity — no secret ever sits in a Bicep parameter file or GitHub Actions log.')
param name string
param apiPrincipalId string

// Referenced as `existing` rather than created here, mirroring main.bicep's
// own apiIdentity pattern — same underlying reason. This module's role
// assignment depends on apiPrincipalId, which comes from the Container App
// module, so Azure builds the Container App before this module runs. If this
// module also OWNED vault creation, the vault (and the two secrets the
// Container App reads at boot — database-url, universe-ciam-client-secret)
// wouldn't exist yet either, and the Container App's first revision would
// fail outright rather than just hitting the already-documented RBAC-
// propagation delay below. Discovered for real on the first B4 deploy
// attempt (2026-09-25): the Container App failed with "Unable to get value
// using Managed identity ... for secret" because the vault had never been
// created. Fixed by pre-provisioning the vault once via CLI (RBAC-mode,
// same as it would be created here) and referencing it as `existing` — see
// backend-launch-checklist.md B4 for the exact bootstrap commands if this
// ever needs to be redone for a new environment.
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: name
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
