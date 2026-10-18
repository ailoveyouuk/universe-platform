import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { ProductChangeEntry, ProductFamilyDetail, ProductFamilyListResult, ProductFamilySummary } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertNotDemoUser } from "../common/authorization";
import type { AssignFamilyDto, CreateProductFamilyDto, UpdateProductFamilyDto } from "./dto/product-family.dto";
import { computeCompliance } from "./product-registrations.service";
import { writeTargetChanges } from "./product-target";

const clean = (v: string | undefined) => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());

/**
 * Product families (Product Database step 3b, 2026-10-18). A family is the generic product above its variants (every
 * ProductMaster row is a variant). Shared catalogue data: platform staff create and edit families and assign variants;
 * nothing is deleted (families are archived). Registrations and documents can attach to a family and then apply to all its
 * variants. Every change is audited to the family's change history.
 */
@Injectable()
export class ProductFamiliesService {
  private assertStaff(user: RequestUser, what: string) {
    assertNotDemoUser(user, what);
    if (user.platformStaffRole === "NONE") throw new ForbiddenException(`${what} is limited to platform administrators.`);
  }

  private visible(user: RequestUser) {
    return user.inDemoOrganization === true ? {} : { isSimulated: false };
  }

  private toSummary(f: { id: string; name: string; category: string; brand: string | null; inn: string | null; regulatoryClass: string | null; isArchived: boolean; _count: { variants: number } }): ProductFamilySummary {
    return { id: f.id, name: f.name, category: f.category, brand: f.brand, inn: f.inn, regulatoryClass: f.regulatoryClass, variantCount: f._count.variants, isArchived: f.isArchived };
  }

