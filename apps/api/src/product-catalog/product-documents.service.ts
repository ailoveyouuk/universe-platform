import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import type { ProductDocumentSummary } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { BlobStorageService } from "../documents/blob-storage.service";
import { PRODUCT_DOC_MAX_BYTES, PRODUCT_DOC_MIME_TYPES, type CreateProductDocumentDto, type RequestProductDocumentUploadDto } from "./dto/product-document.dto";

const DAY = 86400000;

type Row = {
  id: string; productMasterId: string; registrationId: string | null; docType: string; title: string; version: string; status: string;
  effectiveDate: Date | null; expiryDate: Date | null; reviewDueDate: Date | null; supersedesId: string | null; blobName: string | null;
  fileName: string | null; fileSizeBytes: number | null; mimeType: string | null; scanStatus: string; notes: string | null; createdAt: Date;
  approvedAt: Date | null; archivedAt: Date | null;
  uploadedBy: { forename: string; surname: string }; approvedBy: { forename: string; surname: string } | null;
};

export function toDocumentSummary(r: Row, now = Date.now()): ProductDocumentSummary {
  const days = r.expiryDate ? Math.floor((r.expiryDate.getTime() - now) / DAY) : null;
  return {
    id: r.id, productMasterId: r.productMasterId, registrationId: r.registrationId, docType: r.docType, title: r.title, version: r.version, status: r.status,
    effectiveDate: r.effectiveDate?.toISOString() ?? null, expiryDate: r.expiryDate?.toISOString() ?? null, reviewDueDate: r.reviewDueDate?.toISOString() ?? null,
    isExpired: r.status === "APPROVED" && days !== null && days < 0, daysToExpiry: days, supersedesId: r.supersedesId,
    fileName: r.fileName, fileSizeBytes: r.fileSizeBytes, mimeType: r.mimeType, hasFile: !!r.blobName, scanStatus: r.scanStatus, notes: r.notes,
    uploadedByName: `${r.uploadedBy.forename} ${r.uploadedBy.surname}`.trim(), uploadedAt: r.createdAt.toISOString(),
    approvedByName: r.approvedBy ? `${r.approvedBy.forename} ${r.approvedBy.surname}`.trim() : null, approvedAt: r.approvedAt?.toISOString() ?? null,
    archived: r.archivedAt !== null,
  };
}

