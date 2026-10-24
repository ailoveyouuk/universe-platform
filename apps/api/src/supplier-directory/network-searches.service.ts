import { BadRequestException, Injectable } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { NetworkSavedSearchRecord, NetworkSearchCriteria } from "@universe/types";
import { orgTypesOf } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { createNotifications, usersWithPermission } from "../notifications/notify";
import { isEmptyCriteria, matchesNetworkCriteria, type NetworkSubject } from "./network-criteria";
import type { SaveNetworkSearchDto, UpdateNetworkSearchDto } from "./dto/network-search.dto";

const MAX_SEARCHES = 25;

function clean(dto: Partial<NetworkSearchCriteria>): NetworkSearchCriteria {
  const list = (v?: string[]) => (v ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 60);
  const c: NetworkSearchCriteria = {};
  if (dto.q?.trim()) c.q = dto.q.trim().slice(0, 200);
  if (dto.type) c.type = dto.type;
  if (list(dto.scope).length) c.scope = list(dto.scope);
  if (list(dto.country).length) c.country = list(dto.country).map((x) => x.toUpperCase());
  if (list(dto.certType).length) c.certType = list(dto.certType).slice(0, 10);
  if (dto.certified) c.certified = true;
  if (dto.whoPq) c.whoPq = true;
  if (dto.localMfr) c.localMfr = true;
  if (dto.minYears) c.minYears = dto.minYears;
  if (dto.warehousing) c.warehousing = dto.warehousing;
  return c;
}

/** Saved Find suppliers searches. With alerts on, the organisation is told in-app when a newly published organisation matches. */
@Injectable()
export class NetworkSearchesService {
  async list(user: RequestUser): Promise<NetworkSavedSearchRecord[]> {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.networkSavedSearch.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } });
      return rows.map((r: any) => ({ id: r.id, name: r.name, alertsEnabled: r.alertsEnabled, criteria: JSON.parse(r.criteriaJson) as NetworkSearchCriteria, createdAt: r.createdAt.toISOString() }));
    });
  }

  async save(user: RequestUser, dto: SaveNetworkSearchDto) {
    assertHasPermission(user, "tenders.view");
    const { name, alertsEnabled, ...rest } = dto;
    const criteria = clean(rest);
    if (isEmptyCriteria(criteria)) throw new BadRequestException("Set at least one filter before saving a search.");
    return withTenantContext(user.organizationId, async (tx) => {
      if ((await tx.networkSavedSearch.count({ where: { organizationId: user.organizationId } })) >= MAX_SEARCHES) throw new BadRequestException(`You can save up to ${MAX_SEARCHES} supplier searches.`);
      const r = await tx.networkSavedSearch.create({ data: { organizationId: user.organizationId, name: name.trim(), alertsEnabled: alertsEnabled ?? true, criteriaJson: JSON.stringify(criteria), createdById: user.id } });
      return { id: r.id };
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateNetworkSearchDto) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await tx.networkSavedSearch.updateMany({
        where: { id, organizationId: user.organizationId },
        data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.alertsEnabled !== undefined ? { alertsEnabled: dto.alertsEnabled } : {}), updatedAt: new Date() },
      });
      return { updated: r.count > 0 };
    });
  }

  async remove(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      await tx.networkSavedSearch.deleteMany({ where: { id, organizationId: user.organizationId } });
      return { deleted: true };
    });
  }

  /** Called when an organisation publishes its directory profile: notifies every other organisation holding a matching alert-enabled search. Never throws. */
  async alertOnPublish(organizationId: string): Promise<void> {
    try {
      await withPlatformStaffContext(async (tx: any) => {
        const notExpired = { archivedAt: null, OR: [{ expiresOn: null }, { expiresOn: { gte: new Date() } }] };
        const p = await tx.supplierProfile.findUnique({
          where: { organizationId },
          include: { organization: { select: { id: true, name: true, type: true, additionalTypes: true, scopeOfSupply: { where: { archivedAt: null }, select: { scopeSubId: true } }, countryPresence: { select: { countryCode: true } }, supplierCountryPresence: { select: { countryCode: true } }, certifications: { where: notExpired, select: { type: true } }, manufacturerProfile: { select: { whoPrequalified: true, isLocalManufacturer: true } } } } },
        });
        if (!p || !p.publishedAt) return;
        const o = p.organization;
        const subject: NetworkSubject = {
          name: o.name, type: o.type, types: orgTypesOf({ type: o.type, additionalTypes: o.additionalTypes }), description: p.description ?? null, principalManufacturers: p.principalManufacturersRepresented ?? null,
          scope: o.scopeOfSupply.map((x: any) => x.scopeSubId),
          countryCodes: [...new Set<string>([...o.countryPresence, ...o.supplierCountryPresence].map((c: any) => c.countryCode))],
          certificationTypes: [...new Set<string>(o.certifications.map((c: any) => c.type))],
          whoPrequalified: !!o.manufacturerProfile?.whoPrequalified, localManufacturer: !!o.manufacturerProfile?.isLocalManufacturer,
          yearsInOperation: p.yearsInOperation ?? null, warehousing: p.warehousingCapability ?? null,
        };
        const searches = await tx.networkSavedSearch.findMany({ where: { alertsEnabled: true, organizationId: { not: organizationId } }, take: 5000 });
        const hits = new Map<string, string>();
        for (const s of searches) {
          if (hits.has(s.organizationId)) continue;
          let c: NetworkSearchCriteria;
          try { c = JSON.parse(s.criteriaJson); } catch { continue; }
          if (matchesNetworkCriteria(c, subject)) hits.set(s.organizationId, s.name);
        }
        for (const [orgId, searchName] of hits) {
          const recipients = await usersWithPermission(tx, orgId, "tenders.view");
          if (recipients.length === 0) continue;
          await createNotifications(tx, recipients.map((recipientUserId) => ({
            organizationId: orgId, recipientUserId, actorUserId: null, kind: "SUPPLIER_MATCH", category: "PROCUREMENT",
            title: `New supplier matches “${searchName}”`.slice(0, 300), body: `${o.name} has joined the network directory.`,
            link: "/suppliers", subjectType: "ORGANIZATION", subjectId: organizationId,
          })));
        }
      });
    } catch (e) {
      console.error("Supplier search alerts failed", e);
    }
  }
}
