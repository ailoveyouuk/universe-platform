import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import type { PartnerSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import { normalizeStakeholderName } from "../common/normalize-name";
import { StakeholderRegistryService } from "../stakeholder-registry/stakeholder-registry.service";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreatePartnerDto } from "./dto/create-partner.dto";
import type { UpdatePartnerDto } from "./dto/update-partner.dto";

const PARTNER_INCLUDE = {
  roles: true,
  supplierDetail: true,
  manufacturerDetail: true,
  freightForwarderDetail: true,
  clientDetail: true,
  warehousingDetail: true,
  manufacturerSites: true,
  certifications: true,
  companyChecks: true,
} as const;

type PartnerWithDetails = Awaited<ReturnType<typeof prisma.partner.findFirstOrThrow<{ include: typeof PARTNER_INCLUDE }>>>;

function toSummary(p: PartnerWithDetails): PartnerSummary {
  const now = Date.now();
  return {
    id: p.id,
    name: p.name,
    countryCode: p.countryCode,
    website: p.website,
    approvalStatus: p.approvalStatus,
    riskTier: p.riskTier,
    companyRegistrationNumber: p.companyRegistrationNumber,
    vatNumber: p.vatNumber,
    registryEntryId: p.registryEntryId,
    sharedWithUniverseRegistry: p.sharedWithUniverseRegistry,
    lastApprovalReviewDate: p.lastApprovalReviewDate ? p.lastApprovalReviewDate.toISOString() : null,
    nextApprovalReviewDue: p.nextApprovalReviewDue ? p.nextApprovalReviewDue.toISOString() : null,
    roles: p.roles.map((r) => ({ roleType: r.roleType, isActive: r.isActive })),
    supplierDetail: p.supplierDetail
      ? {
          supplierCode: p.supplierDetail.supplierCode,
          productCategory: p.supplierDetail.productCategory,
          fdaRegistrationNumber: p.supplierDetail.fdaRegistrationNumber,
          scopeOfSupply: p.supplierDetail.scopeOfSupply,
          scopeOfServicesDescription: p.supplierDetail.scopeOfServicesDescription,
          codeOfConductAcknowledged: p.supplierDetail.codeOfConductAcknowledged,
          codeOfConductAcknowledgedDate: p.supplierDetail.codeOfConductAcknowledgedDate
            ? p.supplierDetail.codeOfConductAcknowledgedDate.toISOString()
            : null,
        }
      : null,
    manufacturerDetail: p.manufacturerDetail
      ? {
          partNumberConvention: p.manufacturerDetail.partNumberConvention,
          countryOfManufactureCode: p.manufacturerDetail.countryOfManufactureCode,
          scopeOfSupply: p.manufacturerDetail.scopeOfSupply,
          scopeOfServicesDescription: p.manufacturerDetail.scopeOfServicesDescription,
        }
      : null,
    freightForwarderDetail: p.freightForwarderDetail
      ? {
          modesOfTransport: p.freightForwarderDetail.modesOfTransport,
          iataDgrCertified: p.freightForwarderDetail.iataDgrCertified,
          aeoAccredited: p.freightForwarderDetail.aeoAccredited,
          gdpTransportCapable: p.freightForwarderDetail.gdpTransportCapable,
          referencesProvided: p.freightForwarderDetail.referencesProvided,
        }
      : null,
    clientDetail: p.clientDetail
      ? {
          billingAddressLine1: p.clientDetail.billingAddressLine1,
          billingAddressLine2: p.clientDetail.billingAddressLine2,
          billingCity: p.clientDetail.billingCity,
          billingRegion: p.clientDetail.billingRegion,
          billingPostcode: p.clientDetail.billingPostcode,
          billingCountryCode: p.clientDetail.billingCountryCode,
          deliveryAddressLine1: p.clientDetail.deliveryAddressLine1,
          deliveryAddressLine2: p.clientDetail.deliveryAddressLine2,
          deliveryCity: p.clientDetail.deliveryCity,
          deliveryRegion: p.clientDetail.deliveryRegion,
          deliveryPostcode: p.clientDetail.deliveryPostcode,
          deliveryCountryCode: p.clientDetail.deliveryCountryCode,
          paymentTerms: p.clientDetail.paymentTerms,
          productCategoryLicenses: p.clientDetail.productCategoryLicenses,
          productCategoryLicensingOtherNotes: p.clientDetail.productCategoryLicensingOtherNotes,
          destinationCountryRestrictionsNotes: p.clientDetail.destinationCountryRestrictionsNotes,
          isPharmaApprovedCustomer: p.clientDetail.isPharmaApprovedCustomer,
          approvedCustomerLogRef: p.clientDetail.approvedCustomerLogRef,
        }
      : null,
    warehousingDetail: p.warehousingDetail
      ? {
          wdaNumber: p.warehousingDetail.wdaNumber,
          technicalAgreementRef: p.warehousingDetail.technicalAgreementRef,
          gdpAuditDate: p.warehousingDetail.gdpAuditDate ? p.warehousingDetail.gdpAuditDate.toISOString() : null,
          nextGdpAuditDue: p.warehousingDetail.nextGdpAuditDue
            ? p.warehousingDetail.nextGdpAuditDue.toISOString()
            : null,
          monthlyReconciliationContact: p.warehousingDetail.monthlyReconciliationContact,
        }
      : null,
    manufacturerSites: p.manufacturerSites.map((s) => ({
      id: s.id,
      siteName: s.siteName,
      countryCode: s.countryCode,
      address: s.address,
      isPrimary: s.isPrimary,
    })),
    certifications: p.certifications.map((c) => ({
      id: c.id,
      type: c.type,
      referenceNumber: c.referenceNumber,
      revision: c.revision,
      issuingBody: c.issuingBody,
      issuedDate: c.issuedDate ? c.issuedDate.toISOString() : null,
      expiryDate: c.expiryDate ? c.expiryDate.toISOString() : null,
      verifiedAt: c.verifiedAt ? c.verifiedAt.toISOString() : null,
      status: c.status,
      notes: c.notes,
      manufacturerSiteId: c.manufacturerSiteId,
      relatedCompanyCheckType: c.relatedCompanyCheckType,
      isExpired: Boolean(c.expiryDate && c.expiryDate.getTime() < now),
    })),
    companyChecks: p.companyChecks.map((c) => ({
      id: c.id,
      checkType: c.checkType,
      customLabel: c.customLabel,
      result: c.result,
      checkedDate: c.checkedDate ? c.checkedDate.toISOString() : null,
      referenceOrSource: c.referenceOrSource,
      comment: c.comment,
    })),
    createdAt: p.createdAt.toISOString(),
  };
}

