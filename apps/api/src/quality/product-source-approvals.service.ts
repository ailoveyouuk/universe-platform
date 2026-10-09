import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import type { ProductMasterOption, ProductSourceApprovalSummary, QualityDashboardSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateProductSourceApprovalDto } from "./dto/create-product-source-approval.dto";
import type { UpdateProductSourceApprovalDto } from "./dto/update-product-source-approval.dto";
import { ProductCatalogService } from "../product-catalog/product-catalog.service";
import { assertHasPermission } from "../common/authorization";

const APPROVAL_INCLUDE = {
  productMaster: true,
  manufacturer: { include: { certifications: true } },
  supplier: { include: { certifications: true } },
} as const;

type ApprovalWithDetails = Awaited<
  ReturnType<typeof prisma.productSourceApproval.findFirstOrThrow<{ include: typeof APPROVAL_INCLUDE }>>
>;

/** True if the given partner (manufacturer or supplier) has any
 * certification whose expiryDate has already passed. Mirrors the "subtle
 * warning" Lewis asked for (certificates/documents out of date). */
function hasExpiredCertification(partner: { certifications: { expiryDate: Date | null }[] } | null): boolean {
  if (!partner) return false;
  const now = new Date();
  return partner.certifications.some((c) => c.expiryDate !== null && c.expiryDate < now);
}

