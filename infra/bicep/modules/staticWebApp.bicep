@description('One Azure Static Web App per Universe frontend app — deployed independently of every other app, per the "each app deploys independently" architecture decision.')
param name string
param location string

@description('SKU: Free is fine for the pilot; Standard adds custom auth/private endpoints if needed later.')
param sku string = 'Free'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // Not linking a GitHub repo here on purpose — deployment is driven by
    // the GitHub Actions workflow using this resource's deployment token,
    // not Azure's own repo-linkage/CI, so every app's pipeline lives in one
    // place (.github/workflows) instead of split across the portal too.
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

#disable-next-line outputs-should-not-contain-secrets
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
output defaultHostname string = staticWebApp.properties.defaultHostname