const include = { uploadedBy: { select: { forename: true, surname: true } }, approvedBy: { select: { forename: true, surname: true } } } as const;
const toDate = (v?: string) => { if (!v) return null; const d = new Date(v); if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${v}`); return d; };

/**
 * Controlled product documents (Product Database step 3, 2026-10-18). Private to the organisation (RLS). Files go
 * browser-to-blob by short-lived SAS into the organisation's private container; the confirm step checks the stored blob
 * (type, size, malware-scan tag) before a record exists. Approval is four-eyes (approver is not the uploader). Versions
 * supersede; nothing is deleted. Every change is written to the field audit log.
 */
@Injectable()
export class ProductDocumentsService {
  constructor(private readonly blobs: BlobStorageService) {}

  private canWrite(u: RequestUser) { return u.permissions.includes("projects.edit") || u.permissions.includes("products.approve") || u.platformStaffRole !== "NONE"; }
  private canApprove(u: RequestUser) { return u.permissions.includes("products.approve") || u.platformStaffRole !== "NONE"; }

  private async assertProductVisible(user: RequestUser, productId: string) {
    const p = await prisma.productMaster.findUnique({ where: { id: productId }, select: { id: true, isSimulated: true } });
    if (!p || (p.isSimulated && user.inDemoOrganization !== true)) throw new NotFoundException("Product not found.");
  }

  async list(user: RequestUser, productId: string, includeArchived = false): Promise<ProductDocumentSummary[]> {
    await this.assertProductVisible(user, productId);
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productDocument.findMany({
        where: { organizationId: user.organizationId, productMasterId: productId, ...(includeArchived ? {} : { archivedAt: null }) },
        include, orderBy: [{ docType: "asc" }, { createdAt: "desc" }],
      }),
    );
    return rows.map((r) => toDocumentSummary(r));
  }

  async requestUpload(user: RequestUser, productId: string, dto: RequestProductDocumentUploadDto) {
    if (!this.canWrite(user)) throw new ForbiddenException("Missing permission to add product documents.");
    await this.assertProductVisible(user, productId);
    if (!PRODUCT_DOC_MIME_TYPES.includes(dto.contentType)) throw new BadRequestException("File type not allowed. Use PDF, PNG, JPEG, text, CSV, Word or Excel.");
    if (dto.fileSizeBytes > PRODUCT_DOC_MAX_BYTES) throw new BadRequestException("File is larger than the 25 MB limit.");
    const safe = dto.fileName.replace(/[^a-zA-Z0-9.\-_ ]/g, "_").slice(-150);
    return this.blobs.getUploadUrl(user.organizationId, `product-docs/${productId}/${randomUUID()}-${safe}`, dto.contentType);
  }

  async create(user: RequestUser, productId: string, dto: CreateProductDocumentDto): Promise<ProductDocumentSummary> {
    if (!this.canWrite(user)) throw new ForbiddenException("Missing permission to add product documents.");
    await this.assertProductVisible(user, productId);
    let file: { size: number; contentType: string; etag: string; scanStatus: string } | null = null;
    if (dto.blobName) {
      if (!dto.blobName.startsWith(`product-docs/${productId}/`)) throw new BadRequestException("Upload does not belong to this product.");
      file = await this.blobs.getBlobInfo(user.organizationId, dto.blobName);
      if (!file) throw new BadRequestException("The uploaded file was not found. Please upload again.");
      if (file.size > PRODUCT_DOC_MAX_BYTES || !PRODUCT_DOC_MIME_TYPES.includes(file.contentType)) throw new BadRequestException("The uploaded file is not an accepted type or size, so it was not recorded.");
      if (file.scanStatus === "INFECTED") throw new BadRequestException("The uploaded file failed the malware scan, so it was not recorded.");
    }
    const row = await withTenantContext(user.organizationId, async (tx) => {
      if (dto.supersedesId) {
        const prior = await tx.productDocument.findFirst({ where: { id: dto.supersedesId, organizationId: user.organizationId, productMasterId: productId } });
        if (!prior) throw new BadRequestException("The document to supersede was not found for this product.");
      }
      const created = await tx.productDocument.create({
        data: {
          organizationId: user.organizationId, productMasterId: productId, registrationId: dto.registrationId ?? null, docType: dto.docType, title: dto.title.trim(),
          version: dto.version?.trim() || "1.0", status: "DRAFT", effectiveDate: toDate(dto.effectiveDate), expiryDate: toDate(dto.expiryDate), reviewDueDate: toDate(dto.reviewDueDate),
          supersedesId: dto.supersedesId ?? null, blobName: dto.blobName ?? null, fileName: dto.fileName ?? null, fileSizeBytes: file?.size ?? null,
          mimeType: file?.contentType ?? null, blobEtag: file?.etag ?? null, scanStatus: file?.scanStatus ?? "NOT_SCANNED", notes: dto.notes?.trim() || null,
          uploadedById: user.id, isSimulated: user.inDemoOrganization === true,
        },
        include,
      });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "product_documents", recordId: created.id, changedById: user.id, source: "API",
        changes: [{ field: "document added", oldValue: null, newValue: `${created.docType}: ${created.title} v${created.version} (draft)` }] });
      return created;
    });
    return toDocumentSummary(row);
  }

  /** Four-eyes approval: the approver cannot be the uploader. Approving a version marks the one it supersedes SUPERSEDED. */
  async approve(user: RequestUser, documentId: string): Promise<ProductDocumentSummary> {
    if (!this.canApprove(user)) throw new ForbiddenException("Missing permission: approving a document requires products.approve (QA).");
    const row = await withTenantContext(user.organizationId, async (tx) => {
      const doc = await tx.productDocument.findFirst({ where: { id: documentId, organizationId: user.organizationId, archivedAt: null } });
      if (!doc) throw new NotFoundException("Document not found.");
      if (doc.status !== "DRAFT") throw new BadRequestException("Only a draft document can be approved.");
      if (doc.uploadedById === user.id) throw new ForbiddenException("A document cannot be approved by the person who uploaded it.");
      if (doc.scanStatus === "INFECTED") throw new BadRequestException("This file failed the malware scan and cannot be approved.");
      const updated = await tx.productDocument.update({ where: { id: documentId }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() }, include });
      const changes = [{ field: "status", oldValue: "DRAFT", newValue: "APPROVED" }];
      if (doc.supersedesId) {
        await tx.productDocument.update({ where: { id: doc.supersedesId }, data: { status: "SUPERSEDED" } });
        await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "product_documents", recordId: doc.supersedesId, changedById: user.id, source: "API", changes: [{ field: "status", oldValue: "APPROVED", newValue: "SUPERSEDED" }] });
      }
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "product_documents", recordId: documentId, changedById: user.id, source: "API", changes });
      return updated;
    });
    return toDocumentSummary(row);
  }

  /** Archive (never delete). The file and row are retained for the audit trail. */
  async archive(user: RequestUser, documentId: string, reason?: string): Promise<ProductDocumentSummary> {
    if (!this.canWrite(user)) throw new ForbiddenException("Missing permission to archive product documents.");
    const row = await withTenantContext(user.organizationId, async (tx) => {
      const doc = await tx.productDocument.findFirst({ where: { id: documentId, organizationId: user.organizationId, archivedAt: null } });
      if (!doc) throw new NotFoundException("Document not found.");
      const updated = await tx.productDocument.update({ where: { id: documentId }, data: { archivedAt: new Date(), archivedById: user.id }, include });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "product_documents", recordId: documentId, changedById: user.id, source: "API", reason: reason ?? null,
        changes: [{ field: "archived", oldValue: "false", newValue: "true" }] });
      return updated;
    });
    return toDocumentSummary(row);
  }

  /** Short-lived read link. Re-checks the malware-scan tag at download and blocks an infected file. Simulated records have no file. */
  async downloadUrl(user: RequestUser, documentId: string): Promise<{ downloadUrl: string }> {
    const doc = await withTenantContext(user.organizationId, (tx) => tx.productDocument.findFirst({ where: { id: documentId, organizationId: user.organizationId, archivedAt: null } }));
    if (!doc) throw new NotFoundException("Document not found.");
    if (!doc.blobName) throw new NotFoundException("This record has no stored file.");
    const info = await this.blobs.getBlobInfo(user.organizationId, doc.blobName);
    if (info?.scanStatus === "INFECTED") {
      await withTenantContext(user.organizationId, (tx) => tx.productDocument.update({ where: { id: doc.id }, data: { scanStatus: "INFECTED" } }));
      throw new ForbiddenException("This file failed the malware scan and cannot be downloaded.");
    }
    return { downloadUrl: await this.blobs.getDownloadUrl(user.organizationId, doc.blobName) };
  }
}