// normalize() moved to ../common/normalize-name.ts (normalizeStakeholderName)
// — shared with StakeholderRegistryService so Partner/registry matching use
// the exact same normalization.

/** Turns a CreatePartnerDto's `manufacturerSites` array into a plain Prisma
 * nested-create input — site-scoped certifications are deliberately NOT
 * nested here. PartnerCertification has TWO required-at-write-time
 * relations (partnerId and, when site-scoped, manufacturerSiteId), and a
 * triple-nested create (partner → manufacturerSites → certifications)
 * only lets Prisma auto-fill the FK for the relation actually being
 * traversed (manufacturerSiteId); partnerId still has to be supplied
 * explicitly, and the partner doesn't have a real id yet either at this
 * point in the same create() call. So site-scoped certifications are
 * created in a separate follow-up step below, once both the partner's and
 * each site's real ids are known — see create()'s second write.
 */
function buildManufacturerSitesCreate(
  sites: { siteName: string; countryCode?: string; address?: string; isPrimary?: boolean }[] | undefined,
) {
  if (!sites?.length) return undefined;
  return sites.map((site) => ({
    siteName: site.siteName,
    countryCode: site.countryCode,
    address: site.address,
    isPrimary: site.isPrimary ?? false,
  }));
}

@Injectable()
export class PartnersService {
  constructor(private readonly stakeholderRegistryService: StakeholderRegistryService) {}

