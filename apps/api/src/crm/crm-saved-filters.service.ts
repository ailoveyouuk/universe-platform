import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { CRM_FILTER_KEYS, CRM_FILTER_VIEWS, type CrmFilterView, type CrmSavedFilter, type CrmSavedFilterInput } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";

/**
 * Saved filters: a named combination of list filters. Anyone with crm.view can keep their own; sharing one with the organisation needs crm.manage.
 * You see your own and the shared ones. You change your own; a manager can also change shared ones. Archived, never deleted.
 */
@Injectable()
export class CrmSavedFiltersService {
  private isManager(u: RequestUser) { return u.platformStaffRole !== "NONE" || u.permissions.includes("crm.manage"); }

  /** Keeps only the known filter keys with short text values, so what is stored can never be anything but a filter. */
  private clean(filters: unknown): Record<string, string> {
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) throw new BadRequestException("Choose at least one filter to save.");
    const out: Record<string, string> = {};
    for (const k of CRM_FILTER_KEYS) {
      const v = (filters as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 100);
    }
    if (!Object.keys(out).length) throw new BadRequestException("Choose at least one filter to save.");
    return out;
  }

  private shape(r: { id: string; view: string; name: string; filters: string; shared: boolean; ownerUserId: string }, me: string, owners: Map<string, string>): CrmSavedFilter {
    let filters: Record<string, string> = {};
    try { filters = JSON.parse(r.filters); } catch { filters = {}; }
    return { id: r.id, view: r.view as CrmFilterView, name: r.name, filters, shared: r.shared, mine: r.ownerUserId === me, ownerName: owners.get(r.ownerUserId) ?? null };
  }

  async list(u: RequestUser, view?: string): Promise<CrmSavedFilter[]> {
    assertHasPermission(u, "crm.view");
    return withTenantContext(u.organizationId, async (tx) => {
      const rows = await tx.crmSavedFilter.findMany({
        where: { organizationId: u.organizationId, archivedAt: null, OR: [{ ownerUserId: u.id }, { shared: true }], ...(view ? { view } : {}) },
        orderBy: [{ name: "asc" }], take: 200,
      });
      const ids = [...new Set(rows.map((r) => r.ownerUserId))];
      const users = ids.length ? await tx.user.findMany({ where: { id: { in: ids }, organizationId: u.organizationId }, select: { id: true, forename: true, surname: true } }) : [];
      const owners = new Map(users.map((x) => [x.id, `${x.forename} ${x.surname}`.trim()]));
      return rows.map((r) => this.shape(r, u.id, owners));
    });
  }

  async create(u: RequestUser, dto: CrmSavedFilterInput): Promise<CrmSavedFilter> {
    assertHasPermission(u, "crm.view");
    const name = dto.name?.trim().replace(/\s+/g, " ");
    if (!name) throw new BadRequestException("Give the saved filter a name.");
    if (name.length > 80) throw new BadRequestException("Keep the name to 80 characters.");
    if (!dto.view || !CRM_FILTER_VIEWS.includes(dto.view)) throw new BadRequestException("Say which list the filter is for.");
    if (dto.shared && !this.isManager(u)) throw new BadRequestException("Only CRM managers can share a filter with the organisation.");
    const filters = this.clean(dto.filters);
    return withTenantContext(u.organizationId, async (tx) => {
      const clash = await tx.crmSavedFilter.findFirst({ where: { organizationId: u.organizationId, view: dto.view, archivedAt: null, name, OR: [{ ownerUserId: u.id }, { shared: true }] }, select: { id: true } });
      if (clash) throw new ConflictException("You already have a saved filter with that name.");
      const row = await tx.crmSavedFilter.create({ data: { organizationId: u.organizationId, ownerUserId: u.id, view: dto.view!, name, filters: JSON.stringify(filters), shared: !!dto.shared } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_saved_filters", recordId: row.id, changedById: u.id, changes: [{ field: "created", oldValue: null, newValue: name }] });
      return this.shape(row, u.id, new Map([[u.id, `${u.forename} ${u.surname}`.trim()]]));
    });
  }

  async update(u: RequestUser, id: string, dto: CrmSavedFilterInput): Promise<CrmSavedFilter> {
    assertHasPermission(u, "crm.view");
    return withTenantContext(u.organizationId, async (tx) => {
      const cur = await tx.crmSavedFilter.findFirst({ where: { id, organizationId: u.organizationId, archivedAt: null, OR: [{ ownerUserId: u.id }, { shared: true }] } });
      if (!cur) throw new NotFoundException("Saved filter not found.");
      if (cur.ownerUserId !== u.id && !this.isManager(u)) throw new NotFoundException("Saved filter not found.");
      const data: { name?: string; shared?: boolean; archivedAt?: Date | null } = {};
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      if (dto.name !== undefined) { const n = dto.name.trim().replace(/\s+/g, " "); if (!n || n.length > 80) throw new BadRequestException("Give the saved filter a name of up to 80 characters."); data.name = n; changes.push({ field: "name", oldValue: cur.name, newValue: n }); }
      if (dto.shared !== undefined) { if (dto.shared && !this.isManager(u)) throw new BadRequestException("Only CRM managers can share a filter with the organisation."); data.shared = dto.shared; changes.push({ field: "shared", oldValue: String(cur.shared), newValue: String(dto.shared) }); }
      if (dto.archived) { data.archivedAt = new Date(); changes.push({ field: "archivedAt", oldValue: null, newValue: data.archivedAt.toISOString() }); }
      const row = await tx.crmSavedFilter.update({ where: { id }, data });
      if (changes.length) await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_saved_filters", recordId: id, changedById: u.id, changes });
      return this.shape(row, u.id, new Map());
    });
  }
}
