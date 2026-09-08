@description('Name for the Log Analytics workspace backing the Container Apps environment.')
param name string
param location string

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

output workspaceId string = logAnalytics.id
output customerId string = logAnalytics.properties.customerId
#disable-next-line outputs-should-not-contain-secrets
output sharedKey string = logAnalytics.listKeys().primarySharedKey
