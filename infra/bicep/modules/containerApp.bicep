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

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned' // used for both ACR pull and Key Vault secret access
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
          identity: 'system'
        }
      ]
      secrets: [
        // Referencing Key Vault directly means a secret ROTATION in Key
        // Vault takes effect on the next revision without touching this
        // Bicep file or any GitHub secret.
        {
          name: 'database-url'
          keyVaultUrl: '${keyVaultUri}secrets/database-url'
          identity: 'system'
        }
        {
          name: 'universe-ciam-client-secret'
          keyVaultUrl: '${keyVaultUri}secrets/universe-ciam-client-secret'
          identity: 'system'
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
output principalId string = containerApp.identity.principalId
