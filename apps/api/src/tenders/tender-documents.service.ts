import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { BlobStorageService } from "../documents/blob-storage.service";
import { appendTenderEvent } from "./tender-events";
import { effectiveStatus, TendersService } from "./tenders.service";
import type { ConfirmTenderDocumentDto, RequestTenderDocumentDto } from "./dto/tenders.dto";

const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "zip", "png", "jpg", "jpeg", "dwg"];
const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Tender documents with versions (2026-10-21). The issuer uploads specifications, terms, drawings and templates to the tender; replacing a
 * document creates a new version and keeps the old one as history, so a bidder can always show what they relied on. Files sit in the issuer's
 * own storage container; anyone who may see the tender gets a short-lived download link minted here after the same visibility check the
 * database applies. Changes after publication are written to the tamper-evident timeline and notified to participants and invitees.
 */
@Injectable()
export class TenderDocumentsService {
  constructor(private readonly tenders: TendersService, private readonly blob: BlobStorageService) {}

  async requestUpload(user: RequestUser, tenderId: string, dto: RequestTenderDocumentDto) {
    assertHasPermission(user, "tenders.issue");
    await withTenantContext(user.organizationId, async (tx) => this.assertEditable(await this.tenders.ownTender(tx, user, tenderId)));
    const ext = dto.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(ext)) throw new BadRequestException(`Tender documents can be ${ALLOWED.join(", ")} files.`);
    if (dto.fileSizeBytes > MAX_BYTES) throw new BadRequestException("Tender documents can be up to 50 MB.");
    return this.blob.getUploadUrl(user.organizationId, `tender-docs/${tenderId}/${randomUUID()}-${safeName(dto.fileName)}`, dto.contentType);
  }

  private assertEditable(t: { status: string; closingAt: Date | null; isPublished: boolean; archivedAt: Date | null }) {
    const st = effectiveStatus(t as never);
    if (st !== "DRAFT" && st !== "PUBLISHED") throw new ConflictException("Documents can only be changed while the tender is a draft or open.");
  }

  async confirm(user: RequestUser, tenderId: string, dto: ConfirmTenderDocumentDto) {
    assertHasPermission(user, "tenders.issue");
    if (!dto.blobName.startsWith(`tender-docs/${tenderId}/`)) throw new BadRequestException("That file does not belong to this tender.");
    const info = await this.blob.getBlobInfo(user.organizationId, dto.blobName);
    if (!info) throw new BadRequestException("The file was not found in storage. Please upload it again.");
    if (info.scanStatus === "INFECTED") { await this.blob.deleteBlob(user.organizationId, dto.blobName); throw new BadRequestException("That file was flagged by the malware scan and has been removed."); }
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      this.assertEditable(t);
      let version = 1; let key: string | null = null; let replaced: { title: string } | null = null;
      if (dto.replacesDocumentId) {
        const cur = await tx.tenderDocument.findFirst({ where: { id: dto.replacesDocumentId, tenderId, archivedAt: null, supersededAt: null } });
        if (!cur) throw new ConflictException("That document has already been replaced or removed. Reload and try again.");
        version = cur.version + 1; key = cur.documentKey ?? cur.id; replaced = { title: cur.title };
        await tx.tenderDocument.update({ where: { id: cur.id }, data: { supersededAt: new Date(), documentKey: key } });
      }
      const row = await tx.tenderDocument.create({ data: {
        organizationId: user.organizationId, tenderId, title: dto.title.trim(), docType: dto.docType, description: dto.description?.trim() || null,
        blobName: dto.blobName, fileName: dto.fileName, fileSizeBytes: dto.fileSizeBytes ?? info.size, mimeType: dto.mimeType ?? info.contentType, uploadedById: user.id, version, documentKey: key,
      } });
      if (!key) await tx.tenderDocument.update({ where: { id: row.id }, data: { documentKey: row.id } });
      return { t, row, replaced };
    });
    if (out.t.isPublished) {
      const verb = out.replaced ? `replaced (now version ${out.row.version})` : "added";
      await appendTenderEvent({ organizationId: out.t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: out.replaced ? "DOCUMENT_REPLACED" : "DOCUMENT_ADDED", summary: `Document ${verb}: ${out.row.title}`, details: { documentId: out.row.id, version: out.row.version, fileName: out.row.fileName } });
      await this.tenders.notifyOrgs(await this.audience(user, tenderId), () => ({ title: `Document ${out.replaced ? "updated" : "added"} on ${out.t.referenceNumber}`, body: `${out.row.title}${out.replaced ? ` is now version ${out.row.version}` : " was added"} on ${out.t.title}.`, link: `/tenders/detail?id=${tenderId}`, subjectId: tenderId }), "TENDER_ADDENDUM", user.id);
    }
    return { id: out.row.id, version: out.row.version };
  }

  async remove(user: RequestUser, tenderId: string, docId: string) {
    assertHasPermission(user, "tenders.issue");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      this.assertEditable(t);
      const cur = await tx.tenderDocument.findFirst({ where: { id: docId, tenderId, archivedAt: null, supersededAt: null } });
      if (!cur) throw new NotFoundException("Document not found.");
      // A removed document stays in storage and in the history; it is withdrawn from view of its whole version chain.
      await tx.tenderDocument.updateMany({ where: { tenderId, OR: [{ id: cur.id }, ...(cur.documentKey ? [{ documentKey: cur.documentKey }] : [])] }, data: { archivedAt: new Date() } });
      return { t, cur };
    });
    if (out.t.isPublished) {
      await appendTenderEvent({ organizationId: out.t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "DOCUMENT_REMOVED", summary: `Document withdrawn: ${out.cur.title}`, details: { documentId: out.cur.id } });
      await this.tenders.notifyOrgs(await this.audience(user, tenderId), () => ({ title: `Document withdrawn from ${out.t.referenceNumber}`, body: `${out.cur.title} was withdrawn from ${out.t.title}.`, link: `/tenders/detail?id=${tenderId}`, subjectId: tenderId }), "TENDER_ADDENDUM", user.id);
    }
    return { removed: true };
  }

  /** Download link for the issuer or any organisation that can see the (published) tender; superseded versions stay downloadable. */
  async downloadUrl(user: RequestUser, tenderId: string, docId: string) {
    const found = await withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id: tenderId } }); // row-level security already hides tenders this organisation may not see
      if (!t || t.archivedAt || (t.organizationId !== user.organizationId && !t.isPublished)) return null;
      const doc = await tx.tenderDocument.findFirst({ where: { id: docId, tenderId, archivedAt: null } });
      return doc?.blobName ? { issuerOrgId: t.organizationId, blobName: doc.blobName, fileName: doc.fileName } : null;
    });
    if (!found) throw new NotFoundException("Document not found.");
    return { downloadUrl: await this.blob.getDownloadUrl(found.issuerOrgId, found.blobName), fileName: found.fileName };
  }

  private async audience(user: RequestUser, tenderId: string): Promise<string[]> {
    return withTenantContext(user.organizationId, async (tx) => {
      const [parts, invites] = await Promise.all([
        tx.tenderParticipation.findMany({ where: { tenderId, withdrawnAt: null }, select: { organizationId: true } }),
        tx.tenderInvitation.findMany({ where: { tenderId }, select: { invitedOrganizationId: true } }),
      ]);
      return [...new Set([...parts.map((p) => p.organizationId), ...invites.map((i) => i.invitedOrganizationId)])];
    });
  }
}
