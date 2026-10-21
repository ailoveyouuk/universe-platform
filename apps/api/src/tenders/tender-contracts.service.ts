import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { BlobStorageService } from "../documents/blob-storage.service";
import { appendTenderEvent } from "./tender-events";
import { TendersService } from "./tenders.service";
import type { CloseContractDto, ConfirmContractFileDto, ContractMilestoneDto, ContractMilestoneUpdateDto, ContractSignatoryDto, RequestContractFileDto, UpdateContractDto } from "./dto/tenders.dto";

type Party = "ISSUER" | "SUPPLIER";
type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "zip", "png", "jpg", "jpeg", "txt"];
const num = (v: unknown) => (v == null ? null : Number(v));

/**
 * Tender contracts (step 5, 2026-10-21). One contract per award, shared by the issuer and the awarded supplier and visible to nobody else
 * (database policy plus the checks here). The issuer drafts it, sends it for signature after the standstill, and closes it; signing happens
 * outside the platform (Acrobat Sign, DocuSign or equivalent), so the Signature section holds the executed PDF, its certificate, who signed
 * and when. A contract becomes ACTIVE only when a signed copy is on file and both parties have recorded a signatory. Every step is written to
 * the tender's hash-chained timeline, so the thread from tender to award to contract is one audit trail. Once active, the supplier can create
 * its Project Management project from the contract.
 */
@Injectable()
export class TenderContractsService {
  constructor(private readonly tenders: TendersService, private readonly blob: BlobStorageService) {}

  // ------------------------------------------------------------------ helpers

  private async load(tx: Tx, user: RequestUser, contractId: string) {
    const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
    if (!c) throw new NotFoundException("Contract not found.");
    const party: Party | null = c.organizationId === user.organizationId ? "ISSUER" : c.awardedOrganizationId === user.organizationId ? "SUPPLIER" : null;
    if (!party) throw new NotFoundException("Contract not found.");
    return { c, party };
  }

  private need(user: RequestUser, party: Party) { assertHasPermission(user, party === "ISSUER" ? "tenders.award" : "tenders.bid"); }

  private async event(c: { organizationId: string; awardedOrganizationId: string; tenderId: string }, user: RequestUser, kind: string, summary: string, details?: unknown) {
    const issuer = c.organizationId === user.organizationId;
    await appendTenderEvent({ organizationId: c.organizationId, counterpartyOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind, summary: `${summary}${issuer ? "" : " (supplier)"}`, details });
  }

  private async tell(c: { id: string; tenderId: string; reference: string }, orgIds: string[], title: string, body: string, userId: string) {
    await this.tenders.notifyOrgs(orgIds, () => ({ title, body, link: `/bids/status?id=${c.tenderId}`, subjectId: c.tenderId }), "TENDER_AWARD", userId);
  }

  // ------------------------------------------------------------------ reading

