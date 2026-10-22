import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { BlobStorageService } from "../documents/blob-storage.service";
import type { AddEvidenceDto, RequestContractFileDto } from "./dto/tenders.dto";
import { appendTenderEvent } from "./tender-events";
import { TendersService } from "./tenders.service";

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];
const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "zip", "png", "jpg", "jpeg", "txt"];
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);

/** Pure rule: evidence must say something checkable, either a file or a reference number. */
export function evidenceProblems(e: { reference?: string | null; blobName?: string | null; sha256?: string | null; evidenceDate: Date; now: Date }): string[] {
  const out: string[] = [];
  if (!e.blobName && !e.reference?.trim()) out.push("Attach a file or give a reference number (for example the delivery note or invoice number).");
  if (e.blobName && !/^[a-f0-9]{64}$/.test(e.sha256 ?? "")) out.push("The file fingerprint is missing. Please upload the file again.");
  if (e.evidenceDate.getTime() > e.now.getTime() + 86_400_000) out.push("The evidence date cannot be in the future.");
  return out;
}

/**
 * Contract evidence (step 7 part 3, 2026-10-22, requested by Lewis): evidence is logged as a typed, dated record against a contract and, where it
 * applies, a milestone, payment, variation or call-off, rather than left as a loose file. Each record may carry a file; its SHA-256 fingerprint is
 * written to the tender's hash-chained timeline, so a file cannot later be swapped without the chain showing it. Records are append-only: they can
 * be acknowledged by the other party, or withdrawn by whoever logged them with a reason, but never edited or deleted. Both parties see all of it.
 */
@Injectable()
export class TenderEvidenceService {
  constructor(private readonly tenders: TendersService, private readonly blob: BlobStorageService) {}

  private async load(tx: Tx, user: RequestUser, contractId: string) {
    const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
    if (!c) throw new NotFoundException("Contract not found.");
    const party = c.organizationId === user.organizationId ? "ISSUER" : c.awardedOrganizationId === user.organizationId ? "SUPPLIER" : null;
    if (!party) throw new NotFoundException("Contract not found.");
    assertHasPermission(user, party === "ISSUER" ? "tenders.award" : "tenders.bid");
    return { c, party };
  }
  private async event(c: { organizationId: string; awardedOrganizationId: string; tenderId: string }, user: RequestUser, kind: string, summary: string, details?: unknown) {
    await appendTenderEvent({ organizationId: c.organizationId, counterpartyOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind, summary: `${summary}${c.organizationId === user.organizationId ? "" : " (supplier)"}`, details });
  }

