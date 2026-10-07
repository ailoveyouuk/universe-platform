import { Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { tenantScope } from "../common/tenant-scoped";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateProductBatchDto, SearchProductBatchesDto, UpdateProductBatchDto } from "./dto/product-batch.dto";
import type { CreateTemperatureLogDto, ReviewTemperatureLogDto } from "./dto/temperature-log.dto";

/**
 * Gaps 5/6 (compliance-standards-gap-analysis.md) — full batch-level
 * traceability. See sop-driven-quality-roadmap.md "Full batch-level
 * traceability for pharma projects": promotes a batch from a free-text
 * field on ProjectLine to a first-class entity so "every place batch X
 * was shipped, and was it kept in spec" is one query, not a manual search.
 */
@Injectable()
export class ProductBatchesService {
  async create(user: RequestUser, dto: CreateProductBatchDto) {
    return withTenantContext(user.organizationId, (tx) =>
      tx.productBatch.create({
        data: {
          organizationId: user.organizationId,
          batchNumber: dto.batchNumber,
          productMasterId: dto.productMasterId ?? null,
          manufacturerId: dto.manufacturerId ?? null,
          manufacturedDate: dto.manufacturedDate ? new Date(dto.manufacturedDate) : null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          storageConditions: dto.storageConditions ?? null,
          qualificationPathway: dto.qualificationPathway ?? null,
          qualificationPathwayExpiryDate: dto.qualificationPathwayExpiryDate ? new Date(dto.qualificationPathwayExpiryDate) : null,
          maPl: dto.maPl ?? null,
          notes: dto.notes ?? null,
          createdById: user.id,
        },
      }),
    );
  }

  /** The actual traceability ask — search/filter by batch, product,
   * manufacturer, status; "every place batch X went" comes from the
   * caller then calling getDetail(id) on the matched row. */
  async search(user: RequestUser, query: SearchProductBatchesDto) {
    return withTenantContext(user.organizationId, (tx) =>
      tx.productBatch.findMany({
        where: {
          ...tenantScope(user.organizationId),
          ...(query.batchNumber ? { batchNumber: { contains: query.batchNumber } } : {}),
          ...(query.productMasterId ? { productMasterId: query.productMasterId } : {}),
          ...(query.manufacturerId ? { manufacturerId: query.manufacturerId } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        include: { productMaster: true, manufacturer: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  /** "From one batch, see every project/client/quantity/delivery it was
   * ever part of, and every data-logger excursion recorded against it" —
   * the one-query view the roadmap doc asked for. */
  async getDetail(user: RequestUser, id: string) {
    const batch = await withTenantContext(user.organizationId, (tx) =>
      tx.productBatch.findFirst({
        where: { id, ...tenantScope(user.organizationId) },
        include: {
          productMaster: true,
          manufacturer: { select: { id: true, name: true } },
          temperatureLogs: { orderBy: { recordedAt: "desc" } },
          projectLines: {
            include: {
              project: { select: { id: true, referenceNumber: true, client: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
    );
    if (!batch) throw new NotFoundException(`Product batch ${id} not found`);
    return batch;
  }

  async update(user: RequestUser, id: string, dto: UpdateProductBatchDto) {
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.productBatch.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Product batch ${id} not found`);

      const normalizedDto = {
        ...dto,
        manufacturedDate: dto.manufacturedDate ? new Date(dto.manufacturedDate) : dto.manufacturedDate,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : dto.expiryDate,
        qualificationPathwayExpiryDate: dto.qualificationPathwayExpiryDate
          ? new Date(dto.qualificationPathwayExpiryDate)
          : dto.qualificationPathwayExpiryDate,
      };
      const auditedFields = [
        "productMasterId",
        "manufacturerId",
        "manufacturedDate",
        "expiryDate",
        "storageConditions",
        "qualificationPathway",
        "qualificationPathwayExpiryDate",
        "maPl",
        "status",
        "notes",
      ] as const;
      const changes = diffForAudit(existing, normalizedDto, auditedFields);

      const updated = await tx.productBatch.update({
        where: { id },
        data: {
          ...(dto.productMasterId !== undefined ? { productMasterId: dto.productMasterId } : {}),
          ...(dto.manufacturerId !== undefined ? { manufacturerId: dto.manufacturerId } : {}),
          ...(dto.manufacturedDate !== undefined ? { manufacturedDate: dto.manufacturedDate ? new Date(dto.manufacturedDate) : null } : {}),
          ...(dto.expiryDate !== undefined ? { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null } : {}),
          ...(dto.storageConditions !== undefined ? { storageConditions: dto.storageConditions } : {}),
          ...(dto.qualificationPathway !== undefined ? { qualificationPathway: dto.qualificationPathway } : {}),
          ...(dto.qualificationPathwayExpiryDate !== undefined
            ? { qualificationPathwayExpiryDate: dto.qualificationPathwayExpiryDate ? new Date(dto.qualificationPathwayExpiryDate) : null }
            : {}),
          ...(dto.maPl !== undefined ? { maPl: dto.maPl } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "product_batches",
        recordId: id,
        changedById: user.id,
        changes,
      });

      return updated;
    });
  }

  // --- Temperature logs (Gap 5 — cold chain / data-logger monitoring) ---

  async addTemperatureLog(user: RequestUser, batchId: string, dto: CreateTemperatureLogDto) {
    return withTenantContext(user.organizationId, async (tx) => {
      const batch = await tx.productBatch.findFirst({ where: { id: batchId, ...tenantScope(user.organizationId) } });
      if (!batch) throw new NotFoundException(`Product batch ${batchId} not found`);

      return tx.batchTemperatureLog.create({
        data: {
          organizationId: user.organizationId,
          productBatchId: batchId,
          projectLineId: dto.projectLineId ?? null,
          loggerReference: dto.loggerReference ?? null,
          readingSummary: dto.readingSummary ?? null,
          hasExcursion: dto.hasExcursion ?? false,
          excursionNotes: dto.excursionNotes ?? null,
          recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
        },
      });
    });
  }

  /** A deliberate review step, separate from logging the reading itself —
   * same "attributable, timestamped sign-off on a specific record" shape
   * as evidence verification (Gap 2/3), appropriate here since a
   * reviewed-but-unactioned excursion is exactly the kind of gap a GDP
   * audit looks for. */
  async reviewTemperatureLog(user: RequestUser, logId: string, dto: ReviewTemperatureLogDto) {
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.batchTemperatureLog.findFirst({ where: { id: logId, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Temperature log ${logId} not found`);

      return tx.batchTemperatureLog.update({
        where: { id: logId },
        data: {
          reviewed: true,
          reviewedById: user.id,
          reviewedAt: new Date(),
          ...(dto.excursionNotes !== undefined ? { excursionNotes: dto.excursionNotes } : {}),
        },
      });
    });
  }
}
