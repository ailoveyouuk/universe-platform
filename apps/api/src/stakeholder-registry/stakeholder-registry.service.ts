import { Injectable } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { StakeholderRegistryMatch, StakeholderRegistryDetail, StakeholderRegistryProduct } from "@universe/types";
import { normalizeStakeholderName } from "../common/normalize-name";

/**
 * Cross-tenant stakeholder identity registry — see
 * StakeholderRegistryEntry's doc comment in schema.prisma for the full
 * design rationale (claude/sop-driven-quality-roadmap.md Section B3/C).
 * `stakeholder_registry_entries` carries no organizationId column and is
 * deliberately excluded from row-level-security.sql, same category as
 * product_master — every method here is a plain, bare-`prisma` call, no
 * withTenantContext wrapper, same reasoning product-source-approvals.service.ts
 * documents for ProductMaster.
 *
 * Two jobs, one table:
 *   1. Duplicate-prevention — matching/creating entries as organisations
 *      onboard manufacturers/suppliers, so the same real-world company
 *      converges on one row regardless of which tenant (or the company
 *      itself) added it first.
 *   2. Identity-consent gating — a product's manufacturer/supplier name is
 *      only ever safe to reveal cross-tenant once there's a real,
 *      consenting company behind the entry (see isIdentityPublic below).
 */
@Injectable()
export class StakeholderRegistryService {
  /** The single rule for whether this entry's real identity may be shown
   * to an organisation other than the one that added the referencing
   * Partner — see sop-driven-quality-roadmap.md Section B3. Deliberately
   * centralized here so every call site (search results, product listings,
   * a future Universe Product Database search) applies the exact same
   * gate rather than each reimplementing it slightly differently. */
  private isIdentityPublic(entry: {
    linkedOrganizationId: string | null;
    linkedOrganization: { supplierProfile: { publishedAt: Date | null } | null } | null;
  }): boolean {
    return Boolean(entry.linkedOrganizationId && entry.linkedOrganization?.supplierProfile?.publishedAt);
  }