  // Every method wraps its Prisma work in withTenantContext(user.organizationId, ...)
  // — see packages/db/src/tenant-context.ts. Azure SQL Row-Level Security on the
  // partners table default-denies any query that doesn't carry that session context,
  // so a bare `prisma.partner.*` call here would either return nothing (reads) or
  // fail outright (writes) — this bit us for real during the Phase 1 smoke test,
  // 2026-09-30 (see backend-launch-checklist.md). Matches the pattern already
  // established in supplier-directory.service.ts.
  async findAll(user: RequestUser, roleType?: string): Promise<PartnerSummary[]> {
    const partners = await withTenantContext(user.organizationId, (tx) =>
      tx.partner.findMany({
        where: {
          ...tenantScope(user.organizationId),
          isArchived: false,
          ...(roleType ? { roles: { some: { roleType, isActive: true } } } : {}),
        },
        include: PARTNER_INCLUDE,
        orderBy: { name: "asc" },
      }),
    );
    return partners.map(toSummary);
  }

  async findOne(user: RequestUser, id: string): Promise<PartnerSummary> {
    const p = await withTenantContext(user.organizationId, (tx) =>
      tx.partner.findFirst({
        where: { id, ...tenantScope(user.organizationId) },
        include: PARTNER_INCLUDE,
      }),
    );
    if (!p) throw new NotFoundException(`Partner ${id} not found`);
    return toSummary(p);
  }