  async requestUpload(user: RequestUser, contractId: string, dto: RequestContractFileDto) {
    await withTenantContext(user.organizationId, async (tx) => { await this.load(tx, user, contractId); });
    const ext = dto.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(ext)) throw new BadRequestException(`Evidence files can be ${ALLOWED.join(", ")}.`);
    if (dto.fileSizeBytes > 50 * 1024 * 1024) throw new BadRequestException("Evidence files can be up to 50 MB.");
    return this.blob.getUploadUrl(user.organizationId, `tender-evidence/${contractId}/${randomUUID()}-${safeName(dto.fileName)}`, dto.contentType);
  }

  async add(user: RequestUser, contractId: string, dto: AddEvidenceDto) {
    const evidenceDate = new Date(dto.evidenceDate);
    const problems = evidenceProblems({ reference: dto.reference, blobName: dto.blobName, sha256: dto.sha256, evidenceDate, now: new Date() });
    if (problems.length) throw new BadRequestException(problems.join(" "));
    if ((dto.linkType && !dto.linkId) || (!dto.linkType && dto.linkId)) throw new BadRequestException("Choose what the evidence relates to, or leave it as the contract as a whole.");
    let info: { size?: number; contentType?: string } | null = null;
    if (dto.blobName) {
      if (!dto.blobName.startsWith(`tender-evidence/${contractId}/`)) throw new BadRequestException("That file does not belong to this contract.");
      const b = await this.blob.getBlobInfo(user.organizationId, dto.blobName);
      if (!b) throw new BadRequestException("The file was not found in storage. Please upload it again.");
      if (b.scanStatus === "INFECTED") { await this.blob.deleteBlob(user.organizationId, dto.blobName); throw new BadRequestException("That file was flagged by the malware scan and has been removed."); }
      info = b;
    }
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const { c } = await this.load(tx, user, contractId);
      if (c.status === "DRAFT") throw new ConflictException("Evidence is logged once the contract has been sent for signature.");
      if (dto.linkType === "MILESTONE" && !(await tx.tenderContractMilestone.findFirst({ where: { id: dto.linkId!, contractId } }))) throw new BadRequestException("That milestone is not on this contract.");
      if (dto.linkType === "PAYMENT" && !(await tx.tenderContractPayment.findFirst({ where: { id: dto.linkId!, contractId } }))) throw new BadRequestException("That payment is not on this contract.");
      if (dto.linkType === "VARIATION" && !(await tx.tenderContractVariation.findFirst({ where: { id: dto.linkId!, contractId } }))) throw new BadRequestException("That variation is not on this contract.");
      if (dto.linkType === "CALL_OFF" && !(await tx.tenderCallOff.findFirst({ where: { id: dto.linkId!, contractId } }))) throw new BadRequestException("That call-off is not on this contract.");
      const e = await tx.tenderEvidence.create({ data: {
        organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId, kind: dto.kind, title: dto.title.trim(), description: dto.description?.trim() || null, reference: dto.reference?.trim() || null,
        evidenceDate, linkType: dto.linkType ?? null, linkId: dto.linkId ?? null, blobName: dto.blobName ?? null, fileName: dto.fileName ?? null, mimeType: dto.mimeType ?? info?.contentType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? info?.size ?? null, sha256: dto.sha256 ?? null, recordedByOrganizationId: user.organizationId, recordedById: user.id,
      } });
      return { c, e };
    });
    const other = r.c.organizationId === user.organizationId ? r.c.awardedOrganizationId : r.c.organizationId;
    await this.event(r.c, user, "EVIDENCE_ADDED", `Evidence logged on contract ${r.c.reference}: ${r.e.title}`, { evidenceId: r.e.id, kind: r.e.kind, reference: r.e.reference, fileName: r.e.fileName, sha256: r.e.sha256, linkType: r.e.linkType, linkId: r.e.linkId });
    await this.tenders.notifyOrgs([other], () => ({ title: `Evidence logged: ${r.c.reference}`, body: `${r.e.title} was added to the contract. Please review and acknowledge it.`, link: `/bids/status?id=${r.c.tenderId}`, subjectId: r.c.tenderId }), "TENDER_AWARD", user.id);
    return { tenderId: r.c.tenderId };
  }

  async acknowledge(user: RequestUser, evidenceId: string) {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const e0 = await tx.tenderEvidence.findUnique({ where: { id: evidenceId } });
      if (!e0) throw new NotFoundException("Evidence not found.");
      const { c } = await this.load(tx, user, e0.contractId);
      if (e0.recordedByOrganizationId === user.organizationId) throw new ForbiddenException("The other party acknowledges evidence you log.");
      if (e0.withdrawnAt) throw new ConflictException("This evidence has been withdrawn.");
      if (e0.acknowledgedAt) throw new ConflictException("This evidence has already been acknowledged.");
      const e = await tx.tenderEvidence.update({ where: { id: e0.id }, data: { acknowledgedAt: new Date(), acknowledgedById: user.id, acknowledgedByOrganizationId: user.organizationId } });
      return { c, e };
    });
    await this.event(r.c, user, "EVIDENCE_ACKNOWLEDGED", `Evidence acknowledged on contract ${r.c.reference}: ${r.e.title}`, { evidenceId: r.e.id });
    return { tenderId: r.c.tenderId };
  }

  async withdraw(user: RequestUser, evidenceId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("Give a reason for withdrawing this evidence.");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const e0 = await tx.tenderEvidence.findUnique({ where: { id: evidenceId } });
      if (!e0) throw new NotFoundException("Evidence not found.");
      const { c } = await this.load(tx, user, e0.contractId);
      if (e0.recordedByOrganizationId !== user.organizationId) throw new ForbiddenException("Only the party that logged the evidence can withdraw it.");
      if (e0.withdrawnAt) throw new ConflictException("This evidence has already been withdrawn.");
      const e = await tx.tenderEvidence.update({ where: { id: e0.id }, data: { withdrawnAt: new Date(), withdrawnReason: reason.trim() } });
      return { c, e };
    });
    await this.event(r.c, user, "EVIDENCE_WITHDRAWN", `Evidence withdrawn on contract ${r.c.reference}: ${r.e.title} (${reason.trim().slice(0, 200)})`, { evidenceId: r.e.id });
    return { tenderId: r.c.tenderId };
  }

  async fileUrl(user: RequestUser, evidenceId: string) {
    const e = await withTenantContext(user.organizationId, async (tx) => {
      const e = await tx.tenderEvidence.findUnique({ where: { id: evidenceId } });
      if (!e) throw new NotFoundException("Evidence not found.");
      await this.load(tx, user, e.contractId);
      return e;
    });
    if (!e.blobName) throw new NotFoundException("This evidence has no file.");
    return { downloadUrl: await this.blob.getDownloadUrl(e.recordedByOrganizationId, e.blobName), fileName: e.fileName ?? "evidence" };
  }

  /** Shaped for the contract card. */
  static shape(rows: { id: string; contractId: string; kind: string; title: string; description: string | null; reference: string | null; evidenceDate: Date; linkType: string | null; linkId: string | null; fileName: string | null; fileSizeBytes: number | null; sha256: string | null; recordedByOrganizationId: string; recordedAt: Date; acknowledgedByOrganizationId: string | null; acknowledgedAt: Date | null; withdrawnAt: Date | null; withdrawnReason: string | null }[], viewerOrgId: string, names: Map<string, string>, labels: Map<string, string>) {
    return rows.map((e) => ({
      id: e.id, contractId: e.contractId, kind: e.kind, title: e.title, description: e.description, reference: e.reference, evidenceDate: e.evidenceDate, linkType: e.linkType as "MILESTONE" | "PAYMENT" | "VARIATION" | "CALL_OFF" | null, linkId: e.linkId, linkLabel: e.linkId ? labels.get(e.linkId) ?? null : null,
      fileName: e.fileName, fileSizeBytes: e.fileSizeBytes, sha256: e.sha256, recordedBy: names.get(e.recordedByOrganizationId) ?? null, recordedByYou: e.recordedByOrganizationId === viewerOrgId, recordedAt: e.recordedAt,
      acknowledgedBy: e.acknowledgedByOrganizationId ? names.get(e.acknowledgedByOrganizationId) ?? null : null, acknowledgedAt: e.acknowledgedAt,
      canAcknowledge: !e.withdrawnAt && !e.acknowledgedAt && e.recordedByOrganizationId !== viewerOrgId, withdrawnAt: e.withdrawnAt, withdrawnReason: e.withdrawnReason, canWithdraw: !e.withdrawnAt && e.recordedByOrganizationId === viewerOrgId,
    }));
  }
}
