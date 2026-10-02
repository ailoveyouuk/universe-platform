import { Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { ProjectDetail } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateSupplierEnquiryDto } from "./dto/create-supplier-enquiry.dto";
import type { UpdateSupplierEnquiryDto } from "./dto/update-supplier-enquiry.dto";
import { ProjectsService } from "../projects/projects.service";

/**
 * SupplierEnquiry — structured RFQ tracking per ProjectLine (schema added
 * 2026-09-24, API/UI built Phase 2, 2026-09-30 — see
 * backend-launch-checklist.md "Project Management app — Phase 2"). Every
 * write returns the FULL ProjectDetail, same convention
 * ProjectsService.addLine/updateLine already established, so the frontend
 * only ever needs one fetch shape per project rather than a second,
 * separate enquiries collection to keep in sync.
 *
 * Deliberately a thin service, not its own controller root — every method
 * needs the parent project AND line to exist and belong to the caller's
 * org before an enquiry can be touched, so it re-uses ProjectsService's
 * own findOne() (which already does that tenant check) to build the final
 * response rather than duplicating that logic.
 */
@Injectable()
export class SupplierEnquiriesService {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Verifies projectId/lineId belong to the caller's own org — same
   * "never trust a path param's ownership" reasoning as
   * ProjectsService.assertPartnersOwned. Returns the line row (id only
   * needed) so callers don't re-query it. */
  private async assertLineOwned(tx: Parameters<Parameters<typeof withTenantContext>[1]>[0], user: RequestUser, projectId: string, lineId: string) {
    const line = await tx.projectLine.findFirst({
      where: { id: lineId, projectId, ...tenantScope(user.organizationId) },
    });
    if (!line) throw new NotFoundException(`Line ${lineId} not found on project ${projectId}`);
    return line;
  }

  async create(user: RequestUser, projectId: string, lineId: string, dto: CreateSupplierEnquiryDto): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      await this.assertLineOwned(tx, user, projectId, lineId);

      const supplier = await tx.partner.findFirst({
        where: { id: dto.supplierId, ...tenantScope(user.organizationId) },
      });
      if (!supplier) throw new NotFoundException(`Supplier ${dto.supplierId} not found in your organisation`);

      await tx.supplierEnquiry.create({
        data: {
          organizationId: user.organizationId,
          projectLineId: lineId,
          supplierId: dto.supplierId,
          dateContacted: dto.dateContacted ? new Date(dto.dateContacted) : undefined,
          responseStatus: dto.responseStatus ?? "WAITING",
          quotedPrice: dto.quotedPrice,
          quotedCurrency: dto.quotedCurrency,
          notes: dto.notes,
        },
      });
    });
    return this.projectsService.findOne(user, projectId);
  }

  async update(
    user: RequestUser,
    projectId: string,
    lineId: string,
    enquiryId: string,
    dto: UpdateSupplierEnquiryDto,
  ): Promise<ProjectDetail> {
    await withTenantContext(user.organizationId, async (tx) => {
      await this.assertLineOwned(tx, user, projectId, lineId);

      const enquiry = await tx.supplierEnquiry.findFirst({
        where: { id: enquiryId, projectLineId: lineId, ...tenantScope(user.organizationId) },
      });
      if (!enquiry) throw new NotFoundException(`Enquiry ${enquiryId} not found on line ${lineId}`);

      if (dto.supplierId !== undefined) {
        const supplier = await tx.partner.findFirst({
          where: { id: dto.supplierId, ...tenantScope(user.organizationId) },
        });
        if (!supplier) throw new NotFoundException(`Supplier ${dto.supplierId} not found in your organisation`);
      }

      await tx.supplierEnquiry.update({
        where: { id: enquiryId },
        data: {
          ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
          ...(dto.dateContacted !== undefined ? { dateContacted: dto.dateContacted ? new Date(dto.dateContacted) : null } : {}),
          ...(dto.responseStatus !== undefined ? { responseStatus: dto.responseStatus } : {}),
          ...(dto.quotedPrice !== undefined ? { quotedPrice: dto.quotedPrice } : {}),
          ...(dto.quotedCurrency !== undefined ? { quotedCurrency: dto.quotedCurrency } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });
    });
    return this.projectsService.findOne(user, projectId);
  }
}
