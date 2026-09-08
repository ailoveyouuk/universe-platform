@description('Container Registry holding the API service image built by GitHub Actions.')
param name string
param location string

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: name
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false // Container App pulls via managed identity, not admin credentials
  }
}

output loginServer string = acr.properties.loginServer
output registryId string = acr.id