  /** The contracts on a tender that the caller may see: the issuer sees every one, a supplier only its own. */
  async forTender(user: RequestUser, tenderId: string) {
    return withTenantContext(user.organizationId, async (tx) => {
      const tender = await tx.tender.findUnique({ where: { id: tenderId }, select: { id: true, organizationId: true, referenceNumber: true, title: true, standstillEndsAt: true, currency: true } });
      if (!tender) throw new NotFoundException("Tender not found.");
      const issuerSide = tender.organizationId === user.organizationId;
      const contracts = await tx.tenderContract.findMany({ where: { tenderId, ...(issuerSide ? {} : { awardedOrganizationId: user.organizationId }) }, orderBy: { createdAt: "asc" } });
      const awards = issuerSide ? await tx.tenderAward.findMany({ where: { tenderId } }) : [];
      const ids = contracts.map((c) => c.id);
      const [milestones, files, signatories] = await Promise.all([
        tx.tenderContractMilestone.findMany({ where: { contractId: { in: ids } }, orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }] }),
        tx.tenderContractFile.findMany({ where: { contractId: { in: ids } }, orderBy: { uploadedAt: "asc" } }),
        tx.tenderContractSignatory.findMany({ where: { contractId: { in: ids } }, orderBy: { recordedAt: "asc" } }),
      ]);
      const orgIds = [...new Set([tender.organizationId, ...contracts.map((c) => c.awardedOrganizationId), ...awards.map((a) => a.awardedOrganizationId)])];
      const names = new Map((await tx.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
      const complaints = issuerSide ? await tx.tenderComplaint.count({ where: { tenderId, status: "OPEN" } }) : 0;
      return {
        role: (issuerSide ? "ISSUER" : "SUPPLIER") as Party,
        standstillEndsAt: tender.standstillEndsAt, openComplaints: complaints,
        contracts: contracts.map((c) => {
          const f = files.filter((x) => x.contractId === c.id);
          const s = signatories.filter((x) => x.contractId === c.id);
          const missing = [
            ...(f.some((x) => x.kind === "SIGNED") ? [] : ["a signed copy of the contract"]),
            ...(s.some((x) => x.party === "ISSUER") ? [] : ["a signatory from the tender owner"]),
            ...(s.some((x) => x.party === "SUPPLIER") ? [] : ["a signatory from the supplier"]),
          ];
          return {
            id: c.id, awardId: c.awardId, reference: c.reference, title: c.title, status: c.status, currency: c.currency, totalValue: num(c.totalValue),
            startDate: c.startDate, endDate: c.endDate, terms: c.terms, sentAt: c.sentAt, executedAt: c.executedAt, closedAt: c.closedAt, closeNote: c.closeNote,
            supplierProjectId: c.supplierProjectId, issuerName: names.get(c.organizationId) ?? null, supplierName: names.get(c.awardedOrganizationId) ?? null, createdAt: c.createdAt,
            milestones: milestones.filter((m) => m.contractId === c.id).map((m) => ({ id: m.id, title: m.title, dueDate: m.dueDate, status: m.status, completedAt: m.completedAt, notes: m.notes })),
            files: f.map((x) => ({ id: x.id, kind: x.kind, version: x.version, title: x.title, fileName: x.fileName, fileSizeBytes: x.fileSizeBytes, uploadedBy: names.get(x.uploadedByOrganizationId) ?? null, uploadedAt: x.uploadedAt, note: x.note })),
            signatories: s.map((x) => ({ id: x.id, party: x.party, signerName: x.signerName, signerRole: x.signerRole, signedOn: x.signedOn, own: x.recordedByOrganizationId === user.organizationId })),
            signature: { status: c.status === "DRAFT" ? "NOT_STARTED" : missing.length === 0 ? "EXECUTED" : missing.length === 3 ? "AWAITING" : "PARTLY_SIGNED", missing },
          };
        }),
        // Awards that do not have a contract yet (issuer only).
        awardsWithoutContract: awards.filter((a) => !contracts.some((c) => c.awardId === a.id)).map((a) => ({ awardId: a.id, supplierName: names.get(a.awardedOrganizationId) ?? null })),
      };
    });
  }

  // ------------------------------------------------------------------ issuer lifecycle

