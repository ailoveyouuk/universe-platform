@description('The Universe API service, running as an Azure Container App. This is the ONE thing that talks to the database (see architecture doc) — no other app gets a database connection string.')
param name string
param location string
param containerAppsEnvironmentId string
param containerRegistryLoginServer string

@description('Full image reference, e.g. myacr.azurecr.io/universe-api:latest. Set by the deploy workflow after it pushes a new image — this template does not build images itself.')
param apiImage string

param keyVaultUri string
param minReplicas int = 0
param maxReplicas int = 3

@description('Resource ID of the pre-provisioned user-assigned managed identity (see architecture doc, "Client secret blocked by tenant policy" / backend-launch-checklist.md B2) — used for both ACR pull and Key Vault secret access. NOT system-assigned: a system-assigned identity does not exist until this resource is created, so it cannot be pre-federated with the CIAM App Registration ahead of first deploy. A user-assigned identity, created once ahead of time, can be.')
param userAssignedIdentityId string

@description('Principal (object) ID of that same user-assigned identity — Bicep cannot read this back off `containerApp.identity` for a user-assigned identity the way it can for system-assigned, so it is threaded through as a param from main.bicep (which looks it up via an `existing` resource reference) and passed straight through as this module\'s `principalId` output.')
param userAssignedIdentityPrincipalId string

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistryLoginServer
          identity: userAssignedIdentityId
        }
      ]
      secrets: [
        // Referencing Key Vault directly means a secret ROTATION in Key
        // Vault takes effect on the next revision without touching this
        // Bicep file or any GitHub secret.
        {
          name: 'database-url'
          keyVaultUrl: '${keyVaultUri}secrets/database-url'
          identity: userAssignedIdentityId
        }
        {
          name: 'universe-ciam-client-secret'
          keyVaultUrl: '${keyVaultUri}secrets/universe-ciam-client-secret'
          identity: userAssignedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'UNIVERSE_CIAM_CLIENT_SECRET', secretRef: 'universe-ciam-client-secret' }
            { name: 'API_PORT', value: '4000' }
            // UNIVERSE_CIAM_TENANT_ID / UNIVERSE_CIAM_API_AUDIENCE are not
            // secret — set as plain env vars once the CIAM tenant exists,
            // either here or via `az containerapp update`.
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output fqdn string = containerApp.properties.configuration.ingress.fqdn
output principalId string = userAssignedIdentityPrincipalId
