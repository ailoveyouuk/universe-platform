import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { CRM_NETWORK_FLOOR, STAKEHOLDER_CATEGORIES, type CrmNetworkOrganisation, type CrmNetworkPanel } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { normalizeStakeholderName } from "../common/normalize-name";
import { counterpartyKeyForPartner } from "./crm.service";

/** A Universe organisation type becomes the stakeholder role of the same name; the data and insights type is not a stakeholder category. */
const ROLE_BY_ORG_TYPE: Record<string, string> = Object.fromEntries(STAKEHOLDER_CATEGORIES.filter((c) => c.orgType).map((c) => [c.key, c.key]));
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

/**
 * Universe organisations as CRM counterparties (2026-10-27). Principle: everything that can be anonymised is shared and joined up by default, and
 * identity appears only where the organisation has chosen to publish it. Two halves:
 *  - "Add from Universe": an organisation with a published profile can be added as a stakeholder, linked to the shared registry, so its public
 *    profile and tender history sit beside the organisation's own records.
 *  - "Universe network" panel: how many OTHER organisations hold the same stakeholder and in which roles (anonymised, shown only at or above a
 *    floor of five organisations); the stakeholder's identity and tender figures only when it has published a profile.
 * The cross-organisation counts are read with the platform-staff context on the server, never on a caller's say-so, and only counts leave it.
 */
