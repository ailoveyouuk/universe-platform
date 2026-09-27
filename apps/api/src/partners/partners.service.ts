import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { PartnerSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreatePartnerDto } from "./dto/create-partner.dto";
import type { UpdatePartnerDto } from "./dto/update-partner.dto";

const PARTNER_INCLUDE = {
  roles: true,
  supplierDetail: true,
  manufacturerDetail: true,
  freightForwarderDetail: true,
  clientDetail: true,
} as const;

type PartnerWithDetails = Awaited<ReturnType<typeof prisma.partner.findFirstOrThrow<{ include: typeof PARTNER_INCLUDE }>>>;

function toSummary(p: PartnerWithDetails): PartnerSummary {
  return {
    id: p.id,
    name: p.name,
    countryCode: p.countryCode,
    website: p.website,
    approvalStatus: p.approvalStatus,
    roles: p.roles.map((r) => ({ roleType: r.roleType, isActive: r.isActive })),
    supplierDetail: p.supplierDetail
      ? {
          supplierCode: p.supplierDetail.supplierCode,
          productCategory: p.supplierDetail.productCategory,
          fdaRegistrationNumber: p.supplierDetail.fdaRegistrationNumber,
        }
      : null,
    manufacturerDetail: p.manufacturerDetail
      ? {
          partNumberConvention: p.manufacturerDetail.partNumberConvention,
          countryOfManufactureCode: p.manufacturerDetail.countryOfManufactureCode,
        }
      : null,
    freightForwarderDetail: p.freightForwarderDetail
      ? {
          preferredIncoterm: p.freightForwarderDetail.preferredIncoterm,
          serviceRegions: p.freightForwarderDetail.serviceRegions,
        }
      : null,
    clientDetail: p.clientDetail
      ? {
          billingAddress: p.clientDetail.billingAddress,
          deliveryAddress: p.clientDetail.deliveryAddress,
          paymentTerms: p.clientDetail.paymentTerms,
        }
      : null,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Lowercases and strips common legal suffixes/punctuation — mirrors
 * Partner.normalizedName's doc comment (dedup/fuzzy-match aid). Deliberately
 * simple; not meant to be a full normalization library. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(inc|ltd|llc|limited|corp|corporation|gmbh|plc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

@Injectable()
export class PartnersService {
  async findAll(user: RequestUser, roleType?: string): Promise<PartnerSummary[]> {
    const partners = await prisma.partner.findMany({
      where: {
        ...tenantScope(user.organizationId),
        isArchived: false,
        ...(roleType ? { roles: { some: { roleType, isActive: true } } } : {}),
      },
      include: PARTNER_INCLUDE,
      orderBy: { name: "asc" },
    });
    return partners.map(toSummary);
  }

  async findOne(user: RequestUser, id: string): Promise<PartnerSummary> {
    const p = await prisma.partner.findFirst({
      where: { id, ...tenantScope(user.organizationId) },
      include: PARTNER_INCLUDE,
    });
    if (!p) throw new NotFoundException(`Partner ${id} not found`);
    return toSummary(p);
  }

  async create(user: RequestUser, dto: CreatePartnerDto): Promise<PartnerSummary> {
    const p = await prisma.partner.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        normalizedName: normalize(dto.name),
        countryCode: dto.countryCode,
        website: dto.website,
        roles: { create: dto.roleTypes.map((roleType) => ({ roleType })) },
        ...(dto.supplierDetail ? { supplierDetail: { create: dto.supplierDetail } } : {}),
        ...(dto.manufacturerDetail ? { manufacturerDetail: { create: dto.manufacturerDetail } } : {}),
        ...(dto.freightForwarderDetail ? { freightForwarderDetail: { create: dto.freightForwarderDetail } } : {}),
        ...(dto.clientDetail ? { clientDetail: { create: dto.clientDetail } } : {}),
      },
      include: PARTNER_INCLUDE,
    });
    return toSummary(p);
  }

  /** Additive only, deliberately — see UpdatePartnerDto.addRoleTypes' doc
   * comment. A role-detail object here always upserts (create if this
   * Partner has never had that detail row, update if it has), since a
   * Partner might gain e.g. a SUPPLIER role well after being created as a
   * CLIENT-only record. */
  async update(user: RequestUser, id: string, dto: UpdatePartnerDto): Promise<PartnerSummary> {
    const existing = await prisma.partner.findFirst({
      where: { id, ...tenantScope(user.organizationId) },
      include: { roles: true },
    });
    if (!existing) throw new NotFoundException(`Partner ${id} not found`);

    const existingRoleTypes = new Set(existing.roles.map((r) => r.roleType));
    const newRoleTypes = (dto.addRoleTypes ?? []).filter((rt) => !existingRoleTypes.has(rt));

    const p = await prisma.partner.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name, normalizedName: normalize(dto.name) } : {}),
        ...(dto.countryCode !== undefined ? { countryCode: dto.countryCode } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.approvalStatus !== undefined ? { approvalStatus: dto.approvalStatus } : {}),
        ...(newRoleTypes.length ? { roles: { create: newRoleTypes.map((roleType) => ({ roleType })) } } : {}),
        ...(dto.supplierDetail
          ? { supplierDetail: { upsert: { create: dto.supplierDetail, update: dto.supplierDetail } } }
          : {}),
        ...(dto.manufacturerDetail
          ? { manufacturerDetail: { upsert: { create: dto.manufacturerDetail, update: dto.manufacturerDetail } } }
          : {}),
        ...(dto.freightForwarderDetail
          ? {
              freightForwarderDetail: {
                upsert: { create: dto.freightForwarderDetail, update: dto.freightForwarderDetail },
              },
            }
          : {}),
        ...(dto.clientDetail
          ? { clientDetail: { upsert: { create: dto.clientDetail, update: dto.clientDetail } } }
          : {}),
      },
      include: PARTNER_INCLUDE,
    });
    return toSummary(p);
  }
}
