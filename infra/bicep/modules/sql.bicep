@description('Azure SQL Server + Database holding every organization''s data, isolated by organizationId (see packages/db/prisma/schema.prisma). One database, not one per tenant — see architecture doc for why.')
param serverName string
param databaseName string
param location string

@description('SQL admin login. The API connects with a separate, lower-privilege user created post-deploy — this admin login is for migrations/break-glass only.')
param sqlAdminLogin string

@secure()
param sqlAdminPassword string

@description('SKU name, e.g. GP_S_Gen5_1 (serverless General Purpose) for pilot-scale cost, or S0/S1 for predictable Standard tier.')
param skuName string = 'GP_S_Gen5_1'

param skuTier string = 'GeneralPurpose'

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: serverName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled' // tighten to 'Disabled' + private endpoint before onboarding real pilot client data
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: databaseName
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    autoPauseDelay: 60 // serverless auto-pause after 60 min idle — cheap for a pilot, remove for production
    minCapacity: json('0.5')
  }
}

// Allows Azure services (the Container App) to reach the server. Tighten to
// a VNet integration + private endpoint before real pilot client data lands
// here — this rule is intentionally broad for early bring-up only.
resource allowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output serverFqdn string = sqlServer.properties.fullyQualifiedDomainName
output databaseName string = sqlDatabase.name
