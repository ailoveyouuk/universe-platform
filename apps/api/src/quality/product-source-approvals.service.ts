import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import type { PagedResult, ProductSourceApprovalSummary, QualityDashboardSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateProductSourceApprovalDto } from "./dto/create-product-source-approval.dto";
import type { UpdateProductSourceApprovalDto } from "./dto/update-product-source-approval.dto";
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

/** Database form of toSummary's `isQualified` test (minus the status check): manufacturer and any supplier
 * approved with no expired certification, and the review not overdue. Keep the two in step. */
function qualifiedWhere() {
  const now = new Date();
  const partnerOk = { approvalStatus: "APPROVED", certifications: { none: { expiryDate: { lt: now } } } };
  return {
    manufacturer: partnerOk,
    AND: [{ OR: [{ supplierId: null }, { supplier: partnerOk }] }, { OR: [{ nextReviewDue: null }, { nextReviewDue: { gte: now } }] }],
  };
}

@Injectable()
export class ProductSourceApprovalsService {
  // Delegates product search to the shared catalog service rather than
  // duplicating the ProductMaster query — see ProductCatalogService's doc
  // comment (apps/api/src/product-catalog/product-catalog.service.ts).
  // Refactored 2026-10-02 when that shared service was built; this is
  // the first concrete reuse of it, not just a documented intention.
  constructor() {}

  // Same tenant-isolation pattern as PartnersService — see its doc comment.
  // product_source_approvals is RLS-protected (infra/sql/row-level-security.sql),
  // so every query here must run inside withTenantContext.
  /** Capped at 500. `productMasterId` narrows it to one product's sourcing (Product Database
   * entry panel). Screens that list everything use findPage. */
  async findAll(user: RequestUser, status?: string, productMasterId?: string): Promise<ProductSourceApprovalSummary[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productSourceApproval.findMany({
        where: {
          ...tenantScope(user.organizationId),
          isArchived: false,
          ...(status ? { status } : {}),
          ...(productMasterId ? { productMasterId } : {}),
        },
        include: APPROVAL_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    );
    return rows.map(toSummary);
  }

  /** One page of sourcing approvals (2026-10-17, scale work). `status` PENDING | APPROVED | REJECTED,
   * or "WARNING" for approved-but-no-longer-qualified. `q` matches product, manufacturer or supplier name. */
  async findPage(
    user: RequestUser,
    opts: { status?: string; q?: string; page?: number; pageSize?: number },
  ): Promise<PagedResult<ProductSourceApprovalSummary>> {
    const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? 25), 5), 100);
    const page = Math.max(Math.floor(opts.page ?? 1), 1);
    const term = opts.q?.trim();
    const base = { ...tenantScope(user.organizationId), isArchived: false };
    const where = {
      ...base,
      ...(opts.status === "QUALIFIED" ? { status: "APPROVED", ...qualifiedWhere() } : opts.status === "WARNING" ? { status: "APPROVED", NOT: qualifiedWhere() } : opts.status ? { status: opts.status } : {}),
      ...(term
        ? {
            OR: [
              { productMaster: { name: { contains: term } } },
              { manufacturer: { name: { contains: term } } },
              { supplier: { name: { contains: term } } },
            ],
          }
        : {}),
    };
    return withTenantContext(user.organizationId, async (tx) => {
      const total = await tx.productSourceApproval.count({ where });
      const rows = await tx.productSourceApproval.findMany({
        where,
        include: APPROVAL_INCLUDE,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return { items: rows.map(toSummary), total, page, pageSize };
    });
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
  /** Counts are computed in the database; only the ten "needs attention" rows are loaded. */
  async getDashboard(user: RequestUser): Promise<QualityDashboardSummary> {
    const base = { ...tenantScope(user.organizationId), isArchived: false };
    const qualified = qualifiedWhere();
    return withTenantContext(user.organizationId, async (tx) => {
      const [totalProducts, qualifiedCount, warningCount, pendingCount, rejectedCount, attention] = await Promise.all([
        tx.productSourceApproval.count({ where: base }),
        tx.productSourceApproval.count({ where: { ...base, status: "APPROVED", ...qualified } }),
        tx.productSourceApproval.count({ where: { ...base, status: "APPROVED", NOT: qualified } }),
        tx.productSourceApproval.count({ where: { ...base, status: "PENDING" } }),
        tx.productSourceApproval.count({ where: { ...base, status: "REJECTED" } }),
        tx.productSourceApproval.findMany({
          where: { ...base, status: "APPROVED", NOT: qualified },
          include: APPROVAL_INCLUDE,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 10,
        }),
      ]);
      return { totalProducts, qualifiedCount, warningCount, pendingCount, rejectedCount, needsAttention: attention.map(toSummary) };
    });
  }
}
