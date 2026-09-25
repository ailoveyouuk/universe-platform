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

@description('Directory (tenant) ID of the real Universe CIAM tenant (Entra External ID) — "Universe Platform", universeplatform.onmicrosoft.com. One tenant for the whole platform (see architecture doc, "Everyone signs in through the one CIAM tenant"), so this default is the same across every environment unless the CIAM tenant is ever recreated.')
param ciamTenantId string = '23851fd3-0682-4268-af83-338cfea80d89'

@description('The tenant\'s subdomain — the part before ".ciamlogin.com" / ".onmicrosoft.com". Required for the API to resolve the tenant\'s real ciamlogin.com OIDC discovery document (see packages/auth/src/verifyToken.ts) rather than falling back to the local-dev login.microsoftonline.com pattern.')
param ciamTenantSubdomain string = 'universeplatform'

@description('Expected `aud` claim on API access tokens — the universe-platform-api app registration\'s Application ID URI (registered 2026-09-25, client ID bf7f8f96-dc29-4754-b323-5a17058f5a1b).')
param ciamApiAudience string = 'api://bf7f8f96-dc29-4754-b323-5a17058f5a1b'

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
        // universe-ciam-client-secret deliberately NOT wired here (removed
        // 2026-09-25). Confirmed via full-codebase grep that nothing reads
        // UNIVERSE_CIAM_CLIENT_SECRET — the SPA (universe-platform-web) is a
        // public client (PKCE, no secret) and the API verifies tokens via
        // pure JWKS public-key validation (see verifyToken.ts), so no
        // confidential-client flow exists that would need it. The
        // apiIdentity user-assigned managed identity (see main.bicep) was
        // pre-provisioned in case Workload Identity Federation was needed
        // instead of a client secret ("Client secret blocked by tenant
        // policy" — see backend-launch-checklist.md), but nothing in the
        // current design does an OBO/confidential-client call, so that
        // federation was never set up either. Revisit if a future feature
        // genuinely needs the API to call another API as itself.
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
            { name: 'API_PORT', value: '4000' }
            // Not secret — the real Universe CIAM tenant's identifiers,
            // wired 2026-09-25 once the tenant and API app registration
            // existed. See entra-auth.guard.ts / verifyToken.ts for how
            // these are used.
            { name: 'UNIVERSE_CIAM_TENANT_ID', value: ciamTenantId }
            { name: 'UNIVERSE_CIAM_TENANT_SUBDOMAIN', value: ciamTenantSubdomain }
            { name: 'UNIVERSE_CIAM_API_AUDIENCE', value: ciamApiAudience }
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