  /** Typeahead match while a user is onboarding a new stakeholder —
   * GET /stakeholder-registry/search. Scoped by stakeholder type (the
   * calling form already knows whether it's adding a Manufacturer,
   * Supplier, etc.) per Lewis's own framing: "the system will know Client
   * 2 is trying to add a stakeholder-manufacturer". Deliberately
   * conservative (name/country only, no fuzzy-scoring library) for a first
   * version — see the doc's "matching quality, stated plainly" note; this
   * always surfaces a confirm step, never silently merges anything. */
  async search(type: string | undefined, q: string | undefined): Promise<StakeholderRegistryMatch[]> {
    if (!q || q.trim().length < 2) return [];
    const rows = await prisma.stakeholderRegistryEntry.findMany({
      where: {
        legalName: { contains: q.trim() },
        ...(type ? { stakeholderTypes: { contains: `"${type}"` } } : {}),
      },
      include: { linkedOrganization: { include: { supplierProfile: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    return rows.map((r) => this.toMatch(r));
  }

  /** The duplicate-prevention lightbox's "view record" detail —
   * GET /stakeholder-registry/:id. Returns only the deliberately thin,
   * always-safe registry fields plus — only when isIdentityPublic — the
   * linked Organization's own self-published profile fields (their own
   * asserted public data, never another tenant's private assessment of
   * them, per the doc's explicit boundary). */
  async getOne(id: string): Promise<StakeholderRegistryDetail | null> {
    const entry = await prisma.stakeholderRegistryEntry.findUnique({
      where: { id },
      include: {
        linkedOrganization: {
          include: { supplierProfile: true, manufacturerProfile: true, supplierCountryPresence: true },
        },
      },
    });
    if (!entry) return null;
    const isPublic = this.isIdentityPublic(entry);
    return {
      ...this.toMatch(entry),
      manufacturerProfile:
        isPublic && entry.linkedOrganization?.manufacturerProfile
          ? {
              whoPrequalified: entry.linkedOrganization.manufacturerProfile.whoPrequalified,
              sraApprovals: entry.linkedOrganization.manufacturerProfile.sraApprovals,
              nationalRegistrations: entry.linkedOrganization.manufacturerProfile.nationalRegistrations,
              otherCertifications: entry.linkedOrganization.manufacturerProfile.otherCertifications,
              isLocalManufacturer: entry.linkedOrganization.manufacturerProfile.isLocalManufacturer,
            }
          : null,
      countryPresence:
        isPublic && entry.linkedOrganization?.supplierCountryPresence
          ? entry.linkedOrganization.supplierCountryPresence.map((c) => c.countryCode)
          : [],
    };
  }

  /** "Products belonging to that manufacturer" — GET
   * /stakeholder-registry/:id/products, the product-database integration
   * point (sop-driven-quality-roadmap.md Section B4/C). Only returns
   * anything once isIdentityPublic is true: the linked Organization's own
   * published SupplierProduct catalogue — self-published data, safe to
   * show to any organisation, same visibility rule as the manufacturer's
   * name itself. Never includes pricing (SupplierProduct doesn't carry
   * pricing at all — that only ever lives in a tenant's own
   * ProductSourceApproval/ProductPriceHistory). */
  async getProducts(id: string): Promise<StakeholderRegistryProduct[]> {
    const entry = await prisma.stakeholderRegistryEntry.findUnique({
      where: { id },
      include: { linkedOrganization: { include: { supplierProfile: true } } },
    });
    if (!entry || !this.isIdentityPublic(entry) || !entry.linkedOrganizationId) return [];

    const products = await prisma.supplierProduct.findMany({
      where: { organizationId: entry.linkedOrganizationId, isPublished: true },
      include: { productMaster: { select: { category: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.productMaster?.category ?? null,
      specifications: p.specifications,
      gtin: p.gtin,
    }));
  }

  /** Used by PartnersService.create — resolves the registryEntryId to
   * store on a newly-created Partner. See create-partner.dto.ts's
   * registryEntryId doc comment for the two paths (explicit confirm vs.
   * server-side match-or-create). */
  async resolveForPartnerCreate(args: {
    explicitRegistryEntryId?: string;
    name: string;
    countryCode?: string;
    registrationNumber?: string;
    roleTypes: string[];
  }): Promise<string> {
    if (args.explicitRegistryEntryId) {
      await this.mergeStakeholderTypes(args.explicitRegistryEntryId, args.roleTypes);
      return args.explicitRegistryEntryId;
    }
    return this.matchOrCreate(args);
  }

  /** The actual matching logic: an exact registration-number match is the
   * strongest signal (a real external identifier, not a guess), falling
   * back to normalized-name + country. No match found -> create a fresh
   * entry. See the roadmap doc's open item on tuning this from real usage
   * rather than guessing thresholds up front. */
  private async matchOrCreate(args: {
    name: string;
    countryCode?: string;
    registrationNumber?: string;
    roleTypes: string[];
  }): Promise<string> {
    const normalizedName = normalizeStakeholderName(args.name);

    let existing = args.registrationNumber
      ? await prisma.stakeholderRegistryEntry.findFirst({ where: { registrationNumber: args.registrationNumber } })
      : null;

    if (!existing) {
      existing = await prisma.stakeholderRegistryEntry.findFirst({
        where: { normalizedName, ...(args.countryCode ? { countryCode: args.countryCode } : {}) },
      });
    }

    if (existing) {
      await this.mergeStakeholderTypes(existing.id, args.roleTypes);
      return existing.id;
    }

    const created = await prisma.stakeholderRegistryEntry.create({
      data: {
        normalizedName,
        legalName: args.name,
        countryCode: args.countryCode,
        registrationNumber: args.registrationNumber,
        stakeholderTypes: JSON.stringify(args.roleTypes),
      },
    });
    return created.id;
  }

  /** A real-world company can be onboarded under more than one stakeholder
   * type over time (e.g. added as a Supplier by one org, later referenced
   * as a Manufacturer by another) — keep the entry's known types as the
   * union, not whichever type happened to create it first. */
  private async mergeStakeholderTypes(entryId: string, roleTypes: string[]): Promise<void> {
    const entry = await prisma.stakeholderRegistryEntry.findUnique({ where: { id: entryId } });
    if (!entry) return;
    const existingTypes: string[] = JSON.parse(entry.stakeholderTypes || "[]");
    const merged = Array.from(new Set([...existingTypes, ...roleTypes]));
    if (merged.length === existingTypes.length) return; // no new types, skip the write
    await prisma.stakeholderRegistryEntry.update({
      where: { id: entryId },
      data: { stakeholderTypes: JSON.stringify(merged) },
    });
  }

  /** Reconciliation — called when an Organization publishes its
   * SupplierProfile/ManufacturerProfile (see SupplierDirectoryService.
   * setPublished). Links that Organization to any existing registry entry
   * that plausibly represents the same real company, so every tenant's
   * Partner records that already point at that entry pick up the real
   * identity automatically — no manual re-linking needed on any client's
   * part, per the roadmap doc's "reverse direction" note. Conservative by
   * design: only auto-links on an exact registration-number match, or an
   * exact normalized-name + country match when the entry isn't already
   * linked to a different organisation. Anything less certain is left for
   * manual linking later rather than guessed.
   */
  async reconcileOnPublish(organizationId: string): Promise<void> {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return;

    const normalizedName = normalizeStakeholderName(org.name);
    const candidate = await prisma.stakeholderRegistryEntry.findFirst({
      where: {
        linkedOrganizationId: null,
        OR: [
          ...(org.registrationNumber ? [{ registrationNumber: org.registrationNumber }] : []),
          { normalizedName, ...(org.countryOfRegistrationCode ? { countryCode: org.countryOfRegistrationCode } : {}) },
        ],
      },
    });
    if (!candidate) return;

    await prisma.stakeholderRegistryEntry.update({
      where: { id: candidate.id },
      data: { linkedOrganizationId: organizationId },
    });
  }

  private toMatch(entry: {
    id: string;
    legalName: string;
    countryCode: string | null;
    website: string | null;
    registrationNumber: string | null;
    stakeholderTypes: string;
    linkedOrganizationId: string | null;
    linkedOrganization: { name: string; supplierProfile: { publishedAt: Date | null } | null } | null;
  }): StakeholderRegistryMatch {
    const isPublic = this.isIdentityPublic(entry);
    return {
      id: entry.id,
      legalName: entry.legalName,
      countryCode: entry.countryCode,
      website: entry.website,
      registrationNumber: entry.registrationNumber,
      stakeholderTypes: JSON.parse(entry.stakeholderTypes || "[]"),
      isKnownToUniverse: true,
      // The organisation NAME is only ever included once the identity is
      // actually public — otherwise the match prompt stays deliberately
      // conservative ("a stakeholder matching this name has been added by
      // other organisations"), per sop-driven-quality-roadmap.md Section C.
      linkedOrganizationName: isPublic ? entry.linkedOrganization!.name : null,
      isLinkedToPublishedOrganization: isPublic,
    };
  }
}
