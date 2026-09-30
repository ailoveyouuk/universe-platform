import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, prisma, withTenantContext } from "@universe/db";
import type { ProjectDetail, ProjectLineSummary, ProjectSummary } from "@universe/types";
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
  };
}

const PROJECT_DETAIL_INCLUDE = {
  client: true,
  lines: { include: { manufacturer: true, supplier: true, freightForwarder: true }, orderBy: { createdAt: "asc" as const } },
} as const;

type ProjectWithLines = Awaited<ReturnType<typeof prisma.project.findFirstOrThrow<{ include: typeof PROJECT_DETAIL_INCLUDE }>>>;
type LineWithPartners = ProjectWithLines["lines"][number];

function decimalToString(d: unknown): string | null {
  return d === null || d === undefined ? null : String(d);
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
    warehouseReferenceNumber: l.warehouseReferenceNumber,
    goodsCollectedDate: l.goodsCollectedDate?.toISOString() ?? null,
    goodsManufacturedDate: l.goodsManufacturedDate?.toISOString() ?? null,
    goodsDeliveredToClientDate: l.goodsDeliveredToClientDate?.toISOString() ?? null,
    promisedDeliveryDate: l.promisedDeliveryDate?.toISOString() ?? null,
    actualDeliveryDate: l.actualDeliveryDate?.toISOString() ?? null,
    internalOnTime: l.internalOnTime,
    supplierOnTime: l.supplierOnTime,
    supplierInFull: l.supplierInFull,
    supplierUnitPrice: decimalToString(l.supplierUnitPrice),
    supplierPaymentAmountTotal: decimalToString(l.supplierPaymentAmountTotal),
    supplierPaymentCurrency: l.supplierPaymentCurrency,
    supplierPaymentDate: l.supplierPaymentDate?.toISOString() ?? null,
    supplierDocumentsReceivedDate: l.supplierDocumentsReceivedDate?.toISOString() ?? null,
    supplierPaymentStatusPercent: decimalToString(l.supplierPaymentStatusPercent),
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
      return tx.project.create({
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

      return tx.project.update({
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
        },
        include: PROJECT_DETAIL_INCLUDE,
      });
    });
    if (!p) throw new NotFoundException(`Project ${id} not found`);
    return toDetail(p);
  }

  /** Verifies a manufacturer/supplier/freight-forwarder id on a line DTO
   * belongs to the caller's own organization, same reasoning as clientId
   * above — never trust a Partner id from the request body without
   * checking tenant ownership first. Runs inside the same tenant tx as the
   * caller so it shares one Azure SQL connection/session context. */
  private async assertPartnersOwned(tx: Prisma.TransactionClient, user: RequestUser, dto: ProjectLineDto) {
    const ids = [dto.manufacturerId, dto.supplierId, dto.freightForwarderId].filter(
      (v): v is string => typeof v === "string",
    );
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
