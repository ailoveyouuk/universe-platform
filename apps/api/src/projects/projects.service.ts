import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, prisma, withTenantContext } from "@universe/db";
import type { ProjectDetail, ProjectDocumentSummary, ProjectLineSummary, ProjectStatusHistoryEntry, ProjectSummary, SupplierEnquirySummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";
import type { ProjectLineDto } from "./dto/project-line.dto";

function daysRemaining(dueDate: Date | null): number | null {
  if (!dueDate) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((dueDate.getTime() - Date.now()) / msPerDay);
}

function toSummary(p: {
  id: string;
  referenceNumber: string;
  title: string;
  status: string;
  category: string;
  projectType: string;
  dueDate: Date | null;
  completionStage: string | null;
  client: { name: string } | null;
}): ProjectSummary {
  return {
    id: p.id,
    referenceNumber: p.referenceNumber,
    title: p.title,
    status: p.status,
    category: p.category,
    projectType: p.projectType as ProjectSummary["projectType"],
    clientName: p.client?.name ?? null,
    dueDate: p.dueDate?.toISOString() ?? null,
    daysRemainingForSubmission: daysRemaining(p.dueDate),
    completionStage: p.completionStage,
  };
}

const PROJECT_DETAIL_INCLUDE = {
  client: true,
  lines: {
    include: {
      manufacturer: true,
      supplier: true,
      freightForwarder: true,
      // Supplier Enquiries (Phase 2, 2026-09-30) — RFQ tracking per line,
      // newest-contacted-first so an active enquiry in progress surfaces
      // above older, already-resolved ones. Prisma's back-relation field on
      // ProjectLine is named supplierEnquiries (see schema.prisma) — mapped
      // to the shorter `enquiries` in ProjectLineSummary below.
      supplierEnquiries: { include: { supplier: true }, orderBy: { createdAt: "desc" as const } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  // Oldest-first, matching ProjectStatusHistoryEntry's doc comment in
  // packages/types — the StageTracker walks this array forward to compute
  // both "latest" and "cumulative" time-in-stage. See
  // project-stage-navigation-plan.md / ProjectStatusHistory's doc comment.
  statusHistory: { include: { changedBy: true }, orderBy: { enteredAt: "asc" as const } },
  // Documents (Phase 2b, Blob Storage — added 2026-10-01). Newest-first —
  // same convention as supplierEnquiries above, a just-uploaded document is
  // what a user most likely wants to see at the top. Back-relation field on
  // Project is `documents` (see schema.prisma).
  documents: { include: { uploadedBy: true }, orderBy: { uploadedAt: "desc" as const } },
} as const;

type ProjectWithLines = Awaited<ReturnType<typeof prisma.project.findFirstOrThrow<{ include: typeof PROJECT_DETAIL_INCLUDE }>>>;
type LineWithPartners = ProjectWithLines["lines"][number];
type EnquiryWithSupplier = LineWithPartners["supplierEnquiries"][number];
type StatusHistoryWithUser = ProjectWithLines["statusHistory"][number];
type DocumentWithUploader = ProjectWithLines["documents"][number];

function decimalToString(d: unknown): string | null {
  return d === null || d === undefined ? null : String(d);
}

/** Remaining balance = amount due - amount paid, computed here rather than
 * stored — see supplierAmountPaid's doc comment in schema.prisma. Returns
 * null unless both the due and paid amounts are known (can't say anything
 * meaningful about "remaining" from just one side). */
function remainingBalance(due: unknown, paid: unknown): string | null {
  if (due === null || due === undefined || paid === null || paid === undefined) return null;
  const dueNum = Number(due);
  const paidNum = Number(paid);
  if (Number.isNaN(dueNum) || Number.isNaN(paidNum)) return null;
  return String(dueNum - paidNum);
}

/** OTIF (On-Time In-Full) — a formally named industry metric this field
 * pairing already implemented structurally, just unlabeled. See
 * procurement-lifecycle-benchmarking.md rec. #3. null unless all three
 * contributing flags are set — an unknown flag means OTIF can't be claimed
 * either way, not that it defaults to false. */
function computeOtif(internalOnTime: boolean | null, supplierOnTime: boolean | null, supplierInFull: boolean | null): boolean | null {
  if (internalOnTime === null || supplierOnTime === null || supplierInFull === null) return null;
  return internalOnTime && supplierOnTime && supplierInFull;
}

function toEnquirySummary(e: EnquiryWithSupplier): SupplierEnquirySummary {
  return {
    id: e.id,
    projectLineId: e.projectLineId,
    supplierId: e.supplierId,
    supplierName: e.supplier?.name ?? null,
    dateContacted: e.dateContacted?.toISOString() ?? null,
    responseStatus: e.responseStatus,
    quotedPrice: decimalToString(e.quotedPrice),
    quotedCurrency: e.quotedCurrency,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

function toLineSummary(l: LineWithPartners): ProjectLineSummary {
  return {
    id: l.id,
    projectId: l.projectId,
    clientProductDescription: l.clientProductDescription,
    quantity: l.quantity,
    productCategory: l.productCategory,
    countryOfManufactureCode: l.countryOfManufactureCode,
    incoterm: l.incoterm,
    freightMode: l.freightMode,
    manufacturerId: l.manufacturerId,
    manufacturerName: l.manufacturer?.name ?? null,
    supplierId: l.supplierId,
    supplierName: l.supplier?.name ?? null,
    clientPoNumber: l.clientPoNumber,
    clientPoReceiptDate: l.clientPoReceiptDate?.toISOString() ?? null,
    internalPoNumber: l.internalPoNumber,
    internalPoDatePlaced: l.internalPoDatePlaced?.toISOString() ?? null,
    gad: l.gad?.toISOString() ?? null,
    supplierGad: l.supplierGad?.toISOString() ?? null,
    freightForwarderId: l.freightForwarderId,
    freightForwarderName: l.freightForwarder?.name ?? null,
    freightCost: decimalToString(l.freightCost),
    freightCurrency: l.freightCurrency,
    insuredValue: decimalToString(l.insuredValue),
    insuredCurrency: l.insuredCurrency,
    warehouseReferenceNumber: l.warehouseReferenceNumber,
    goodsCollectedDate: l.goodsCollectedDate?.toISOString() ?? null,
    goodsManufacturedDate: l.goodsManufacturedDate?.toISOString() ?? null,
    goodsDeliveredToClientDate: l.goodsDeliveredToClientDate?.toISOString() ?? null,
    promisedDeliveryDate: l.promisedDeliveryDate?.toISOString() ?? null,
    actualDeliveryDate: l.actualDeliveryDate?.toISOString() ?? null,
    internalOnTime: l.internalOnTime,
    supplierOnTime: l.supplierOnTime,
    supplierInFull: l.supplierInFull,
    otif: computeOtif(l.internalOnTime, l.supplierOnTime, l.supplierInFull),
    supplierUnitPrice: decimalToString(l.supplierUnitPrice),
    supplierPaymentAmountTotal: decimalToString(l.supplierPaymentAmountTotal),
    supplierPaymentCurrency: l.supplierPaymentCurrency,
    supplierPaymentDate: l.supplierPaymentDate?.toISOString() ?? null,
    supplierDocumentsReceivedDate: l.supplierDocumentsReceivedDate?.toISOString() ?? null,
    supplierAmountPaid: decimalToString(l.supplierAmountPaid),
    supplierPaymentStatus: l.supplierPaymentStatus,
    supplierRemainingBalance: remainingBalance(l.supplierPaymentAmountTotal, l.supplierAmountPaid),
    unitSalesPrice: decimalToString(l.unitSalesPrice),
    clientPaymentAmount: decimalToString(l.clientPaymentAmount),
    clientPaymentCurrency: l.clientPaymentCurrency,
    clientPaymentDate: l.clientPaymentDate?.toISOString() ?? null,
    internalInvoiceNumber: l.internalInvoiceNumber,
    internalInvoiceDate: l.internalInvoiceDate?.toISOString() ?? null,
    grossMargin: decimalToString(l.grossMargin),
    margin: decimalToString(l.margin),
    strength: l.strength,
    form: l.form,
    packSize: l.packSize,
    batchNumber: l.batchNumber,
    expiryDate: l.expiryDate?.toISOString() ?? null,
    storageConditions: l.storageConditions,
    dataLoggerReference: l.dataLoggerReference,
    dataLoggerReportReviewed: l.dataLoggerReportReviewed,
    excursionReview: l.excursionReview,
    customerApproved: l.customerApproved,
    rpApproved: l.rpApproved,
    maPl: l.maPl,
    qualificationPathway: l.qualificationPathway,
    qualificationPathwayExpiryDate: l.qualificationPathwayExpiryDate?.toISOString() ?? null,
    enquiries: l.supplierEnquiries.map(toEnquirySummary),
  };
}

function toStatusHistoryEntry(h: StatusHistoryWithUser): ProjectStatusHistoryEntry {
  return {
    status: h.status,
    enteredAt: h.enteredAt.toISOString(),
    changedByName: h.changedBy ? `${h.changedBy.forename} ${h.changedBy.surname}` : null,
  };
}

function toDocumentSummary(d: DocumentWithUploader): ProjectDocumentSummary {
  return {
    id: d.id,
    projectId: d.projectId,
    type: d.type,
    title: d.title,
    fileName: d.fileName,
    fileSizeBytes: d.fileSizeBytes,
    mimeType: d.mimeType,
    uploadedByName: d.uploadedBy ? `${d.uploadedBy.forename} ${d.uploadedBy.surname}` : null,
    uploadedAt: d.uploadedAt.toISOString(),
  };
}

function toDetail(p: ProjectWithLines): ProjectDetail {
  return {
    ...toSummary(p),
    clientId: p.clientId,
    donorReference: p.donorReference,
    deliveryCountryCode: p.deliveryCountryCode,
    startDate: p.startDate?.toISOString() ?? null,
    submissionDate: p.submissionDate?.toISOString() ?? null,
    managementResponsibility: p.managementResponsibility,
    reasonForCancellation: p.reasonForCancellation,
    projectNotes: p.projectNotes,
    projectFolderUrl: p.projectFolderUrl,
    lines: p.lines.map(toLineSummary),
    statusHistory: p.statusHistory.map(toStatusHistoryEntry),
    documents: p.documents.map(toDocumentSummary),
  };
}

/** Converts a ProjectLineDto's plain-string date fields into Date objects
 * (or null/undefined pass-through) for Prisma, and leaves everything else
 * as-is. Shared by create and update so the two don't drift. */
function lineDataFromDto(dto: ProjectLineDto) {
  const dateFields = [
    "clientPoReceiptDate",
    "internalPoDatePlaced",
    "gad",
    "supplierGad",
    "goodsCollectedDate",
    "goodsManufacturedDate",
    "goodsDeliveredToClientDate",
    "promisedDeliveryDate",
    "actualDeliveryDate",
    "supplierPaymentDate",
    "supplierDocumentsReceivedDate",
    "clientPaymentDate",
    "internalInvoiceDate",
    "expiryDate",
    "qualificationPathwayExpiryDate",
  ] as const;

  const data: Record<string, unknown> = { ...dto };
  for (const field of dateFields) {
    const value = dto[field];
    if (value !== undefined) data[field] = value ? new Date(value) : null;
  }
  return data;
}

@Injectable()
export class ProjectsService {
  /** Every method here takes the requesting user and scopes to THEIR
   * organization only — see apps/api/src/common/tenant-scoped.ts. There is
   * no findAll() without a caller; that's intentional.
   *
   * Every Prisma call also runs inside withTenantContext(user.organizationId, ...)
   * — see packages/db/src/tenant-context.ts. Azure SQL Row-Level Security on
   * projects/project_lines default-denies any query that doesn't carry that
   * session context, so a bare `prisma.*` call here would either silently
   * return nothing (reads) or fail outright (writes) — confirmed for real
   * during the Phase 1 smoke test, 2026-09-30 (see backend-launch-checklist.md).
   * Matches the pattern already established in supplier-directory.service.ts. */

  async findAll(user: RequestUser): Promise<ProjectSummary[]> {
    const projects = await withTenantContext(user.organizationId, (tx) =>
      tx.project.findMany({
        where: tenantScope(user.organizationId),
        include: { client: true },
        orderBy: { updatedAt: "desc" },
      }),
    );
    return projects.map(toSummary);
  }

  async findOne(user: RequestUser, id: string): Promise<ProjectDetail> {
    const p = await withTenantContext(user.organizationId, (tx) =>
      tx.project.findFirst({
        where: { id, ...tenantScope(user.organizationId) },
        include: PROJECT_DETAIL_INCLUDE,
      }),
    );
    if (!p) throw new NotFoundException(`Project ${id} not found`);
    return toDetail(p);
  }

  async create(user: RequestUser, dto: CreateProjectDto): Promise<ProjectSummary> {
    const p = await withTenantContext(user.organizationId, async (tx) => {
      // If a clientId is supplied, verify it belongs to the caller's own
      // organization before attaching it — otherwise a crafted request could
      // link a project to another tenant's partner record. Client is now a
      // role (PartnerRoleType.CLIENT) on the shared Partner model rather than
      // its own Prisma model — see schema rework, 2026-09-24.
      if (dto.clientId) {
        const client = await tx.partner.findFirst({
          where: { id: dto.clientId, ...tenantScope(user.organizationId) },
        });
        if (!client) throw new NotFoundException(`Client ${dto.clientId} not found in your organization`);
      }

      // Project is now a header only; the fields the old flat model held for
      // "the item being procured" (product description/category/quantity)
      // live on ProjectLine instead. Creating a project still creates one
      // initial line alongside the header in a single call, matching the
      // existing single-page intake UX — see CreateProjectLineDto.
      const created = await tx.project.create({
        data: {
          organizationId: user.organizationId,
          referenceNumber: dto.referenceNumber,
          title: dto.title,
          category: dto.category,
          projectType: dto.projectType,
          clientId: dto.clientId,
          donorReference: dto.donorReference,
          deliveryCountryCode: dto.deliveryCountryCode,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          ...(dto.firstLine
            ? {
                lines: {
                  create: {
                    organizationId: user.organizationId,
                    clientProductDescription: dto.firstLine.clientProductDescription,
                    productCategory: dto.firstLine.productCategory,
                    quantity: dto.firstLine.quantity,
                  },
                },
              }
            : {}),
        },
        include: { client: true },
      });

      // A project is born IDENTIFIED (the schema default) — record that as
      // stage-entry #1 so the StageTracker has a real starting point rather
      // than a gap before the first status change. See
      // ProjectStatusHistory's doc comment in schema.prisma.
      await tx.projectStatusHistory.create({
        data: { organizationId: user.organizationId, projectId: created.id, status: created.status, changedById: user.id },
      });

      return created;
    });

    return toSummary(p);
  }

  /** Header-only update — see UpdateProjectDto. Line data goes through
   * addLine/updateLine below. */
  async update(user: RequestUser, id: string, dto: UpdateProjectDto): Promise<ProjectDetail> {
    const p = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) return null;

      if (dto.clientId) {
        const client = await tx.partner.findFirst({
          where: { id: dto.clientId, ...tenantScope(user.organizationId) },
        });
        if (!client) throw new NotFoundException(`Client ${dto.clientId} not found in your organization`);
      }

      const updated = await tx.project.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
          ...(dto.donorReference !== undefined ? { donorReference: dto.donorReference } : {}),
          ...(dto.deliveryCountryCode !== undefined ? { deliveryCountryCode: dto.deliveryCountryCode } : {}),
          ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
          ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
          ...(dto.submissionDate !== undefined
            ? { submissionDate: dto.submissionDate ? new Date(dto.submissionDate) : null }
            : {}),
          ...(dto.managementResponsibility !== undefined
            ? { managementResponsibility: dto.managementResponsibility }
            : {}),
          ...(dto.reasonForCancellation !== undefined ? { reasonForCancellation: dto.reasonForCancellation } : {}),
          ...(dto.projectNotes !== undefined ? { projectNotes: dto.projectNotes } : {}),
          ...(dto.completionStage !== undefined ? { completionStage: dto.completionStage } : {}),
        },
        include: PROJECT_DETAIL_INCLUDE,
      });

      // Record a new stage-entry row whenever the status actually changed —
      // see ProjectStatusHistory's doc comment in schema.prisma. Runs in the
      // same tenant transaction as the update above, matching the pattern
      // withTenantContext's own doc comment establishes (one connection,
      // one session context, for every write a request makes). Deliberately
      // compares against `existing.status` (the row read at the top of this
      // method, before the update), not `updated.status`, so this can never
      // double-fire from anything downstream of the update itself.
      if (dto.status !== undefined && dto.status !== existing.status) {
        await tx.projectStatusHistory.create({
          data: { organizationId: user.organizationId, projectId: id, status: dto.status, changedById: user.id },
        });
      }

      return updated;
    });
    if (!p) throw new NotFoundException(`Project ${id} not found`);
    return this.findOne(user, id);
  }

  /** Verifies a manufacturer/supplier/freight-forwarder id on a line DTO
   * belongs to the caller's own organization, same reasoning as clientId
   * above — never trust a Partner id from the request body without
   * checking tenant ownership first. Runs inside the same tenant tx as the
   * caller so it shares one Azure SQL connection/session context. */
  private async assertPartnersOwned(tx: Prisma.TransactionClient, user: RequestUser, dto: ProjectLineDto) {
    // Deduplicated deliberately: the same Partner commonly fills more than
    // one role on a line (e.g. a company that is both manufacturer and
    // supplier for a given product, exactly the case the Phase 1 smoke
    // test used, 2026-09-30). `tx.partner.count()` with a Prisma `in`
    // filter naturally matches distinct rows, so comparing its result
    // against a non-deduplicated ids.length undercounts and rejects a
    // perfectly valid line with a false "not found in your organization".
    const ids = [...new Set([dto.manufacturerId, dto.supplierId, dto.freightForwarderId].filter(
      (v): v is string => typeof v === "string",
    ))];
    if (!ids.length) return;
    const count = await tx.partner.count({ where: { id: { in: ids }, ...tenantScope(user.organizationId) } });
    if (count !== ids.length) throw new NotFoundException("One or more referenced partners were not found in your organization");
  }

  async addLine(user: RequestUser, projectId: string, dto: ProjectLineDto): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);
      await this.assertPartnersOwned(tx, user, dto);

      await tx.projectLine.create({
        data: { organizationId: user.organizationId, projectId, ...lineDataFromDto(dto) },
      });
    });
    return this.findOne(user, projectId);
  }

  async updateLine(user: RequestUser, projectId: string, lineId: string, dto: ProjectLineDto): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const line = await tx.projectLine.findFirst({
        where: { id: lineId, projectId, ...tenantScope(user.organizationId) },
      });
      if (!line) throw new NotFoundException(`Line ${lineId} not found on project ${projectId}`);
      await this.assertPartnersOwned(tx, user, dto);

      await tx.projectLine.update({ where: { id: lineId }, data: lineDataFromDto(dto) });
    });
    return this.findOne(user, projectId);
  }
}