function toSummary(a: ApprovalWithDetails): ProductSourceApprovalSummary {
  const manufacturerExpired = hasExpiredCertification(a.manufacturer);
  const supplierExpired = hasExpiredCertification(a.supplier);
  const isReviewOverdue = a.nextReviewDue !== null && a.nextReviewDue < new Date();
  const manufacturerOk = a.manufacturer.approvalStatus === "APPROVED";
  const supplierOk = a.supplier === null || a.supplier.approvalStatus === "APPROVED";
  const isQualified =
    a.status === "APPROVED" &&
    manufacturerOk &&
    supplierOk &&
    !manufacturerExpired &&
    !supplierExpired &&
    !isReviewOverdue;

  return {
    id: a.id,
    productMasterId: a.productMasterId,
    productMasterName: a.productMaster.name,
    productCategory: a.productMaster.category,
    manufacturerId: a.manufacturerId,
    manufacturerName: a.manufacturer.name,
    manufacturerCountryCode: a.manufacturer.countryCode,
    supplierId: a.supplierId,
    supplierName: a.supplier?.name ?? null,
    supplierCountryCode: a.supplier?.countryCode ?? null,
    status: a.status,
    approvedAt: a.approvedAt?.toISOString() ?? null,
    nextReviewDue: a.nextReviewDue?.toISOString() ?? null,
    notes: a.notes,
    manufacturerApprovalStatus: a.manufacturer.approvalStatus,
    supplierApprovalStatus: a.supplier?.approvalStatus ?? null,
    hasExpiredCertification: manufacturerExpired || supplierExpired,
    isReviewOverdue,
    isQualified,
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class ProductSourceApprovalsService {
  // Delegates product search to the shared catalog service rather than
  // duplicating the ProductMaster query — see ProductCatalogService's doc
  // comment (apps/api/src/product-catalog/product-catalog.service.ts).
  // Refactored 2026-10-02 when that shared service was built; this is
  // the first concrete reuse of it, not just a documented intention.
  constructor(private readonly productCatalogService: ProductCatalogService) {}

  // Same tenant-isolation pattern as PartnersService — see its doc comment.
  // product_source_approvals is RLS-protected (infra/sql/row-level-security.sql),
  // so every query here must run inside withTenantContext.
  async findAll(user: RequestUser, status?: string): Promise<ProductSourceApprovalSummary[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productSourceApproval.findMany({
        where: {
          ...tenantScope(user.organizationId),
          isArchived: false,
          ...(status ? { status } : {}),
        },
        include: APPROVAL_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
    );
    return rows.map(toSummary);
  }

  async create(user: RequestUser, dto: CreateProductSourceApprovalDto): Promise<ProductSourceApprovalSummary> {
    const status = dto.status ?? "PENDING";
    // QA/procurement segregation of duties (Lewis, 2026-10-08) — logging a
    // new sourcing record defaults to PENDING and needs no permission; only
    // creating one that's already APPROVED (or REJECTED) skips the normal
    // QA review, so that path is gated the same as the update() transition.
    if (status !== "PENDING") {
      assertHasPermission(user, "products.approve");
    }
    const row = await withTenantContext(user.organizationId, (tx) =>
      tx.productSourceApproval.create({
        data: {
          organizationId: user.organizationId,
          productMasterId: dto.productMasterId,
          manufacturerId: dto.manufacturerId,
          supplierId: dto.supplierId,
          status,
          approvedAt: status === "APPROVED" ? new Date() : null,
          approvedById: status === "APPROVED" ? user.id : null,
          nextReviewDue: dto.nextReviewDue ? new Date(dto.nextReviewDue) : null,
          notes: dto.notes,
        },
        include: APPROVAL_INCLUDE,
      }),
    );
    return toSummary(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateProductSourceApprovalDto): Promise<ProductSourceApprovalSummary> {
    const row = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.productSourceApproval.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) return null;
      const movingToApproved = dto.status === "APPROVED" && existing.status !== "APPROVED";
      const movingToRejected = dto.status === "REJECTED" && existing.status !== "REJECTED";
      if (movingToApproved || movingToRejected) {
        assertHasPermission(user, "products.approve");
      }
      return tx.productSourceApproval.update({
        where: { id },
        data: {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(movingToApproved ? { approvedAt: new Date(), approvedById: user.id } : {}),
          ...(dto.nextReviewDue !== undefined
            ? { nextReviewDue: dto.nextReviewDue ? new Date(dto.nextReviewDue) : null }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
        include: APPROVAL_INCLUDE,
      });
    });
    if (!row) throw new NotFoundException(`ProductSourceApproval ${id} not found`);
    return toSummary(row);
  }

  /** ProductMaster is the shared, non-tenant-scoped catalog (see
   * schema.prisma "PRODUCT CLASSIFICATION" comment) — not RLS-protected,
   * so this is a plain read with no withTenantContext wrapper, same
   * reasoning as row-level-security.sql explicitly excluding product_master.
   * `user` isn't used for scoping here; it's accepted for consistency with
   * every other service method and in case this needs to become
   * org-aware later (e.g. ranking by the org's own usage). */
  async searchProducts(_user: RequestUser, search?: string): Promise<ProductMasterOption[]> {
    // Thin adapter over the shared catalog search (see
    // ProductCatalogService.search) — this endpoint's existing response
    // shape (ProductMasterOption) predates ProductCatalogMatch's richer
    // provenance fields, so only the three fields this picker ever used are
    // projected back out, to avoid a wider change to this screen.
    const matches = await this.productCatalogService.search(search);
    return matches.map((m) => ({ id: m.id, name: m.name, category: m.category }));
  }

  async getDashboard(user: RequestUser): Promise<QualityDashboardSummary> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productSourceApproval.findMany({
        where: { ...tenantScope(user.organizationId), isArchived: false },
        include: APPROVAL_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
    );
    const summaries = rows.map(toSummary);
    const qualifiedCount = summaries.filter((s) => s.isQualified).length;
    // "Warning" = approved as a sourcing decision but currently failing the
    // live cross-reference — the case Lewis specifically asked to flag.
    const warningCount = summaries.filter((s) => s.status === "APPROVED" && !s.isQualified).length;
    const pendingCount = summaries.filter((s) => s.status === "PENDING").length;
    const rejectedCount = summaries.filter((s) => s.status === "REJECTED").length;
    const needsAttention = summaries
      .filter((s) => s.status === "APPROVED" && !s.isQualified)
      .slice(0, 10);
    return {
      totalProducts: summaries.length,
      qualifiedCount,
      warningCount,
      pendingCount,
      rejectedCount,
      needsAttention,
    };
  }
}
