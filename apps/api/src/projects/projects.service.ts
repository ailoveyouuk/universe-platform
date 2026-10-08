import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, prisma, withTenantContext, computeLogisticsMetric, type TransportMode } from "@universe/db";
import type { ProjectContactSummary, ProjectDetail, ProjectDocumentSummary, ProjectFinancialSummary, ProjectLeadSummary, ProjectLineSummary, ProjectStatusHistoryEntry, ProjectSummary, SupplierEnquirySummary, LogisticsMetricSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
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
  isArchived: boolean;
  archivedAt: Date | null;
  archivedById: string | null;
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
    isArchived: p.isArchived,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    archivedById: p.archivedById,
  };
}

const PROJECT_DETAIL_INCLUDE = {
  client: true,
  // Added 2026-10-03, alongside freight moving from ProjectLine to
  // Project — see Project's "Freight & Logistics" block.
  freightForwarder: true,
  lines: {
    include: {
      manufacturer: true,
      supplier: true,
      // Shared product catalog match (added 2026-10-02) — see
      // ProjectLine.productMasterId's doc comment in schema.prisma and
      // claude/product-catalog-build.md. Select only what toLineSummary
      // needs for display; the picker fetches full detail itself via
      // GET /product-catalog/:id when a line is being edited.
      productMaster: { select: { id: true, name: true } },
      // Supplier Enquiries (Phase 2, 2026-09-30) — RFQ tracking per line,
      // newest-contacted-first so an active enquiry in progress surfaces
      // above older, already-resolved ones. Prisma's back-relation field on
      // ProjectLine is named supplierEnquiries (see schema.prisma) — mapped
      // to the shorter `enquiries` in ProjectLineSummary below.
      supplierEnquiries: { include: { supplier: true }, orderBy: { createdAt: "desc" as const } },
      // Supply-chain CO2/distance/efficiency metric (added 2026-10-08) —
      // see ProjectLineLogisticsMetric in schema.prisma.
      logisticsMetric: true,
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
  // Project Leads/Contacts (added 2026-10-08) — previously settable only
  // via the full create/update payload (never actually wired up), now
  // independently addable/removable via POST/DELETE /projects/:id/leads
  // and /projects/:id/contacts. Plain join tables, no natural ordering of
  // their own — ordered by the joined record's name for a stable,
  // readable list.
  leads: { include: { user: true }, orderBy: { user: { forename: "asc" as const } } },
  contacts: { include: { contact: { include: { partner: true } } }, orderBy: { contact: { name: "asc" as const } } },
} as const;

type ProjectWithLines = Awaited<ReturnType<typeof prisma.project.findFirstOrThrow<{ include: typeof PROJECT_DETAIL_INCLUDE }>>>;
type LineWithPartners = ProjectWithLines["lines"][number];
type EnquiryWithSupplier = LineWithPartners["supplierEnquiries"][number];
type LineLogisticsMetric = NonNullable<LineWithPartners["logisticsMetric"]>;
type StatusHistoryWithUser = ProjectWithLines["statusHistory"][number];
type DocumentWithUploader = ProjectWithLines["documents"][number];
type LeadWithUser = ProjectWithLines["leads"][number];
type ContactLinkWithContact = ProjectWithLines["contacts"][number];

function decimalToString(d: unknown): string | null {
  return d === null || d === undefined ? null : String(d);
}

function decimalToNumber(d: unknown): number | null {
  return d === null || d === undefined ? null : Number(d);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

function toLogisticsMetricSummary(m: LineLogisticsMetric): LogisticsMetricSummary {
  return {
    manufactureCountryCode: m.manufactureCountryCode,
    destinationCountryCode: m.destinationCountryCode,
    transportMode: m.transportMode,
    incoterm: m.incoterm,
    commodityGroup: m.commodityGroup,
    weightKgUsed: decimalToString(m.weightKgUsed) ?? "0",
    weightEstimated: m.weightEstimated,
    distanceKm: decimalToString(m.distanceKm) ?? "0",
    co2FactorKgPerTonneKm: decimalToString(m.co2FactorKgPerTonneKm) ?? "0",
    co2TotalKg: decimalToString(m.co2TotalKg) ?? "0",
    durationDays: m.durationDays,
    efficiencyScore: m.efficiencyScore,
    scoreBand: m.scoreBand,
    methodologyVersion: m.methodologyVersion,
    calculatedAt: m.calculatedAt.toISOString(),
  };
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
    productMasterId: l.productMasterId,
    productMasterName: l.productMaster?.name ?? null,
    quantity: l.quantity,
    productCategory: l.productCategory,
    weightKg: decimalToString(l.weightKg),
    countryOfManufactureCode: l.countryOfManufactureCode,
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
    warehouseReferenceNumber: l.warehouseReferenceNumber,
    goodsCollectedDate: l.goodsCollectedDate?.toISOString() ?? null,
    goodsManufacturedDate: l.goodsManufacturedDate?.toISOString() ?? null,
    goodsDeliveredToClientDate: l.goodsDeliveredToClientDate?.toISOString() ?? null,
    projectedDeliveryDate: l.projectedDeliveryDate?.toISOString() ?? null,
    actualDeliveryDate: l.actualDeliveryDate?.toISOString() ?? null,
    quantityReceived: l.quantityReceived,
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
    productMarginPercent: decimalToString(l.productMarginPercent),
    productMarginAmount: decimalToString(l.productMarginAmount),
    reportingCurrencyCode: l.reportingCurrencyCode,
    supplierPriceLockedAt: l.supplierPriceLockedAt?.toISOString() ?? null,
    supplierUnitPriceReportingCcy: decimalToString(l.supplierUnitPriceReportingCcy),
    supplierTotalPriceReportingCcy: decimalToString(l.supplierTotalPriceReportingCcy),
    salesPriceLockedAt: l.salesPriceLockedAt?.toISOString() ?? null,
    salesUnitPriceReportingCcy: decimalToString(l.salesUnitPriceReportingCcy),
    salesTotalPriceReportingCcy: decimalToString(l.salesTotalPriceReportingCcy),
    strength: l.strength,
    form: l.form,
    packSize: l.packSize,
    batchNumber: l.batchNumber,
    productBatchId: l.productBatchId,
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
    logisticsMetric: l.logisticsMetric ? toLogisticsMetricSummary(l.logisticsMetric) : null,
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

function toLeadSummary(l: LeadWithUser): ProjectLeadSummary {
  return {
    userId: l.userId,
    userName: `${l.user.forename} ${l.user.surname}`,
  };
}

function toContactSummary(c: ContactLinkWithContact): ProjectContactSummary {
  return {
    contactId: c.contactId,
    contactName: c.contact.name,
    partnerName: c.contact.partner?.name ?? null,
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
    // --- Freight & Logistics (moved here from ProjectLine 2026-10-03) ---
    incoterm: p.incoterm,
    freightMode: p.freightMode,
    freightForwarderId: p.freightForwarderId,
    freightForwarderName: p.freightForwarder?.name ?? null,
    freightCost: decimalToString(p.freightCost),
    freightCurrency: p.freightCurrency,
    insuredValue: decimalToString(p.insuredValue),
    insuredCurrency: p.insuredCurrency,
    freightInsuranceCost: decimalToString(p.freightInsuranceCost),
    freightAdditionalCost: decimalToString(p.freightAdditionalCost),
    freightAdditionalCostDescription: p.freightAdditionalCostDescription,
    freightTotalCost: decimalToString(p.freightTotalCost),
    freightMarginPercent: decimalToString(p.freightMarginPercent),
    freightMarginAmount: decimalToString(p.freightMarginAmount),
    freightPriceLockedAt: p.freightPriceLockedAt?.toISOString() ?? null,
    reportingCurrencyCode: p.reportingCurrencyCode,
    freightTotalCostReportingCcy: decimalToString(p.freightTotalCostReportingCcy),
    freightInvoiceAmountReportingCcy: decimalToString(p.freightInvoiceAmountReportingCcy),
    lines: p.lines.map(toLineSummary),
    statusHistory: p.statusHistory.map(toStatusHistoryEntry),
    documents: p.documents.map(toDocumentSummary),
    leads: p.leads.map(toLeadSummary),
    contacts: p.contacts.map(toContactSummary),
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
    "actualDeliveryDate",
    "projectedDeliveryDate",
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

  constructor(private readonly exchangeRates: ExchangeRatesService) {}

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

  /** Org-wide rollup — see ProjectFinancialSummary's doc comment in
   * packages/types. Sums every line's LOCKED product invoice total plus
   * every PROJECT's own single, separate LOCKED freight invoice total
   * (freight moved from per-line to per-project 2026-10-03 — see
   * Project's "Freight & Logistics" doc comment in schema.prisma; it's
   * no longer part of any one line's clientPaymentAmount, so it has to
   * be summed from projects, not lines). `currency`, if given,
   * re-expresses the rollup in that currency LIVE (today's rate, not
   * locked) via summarize()/convertFromBase() — the mechanism behind the
   * dashboard's currency selector. */
  async getFinancialSummary(user: RequestUser, currency?: string): Promise<ProjectFinancialSummary> {
    const [lines, projects] = await withTenantContext(user.organizationId, (tx) =>
      Promise.all([
        tx.projectLine.findMany({
          where: tenantScope(user.organizationId),
          select: { supplierTotalPriceReportingCcy: true, salesTotalPriceReportingCcy: true },
        }),
        tx.project.findMany({
          where: tenantScope(user.organizationId),
          select: { freightTotalCostReportingCcy: true, freightInvoiceAmountReportingCcy: true },
        }),
      ]),
    );
    return this.summarize(lines, projects, currency);
  }

  /** Same rollup as getFinancialSummary, scoped to one project — its own
   * lines' product totals plus its OWN single freight record (not summed
   * from lines any more). */
  async getProjectFinancialSummary(user: RequestUser, projectId: string, currency?: string): Promise<ProjectFinancialSummary> {
    const project = await withTenantContext(user.organizationId, (tx) =>
      tx.project.findFirst({
        where: { id: projectId, ...tenantScope(user.organizationId) },
        select: { freightTotalCostReportingCcy: true, freightInvoiceAmountReportingCcy: true },
      }),
    );
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const lines = await withTenantContext(user.organizationId, (tx) =>
      tx.projectLine.findMany({
        where: { projectId, ...tenantScope(user.organizationId) },
        select: { supplierTotalPriceReportingCcy: true, salesTotalPriceReportingCcy: true },
      }),
    );
    return this.summarize(lines, [project], currency);
  }

  /** Shared rollup logic for both financial-summary endpoints above.
   * Sums each line's already-LOCKED product cost/invoice figures (pure
   * addition, no FX call needed for that part — each was individually
   * locked to its own entry date's rate, see ExchangeRatesService) plus
   * each project's own already-LOCKED freight cost/invoice figures, then,
   * if the caller asked for a different display currency, converts the
   * four aggregate totals LIVE (today's rate) via convertFromBase().
   * Falls back to the base currency (flagging conversionUnavailable) if
   * that live conversion can't be done — never silently shows a wrong
   * number. A line with no price yet is counted in totalLines but not
   * linesWithPricing or any total; same for a project with no freight
   * entered yet. */
  private async summarize(
    lines: { supplierTotalPriceReportingCcy: unknown; salesTotalPriceReportingCcy: unknown }[],
    projects: { freightTotalCostReportingCcy: unknown; freightInvoiceAmountReportingCcy: unknown }[],
    currency?: string,
  ): Promise<ProjectFinancialSummary> {
    const base = ExchangeRatesService.DEFAULT_BASE_CURRENCY;
    const display = (currency || base).toUpperCase();

    let totalProductCost = 0;
    let totalFreightCost = 0;
    let totalInvoiceValue = 0;
    let linesWithPricing = 0;
    for (const l of lines) {
      const cost = decimalToNumber(l.supplierTotalPriceReportingCcy);
      const invoice = decimalToNumber(l.salesTotalPriceReportingCcy);
      if (cost !== null) totalProductCost += cost;
      if (invoice !== null) totalInvoiceValue += invoice;
      if (cost !== null || invoice !== null) linesWithPricing += 1;
    }
    for (const p of projects) {
      const freight = decimalToNumber(p.freightTotalCostReportingCcy);
      const freightInvoice = decimalToNumber(p.freightInvoiceAmountReportingCcy);
      if (freight !== null) totalFreightCost += freight;
      if (freightInvoice !== null) totalInvoiceValue += freightInvoice;
    }
    const totalMargin = totalInvoiceValue - (totalProductCost + totalFreightCost);

    let conversionUnavailable = false;
    let [outProductCost, outFreightCost, outMargin, outInvoice] = [totalProductCost, totalFreightCost, totalMargin, totalInvoiceValue];

    if (display !== base) {
      const now = new Date();
      const [p, f, m, i] = await Promise.all([
        this.exchangeRates.convertFromBase(totalProductCost, display, now),
        this.exchangeRates.convertFromBase(totalFreightCost, display, now),
        this.exchangeRates.convertFromBase(totalMargin, display, now),
        this.exchangeRates.convertFromBase(totalInvoiceValue, display, now),
      ]);
      if (p === null || f === null || m === null || i === null) {
        conversionUnavailable = true;
      } else {
        [outProductCost, outFreightCost, outMargin, outInvoice] = [p, f, m, i];
      }
    }

    return {
      baseCurrencyCode: base,
      displayCurrencyCode: conversionUnavailable ? base : display,
      conversionUnavailable,
      totalProductCost: String(round2(outProductCost)),
      totalFreightCost: String(round2(outFreightCost)),
      totalMargin: String(round2(outMargin)),
      totalInvoiceValue: String(round2(outInvoice)),
      linesWithPricing,
      totalLines: lines.length,
    };
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
        if (!client) throw new NotFoundException(`Client ${dto.clientId} not found in your organisation`);
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
        if (!client) throw new NotFoundException(`Client ${dto.clientId} not found in your organisation`);
      }
      if (dto.freightForwarderId) {
        const forwarder = await tx.partner.findFirst({
          where: { id: dto.freightForwarderId, ...tenantScope(user.organizationId) },
        });
        if (!forwarder) throw new NotFoundException(`Freight forwarder ${dto.freightForwarderId} not found in your organisation`);
      }

      const freightData: Record<string, unknown> = {};
      await this.applyProjectFreightPricing(freightData, dto, existing);

      // Gap 1 — generic field-level audit trail. Diffed against the DTO's
      // own fields BEFORE the update call below, same "before" snapshot
      // (`existing`) ProjectStatusHistory already reads for its own
      // status-only check a few lines down. freightCost/freightCurrency/
      // etc. are deliberately excluded here — applyProjectFreightPricing
      // above already computes freightTotalCost/freightTotalCostReportingCcy
      // from them, and auditing the COMPUTED figures after the update
      // (see below) is more useful than auditing the raw inputs twice.
      const auditedFields = [
        "title",
        "status",
        "clientId",
        "donorReference",
        "deliveryCountryCode",
        "startDate",
        "dueDate",
        "submissionDate",
        "managementResponsibility",
        "reasonForCancellation",
        "projectNotes",
        "completionStage",
        "incoterm",
        "freightMode",
        "freightForwarderId",
        "freightAdditionalCostDescription",
      ] as const;
      const changes = diffForAudit(existing, dto, auditedFields);

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
          ...(dto.incoterm !== undefined ? { incoterm: dto.incoterm } : {}),
          ...(dto.freightMode !== undefined ? { freightMode: dto.freightMode } : {}),
          ...(dto.freightForwarderId !== undefined ? { freightForwarderId: dto.freightForwarderId } : {}),
          ...(dto.freightAdditionalCostDescription !== undefined
            ? { freightAdditionalCostDescription: dto.freightAdditionalCostDescription }
            : {}),
          ...freightData,
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

      // Also audit the COMPUTED freight figures (not the raw cost inputs
      // excluded from `changes` above) — these are the numbers that
      // actually feed ProjectFinancialSummary, so they're what a review
      // of "what changed about this project's freight charge" should show.
      const freightComputedChanges = diffForAudit(existing, updated, [
        "freightTotalCost",
        "freightTotalCostReportingCcy",
        "freightMarginPercent",
        "freightMarginAmount",
        "freightInvoiceAmountReportingCcy",
      ] as const);

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "projects",
        recordId: id,
        changedById: user.id,
        changes: [...changes, ...freightComputedChanges],
        source: "API",
      });

      return updated;
    });
    if (!p) throw new NotFoundException(`Project ${id} not found`);
    return this.findOne(user, id);
  }

  /**
   * Soft-delete/retirement — see Project.isArchived's doc comment in
   * schema.prisma. This platform never hard-deletes a compliance-relevant
   * record (GDP/21 CFR Part 11 audit-trail posture — see
   * claude/compliance-standards-gap-analysis.md); archiving a project just
   * retires it from the default list view while keeping every line, status
   * history entry, document and FieldChangeLog row intact and still
   * reachable at GET /projects/:id. Idempotent — archiving an already-
   * archived project is a no-op write (still logged, see Gap 1 below, but
   * never throws).
   */
  async archive(user: RequestUser, id: string): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Project ${id} not found`);

      const archivedAt = existing.isArchived ? existing.archivedAt : new Date();
      const archivedById = existing.isArchived ? existing.archivedById : user.id;

      const after = { isArchived: true, archivedAt, archivedById };
      const changes = diffForAudit(existing, after, ["isArchived", "archivedAt", "archivedById"] as const);

      await tx.project.update({ where: { id }, data: after });

      // Gap 1 — generic field-level audit trail, same recordFieldChanges
      // pattern as update() above.
      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "projects",
        recordId: id,
        changedById: user.id,
        changes,
        source: "API",
      });
    });
    return this.findOne(user, id);
  }

  /** Reverses archive() above — restores the project to the default list
   * view. Idempotent, same reasoning as archive(). */
  async unarchive(user: RequestUser, id: string): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Project ${id} not found`);

      const after = { isArchived: false, archivedAt: null, archivedById: null };
      const changes = diffForAudit(existing, after, ["isArchived", "archivedAt", "archivedById"] as const);

      await tx.project.update({ where: { id }, data: after });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "projects",
        recordId: id,
        changedById: user.id,
        changes,
        source: "API",
      });
    });
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
    // freightForwarderId removed 2026-10-03 — it's on UpdateProjectDto now
    // (project-level), checked separately in update() below.
    const ids = [...new Set([dto.manufacturerId, dto.supplierId].filter(
      (v): v is string => typeof v === "string",
    ))];
    if (!ids.length) return;
    const count = await tx.partner.count({ where: { id: { in: ids }, ...tenantScope(user.organizationId) } });
    if (count !== ids.length) throw new NotFoundException("One or more referenced partners were not found in your organisation");
  }

  /**
   * Computes supplierPaymentAmountTotal/clientPaymentAmount (unit price x
   * quantity, in the price's own native currency) and their locked
   * reporting-currency equivalents, mutating `data` in place. See
   * ExchangeRatesService's doc comment and ProjectLine's "Currency
   * conversion" block in schema.prisma.
   *
   * Lewis's direction: the total is now an arithmetic FACT (unit x qty),
   * not a manually-typed figure — unlike grossMargin/margin, which stay a
   * business judgment call and so stay override-able — so this always
   * overwrites supplierPaymentAmountTotal/clientPaymentAmount, ignoring
   * whatever the DTO sent for either (both are still accepted on the DTO
   * for backward compatibility with existing callers; the service is the
   * single source of truth for the total from here on).
   *
   * `existing` is the line's current DB row (null for a brand-new line);
   * merging against it is what lets a partial PATCH that only changes,
   * say, clientPoNumber leave pricing/conversion untouched, while a PATCH
   * that changes supplierUnitPrice (even alone, without re-sending
   * quantity) still recomputes correctly against the quantity already on
   * the row. Conversion is only (re-)fetched when a dto field that could
   * actually move the native-currency amount or its currency was part of
   * THIS request — so touching unrelated fields never re-locks the rate to
   * a new date for no reason.
   */
  /**
   * Builds the full margin-based client invoice per line — see
   * ProjectLine's "Margin-based client invoice build" doc comment in
   * schema.prisma. Three stages, each mutating `data` in place:
   *
   * 1. Product/supplier side: supplierPaymentAmountTotal (unit x qty, in
   *    supplierPaymentCurrency) + its locked base-currency equivalent
   *    (unchanged from the previous round) + productMarginAmount
   *    (supplierPaymentAmountTotal x productMarginPercent / 100, native —
   *    new this round).
   * 2. Freight side (new this round): freightTotalCost (freightCost +
   *    freightInsuranceCost + freightAdditionalCost, all in
   *    freightCurrency, NOT multiplied by quantity — freight is a
   *    per-line cost, not a per-unit one) + its own locked base-currency
   *    equivalent (freight can be, and often is, priced in a different
   *    currency than the product) + freightMarginAmount.
   * 3. Client invoice: combines both sides' base-currency, WITH-margin
   *    figures (a % markup is proportional, so "convert then apply %" and
   *    "apply % then convert" give the same number — no separate
   *    with-margin base-currency column needed, just the arithmetic
   *    below), then converts that combined base-currency total into
   *    clientPaymentCurrency — this is clientPaymentAmount, no longer
   *    free-text manual entry. unitSalesPrice = clientPaymentAmount /
   *    quantity, a derived display convenience.
   *
   * Currency-agnostic throughout (see ExchangeRatesService's doc comment)
   * — nothing here assumes any particular organisation's home currency.
   */
  private async applyPricing(
    data: Record<string, unknown>,
    dto: ProjectLineDto,
    existing: {
      quantity: number | null;
      supplierUnitPrice: unknown;
      supplierPaymentAmountTotal: unknown;
      supplierPaymentCurrency: string | null;
      supplierTotalPriceReportingCcy: unknown;
      productMarginPercent: unknown;
      clientPaymentCurrency: string | null;
    } | null,
  ) {
    const quantity = dto.quantity !== undefined ? dto.quantity : existing?.quantity ?? null;
    const now = new Date();

    // --- Product/supplier side ---
    const supplierUnitPrice = dto.supplierUnitPrice !== undefined ? dto.supplierUnitPrice : decimalToNumber(existing?.supplierUnitPrice);
    const supplierCurrency = dto.supplierPaymentCurrency !== undefined ? dto.supplierPaymentCurrency : existing?.supplierPaymentCurrency ?? null;
    const supplierTouched = dto.supplierUnitPrice !== undefined || dto.quantity !== undefined || dto.supplierPaymentCurrency !== undefined;

    let supplierTotalNative: number | null = null;
    let supplierTotalBase: number | null = null;

    if (supplierUnitPrice !== null && quantity !== null) {
      supplierTotalNative = round2(supplierUnitPrice * quantity);
      data.supplierPaymentAmountTotal = supplierTotalNative;
      if (supplierTouched && supplierCurrency) {
        const conv = await this.exchangeRates.convertToBaseCcy(supplierUnitPrice, supplierTotalNative, supplierCurrency, now);
        data.reportingCurrencyCode = conv.baseCurrencyCode;
        data.supplierPriceLockedAt = conv.lockedAt;
        data.supplierExchangeRateSnapshotId = conv.exchangeRateSnapshotId;
        data.supplierUnitPriceReportingCcy = conv.unitInBase;
        data.supplierTotalPriceReportingCcy = conv.totalInBase;
        supplierTotalBase = conv.totalInBase;
      } else {
        // This request didn't touch price/qty/currency — reuse the
        // existing locked base-currency figure for the margin/invoice
        // math below rather than recomputing (e.g. a request that only
        // changes productMarginPercent still needs the product's
        // already-locked base-currency total).
        supplierTotalBase = decimalToNumber(existing?.supplierTotalPriceReportingCcy);
      }
    } else {
      data.supplierPaymentAmountTotal = null;
      if (supplierTouched) {
        data.supplierPriceLockedAt = null;
        data.supplierExchangeRateSnapshotId = null;
        data.supplierUnitPriceReportingCcy = null;
        data.supplierTotalPriceReportingCcy = null;
      }
    }

    const productMarginPercent = dto.productMarginPercent !== undefined ? dto.productMarginPercent : decimalToNumber(existing?.productMarginPercent);
    data.productMarginPercent = productMarginPercent;
    const productMarginAmount = supplierTotalNative !== null && productMarginPercent !== null ? round2(supplierTotalNative * (productMarginPercent / 100)) : null;
    data.productMarginAmount = productMarginAmount;

    // --- Client invoice (2026-10-03: PRODUCT ONLY) ---
    // Freight moved to the project level (see applyProjectFreightPricing
    // below) and is no longer folded into any one line's invoice total —
    // confirmed with Lewis via AskUserQuestion: freight is billed as its
    // own separate project-level charge, not apportioned across lines.
    const clientCurrency = dto.clientPaymentCurrency !== undefined ? dto.clientPaymentCurrency : existing?.clientPaymentCurrency ?? null;
    const invoiceTouched =
      supplierTouched ||
      dto.productMarginPercent !== undefined ||
      dto.clientPaymentCurrency !== undefined ||
      dto.quantity !== undefined;

    const productWithMarginBase = supplierTotalBase !== null ? supplierTotalBase * (1 + (productMarginPercent ?? 0) / 100) : null;

    if (invoiceTouched && productWithMarginBase !== null) {
      const invoiceTotalBase = round2(productWithMarginBase);
      data.salesTotalPriceReportingCcy = invoiceTotalBase;
      data.salesUnitPriceReportingCcy = quantity ? round2(invoiceTotalBase / quantity) : null;
      data.reportingCurrencyCode = ExchangeRatesService.DEFAULT_BASE_CURRENCY;

      if (clientCurrency) {
        const snapshot = await this.exchangeRates.getSnapshotForDate(now);
        const ccy = clientCurrency.toUpperCase();
        let clientPaymentAmountNative: number | null = null;
        let clientSnapshotId: string | null = null;
        if (ccy === ExchangeRatesService.DEFAULT_BASE_CURRENCY) {
          clientPaymentAmountNative = invoiceTotalBase;
        } else {
          const rate = snapshot?.rates[ccy];
          if (snapshot && rate) {
            clientPaymentAmountNative = round2(invoiceTotalBase * rate);
            clientSnapshotId = snapshot.id;
          }
        }
        data.clientPaymentAmount = clientPaymentAmountNative;
        data.unitSalesPrice = clientPaymentAmountNative !== null && quantity ? round2(clientPaymentAmountNative / quantity) : null;
        data.salesPriceLockedAt = now;
        data.salesExchangeRateSnapshotId = clientSnapshotId;
      } else {
        data.clientPaymentAmount = null;
        data.unitSalesPrice = null;
        data.salesPriceLockedAt = now;
        data.salesExchangeRateSnapshotId = null;
      }
    } else if (invoiceTouched) {
      data.clientPaymentAmount = null;
      data.unitSalesPrice = null;
      data.salesPriceLockedAt = null;
      data.salesExchangeRateSnapshotId = null;
      data.salesUnitPriceReportingCcy = null;
      data.salesTotalPriceReportingCcy = null;
    }
  }

  /**
   * Project-level counterpart of applyPricing above, added 2026-10-03
   * when freight moved from ProjectLine to Project (one freight contract
   * per project, not per line — see Project's "Freight & Logistics" doc
   * comment in schema.prisma). Computes freightTotalCost (freightCost +
   * freightInsuranceCost + freightAdditionalCost, in freightCurrency),
   * its locked base-currency equivalent, freightMarginAmount, and
   * freightInvoiceAmountReportingCcy (the WITH-margin figure actually
   * charged to the client) — mutating `data` in place, same convention as
   * applyPricing. This freight invoice figure is NOT attached to any
   * line's clientPaymentAmount; it's its own project-level charge, summed
   * in alongside each line's product-only invoice total by
   * getFinancialSummary/getProjectFinancialSummary below.
   */
  private async applyProjectFreightPricing(
    data: Record<string, unknown>,
    dto: UpdateProjectDto,
    existing: {
      freightCost: unknown;
      freightInsuranceCost: unknown;
      freightAdditionalCost: unknown;
      freightCurrency: string | null;
      freightTotalCostReportingCcy: unknown;
      freightMarginPercent: unknown;
    },
  ) {
    const now = new Date();

    const freightCost = dto.freightCost !== undefined ? dto.freightCost : decimalToNumber(existing.freightCost);
    const freightInsuranceCost = dto.freightInsuranceCost !== undefined ? dto.freightInsuranceCost : decimalToNumber(existing.freightInsuranceCost);
    const freightAdditionalCost = dto.freightAdditionalCost !== undefined ? dto.freightAdditionalCost : decimalToNumber(existing.freightAdditionalCost);
    const freightCurrency = dto.freightCurrency !== undefined ? dto.freightCurrency : existing.freightCurrency ?? null;
    const freightTouched = dto.freightCost !== undefined || dto.freightInsuranceCost !== undefined || dto.freightAdditionalCost !== undefined || dto.freightCurrency !== undefined;

    const freightComponents = [freightCost, freightInsuranceCost, freightAdditionalCost].filter((v): v is number => v !== null && v !== undefined);
    const freightTotalNative = freightComponents.length > 0 ? round2(freightComponents.reduce((a, b) => a + b, 0)) : null;
    data.freightTotalCost = freightTotalNative;
    if (freightCost !== undefined) data.freightCost = freightCost;
    if (freightInsuranceCost !== undefined) data.freightInsuranceCost = freightInsuranceCost;
    if (freightAdditionalCost !== undefined) data.freightAdditionalCost = freightAdditionalCost;
    if (freightCurrency !== undefined) data.freightCurrency = freightCurrency;
    if (dto.insuredValue !== undefined) data.insuredValue = dto.insuredValue;
    if (dto.insuredCurrency !== undefined) data.insuredCurrency = dto.insuredCurrency;

    let freightTotalBase: number | null = null;
    if (freightTotalNative !== null && freightTouched && freightCurrency) {
      const conv = await this.exchangeRates.convertToBaseCcy(freightTotalNative, freightTotalNative, freightCurrency, now);
      data.reportingCurrencyCode = conv.baseCurrencyCode;
      data.freightPriceLockedAt = conv.lockedAt;
      data.freightExchangeRateSnapshotId = conv.exchangeRateSnapshotId;
      data.freightTotalCostReportingCcy = conv.totalInBase;
      freightTotalBase = conv.totalInBase;
    } else if (freightTotalNative === null) {
      data.freightPriceLockedAt = null;
      data.freightExchangeRateSnapshotId = null;
      data.freightTotalCostReportingCcy = null;
    } else {
      freightTotalBase = decimalToNumber(existing.freightTotalCostReportingCcy);
    }

    const freightMarginPercent = dto.freightMarginPercent !== undefined ? dto.freightMarginPercent : decimalToNumber(existing.freightMarginPercent);
    data.freightMarginPercent = freightMarginPercent;
    const freightMarginAmount = freightTotalNative !== null && freightMarginPercent !== null ? round2(freightTotalNative * (freightMarginPercent / 100)) : null;
    data.freightMarginAmount = freightMarginAmount;
    data.freightInvoiceAmountReportingCcy =
      freightTotalBase !== null ? round2(freightTotalBase * (1 + (freightMarginPercent ?? 0) / 100)) : null;
  }

  /**
   * Computes internalOnTime/supplierOnTime/supplierInFull server-side
   * (2026-10-03, replacing manual dropdowns — Lewis's instruction: these
   * should be facts derived from dates/quantities already entered, not a
   * judgment call typed in). Returns null for any flag whose inputs
   * aren't both present yet (never defaults to false — an unknown date
   * pair means the flag genuinely isn't knowable yet, not that it failed).
   *
   * - internalOnTime: actualDeliveryDate <= projectedDeliveryDate (Unimed's
   *   own promise to the CLIENT was met).
   * - supplierOnTime: goodsCollectedDate <= supplierGad (the SUPPLIER's own
   *   committed date was met). Judgment call, flagged in schema.prisma and
   *   architecture-decisions.md: GAD/supplierGad's exact definitions are
   *   still an open question — this is a reasonable reading given the
   *   fields available, worth confirming once that's settled.
   * - supplierInFull: quantityReceived >= quantity.
   */
  private computeOnTimeInFull(line: {
    actualDeliveryDate: Date | string | null | undefined;
    projectedDeliveryDate: Date | string | null | undefined;
    goodsCollectedDate: Date | string | null | undefined;
    supplierGad: Date | string | null | undefined;
    quantity: number | null | undefined;
    quantityReceived: number | null | undefined;
  }): { internalOnTime: boolean | null; supplierOnTime: boolean | null; supplierInFull: boolean | null } {
    const toTime = (v: Date | string | null | undefined) => (v ? new Date(v).getTime() : null);

    const actual = toTime(line.actualDeliveryDate);
    const projected = toTime(line.projectedDeliveryDate);
    const internalOnTime = actual !== null && projected !== null ? actual <= projected : null;

    const collected = toTime(line.goodsCollectedDate);
    const supplierCommitted = toTime(line.supplierGad);
    const supplierOnTime = collected !== null && supplierCommitted !== null ? collected <= supplierCommitted : null;

    const supplierInFull =
      line.quantityReceived !== null && line.quantityReceived !== undefined && line.quantity !== null && line.quantity !== undefined
        ? line.quantityReceived >= line.quantity
        : null;

    return { internalOnTime, supplierOnTime, supplierInFull };
  }

  async addLine(user: RequestUser, projectId: string, dto: ProjectLineDto): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);
      await this.assertPartnersOwned(tx, user, dto);

      const data = lineDataFromDto(dto);
      await this.applyPricing(data, dto, null);
      Object.assign(
        data,
        this.computeOnTimeInFull({
          actualDeliveryDate: data.actualDeliveryDate as Date | null | undefined,
          projectedDeliveryDate: data.projectedDeliveryDate as Date | null | undefined,
          goodsCollectedDate: data.goodsCollectedDate as Date | null | undefined,
          supplierGad: data.supplierGad as Date | null | undefined,
          quantity: dto.quantity ?? null,
          quantityReceived: dto.quantityReceived ?? null,
        }),
      );

      const created = await tx.projectLine.create({
        data: { organizationId: user.organizationId, projectId, ...data },
      });

      await this.recomputeLineLogisticsMetric(tx, user.organizationId, projectId, created.id, project, created);
    });
    return this.findOne(user, projectId);
  }

  async updateLine(user: RequestUser, projectId: string, lineId: string, dto: ProjectLineDto): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const line = await tx.projectLine.findFirst({
        where: { id: lineId, projectId, ...tenantScope(user.organizationId) },
      });
      if (!line) throw new NotFoundException(`Line ${lineId} not found on project ${projectId}`);
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);
      await this.assertPartnersOwned(tx, user, dto);

      const data = lineDataFromDto(dto);
      await this.applyPricing(data, dto, line);
      // internalOnTime/supplierOnTime/supplierInFull are computed from
      // the merged (this request's changes + already-stored) state, not
      // just whatever this one PATCH happened to touch — a request that
      // only changes, say, clientPoNumber must not wipe an already-
      // computable on-time/in-full flag back to null.
      Object.assign(
        data,
        this.computeOnTimeInFull({
          actualDeliveryDate: data.actualDeliveryDate !== undefined ? (data.actualDeliveryDate as Date | null) : line.actualDeliveryDate,
          projectedDeliveryDate: data.projectedDeliveryDate !== undefined ? (data.projectedDeliveryDate as Date | null) : line.projectedDeliveryDate,
          goodsCollectedDate: data.goodsCollectedDate !== undefined ? (data.goodsCollectedDate as Date | null) : line.goodsCollectedDate,
          supplierGad: data.supplierGad !== undefined ? (data.supplierGad as Date | null) : line.supplierGad,
          quantity: dto.quantity !== undefined ? dto.quantity : line.quantity,
          quantityReceived: dto.quantityReceived !== undefined ? dto.quantityReceived : line.quantityReceived,
        }),
      );

      // Gap 1 — generic field-level audit trail. `data` is the finalized
      // write payload (post lineDataFromDto/applyPricing/
      // computeOnTimeInFull), not the raw DTO, so every key in it is
      // genuinely about to be written — diffing against it directly
      // (rather than against `dto`) correctly captures computed fields
      // like the server-side on-time/in-full flags and pricing totals,
      // not just whatever the caller's PATCH body happened to touch.
      const changes = diffForAudit(line, data, Object.keys(data));

      const updated = await tx.projectLine.update({ where: { id: lineId }, data });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "project_lines",
        recordId: lineId,
        changedById: user.id,
        changes,
        source: "API",
      });

      await this.recomputeLineLogisticsMetric(tx, user.organizationId, projectId, lineId, project, updated);
    });
    return this.findOne(user, projectId);
  }

  /** GET /projects/:id/status-history — the same ProjectStatusHistoryEntry[]
   * already embedded in ProjectDetail.statusHistory (toDetail/
   * PROJECT_DETAIL_INCLUDE above), as its own lightweight endpoint: a
   * caller that only wants the stage timeline (e.g. a refresh after a
   * status change, or a future standalone history view) shouldn't have
   * to re-fetch the full project with every line/document/enquiry just
   * to get it. Queried directly rather than via findOne() so it stays
   * cheap. Ordered oldest-first, same convention as PROJECT_DETAIL_INCLUDE. */
  async getStatusHistory(user: RequestUser, projectId: string): Promise<ProjectStatusHistoryEntry[]> {
    return withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);

      const history = await tx.projectStatusHistory.findMany({
        where: { projectId, ...tenantScope(user.organizationId) },
        include: { changedBy: true },
        orderBy: { enteredAt: "asc" },
      });
      return history.map(toStatusHistoryEntry);
    });
  }

  // --- Project Leads/Contacts (added 2026-10-08) — plain join-table
  // add/remove, independent of the full project PATCH (see ProjectLead/
  // ProjectContact's doc comments in schema.prisma). Neither join table
  // itself carries history/audit fields — there's nothing on the row to
  // soft-delete or version — so a straightforward create/delete is the
  // right shape here, unlike e.g. a certification or risk record. Still
  // logged to FieldChangeLog via recordFieldChanges for consistency with
  // the rest of the audit trail: tableName "project_leads"/
  // "project_contacts", fieldName "userId"/"contactId", oldValue/newValue
  // reflecting the id added or removed (null on the other side). ---

  async addLead(user: RequestUser, projectId: string, userId: string): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);

      const targetUser = await tx.user.findFirst({ where: { id: userId, organizationId: user.organizationId } });
      if (!targetUser) throw new NotFoundException(`User ${userId} not found in your organisation`);

      await tx.projectLead.upsert({
        where: { projectId_userId: { projectId, userId } },
        create: { projectId, userId },
        update: {},
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "project_leads",
        recordId: projectId,
        changedById: user.id,
        changes: [{ field: "userId", oldValue: null, newValue: userId }],
        source: "API",
      });
    });
    return this.findOne(user, projectId);
  }

  async removeLead(user: RequestUser, projectId: string, userId: string): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);

      await tx.projectLead.deleteMany({ where: { projectId, userId } });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "project_leads",
        recordId: projectId,
        changedById: user.id,
        changes: [{ field: "userId", oldValue: userId, newValue: null }],
        source: "API",
      });
    });
    return this.findOne(user, projectId);
  }

  async addContact(user: RequestUser, projectId: string, contactId: string): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);

      const contact = await tx.contact.findFirst({ where: { id: contactId, ...tenantScope(user.organizationId) } });
      if (!contact) throw new NotFoundException(`Contact ${contactId} not found in your organisation`);

      await tx.projectContact.upsert({
        where: { projectId_contactId: { projectId, contactId } },
        create: { projectId, contactId },
        update: {},
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "project_contacts",
        recordId: projectId,
        changedById: user.id,
        changes: [{ field: "contactId", oldValue: null, newValue: contactId }],
        source: "API",
      });
    });
    return this.findOne(user, projectId);
  }

  async removeContact(user: RequestUser, projectId: string, contactId: string): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ...tenantScope(user.organizationId) } });
      if (!project) throw new NotFoundException(`Project ${projectId} not found`);

      await tx.projectContact.deleteMany({ where: { projectId, contactId } });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "project_contacts",
        recordId: projectId,
        changedById: user.id,
        changes: [{ field: "contactId", oldValue: contactId, newValue: null }],
        source: "API",
      });
    });
    return this.findOne(user, projectId);
  }

  /**
   * Recomputes (or clears) this line's ProjectLineLogisticsMetric row —
   * see computeLogisticsMetric (@universe/db) for the actual methodology.
   * Called from both addLine and updateLine so the metric always reflects
   * the latest saved state of the line/project, never a stale snapshot.
   * Country centroids are read from the plain (non-tenant-scoped) prisma
   * client, same convention as GeoService — Country is global reference
   * data, not RLS-protected.
   */
  private async recomputeLineLogisticsMetric(
    tx: Prisma.TransactionClient,
    organizationId: string,
    projectId: string,
    lineId: string,
    project: { deliveryCountryCode: string | null; freightMode: string | null; incoterm: string | null },
    line: {
      countryOfManufactureCode: string | null;
      weightKg: Prisma.Decimal | number | null;
      productCategory: string | null;
      goodsCollectedDate: Date | null;
      goodsDeliveredToClientDate: Date | null;
    },
  ): Promise<void> {
    const manufactureCountryCode = line.countryOfManufactureCode;
    const destinationCountryCode = project.deliveryCountryCode;
    const mode: TransportMode | null =
      project.freightMode === "AIR" || project.freightMode === "SEA" || project.freightMode === "LAND"
        ? project.freightMode
        : null;

    let manufactureCentroid: { lat: number; lng: number } | null = null;
    let destinationCentroid: { lat: number; lng: number } | null = null;
    if (manufactureCountryCode && destinationCountryCode && mode) {
      const [originCountry, destCountry] = await Promise.all([
        prisma.country.findUnique({ where: { code: manufactureCountryCode }, select: { latitude: true, longitude: true } }),
        prisma.country.findUnique({ where: { code: destinationCountryCode }, select: { latitude: true, longitude: true } }),
      ]);
      if (originCountry?.latitude != null && originCountry?.longitude != null) {
        manufactureCentroid = { lat: originCountry.latitude, lng: originCountry.longitude };
      }
      if (destCountry?.latitude != null && destCountry?.longitude != null) {
        destinationCentroid = { lat: destCountry.latitude, lng: destCountry.longitude };
      }
    }

    const result = computeLogisticsMetric({
      manufactureCentroid,
      destinationCentroid,
      transportMode: mode,
      weightKg: line.weightKg != null ? Number(line.weightKg) : null,
      productCategory: line.productCategory,
      goodsCollectedDate: line.goodsCollectedDate,
      goodsDeliveredToClientDate: line.goodsDeliveredToClientDate,
    });

    if (!result) {
      // Not enough data (yet) to compute — clear any stale row rather than
      // leave an outdated metric standing after, e.g., the manufacture
      // country is removed.
      await tx.projectLineLogisticsMetric.deleteMany({ where: { projectLineId: lineId } });
      return;
    }

    const metricData = {
      organizationId,
      projectId,
      manufactureCountryCode,
      destinationCountryCode,
      transportMode: mode,
      incoterm: project.incoterm ?? null,
      commodityGroup: line.productCategory ?? null,
      weightKgUsed: result.weightKgUsed,
      weightEstimated: result.weightEstimated,
      distanceKm: result.distanceKm,
      co2FactorKgPerTonneKm: result.co2FactorKgPerTonneKm,
      co2TotalKg: result.co2TotalKg,
      durationDays: result.durationDays,
      efficiencyScore: result.efficiencyScore,
      scoreBand: result.scoreBand,
      methodologyVersion: result.methodologyVersion,
    };

    await tx.projectLineLogisticsMetric.upsert({
      where: { projectLineId: lineId },
      create: { projectLineId: lineId, ...metricData },
      update: metricData,
    });
  }
}