  async create(user: RequestUser, dto: CreatePartnerDto): Promise<PartnerSummary> {
    // Certifications that reference a manufacturer site (by index into
    // dto.manufacturerSites) can't be nested into the same create() call
    // as their site — see buildManufacturerSitesCreate's doc comment
    // above. They're created in a second step below instead, once the
    // partner and its sites both have real ids.
    const certDataFor = (c: NonNullable<typeof dto.certifications>[number]) => ({
      type: c.type,
      referenceNumber: c.referenceNumber,
      revision: c.revision,
      issuingBody: c.issuingBody,
      issuedDate: c.issuedDate ? new Date(c.issuedDate) : undefined,
      expiryDate: c.expiryDate ? new Date(c.expiryDate) : undefined,
      verifiedAt: c.verifiedAt ? new Date(c.verifiedAt) : undefined,
      status: c.status,
      notes: c.notes,
      relatedCompanyCheckType: c.relatedCompanyCheckType,
    });
    const partnerLevelCertifications = (dto.certifications ?? []).filter((c) => c.manufacturerSiteIndex === undefined);
    const siteScopedCertifications = (dto.certifications ?? []).filter((c) => c.manufacturerSiteIndex !== undefined);

    // Stakeholder registry linking (2026-10-02, duplicate-prevention +
    // identity-consent scaffolding — see StakeholderRegistryService's doc
    // comment). Resolved BEFORE the tenant transaction below since
    // stakeholder_registry_entries carries no organizationId/RLS (same
    // category as product_master) — a bare, non-tenant-scoped lookup.
    // Two paths:
    //   (a) dto.registryEntryId set — the caller already confirmed a match
    //       via the duplicate-prevention prompt (or explicitly chose "link
    //       to this record"); trust it directly, just folding this
    //       Partner's roleTypes into the entry's known stakeholderTypes.
    //   (b) not set — run the same matching logic server-side as a safety
    //       net (covers API callers that skip the prompt, and the normal
    //       "no match was shown" case), which creates a fresh registry
    //       entry when nothing plausible is found.
    // Mandatory and unconditional — identity-level registry matching runs
    // for every Partner created, regardless of dto.sharedWithUniverseRegistry.
    // Only name/country/registration number/VAT number/roleTypes are ever
    // shared for this matching (see resolveForPartnerCreate) — never
    // pricing or any other relationship-specific data belonging to the
    // creating organization. sharedWithUniverseRegistry is reserved for a
    // future, separate consent that would govern sharing that kind of data
    // with the specific organization that created this record; it does
    // not gate identity matching/autopopulate, which is always on.
    const registryEntryId = await this.stakeholderRegistryService.resolveForPartnerCreate({
      explicitRegistryEntryId: dto.registryEntryId,
      name: dto.name,
      countryCode: dto.countryCode,
      registrationNumber: dto.companyRegistrationNumber,
      vatNumber: dto.vatNumber,
      roleTypes: dto.roleTypes,
    });

    const p = await withTenantContext(user.organizationId, async (tx) => {
      const created = await tx.partner.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name,
          normalizedName: normalizeStakeholderName(dto.name),
          countryCode: dto.countryCode,
          website: dto.website,
          riskTier: dto.riskTier,
          companyRegistrationNumber: dto.companyRegistrationNumber,
          vatNumber: dto.vatNumber,
          registryEntryId,
          sharedWithUniverseRegistry: dto.sharedWithUniverseRegistry ?? false,
          roles: { create: dto.roleTypes.map((roleType) => ({ roleType })) },
          ...(dto.supplierDetail ? { supplierDetail: { create: dto.supplierDetail } } : {}),
          ...(dto.manufacturerDetail ? { manufacturerDetail: { create: dto.manufacturerDetail } } : {}),
          ...(dto.freightForwarderDetail ? { freightForwarderDetail: { create: dto.freightForwarderDetail } } : {}),
          ...(dto.clientDetail ? { clientDetail: { create: dto.clientDetail } } : {}),
          ...(dto.warehousingDetail ? { warehousingDetail: { create: dto.warehousingDetail } } : {}),
          ...(dto.manufacturerSites?.length
            ? { manufacturerSites: { create: buildManufacturerSitesCreate(dto.manufacturerSites) } }
            : {}),
          ...(partnerLevelCertifications.length
            ? { certifications: { create: partnerLevelCertifications.map(certDataFor) } }
            : {}),
          ...(dto.companyChecks?.length
            ? {
                companyChecks: {
                  create: dto.companyChecks.map((c) => ({
                    checkType: c.checkType,
                    customLabel: c.customLabel,
                    result: c.result,
                    checkedDate: c.checkedDate ? new Date(c.checkedDate) : undefined,
                    referenceOrSource: c.referenceOrSource,
                    comment: c.comment,
                  })),
                },
              }
            : {}),
        },
        include: { manufacturerSites: true },
      });

      if (siteScopedCertifications.length) {
        // Each dto certification's manufacturerSiteIndex is a position into
        // dto.manufacturerSites — created.manufacturerSites comes back from
        // Prisma in the same order the nested create array was given, so
        // the index still lines up with a real site id here.
        await tx.partnerCertification.createMany({
          data: siteScopedCertifications
            .filter((c) => created.manufacturerSites[c.manufacturerSiteIndex!] !== undefined)
            .map((c) => ({
              ...certDataFor(c),
              partnerId: created.id,
              manufacturerSiteId: created.manufacturerSites[c.manufacturerSiteIndex!].id,
            })),
        });
      }