  async create(user: RequestUser, tenderId: string, awardId: string) {
    assertHasPermission(user, "tenders.award");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      const award = await tx.tenderAward.findFirst({ where: { id: awardId, tenderId } });
      if (!award) throw new NotFoundException("Award not found.");
      if (await tx.tenderContract.findUnique({ where: { awardId } })) throw new ConflictException("This award already has a contract.");
      const [alines, blines, tlines] = await Promise.all([
        tx.tenderAwardLine.findMany({ where: { awardId } }),
        tx.tenderBidLine.findMany({ where: { bidId: award.bidId } }),
        tx.tenderLine.findMany({ where: { tenderId } }),
      ]);
      let total = 0;
      for (const al of alines) {
        const tl = tlines.find((x) => x.id === al.tenderLineId); const bl = blines.find((x) => x.tenderLineId === al.tenderLineId);
        if (tl?.quantity != null && bl?.unitPrice != null) total += Number(tl.quantity) * Number(bl.unitPrice) * (Number(al.sharePercent) / 100);
      }
      const n = (await tx.tenderContract.count({ where: { tenderId } })) + 1;
      const c = await tx.tenderContract.create({ data: {
        organizationId: user.organizationId, awardedOrganizationId: award.awardedOrganizationId, tenderId, awardId, reference: `CON-${t.referenceNumber}-${n}`,
        title: `Contract for ${t.title}`, currency: t.currency, totalValue: Math.round(total * 100) / 100, startDate: t.contractStartDate, createdById: user.id,
      } });
      return { t, c };
    });
    await this.event(out.c, user, "CONTRACT_CREATED", `Contract ${out.c.reference} drafted`, { contractId: out.c.id });
    return this.forTender(user, tenderId);
  }

  async update(user: RequestUser, contractId: string, dto: UpdateContractDto) {
    const c = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      if (party !== "ISSUER") throw new ForbiddenException("Only the tender owner edits the contract terms.");
      this.need(user, party);
      if (c.status !== "DRAFT") throw new ConflictException("The terms can only be changed while the contract is a draft. Record changes after signature as a variation file.");
      await tx.tenderContract.update({ where: { id: c.id }, data: { title: dto.title, totalValue: dto.totalValue, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined, terms: dto.terms } });
      return c;
    });
    await this.event(c, user, "CONTRACT_UPDATED", `Contract ${c.reference} terms updated`);
    return this.forTender(user, c.tenderId);
  }

  async addMilestone(user: RequestUser, contractId: string, dto: ContractMilestoneDto) {
    const c = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      if (party !== "ISSUER") throw new ForbiddenException("Only the tender owner adds milestones.");
      this.need(user, party);
      if (c.status === "COMPLETED" || c.status === "TERMINATED") throw new ConflictException("This contract is closed.");
      const count = await tx.tenderContractMilestone.count({ where: { contractId } });
      await tx.tenderContractMilestone.create({ data: { organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId, title: dto.title.trim(), dueDate: dto.dueDate ? new Date(dto.dueDate) : null, sortOrder: count } });
      return c;
    });
    await this.event(c, user, "MILESTONE_ADDED", `Milestone added: ${dto.title.trim()}`);
    return this.forTender(user, c.tenderId);
  }

  /** Either party may report progress on a milestone once the contract is active. */
  async updateMilestone(user: RequestUser, contractId: string, milestoneId: string, dto: ContractMilestoneUpdateDto) {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      this.need(user, party);
      if (c.status !== "ACTIVE") throw new ConflictException("Milestones can be updated while the contract is active.");
      const m = await tx.tenderContractMilestone.findFirst({ where: { id: milestoneId, contractId } });
      if (!m) throw new NotFoundException("Milestone not found.");
      await tx.tenderContractMilestone.update({ where: { id: m.id }, data: { status: dto.status, notes: dto.notes, completedAt: dto.status === "DONE" ? new Date() : dto.status ? null : undefined } });
      return { c, m };
    });
    if (dto.status && dto.status !== r.m.status) await this.event(r.c, user, "MILESTONE_UPDATED", `Milestone "${r.m.title}" marked ${dto.status.toLowerCase()}`, { milestoneId: r.m.id });
    return this.forTender(user, r.c.tenderId);
  }

  async send(user: RequestUser, contractId: string) {
    const c = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      if (party !== "ISSUER") throw new ForbiddenException("Only the tender owner sends the contract for signature.");
      this.need(user, party);
      if (c.status !== "DRAFT") throw new ConflictException("This contract has already been sent.");
      const t = await tx.tender.findUnique({ where: { id: c.tenderId } });
      if (t?.standstillEndsAt && t.standstillEndsAt.getTime() > Date.now()) throw new ConflictException("The standstill period has not ended. A contract cannot be sent for signature until it has.");
      if (await tx.tenderComplaint.count({ where: { tenderId: c.tenderId, status: "OPEN" } })) throw new ConflictException("There is an unanswered complaint on this tender. Answer it before sending the contract.");
      if (!c.startDate || c.totalValue == null) throw new BadRequestException("Set a start date and total value before sending the contract.");
      await tx.tenderContract.update({ where: { id: c.id }, data: { status: "AWAITING_SIGNATURE", sentAt: new Date() } });
      return c;
    });
    await this.event(c, user, "CONTRACT_SENT", `Contract ${c.reference} sent for signature`);
    await this.tell(c, [c.awardedOrganizationId], `Contract ready: ${c.reference}`, `The contract for your award is ready for signature.`, user.id);
    return this.forTender(user, c.tenderId);
  }

  async close(user: RequestUser, contractId: string, dto: CloseContractDto) {
    const c = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      if (party !== "ISSUER") throw new ForbiddenException("Only the tender owner closes the contract.");
      this.need(user, party);
      if (c.status !== "ACTIVE") throw new ConflictException("Only an active contract can be closed.");
      await tx.tenderContract.update({ where: { id: c.id }, data: { status: dto.outcome, closedAt: new Date(), closeNote: dto.note.trim() } });
      return c;
    });
    await this.event(c, user, "CONTRACT_CLOSED", `Contract ${c.reference} ${dto.outcome === "COMPLETED" ? "completed" : "terminated"}`, { note: dto.note.trim() });
    await this.tell(c, [c.awardedOrganizationId], `Contract ${dto.outcome === "COMPLETED" ? "completed" : "terminated"}: ${c.reference}`, dto.note.trim(), user.id);
    return this.forTender(user, c.tenderId);
  }

  // ------------------------------------------------------------------ signature section (either party)

  async requestFileUpload(user: RequestUser, contractId: string, dto: RequestContractFileDto) {
    await withTenantContext(user.organizationId, async (tx) => { const { c, party } = await this.load(tx, user, contractId); this.need(user, party); if (c.status === "COMPLETED" || c.status === "TERMINATED") throw new ConflictException("This contract is closed."); });
    const ext = dto.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(ext)) throw new BadRequestException(`Contract files can be ${ALLOWED.join(", ")}.`);
    if (dto.fileSizeBytes > 50 * 1024 * 1024) throw new BadRequestException("Contract files can be up to 50 MB.");
    return this.blob.getUploadUrl(user.organizationId, `tender-contracts/${contractId}/${randomUUID()}-${safeName(dto.fileName)}`, dto.contentType);
  }

  async confirmFile(user: RequestUser, contractId: string, dto: ConfirmContractFileDto) {
    if (!dto.blobName.startsWith(`tender-contracts/${contractId}/`)) throw new BadRequestException("That file does not belong to this contract.");
    const info = await this.blob.getBlobInfo(user.organizationId, dto.blobName);
    if (!info) throw new BadRequestException("The file was not found in storage. Please upload it again.");
    if (info.scanStatus === "INFECTED") { await this.blob.deleteBlob(user.organizationId, dto.blobName); throw new BadRequestException("That file was flagged by the malware scan and has been removed."); }
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      this.need(user, party);
      if (c.status === "COMPLETED" || c.status === "TERMINATED") throw new ConflictException("This contract is closed.");
      if ((dto.kind === "SIGNED" || dto.kind === "CERTIFICATE") && c.status === "DRAFT") throw new ConflictException("Send the contract for signature before uploading the signed copy.");
      if (dto.kind === "VARIATION" && c.status !== "ACTIVE") throw new ConflictException("Variations are recorded once the contract is active.");
      const last = await tx.tenderContractFile.findFirst({ where: { contractId, kind: dto.kind }, orderBy: { version: "desc" } });
      const f = await tx.tenderContractFile.create({ data: { organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId, kind: dto.kind, version: (last?.version ?? 0) + 1, title: dto.title.trim(), fileName: dto.fileName, blobName: dto.blobName, mimeType: dto.mimeType ?? info.contentType, fileSizeBytes: dto.fileSizeBytes ?? info.size, uploadedByOrganizationId: user.organizationId, uploadedById: user.id, note: dto.note?.trim() || null } });
      const executed = await this.maybeExecute(tx, c.id);
      return { c, f, executed };
    });
    await this.event(r.c, user, "CONTRACT_FILE_ADDED", `${dto.kind === "SIGNED" ? "Signed copy" : dto.kind === "DRAFT" ? "Draft contract" : dto.kind === "CERTIFICATE" ? "Signing certificate" : dto.kind === "VARIATION" ? "Variation" : "Document"} added (version ${r.f.version}): ${dto.title.trim()}`, { fileId: r.f.id });
    await this.afterExecution(r.c, r.executed, user);
    return this.forTender(user, r.c.tenderId);
  }

  async fileUrl(user: RequestUser, contractId: string, fileId: string) {
    const f = await withTenantContext(user.organizationId, async (tx) => {
      await this.load(tx, user, contractId);
      return tx.tenderContractFile.findFirst({ where: { id: fileId, contractId } });
    });
    if (!f) throw new NotFoundException("File not found.");
    return { downloadUrl: await this.blob.getDownloadUrl(f.uploadedByOrganizationId, f.blobName), fileName: f.fileName };
  }

  async recordSignatory(user: RequestUser, contractId: string, dto: ContractSignatoryDto) {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      this.need(user, party);
      if (c.status !== "AWAITING_SIGNATURE") throw new ConflictException("Signatories are recorded while the contract is awaiting signature.");
      await tx.tenderContractSignatory.create({ data: { organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId, party, signerName: dto.signerName.trim(), signerRole: dto.signerRole?.trim() || null, signedOn: new Date(dto.signedOn), recordedByOrganizationId: user.organizationId, recordedById: user.id } });
      return { c, party, executed: await this.maybeExecute(tx, c.id) };
    });
    await this.event(r.c, user, "CONTRACT_SIGNATORY_RECORDED", `${r.party === "ISSUER" ? "Tender owner" : "Supplier"} signatory recorded: ${dto.signerName.trim()}`);
    await this.afterExecution(r.c, r.executed, user);
    return this.forTender(user, r.c.tenderId);
  }

  async removeSignatory(user: RequestUser, contractId: string, signatoryId: string) {
    const c = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      this.need(user, party);
      if (c.status !== "AWAITING_SIGNATURE") throw new ConflictException("Signatories can only be removed before the contract is executed.");
      const s = await tx.tenderContractSignatory.findFirst({ where: { id: signatoryId, contractId, recordedByOrganizationId: user.organizationId } });
      if (!s) throw new NotFoundException("Signatory not found.");
      await tx.tenderContractSignatory.delete({ where: { id: s.id } });
      return c;
    });
    await this.event(c, user, "CONTRACT_SIGNATORY_REMOVED", "A recorded signatory was removed");
    return this.forTender(user, c.tenderId);
  }

  /** ACTIVE needs a signed copy and a signatory from each party. Returns true when this call made the contract active. */
  private async maybeExecute(tx: Tx, contractId: string): Promise<boolean> {
    const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
    if (!c || c.status !== "AWAITING_SIGNATURE") return false;
    const [signed, sig] = await Promise.all([tx.tenderContractFile.count({ where: { contractId, kind: "SIGNED" } }), tx.tenderContractSignatory.findMany({ where: { contractId }, select: { party: true } })]);
    if (!signed || !sig.some((s) => s.party === "ISSUER") || !sig.some((s) => s.party === "SUPPLIER")) return false;
    await tx.tenderContract.update({ where: { id: contractId }, data: { status: "ACTIVE", executedAt: new Date() } });
    return true;
  }

  private async afterExecution(c: { id: string; organizationId: string; awardedOrganizationId: string; tenderId: string; reference: string }, executed: boolean, user: RequestUser) {
    if (!executed) return;
    await this.event(c, user, "CONTRACT_EXECUTED", `Contract ${c.reference} executed and active`);
    await this.tell(c, [c.organizationId, c.awardedOrganizationId], `Contract active: ${c.reference}`, "A signed copy and both signatories are on file. The contract is now active.", user.id);
  }

  // ------------------------------------------------------------------ handover

  /** The supplier creates its own Project Management project from an active contract, with a line for each awarded tender line. */
  async createProject(user: RequestUser, contractId: string) {
    assertHasPermission(user, "tenders.bid");
    assertHasPermission(user, "projects.create");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const { c, party } = await this.load(tx, user, contractId);
      if (party !== "SUPPLIER") throw new ForbiddenException("The supplier creates the delivery project.");
      if (c.status !== "ACTIVE") throw new ConflictException("A project can be created once the contract is active.");
      if (c.supplierProjectId) throw new ConflictException("A project has already been created for this contract.");
      const [t, alines] = await Promise.all([tx.tender.findUnique({ where: { id: c.tenderId } }), tx.tenderAwardLine.findMany({ where: { awardId: c.awardId } })]);
      const tlines = await tx.tenderLine.findMany({ where: { id: { in: alines.map((a) => a.tenderLineId) } }, orderBy: { lineNumber: "asc" } });
      const pm = await tx.productMaster.findMany({ where: { id: { in: tlines.map((l) => l.productMasterId).filter((x): x is string => !!x) } }, select: { category: true } });
      const pharma = pm.some((p) => /pharma|medicine|drug/i.test(p.category));
      const project = await tx.project.create({ data: {
        organizationId: user.organizationId, referenceNumber: c.reference, title: c.title, category: "PROCUREMENT", projectType: pharma ? "PHARMACEUTICAL" : "NON_PHARMACEUTICAL",
        status: "AWARDED", startDate: c.startDate, dueDate: c.endDate, incoterm: t?.incoterm ?? undefined,
        ...(t?.deliveryCountryCodes ? { deliveryCountryCodes: t.deliveryCountryCodes, deliveryCountryCode: t.deliveryCountryCodes.split(",").filter(Boolean)[0] } : {}),
        projectNotes: `Created from tender contract ${c.reference} (tender ${t?.referenceNumber ?? ""}).`,
        lines: { create: tlines.map((l) => {
          const share = Number(alines.find((a) => a.tenderLineId === l.id)?.sharePercent ?? 100);
          return { organizationId: user.organizationId, clientProductDescription: l.description, productMasterId: l.productMasterId ?? undefined, quantity: l.quantity != null ? Math.round(Number(l.quantity) * share / 100) : undefined };
        }) },
      } });
      await tx.projectStatusHistory.create({ data: { organizationId: user.organizationId, projectId: project.id, status: "AWARDED", changedById: user.id } });
      await tx.tenderContract.update({ where: { id: c.id }, data: { supplierProjectId: project.id } });
      return { c, project };
    });
    await this.event(r.c, user, "PROJECT_CREATED", `Supplier created its delivery project from contract ${r.c.reference}`, { projectId: r.project.id });
    return { projectId: r.project.id };
  }
}
