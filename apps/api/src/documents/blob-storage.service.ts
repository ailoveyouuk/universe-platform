import { Injectable } from "@nestjs/common";
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * Phase 2b, Blob Storage (decided 2026-10-01 by Lewis — see
 * architecture-decisions.md "Document storage" open question, resolved in
 * favor of the recommended option over continuing to point at SharePoint
 * links). Design, agreed 2026-09-24, held ahead of the go-ahead:
 *
 *  - Container-per-tenant (`org-<organizationId>`), private (no public
 *    access) — mirrors the database's own per-org isolation boundary, just
 *    at the storage layer instead of via RLS.
 *  - User-delegation SAS for both upload and download — the API never
 *    proxies file bytes through itself (would double network cost and cap
 *    upload size at whatever the Container App's own request limit is);
 *    instead it mints a short-lived, scope-limited SAS token and the
 *    browser talks to Blob Storage directly. "User delegation" (not an
 *    account-key SAS) means the token is backed by this managed identity's
 *    own Entra credentials, which can be revoked/audited, rather than the
 *    storage account's long-lived shared key — no account key exists
 *    anywhere in this codebase or Key Vault at all.
 *  - Lifecycle tiering + the access-time-tracking that makes it possible to
 *    tier on genuine inactivity rather than just upload age — see
 *    infra/bicep/modules/storage.bicep's lifecycle policy.
 *
 * Authenticates as the Container App's own user-assigned managed identity
 * (AZURE_CLIENT_ID, set by containerApp.bicep) via DefaultAzureCredential —
 * same "no secret checked in or round-tripped through Key Vault as a
 * connection string" posture as everything else this API talks to.
 */
@Injectable()
export class BlobStorageService {
  private readonly blobServiceClient: BlobServiceClient;
  private readonly accountName: string;

  constructor() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const blobEndpoint = process.env.AZURE_STORAGE_BLOB_ENDPOINT;
    if (!accountName || !blobEndpoint) {
      // Mirrors how DATABASE_URL's absence is handled elsewhere in this
      // app (packages/db throws loudly rather than limping on with an
      // undefined connection) — fail at boot, not on the first upload a
      // real user attempts.
      throw new Error(
        "AZURE_STORAGE_ACCOUNT_NAME / AZURE_STORAGE_BLOB_ENDPOINT are not set — see infra/bicep/modules/containerApp.bicep",
      );
    }
    this.accountName = accountName;
    this.blobServiceClient = new BlobServiceClient(blobEndpoint, new DefaultAzureCredential());
  }

  /** The blob's plain https:// endpoint, no SAS — stored in
   * ProjectDocument.url for display/record-keeping. Never usable on its own
   * against a private container; getDownloadUrl() is what makes it
   * actually fetchable, minted fresh per request. */
  blobUrl(organizationId: string, blobName: string): string {
    return this.blobServiceClient
      .getContainerClient(this.containerName(organizationId))
      .getBlockBlobClient(blobName).url;
  }

  private containerName(organizationId: string): string {
    // Azure container names: lowercase alphanumeric + hyphen only, 3-63
    // chars. organizationId is already a lowercase UUID, so "org-<uuid>" is
    // always valid (40 chars) without any further sanitizing.
    return `org-${organizationId}`;
  }

  /** Idempotent — safe to call on every upload, not just an org's first.
   * Lazy per-org container creation (vs. provisioning one for every org
   * up front in createOrganizationWithDefaultRoles) keeps storage
   * provisioning out of the org-creation transaction entirely; an org that
   * never uploads a document never gets a container. */
  async ensureContainer(organizationId: string): Promise<void> {
    const container = this.blobServiceClient.getContainerClient(this.containerName(organizationId));
    await container.createIfNotExists(); // private by default — no `access` option passed
  }

  /** Short-lived (15 min — generous for a single-file upload, short enough
   * that a leaked URL in a browser history/log is worthless soon after) SAS
   * scoped to exactly one blob, write-only (create + write, no read/delete)
   * so the token can't be repurposed to read or overwrite other documents
   * in the same container. */
  async getUploadUrl(organizationId: string, blobName: string, contentType: string): Promise<{ uploadUrl: string; blobName: string }> {
    await this.ensureContainer(organizationId);
    const containerName = this.containerName(organizationId);
    const blobClient = this.blobServiceClient.getContainerClient(containerName).getBlockBlobClient(blobName);

    const startsOn = new Date(Date.now() - 5 * 60 * 1000); // small clock-skew allowance
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
    const userDelegationKey = await this.blobServiceClient.getUserDelegationKey(startsOn, expiresOn);

    const sas = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("cw"),
        startsOn,
        expiresOn,
        contentType,
      },
      userDelegationKey,
      this.accountName,
    ).toString();

    return { uploadUrl: `${blobClient.url}?${sas}`, blobName };
  }

  /** Read-only, 10-minute SAS — minted fresh on every document-list/open
   * request rather than stored, so a document's effective "share link"
   * never actually lives anywhere longer than a browser tab needs it for. */
  async getDownloadUrl(organizationId: string, blobName: string): Promise<string> {
    const containerName = this.containerName(organizationId);
    const blobClient = this.blobServiceClient.getContainerClient(containerName).getBlockBlobClient(blobName);

    const startsOn = new Date(Date.now() - 5 * 60 * 1000);
    const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
    const userDelegationKey = await this.blobServiceClient.getUserDelegationKey(startsOn, expiresOn);

    const sas = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn,
        expiresOn,
      },
      userDelegationKey,
      this.accountName,
    ).toString();

    return `${blobClient.url}?${sas}`;
  }

  async deleteBlob(organizationId: string, blobName: string): Promise<void> {
    const containerName = this.containerName(organizationId);
    const blobClient = this.blobServiceClient.getContainerClient(containerName).getBlockBlobClient(blobName);
    await blobClient.deleteIfExists();
  }
}
