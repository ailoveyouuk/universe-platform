// Document storage (Phase 2b, decided 2026-10-01 — see architecture-decisions.md
// "Open questions" / backend-launch-checklist.md Phase 2b). Blob Storage,
// chosen over continuing to point ProjectDocument.url at SharePoint links,
// per the design discussion held 2026-09-24: container-per-tenant +
// user-delegation SAS for security, lifecycle tiering for cost.
//
// No account key or connection string leaves this template or Key Vault —
// the API's user-assigned managed identity (same one used for SQL/ACR/Key
// Vault elsewhere in this stack) is granted data-plane RBAC roles directly
// on this storage account, and the API mints short-lived user-delegation
// SAS tokens for upload/download at request time (see
// apps/api/src/documents/blob-storage.service.ts). Nothing durable is ever
// handed to a browser.
@description('Principal (object) ID of the Container App\'s managed identity — granted Storage Blob Data Contributor (read/write/delete blob data) and Storage Blob Delegator (mint user-delegation SAS tokens) directly on this account, same scoping pattern as modules/registry.bicep\'s AcrPull grant.')
param apiPrincipalId string

@description('Storage account names must be globally unique, lowercase alphanumeric only, 3-24 chars.')
param name string

param location string

@description('Origins allowed to PUT directly to blob storage with a SAS (the two-step browser upload flow in documents.service.ts) — the Project Management SWA\'s own hostname. Without this, every browser-side upload fails with a CORS preflight error even though the SAS itself is valid, since Blob Storage default-denies cross-origin requests. Found and fixed 2026-10-01 during the Phase 2b smoke test: upload-url minted fine, the direct-to-blob PUT never got there.')
param allowedOrigin string

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: name
  location: location
  sku: {
    // LRS, not GRS/ZRS: matches the pilot-scale cost posture already set
    // for the rest of this stack (single logical SQL server, Basic ACR
    // tier) — revisit alongside those if/when this moves beyond pilot.
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    // Required for the age-based lifecycle rule below to also consider
    // last-ACCESS time, not just last-modified — a document uploaded once
    // and then read repeatedly years later shouldn't tier down just
    // because it was never re-written.
    isHnsEnabled: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    // Needed for the lastAccessTimeTrackingPolicy below.
    lastAccessTimeTrackingPolicy: {
      enable: true
      name: 'AccessTimeTracking'
      trackingGranularityInDays: 1
      blobType: ['blockBlob']
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 14
    }
    // The browser PUTs file bytes straight to this account using the SAS
    // minted by BlobStorageService.getUploadUrl (see documents.service.ts's
    // doc comment on the two-step upload flow) — a cross-origin request
    // from the SWA's origin to *.blob.core.windows.net. Blob Storage
    // default-denies cross-origin requests with no CORS config at all, so
    // without this every upload fails at the preflight, before the SAS
    // itself is ever checked. GET/HEAD only: downloads go through the same
    // SAS-PUT-style direct-to-blob pattern but browsers don't preflight
    // simple GETs the way they do PUT-with-custom-headers, so this is
    // mainly here for the upload PUT's x-ms-blob-type header.
    cors: {
      corsRules: [
        {
          allowedOrigins: [allowedOrigin]
          allowedMethods: ['GET', 'HEAD', 'PUT', 'OPTIONS']
          allowedHeaders: ['*']
          exposedHeaders: ['*']
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

// Every org's documents live in their own private container
// (`org-<organizationId>`, created lazily on first upload — see
// BlobStorageService.ensureContainer), never a shared container keyed by a
// path prefix: a genuine per-tenant blast-radius boundary, same spirit as
// the Row-Level Security default-deny-by-organizationId model at the
// database layer, not just a convention.

// Lifecycle management: move blobs that haven't been read in a while to
// progressively cheaper access tiers ("Smart Tier" in Lewis's own framing
// from the 2026-09-24 design discussion — implemented here as Azure's
// standard age/access-based lifecycle rules, since "Smart Tier" isn't a
// distinct Azure product name). Archive tier is intentionally NOT used:
// rehydration from Archive takes hours, and procurement documents
// (compliance checklists, certificates, closeout reports) can legitimately
// need same-session retrieval years later — Cool is the floor here.
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'tier-down-inactive-documents'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
            }
            actions: {
              baseBlob: {
                tierToCool: { daysAfterLastAccessTimeGreaterThan: 30 }
              }
            }
          }
        }
      ]
    }
  }
}

var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var storageBlobDelegatorRoleId = 'db58b8e5-c6ad-4a2a-8342-4190687cbf4a'

resource blobDataContributorAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, apiPrincipalId, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: apiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource blobDelegatorAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, apiPrincipalId, storageBlobDelegatorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDelegatorRoleId)
    principalId: apiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output accountName string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
