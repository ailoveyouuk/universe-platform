import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { withTenantContext } from "@universe/db";
import type { ProjectDetail } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import { ProjectsService } from "../projects/projects.service";
import { BlobStorageService } from "./blob-storage.service";
import type { RequestUploadDto } from "./dto/request-upload.dto";
import type { ConfirmUploadDto } from "./dto/confirm-upload.dto";

/**
 * Phase 2b (Documents) — Blob Storage, decided 2026-10-01 by Lewis (see
 * architecture-decisions.md). Deliberately a TWO-STEP upload, not a single
 * multipart POST through this API:
 *
 *   1. POST .../documents/upload-url — caller gets back a short-lived,
 *      write-only SAS URL (see BlobStorageService.getUploadUrl) and PUTs
 *      the file bytes straight to Blob Storage with it. This API process
 *      never sees the file content at all.
 *   2. POST .../documents — once that PUT succeeds, the caller confirms
 *      with the metadata (blobName, title, type, file size/mime) and this
 *      step creates the actual ProjectDocument row.
 *
 * A document whose step 1 happened but step 2 never did (user abandoned
 * the upload, tab closed) leaves an orphaned blob with no DB row — harmless
 * (no RLS-protected metadata references it, nothing in the app will ever
 * resolve a download URL for it since nothing knows its blobName) and left
 * unswept for now; a lifecycle/cleanup job is a reasonable future addition,
 * not needed for Phase 2b to be correct.
 *
 * Same ownership-check-via-ProjectsService.findOne() pattern as
 * SupplierEnquiriesService — see that file's doc comment.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly blobStorageService: BlobStorageService,
  ) {}

  private async assertProjectOwned(tx: Parameters<Parameters<typeof withTenantContext>[1]>[0], user: RequestUser, projectId: string) {
    const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    return project;
  }

  /** Blob names are namespaced by project, then a random id + the original
   * file name, so two uploads of "invoice.pdf" to the same project never
   * collide and the original name still shows up if anyone ever inspects
   * the container directly in the Azure Portal. Characters outside the
   * safe set are stripped rather than rejected — a file name is caller-
   * supplied text, not something to fail an upload over. */
  private buildBlobName(projectId: string, fileName: string): string {
    const safe = fileName.replace(/[^a-zA-Z0-9.\-_ ]/g, "_").slice(-150);
    return `${projectId}/${randomUUID()}-${safe}`;
  }

  async requestUpload(user: RequestUser, projectId: string, dto: RequestUploadDto): Promise<{ uploadUrl: string; blobName: string }> {
    await withTenantContext(user.organizationId, (tx) => this.assertProjectOwned(tx, user, projectId));
    const blobName = this.buildBlobName(projectId, dto.fileName);
    return this.blobStorageService.getUploadUrl(user.organizationId, blobName, dto.contentType);
  }

  async confirmUpload(user: RequestUser, projectId: string, dto: ConfirmUploadDto): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      await this.assertProjectOwned(tx, user, projectId);
      await tx.projectDocument.create({
        data: {
          organizationId: user.organizationId,
          projectId,
          type: dto.type,
          title: dto.title,
          url: this.blobStorageService.blobUrl(user.organizationId, dto.blobName),
          blobName: dto.blobName,
          fileName: dto.fileName,
          fileSizeBytes: dto.fileSizeBytes,
          mimeType: dto.mimeType,
          uploadedById: user.id,
        },
      });
    });
    return this.projectsService.findOne(user, projectId);
  }

  async getDownloadUrl(user: RequestUser, projectId: string, documentId: string): Promise<{ downloadUrl: string }> {
    const doc = await withTenantContext(user.organizationId, async (tx) => {
      await this.assertProjectOwned(tx, user, projectId);
      const document = await tx.projectDocument.findFirst({
        where: { id: documentId, projectId, ...tenantScope(user.organizationId) },
      });
      if (!document) throw new NotFoundException(`Document ${documentId} not found on project ${projectId}`);
      return document;
    });
    if (!doc.blobName) {
      // Legacy SharePoint-link row (pre-dates blobName) — url is already
      // the directly-usable link, nothing to mint a SAS for.
      return { downloadUrl: doc.url };
    }
    const downloadUrl = await this.blobStorageService.getDownloadUrl(user.organizationId, doc.blobName);
    return { downloadUrl };
  }

  async delete(user: RequestUser, projectId: string, documentId: string): Promise<ProjectDetail> {
    const doc = await withTenantContext(user.organizationId, async (tx) => {
      await this.assertProjectOwned(tx, user, projectId);
      const document = await tx.projectDocument.findFirst({
        where: { id: documentId, projectId, ...tenantScope(user.organizationId) },
      });
      if (!document) throw new NotFoundException(`Document ${documentId} not found on project ${projectId}`);
      await tx.projectDocument.delete({ where: { id: documentId } });
      return document;
    });
    if (doc.blobName) await this.blobStorageService.deleteBlob(user.organizationId, doc.blobName);
    return this.projectsService.findOne(user, projectId);
  }
}