@Injectable()
export class CrmNetworkService {
  /** Published Universe organisations (same demo/real side as the caller), by name. */
  async searchOrganisations(user: RequestUser, q: string | undefined): Promise<CrmNetworkOrganisation[]> {
    assertHasPermission(user, "crm.view");
    const term = (q ?? "").trim();
    if (term.length < 2) return [];
    const demoSide = user.inDemoOrganization === true;
    const orgs = await withPlatformStaffContext((s) => s.organization.findMany({
      where: { id: { not: user.organizationId }, name: { contains: term }, supplierProfile: { is: { publishedAt: { not: null } } }, ...(demoSide ? { OR: [{ isDemo: true }, { isSimulated: true }] } : { isDemo: false, isSimulated: false }) },
      select: { id: true, name: true, type: true, countryOfRegistrationCode: true },
      orderBy: { name: "asc" },
      take: 10,
    }));
    if (!orgs.length) return [];
    const tracked = await withTenantContext(user.organizationId, (tx) => tx.crmRelationship.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, partner: { is: { registryEntry: { is: { linkedOrganizationId: { in: orgs.map((o) => o.id) } } } } } },
      select: { id: true, partner: { select: { registryEntry: { select: { linkedOrganizationId: true } } } } },
    }));
    const byOrg = new Map(tracked.map((r) => [r.partner?.registryEntry?.linkedOrganizationId, r.id]));
    return orgs.map((o) => ({ organizationId: o.id, name: o.name, type: o.type, countryCode: o.countryOfRegistrationCode, trackedRelationshipId: byOrg.get(o.id) ?? null }));
  }

  /** Adds a published Universe organisation as a stakeholder and relationship. Returns the relationship id (existing one if already tracked). */
  async addFromOrganisation(user: RequestUser, organizationId: string): Promise<{ relationshipId: string; created: boolean }> {
    assertHasPermission(user, "crm.manage");
    if (organizationId === user.organizationId) throw new BadRequestException("That is your own organisation.");
    const demoSide = user.inDemoOrganization === true;
    const org = await withPlatformStaffContext((s) => s.organization.findFirst({
      where: { id: organizationId, supplierProfile: { is: { publishedAt: { not: null } } }, ...(demoSide ? { OR: [{ isDemo: true }, { isSimulated: true }] } : { isDemo: false, isSimulated: false }) },
      select: { id: true, name: true, type: true, additionalTypes: true, countryOfRegistrationCode: true, supplierProfile: { select: { website: true } } },
    }));
    if (!org) throw new NotFoundException("That organisation has not published a Universe profile.");
    const types = [org.type, ...(org.additionalTypes ?? "").split(/[,;|]/).map((s) => s.trim())].map((t) => ROLE_BY_ORG_TYPE[t]).filter(Boolean) as string[];
    const roleTypes = [...new Set(types)];
    // The shared registry entry for this organisation (created if the organisation has none), found or made outside the tenant transaction.
    let entry = await prisma.stakeholderRegistryEntry.findFirst({ where: { linkedOrganizationId: org.id }, select: { id: true } });
    if (!entry) {
      entry = await prisma.stakeholderRegistryEntry.create({ data: { isSimulated: demoSide, legalName: org.name, normalizedName: normalizeStakeholderName(org.name), countryCode: org.countryOfRegistrationCode, website: org.supplierProfile?.website ?? null, stakeholderTypes: JSON.stringify(roleTypes), linkedOrganizationId: org.id }, select: { id: true } });
    }
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.crmRelationship.findFirst({ where: { organizationId: user.organizationId, partner: { is: { registryEntryId: entry!.id } } }, select: { id: true, archivedAt: true } });
      if (existing) {
        if (existing.archivedAt) {
          await tx.crmRelationship.update({ where: { id: existing.id }, data: { archivedAt: null, archivedById: null } });
          await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_relationships", recordId: existing.id, changedById: user.id, changes: [{ field: "archivedAt", oldValue: "archived", newValue: null }] });
        }
        return { relationshipId: existing.id, created: false };
      }
      const partner = await tx.partner.create({ data: {
        organizationId: user.organizationId, name: org.name, normalizedName: normalizeStakeholderName(org.name), countryCode: org.countryOfRegistrationCode, website: org.supplierProfile?.website ?? null,
        registryEntryId: entry!.id, sharedWithUniverseRegistry: false, approvalStatus: "PENDING", roles: { create: roleTypes.map((roleType) => ({ roleType })) },
      }, select: { id: true } });
      const now = new Date();
      let rel;
      try {
        rel = await tx.crmRelationship.create({ data: { organizationId: user.organizationId, partnerId: partner.id, counterpartyOrganizationId: org.id, counterpartyKey: counterpartyKeyForPartner(partner.id), status: "PROSPECT", reviewIntervalMonths: 12, nextReviewDue: addMonths(now, 12), createdById: user.id }, select: { id: true } });
      } catch (e) { if (/unique|P2002/i.test(String((e as Error).message))) throw new ConflictException("That organisation was just added; refresh the list."); throw e; }
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_relationships", recordId: rel.id, changedById: user.id, changes: [{ field: "created", oldValue: null, newValue: `Added from Universe: ${org.name}` }] });
      return { relationshipId: rel.id, created: true };
    });
  }

  async panel(user: RequestUser, relationshipId: string): Promise<CrmNetworkPanel> {
    assertHasPermission(user, "crm.view");
    const row = await withTenantContext(user.organizationId, (tx) => tx.crmRelationship.findFirst({
      where: { id: relationshipId, organizationId: user.organizationId },
      select: { partner: { select: { registryEntryId: true } } },
    }));
    if (!row) throw new NotFoundException("Relationship not found.");
    const empty: CrmNetworkPanel = { linked: false, otherOrganisations: null, belowFloor: false, roles: [], identityPublic: false, organization: null, tenders: null };
    const entryId = row.partner?.registryEntryId;
    if (!entryId) return empty;
    const entry = await withPlatformStaffContext((s) => s.stakeholderRegistryEntry.findUnique({ where: { id: entryId }, select: { linkedOrganizationId: true, linkedOrganization: { select: { id: true, name: true, type: true, countryOfRegistrationCode: true, supplierProfile: { select: { publishedAt: true, website: true, description: true } } } } } }));
    if (!entry) return empty;
    const mine = user.organizationId;
    const linkedId = entry.linkedOrganizationId;
    const identityPublic = Boolean(linkedId && entry.linkedOrganization?.supplierProfile?.publishedAt);

    // Cross-organisation figures: counts only.
    const shared = await withPlatformStaffContext(async (s) => {
      const partners = await s.partner.findMany({ where: { registryEntryId: entryId, organizationId: { not: mine }, isArchived: false }, select: { id: true, organizationId: true } });
      const orgIds = new Set(partners.map((p) => p.organizationId));
      const roleRows = partners.length ? await s.partnerRole.findMany({ where: { partnerId: { in: partners.map((p) => p.id) }, isActive: true }, select: { partnerId: true, roleType: true } }) : [];
      const orgOf = new Map(partners.map((p) => [p.id, p.organizationId]));
      const byRole = new Map<string, Set<string>>();
      for (const r of roleRows) { const set = byRole.get(r.roleType) ?? new Set<string>(); set.add(orgOf.get(r.partnerId)!); byRole.set(r.roleType, set); }
      let universeBids = 0, universeAwards = 0, yourAwards: { tenderId: string; reference: string; title: string; awardedAt: string }[] = [], yourBids = 0;
      if (identityPublic && linkedId) {
        universeBids = await s.tenderParticipation.count({ where: { organizationId: linkedId, withdrawnAt: null } });
        universeAwards = await s.tenderAward.count({ where: { awardedOrganizationId: linkedId } });
        yourBids = await s.tenderParticipation.count({ where: { organizationId: linkedId, issuerOrganizationId: mine, withdrawnAt: null } });
        const aw = await s.tenderAward.findMany({ where: { organizationId: mine, awardedOrganizationId: linkedId }, orderBy: { awardedAt: "desc" }, take: 20, select: { tenderId: true, awardedAt: true } });
        if (aw.length) {
          const ts = await s.tender.findMany({ where: { id: { in: aw.map((a) => a.tenderId) } }, select: { id: true, referenceNumber: true, title: true } });
          const tm = new Map(ts.map((t) => [t.id, t]));
          yourAwards = aw.map((a) => ({ tenderId: a.tenderId, reference: tm.get(a.tenderId)?.referenceNumber ?? "", title: tm.get(a.tenderId)?.title ?? "", awardedAt: a.awardedAt.toISOString() }));
        }
      }
      return { orgCount: orgIds.size, byRole, universeBids, universeAwards, yourAwards, yourBids };
    });
    const above = shared.orgCount >= CRM_NETWORK_FLOOR;
    const lo = entry.linkedOrganization;
    return {
      linked: true,
      otherOrganisations: above ? shared.orgCount : null,
      belowFloor: !above,
      roles: above ? [...shared.byRole].filter(([, set]) => set.size >= CRM_NETWORK_FLOOR).map(([roleType, set]) => ({ roleType, count: set.size })).sort((a, b) => b.count - a.count) : [],
      identityPublic,
      organization: identityPublic && lo ? { id: lo.id, name: lo.name, type: lo.type, countryCode: lo.countryOfRegistrationCode, website: lo.supplierProfile?.website ?? null, description: lo.supplierProfile?.description ?? null } : null,
      tenders: identityPublic ? { yourAwards: shared.yourAwards, yourBids: shared.yourBids, universeBids: shared.universeBids >= CRM_NETWORK_FLOOR ? shared.universeBids : null, universeAwards: shared.universeAwards >= CRM_NETWORK_FLOOR ? shared.universeAwards : null } : null,
    };
  }
}