      return tx.partner.findFirstOrThrow({ where: { id: created.id }, include: PARTNER_INCLUDE });
    });
    return toSummary(p);
  }

  /** Additive only, deliberately — see UpdatePartnerDto.addRoleTypes' doc
   * comment. A role-detail object here always upserts (create if this
   * Partner has never had that detail row, update if it has), since a
   * Partner might gain e.g. a SUPPLIER role well after being created as a
   * CLIENT-only record. `addManufacturerSites`/`addCertifications`/
   * `addCompanyChecks` are append-only lists, same reasoning as roles —
   * editing or archiving one specific document is a future dedicated
   * endpoint, not this one (PartnerCertification.status already has the
   * CURRENT/ARCHIVED field that endpoint would flip). */
  async update(user: RequestUser, id: string, dto: UpdatePartnerDto): Promise<PartnerSummary> {
    const p = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.partner.findFirst({
        where: { id, ...tenantScope(user.organizationId) },
        include: { roles: true },
      });
      if (!existing) return null;

      const existingRoleTypes = new Set(existing.roles.map((r) => r.roleType));
      const newRoleTypes = (dto.addRoleTypes ?? []).filter((rt) => !existingRoleTypes.has(rt));

      return tx.partner.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name, normalizedName: normalizeStakeholderName(dto.name) } : {}),
          ...(dto.countryCode !== undefined ? { countryCode: dto.countryCode } : {}),
          ...(dto.website !== undefined ? { website: dto.website } : {}),
          ...(dto.approvalStatus !== undefined ? { approvalStatus: dto.approvalStatus } : {}),
          ...(dto.riskTier !== undefined ? { riskTier: dto.riskTier } : {}),
          ...(dto.companyRegistrationNumber !== undefined
            ? { companyRegistrationNumber: dto.companyRegistrationNumber }
            : {}),
          ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber } : {}),
          ...(dto.sharedWithUniverseRegistry !== undefined
            ? { sharedWithUniverseRegistry: dto.sharedWithUniverseRegistry }
            : {}),
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
          ...(dto.warehousingDetail
            ? { warehousingDetail: { upsert: { create: dto.warehousingDetail, update: dto.warehousingDetail } } }
            : {}),
          ...(dto.addManufacturerSites?.length
            ? { 
                manufacturerSites: {
                  create: dto.addManufacturerSites.map((s) => ({
                    siteName: s.siteName,
                    countryCode: s.countryCode,
                    address: s.address,
                    isPrimary: s.isPrimary ?? false,
                  })),
                },
              }
            : {}),
          ...(dto.addCertifications?.length
            ? {
                certifications: {
                  create: dto.addCertifications.map((c) => ({
                    type: c.type,
                    referenceNumber: c.referenceNumber,
                    revision: c.revision,
                    issuingBody: c.issuingBody,
                    issuedDate: c.issuedDate ? new Date(c.issuedDate) : undefined,
                    expiryDate: c.expiryDate ? new Date(c.expiryDate) : undefined,
                    verifiedAt: c.verifiedAt ? new Date(c.verifiedAt) : undefined,
                    status: c.status,
                    notes: c.notes,
                    relatedCompanyCheckType: c.relatedCompanyCheckType,
                    // Note: addCertifications on update is always
                    // company-wide — site-scoping a document to one of
                    // addManufacturerSites in the same call isn't
                    // supported (unlike create, where
                    // buildManufacturerSitesCreate nests it), since
                    // Prisma can't connect two sibling nested-creates to
                    // each other by not-yet-existent id. Add the site
                    // first, then add its certification in a follow-up
                    // call once the site has a real id, if that's needed.
                  })),
                },
              }
            : {}),
          ...(dto.addCompanyChecks?.length
            ? {
                companyChecks: {
                  create: dto.addCompanyChecks.map((c) => ({
                    checkType: c.checkType,
                    customLabel: c.customLabel,
                    result: c.result,
                    checkedDate: c.checkedDate ? new Date(c.checkedDate) : undefined,
                    referenceOrSource: c.referenceOrSource,
                    comment: c.comment,
                  })),
                },
              }
            : {}),
        },
        include: PARTNER_INCLUDE,
      });
    });
    if (!p) throw new NotFoundException(`Partner ${id} not found`);
    return toSummary(p);
  }
}
