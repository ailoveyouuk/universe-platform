import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BlobStorageService } from "../documents/blob-storage.service";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import { SUPPLIER_SCOPE_TAXONOMY, scopeSubsForProduct } from "@universe/types";
import type { CertificationStatus, OrganizationCard, OrganizationCertificationSummary, OrganizationScopeSummary } from "@universe/types";
import { assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { SaveOrganizationCertificationDto } from "./dto/org-scope-certs.dto";

const VALID_SCOPE_IDS = new Set(SUPPLIER_SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => s.id)));
const EXPIRING_DAYS = 90;
const CERT_AUDIT_FIELDS = ["type", "title", "reference", "issuingBody", "issuedOn", "expiresOn", "notes"];

function runner(caller: RequestUser, organizationId: string) {
  return (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
}

export function certificationStatus(expiresOn: Date | null, now = new Date()): { status: CertificationStatus; daysToExpiry: number | null } {
  if (!expiresOn) return { status: "NO_EXPIRY", daysToExpiry: null };
  const days = Math.floor((expiresOn.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { status: "EXPIRED", daysToExpiry: days };
  return { status: days <= EXPIRING_DAYS ? "EXPIRING" : "VALID", daysToExpiry: days };
}

function toCert(row: any): OrganizationCertificationSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    type: row.type,
    title: row.title ?? null,
    reference: row.reference ?? null,
    issuingBody: row.issuingBody ?? null,
    issuedOn: row.issuedOn ? row.issuedOn.toISOString() : null,
    expiresOn: row.expiresOn ? row.expiresOn.toISOString() : null,
    notes: row.notes ?? null,
    documentFileName: row.documentFileName ?? null,
    ...certificationStatus(row.expiresOn ?? null),
  };
}

const DOC_EXT = ["pdf", "png", "jpg", "jpeg", "doc", "docx"];
const DOC_MAX = 10 * 1024 * 1024;
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);

@Injectable()
export class OrgScopeCertsService {
  constructor(private readonly blob: BlobStorageService) {}