  async list(user: RequestUser, q: { search?: string; category?: string; page?: number; pageSize?: number }): Promise<ProductFamilyListResult> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
    const where = {
      isArchived: false,
      ...this.visible(user),
      ...(q.category ? { category: { startsWith: q.category } } : {}),
      ...(q.search?.trim() ? { OR: [{ name: { contains: q.search.trim() } }, { brand: { contains: q.search.trim() } }, { inn: { contains: q.search.trim() } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.productFamily.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { variants: true } } } }),
      prisma.productFamily.count({ where }),
    ]);
    return { items: rows.map((r) => this.toSummary(r)), total, page, pageSize };
  }

  async getOne(user: RequestUser, id: string): Promise<ProductFamilyDetail> {
    const f = await prisma.productFamily.findUnique({ where: { id }, include: { _count: { select: { variants: true } } } });
    if (!f || (f.isSimulated && user.inDemoOrganization !== true)) throw new NotFoundException("Product family not found.");
    const variants = await prisma.productMaster.findMany({
      where: { productFamilyId: id, ...this.visible(user) },
      select: { id: true, name: true, variantLabel: true, strength: true, packSize: true, dosageForm: true, gtin: true, lifecycleStatus: true, isArchived: true },
      orderBy: { name: "asc" },
      take: 200,
    });
    const regs = await prisma.productRegulatoryRegistration.findMany({ where: { productFamilyId: id, isArchived: false }, select: { status: true, expiryDate: true, authority: true, referenceNumber: true } });
    return {
      ...this.toSummary(f),
      intendedUse: f.intendedUse,
      description: f.description,
      addedByOrganizationName: f.addedByOrganizationName,
      version: f.version,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      variants,
      compliance: computeCompliance("ACTIVE", regs),
    };
  }

  async create(user: RequestUser, dto: CreateProductFamilyDto): Promise<ProductFamilySummary> {
    this.assertStaff(user, "Creating a product family");
    const f = await prisma.$transaction(async (tx) => {
      const row = await tx.productFamily.create({
        data: {
          name: dto.name.trim(), category: dto.category.trim(), brand: clean(dto.brand) ?? null, inn: clean(dto.inn) ?? null, regulatoryClass: clean(dto.regulatoryClass) ?? null,
          intendedUse: clean(dto.intendedUse) ?? null, description: clean(dto.description) ?? null, addedByOrganizationId: user.organizationId, addedByOrganizationName: user.organizationName,
        },
        include: { _count: { select: { variants: true } } },
      });
      await writeTargetChanges(tx, { productMasterId: null, productFamilyId: row.id }, { version: 1, changes: [{ field: "(created)", oldValue: null, newValue: row.name }], source: "CREATE", user });
      return row;
    });
    return this.toSummary(f);
  }

  async update(user: RequestUser, id: string, dto: UpdateProductFamilyDto): Promise<ProductFamilySummary> {
    this.assertStaff(user, "Changing a product family");
    const before = await prisma.productFamily.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Product family not found.");
    const data: Record<string, unknown> = {};
    for (const k of ["name", "category", "brand", "inn", "regulatoryClass", "intendedUse", "description"] as const) {
      const v = dto[k];
      if (v !== undefined) data[k] = k === "name" || k === "category" ? v.trim() : clean(v);
    }
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    const b = before as unknown as Record<string, unknown>;
    const changes = Object.entries(data)
      .filter(([k, v]) => (b[k] ?? null) !== (v ?? null))
      .map(([k, v]) => ({ field: k, oldValue: b[k] === null || b[k] === undefined ? null : String(b[k]), newValue: v === null || v === undefined ? null : String(v) }));
    const row = await prisma.$transaction(async (tx) => {
      if (changes.length === 0) return tx.productFamily.findUniqueOrThrow({ where: { id }, include: { _count: { select: { variants: true } } } });
      const updated = await tx.productFamily.update({ where: { id }, data: { ...data, version: before.version + 1 }, include: { _count: { select: { variants: true } } } });
      await writeTargetChanges(tx, { productMasterId: null, productFamilyId: id }, { version: before.version + 1, changes, source: "STAFF_EDIT", user });
      return updated;
    });
    return this.toSummary(row);
  }

  /** Links a variant to a family (or removes the link). */
  async assign(user: RequestUser, productId: string, dto: AssignFamilyDto): Promise<{ ok: true }> {
    this.assertStaff(user, "Changing a product's family");
    const p = await prisma.productMaster.findUnique({ where: { id: productId }, select: { id: true, productFamilyId: true, variantLabel: true, version: true } });
    if (!p) throw new NotFoundException("Product not found.");
    const familyId = dto.familyId ?? null;
    if (familyId && !(await prisma.productFamily.findUnique({ where: { id: familyId }, select: { id: true } }))) throw new BadRequestException("Product family not found.");
    const label = dto.variantLabel === undefined ? p.variantLabel : clean(dto.variantLabel);
    await prisma.$transaction(async (tx) => {
      await tx.productMaster.update({ where: { id: productId }, data: { productFamilyId: familyId, variantLabel: label ?? null, version: p.version + 1 } });
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      if (p.productFamilyId !== familyId) changes.push({ field: "productFamilyId", oldValue: p.productFamilyId, newValue: familyId });
      if ((p.variantLabel ?? null) !== (label ?? null)) changes.push({ field: "variantLabel", oldValue: p.variantLabel, newValue: label ?? null });
      await writeTargetChanges(tx, { productMasterId: productId, productFamilyId: null }, { version: p.version + 1, changes, source: "STAFF_EDIT", user });
    });
    return { ok: true };
  }

  /** Creates a family from a standalone product and links the product to it as its first variant. */
  async createFromProduct(user: RequestUser, productId: string): Promise<ProductFamilySummary> {
    this.assertStaff(user, "Creating a product family");
    const p = await prisma.productMaster.findUnique({ where: { id: productId } });
    if (!p) throw new NotFoundException("Product not found.");
    if (p.productFamilyId) throw new BadRequestException("This product already belongs to a family.");
    const name = p.name.split(",")[0].trim();
    const family = await this.create(user, { name, category: p.category, brand: p.brand ?? undefined, inn: p.inn ?? undefined, regulatoryClass: p.regulatoryClass ?? undefined, intendedUse: p.intendedUse ?? undefined });
    await this.assign(user, productId, { familyId: family.id, variantLabel: p.name.includes(",") ? p.name.slice(p.name.indexOf(",") + 1).trim() : undefined });
    return { ...family, variantCount: 1 };
  }

  async history(user: RequestUser, id: string): Promise<ProductChangeEntry[]> {
    const f = await prisma.productFamily.findUnique({ where: { id }, select: { isSimulated: true } });
    if (!f || (f.isSimulated && user.inDemoOrganization !== true)) throw new NotFoundException("Product family not found.");
    const rows = await prisma.productFamilyChange.findMany({ where: { productFamilyId: id }, orderBy: { changedAt: "desc" }, take: 300 });
    return rows.map((r) => ({
      id: r.id, version: 0, fieldName: r.fieldName, oldValue: r.oldValue, newValue: r.newValue, source: r.source, reason: null, changedByName: r.changedByName,
      changedByOrganizationName: r.changedByOrganizationName, changedAt: r.changedAt.toISOString(),
    }));
  }
}