  /** Step 1 of attaching the certificate file: a short-lived write link into the organisation's own container. */
  async requestDocumentUpload(caller: RequestUser, organizationId: string, certId: string, dto: { fileName: string; contentType: string; fileSizeBytes: number }) {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const ext = dto.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!DOC_EXT.includes(ext)) throw new BadRequestException(`A certificate can be a ${DOC_EXT.join(", ")} file.`);
    if (!(dto.fileSizeBytes > 0) || dto.fileSizeBytes > DOC_MAX) throw new BadRequestException("A certificate file can be up to 10 MB.");
    await this.ownCert(caller, organizationId, certId);
    return this.blob.getUploadUrl(organizationId, `org-certs/${certId}/${randomUUID()}-${safeName(dto.fileName)}`, dto.contentType);
  }

  /** Step 2: records the uploaded file against the certificate, replacing (and removing) any earlier file. */
  async confirmDocument(caller: RequestUser, organizationId: string, certId: string, dto: { blobName: string; fileName: string; mimeType?: string }): Promise<OrganizationCertificationSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    if (!dto.blobName.startsWith(`org-certs/${certId}/`)) throw new BadRequestException("That file does not belong to this certificate.");
    const info = await this.blob.getBlobInfo(organizationId, dto.blobName);
    if (!info) throw new BadRequestException("The file was not found in storage. Please upload it again.");
    if (info.scanStatus === "INFECTED") {
      await this.blob.deleteBlob(organizationId, dto.blobName);
      throw new BadRequestException("That file was flagged by the malware scan and has been removed.");
    }
    const { row, previous } = await runner(caller, organizationId)(async (tx) => {
      const cur = await tx.organizationCertification.findFirst({ where: { id: certId, organizationId, archivedAt: null } });
      if (!cur) throw new NotFoundException("Certification not found");
      const updated = await tx.organizationCertification.update({ where: { id: certId }, data: { documentBlobName: dto.blobName, documentFileName: dto.fileName.slice(0, 300), documentSizeBytes: info.size, documentMimeType: dto.mimeType ?? info.contentType, documentUploadedAt: new Date() } });
      await recordFieldChanges(tx, { organizationId, tableName: "organization_certifications", recordId: certId, changedById: caller.id, changes: [{ field: "document", oldValue: cur.documentFileName ?? null, newValue: dto.fileName }], source: "API" });
      return { row: updated, previous: cur.documentBlobName as string | null };
    });
    if (previous && previous !== dto.blobName) await this.blob.deleteBlob(organizationId, previous).catch(() => undefined);
    return toCert(row);
  }

  async documentDownload(caller: RequestUser, organizationId: string, certId: string): Promise<{ downloadUrl: string; fileName: string | null }> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const c = await this.ownCert(caller, organizationId, certId);
    if (!c.documentBlobName) throw new NotFoundException("No file is attached to this certificate.");
    return { downloadUrl: await this.blob.getDownloadUrl(organizationId, c.documentBlobName), fileName: c.documentFileName ?? null };
  }

  async removeDocument(caller: RequestUser, organizationId: string, certId: string): Promise<OrganizationCertificationSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const { row, previous } = await runner(caller, organizationId)(async (tx) => {
      const cur = await tx.organizationCertification.findFirst({ where: { id: certId, organizationId, archivedAt: null } });
      if (!cur) throw new NotFoundException("Certification not found");
      const updated = await tx.organizationCertification.update({ where: { id: certId }, data: { documentBlobName: null, documentFileName: null, documentSizeBytes: null, documentMimeType: null, documentUploadedAt: null } });
      await recordFieldChanges(tx, { organizationId, tableName: "organization_certifications", recordId: certId, changedById: caller.id, changes: [{ field: "document", oldValue: cur.documentFileName ?? null, newValue: null }], source: "API" });
      return { row: updated, previous: cur.documentBlobName as string | null };
    });
    if (previous) await this.blob.deleteBlob(organizationId, previous).catch(() => undefined);
    return toCert(row);
  }

  private async ownCert(caller: RequestUser, organizationId: string, certId: string) {
    const c = await runner(caller, organizationId)((tx) => tx.organizationCertification.findFirst({ where: { id: certId, organizationId, archivedAt: null } }));
    if (!c) throw new NotFoundException("Certification not found");
    return c;
  }
  /** Read-only card for any signed-in user. Details are read in a system context, so what leaves is decided here, not by row-level security. */
  async getCard(caller: RequestUser, organizationId: string): Promise<OrganizationCard> {
    const isStaff = caller.platformStaffRole !== "NONE";
    const isOwn = caller.organizationId === organizationId;
    return withPlatformStaffContext(async (tx: any) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, type: true } });
      if (!org) throw new NotFoundException("Organisation not found");
      const profile = await tx.supplierProfile.findUnique({ where: { organizationId } });
      const detailVisible = isOwn || isStaff || !!profile?.publishedAt;
      const canEdit = isStaff || (isOwn && (caller.permissions ?? []).includes("org.profile.manage"));
      const card: OrganizationCard = { id: org.id, name: org.name, type: org.type, detailVisible, canEdit, description: null, website: null, contactName: null, contactEmail: null, yearsInOperation: null, scope: [], certifications: [] };
      if (!detailVisible) return card;
      const [scope, certs] = await Promise.all([
        tx.organizationScope.findMany({ where: { organizationId, archivedAt: null }, orderBy: { scopeSubId: "asc" } }),
        tx.organizationCertification.findMany({ where: { organizationId, archivedAt: null }, orderBy: [{ expiresOn: "asc" }] }),
      ]);
      return {
        ...card,
        description: profile?.description ?? null,
        website: profile?.website ?? null,
        contactName: profile?.contactName ?? null,
        contactEmail: profile?.contactEmail ?? null,
        yearsInOperation: profile?.yearsInOperation ?? null,
        scope: scope.map((r: any) => r.scopeSubId),
        certifications: certs.map((c: any) => ({ type: c.type, title: c.title ?? null, issuingBody: c.issuingBody ?? null, expiresOn: c.expiresOn ? c.expiresOn.toISOString() : null, status: certificationStatus(c.expiresOn ?? null).status })),
      };
    });
  }

  async getScope(caller: RequestUser, organizationId: string): Promise<OrganizationScopeSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const rows = await runner(caller, organizationId)((tx) => tx.organizationScope.findMany({ where: { organizationId, archivedAt: null }, orderBy: { scopeSubId: "asc" } }));
    return { organizationId, declared: rows.map((r: any) => r.scopeSubId), demonstrated: await this.demonstrated(organizationId) };
  }

  /** Replaces the declared scope with the given set: new ids are added, removed ids archived, archived ids re-activated. */
  async setScope(caller: RequestUser, organizationId: string, ids: string[]): Promise<OrganizationScopeSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const wanted = Array.from(new Set(ids));
    const bad = wanted.filter((i) => !VALID_SCOPE_IDS.has(i));
    if (bad.length) throw new BadRequestException(`Unknown scope categories: ${bad.join(", ")}`);
    await runner(caller, organizationId)(async (tx) => {
      const existing = await tx.organizationScope.findMany({ where: { organizationId } });
      const before = existing.filter((r: any) => !r.archivedAt).map((r: any) => r.scopeSubId).sort();
      const now = new Date();
      for (const r of existing) {
        const want = wanted.includes(r.scopeSubId);
        if (want && r.archivedAt) await tx.organizationScope.update({ where: { id: r.id }, data: { archivedAt: null, archivedById: null } });
        if (!want && !r.archivedAt) await tx.organizationScope.update({ where: { id: r.id }, data: { archivedAt: now, archivedById: caller.id } });
      }
      const have = new Set(existing.map((r: any) => r.scopeSubId));
      for (const id of wanted) if (!have.has(id)) await tx.organizationScope.create({ data: { organizationId, scopeSubId: id } });
      const after = [...wanted].sort();
      if (before.join(",") !== after.join(",")) {
        await recordFieldChanges(tx, {
          organizationId,
          tableName: "organization_scope",
          recordId: organizationId,
          changedById: caller.id,
          changes: [{ field: "scopeOfSupply", oldValue: before.join(", ") || null, newValue: after.join(", ") || null }],
          source: "API",
        });
      }
    });
    return this.getScope(caller, organizationId);
  }

  async listCertifications(caller: RequestUser, organizationId: string): Promise<OrganizationCertificationSummary[]> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const rows = await runner(caller, organizationId)((tx) => tx.organizationCertification.findMany({ where: { organizationId, archivedAt: null }, orderBy: [{ expiresOn: "asc" }, { createdAt: "asc" }] }));
    return rows.map(toCert);
  }

  async addCertification(caller: RequestUser, organizationId: string, dto: SaveOrganizationCertificationDto): Promise<OrganizationCertificationSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    this.checkDates(dto);
    const row = await runner(caller, organizationId)(async (tx) => {
      const created = await tx.organizationCertification.create({ data: { organizationId, ...this.data(dto) } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "organization_certifications",
        recordId: created.id,
        changedById: caller.id,
        changes: [{ field: "created", oldValue: null, newValue: `${dto.type}${dto.reference ? " " + dto.reference : ""}` }],
        source: "API",
      });
      return created;
    });
    return toCert(row);
  }

  async updateCertification(caller: RequestUser, organizationId: string, id: string, dto: SaveOrganizationCertificationDto): Promise<OrganizationCertificationSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    this.checkDates(dto);
    const row = await runner(caller, organizationId)(async (tx) => {
      const existing = await tx.organizationCertification.findFirst({ where: { id, organizationId, archivedAt: null } });
      if (!existing) throw new NotFoundException("Certification not found");
      const data = this.data(dto);
      const changes = diffForAudit(existing, data, CERT_AUDIT_FIELDS);
      const updated = await tx.organizationCertification.update({ where: { id }, data });
      await recordFieldChanges(tx, { organizationId, tableName: "organization_certifications", recordId: id, changedById: caller.id, changes, source: "API" });
      return updated;
    });
    return toCert(row);
  }

  async archiveCertification(caller: RequestUser, organizationId: string, id: string): Promise<void> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    await runner(caller, organizationId)(async (tx) => {
      const res = await tx.organizationCertification.updateMany({ where: { id, organizationId, archivedAt: null }, data: { archivedAt: new Date(), archivedById: caller.id } });
      if (res.count === 0) throw new NotFoundException("Certification not found");
      await recordFieldChanges(tx, { organizationId, tableName: "organization_certifications", recordId: id, changedById: caller.id, changes: [{ field: "archived", oldValue: null, newValue: "true" }], source: "API" });
    });
  }

  private checkDates(dto: SaveOrganizationCertificationDto) {
    if (dto.issuedOn && dto.expiresOn && new Date(dto.expiresOn) < new Date(dto.issuedOn)) throw new BadRequestException("Expiry date is before the issue date.");
  }

  private data(dto: SaveOrganizationCertificationDto) {
    return {
      type: dto.type,
      title: dto.title?.trim() || null,
      reference: dto.reference?.trim() || null,
      issuingBody: dto.issuingBody?.trim() || null,
      issuedOn: dto.issuedOn ? new Date(dto.issuedOn) : null,
      expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : null,
      notes: dto.notes?.trim() || null,
    };
  }

  /**
   * What the organisation has actually done: catalogue categories of the products on tender lines it bid on (submitted, not no-bid)
   * and was awarded. Read in a system context because the tender lines belong to the issuing organisations; only category counts leave.
   */
  private async demonstrated(organizationId: string): Promise<{ scopeSubId: string; bids: number; awards: number }[]> {
    return withPlatformStaffContext(async (tx: any) => {
      const bidLines = await tx.tenderBidLine.findMany({ where: { organizationId, noBid: false }, select: { tenderLineId: true, bidId: true } });
      const bids = await tx.tenderBid.findMany({ where: { organizationId, status: { not: "DRAFT" } }, select: { id: true } });
      const submitted = new Set(bids.map((b: any) => b.id));
      const awardLines = await tx.tenderAwardLine.findMany({ where: { awardedOrganizationId: organizationId }, select: { tenderLineId: true } });
      const bidLineIds = Array.from(new Set(bidLines.filter((l: any) => submitted.has(l.bidId)).map((l: any) => l.tenderLineId)));
      const awardLineIds = Array.from(new Set(awardLines.map((l: any) => l.tenderLineId)));
      const lines = await tx.tenderLine.findMany({ where: { id: { in: [...bidLineIds, ...awardLineIds] as string[] }, productMasterId: { not: null } }, select: { id: true, productMasterId: true } });
      const productIds = Array.from(new Set(lines.map((l: any) => l.productMasterId)));
      const products = await tx.productMaster.findMany({ where: { id: { in: productIds as string[] } }, select: { id: true, category: true, hsCode: true, name: true, inn: true, brand: true, atcCode: true } });
      const subsByProduct = new Map<string, string[]>(products.map((p: any) => [p.id, scopeSubsForProduct(p)]));
      const subsByLine = new Map<string, string[]>(lines.map((l: any) => [l.id, subsByProduct.get(l.productMasterId) ?? []]));
      const tally = new Map<string, { bids: number; awards: number }>();
      const bump = (lineId: string, k: "bids" | "awards") => {
        for (const sub of subsByLine.get(lineId) ?? []) {
          const t = tally.get(sub) ?? { bids: 0, awards: 0 };
          t[k] += 1;
          tally.set(sub, t);
        }
      };
      bidLineIds.forEach((id) => bump(id as string, "bids"));
      awardLineIds.forEach((id) => bump(id as string, "awards"));
      return Array.from(tally, ([scopeSubId, t]) => ({ scopeSubId, ...t })).sort((a, b) => b.awards - a.awards || b.bids - a.bids);
    });
  }
}
