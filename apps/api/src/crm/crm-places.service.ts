import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { CRM_LINK_KINDS, CRM_LOCATION_KINDS, type CrmLink, type CrmLinkInput, type CrmLocation, type CrmLocationInput } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { safeUrl } from "./crm.service";

const txt = (v: string | null | undefined, max: number) => { const t = (v ?? "").trim(); return t ? t.slice(0, max) : null; };

/**
 * A stakeholder's own places (head office, offices, factories, warehouses) and web addresses (social, portals, quality). The partner's website and
 * its manufacturer sites stay owned by the project-management app and are shown beside these, read-only. One head office per stakeholder: naming a
 * new one demotes the old one to an office. Places and links are archived, never deleted. Every change is audited.
 */
@Injectable()
export class CrmPlacesService {
  private async rel(tx: any, user: RequestUser, id: string) {
    const r = await tx.crmRelationship.findFirst({ where: { id, organizationId: user.organizationId, archivedAt: null }, select: { id: true } });
    if (!r) throw new NotFoundException("Relationship not found.");
  }

  private async checkCountry(tx: any, code: string | null) {
    if (!code) return null;
    const c = code.trim().toUpperCase();
    const ok = await tx.country.findFirst({ where: { code: c }, select: { code: true } });
    if (!ok) throw new BadRequestException("Choose a country from the list.");
    return c;
  }

  private toLocation(l: any): CrmLocation {
    return { id: l.id, source: "crm", kind: l.kind, name: l.name, countryCode: l.countryCode, city: l.city, address: l.address, phone: l.phone, email: l.email, notes: l.notes };
  }

  async saveLocation(user: RequestUser, relationshipId: string, locationId: string | null, dto: CrmLocationInput): Promise<CrmLocation> {
    assertHasPermission(user, "crm.manage");
    if (dto.kind && !CRM_LOCATION_KINDS.includes(dto.kind)) throw new BadRequestException("Choose a place type from the list.");
    if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email.trim())) throw new BadRequestException("That email address does not look right.");
    if (dto.phone && !/^[0-9+()\-.\s]{5,60}$/.test(dto.phone.trim())) throw new BadRequestException("That phone number does not look right.");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.rel(tx, user, relationshipId);
      const org = user.organizationId;
      const cur = locationId ? await tx.crmLocation.findFirst({ where: { id: locationId, organizationId: org, relationshipId } }) : null;
      if (locationId && !cur) throw new NotFoundException("Place not found.");
      const name = dto.name !== undefined ? txt(dto.name, 150) : cur?.name ?? null;
      if (!name) throw new BadRequestException("Give the place a name.");
      const next = {
        kind: dto.kind ?? cur?.kind ?? "OFFICE", name,
        countryCode: dto.countryCode !== undefined ? await this.checkCountry(tx, dto.countryCode) : cur?.countryCode ?? null,
        city: dto.city !== undefined ? txt(dto.city, 100) : cur?.city ?? null,
        address: dto.address !== undefined ? txt(dto.address, 500) : cur?.address ?? null,
        phone: dto.phone !== undefined ? txt(dto.phone, 60) : cur?.phone ?? null,
        email: dto.email !== undefined ? txt(dto.email, 200) : cur?.email ?? null,
        notes: dto.notes !== undefined ? txt(dto.notes, 500) : cur?.notes ?? null,
      };
      if (next.kind === "HQ") {
        // One head office: the old one becomes an ordinary office.
        const old = await tx.crmLocation.findMany({ where: { organizationId: org, relationshipId, kind: "HQ", archivedAt: null, ...(cur ? { id: { not: cur.id } } : {}) }, select: { id: true } });
        for (const o of old) {
          await tx.crmLocation.update({ where: { id: o.id }, data: { kind: "OFFICE" } });
          await recordFieldChanges(tx, { organizationId: org, tableName: "crm_locations", recordId: o.id, changedById: user.id, changes: [{ field: "kind", oldValue: "HQ", newValue: "OFFICE" }] });
        }
      }
      if (!cur) {
        const row = await tx.crmLocation.create({ data: { organizationId: org, relationshipId, createdById: user.id, ...next } });
        await recordFieldChanges(tx, { organizationId: org, tableName: "crm_locations", recordId: row.id, changedById: user.id, changes: [{ field: "created", oldValue: null, newValue: name }] });
        return this.toLocation(row);
      }
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = (Object.keys(next) as (keyof typeof next)[]).filter((k) => (cur as any)[k] !== next[k]).map((k) => ({ field: k, oldValue: (cur as any)[k] ?? null, newValue: next[k] ?? null }));
      const data: Record<string, unknown> = { ...next };
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? new Date() : null; changes.push({ field: "archivedAt", oldValue: cur.archivedAt?.toISOString() ?? null, newValue: dto.archived ? "archived" : null }); }
      const row = await tx.crmLocation.update({ where: { id: cur.id }, data });
      if (changes.length) await recordFieldChanges(tx, { organizationId: org, tableName: "crm_locations", recordId: cur.id, changedById: user.id, changes });
      return this.toLocation(row);
    });
  }

  async saveLink(user: RequestUser, relationshipId: string, linkId: string | null, dto: CrmLinkInput): Promise<CrmLink> {
    assertHasPermission(user, "crm.manage");
    if (dto.kind && !CRM_LINK_KINDS.includes(dto.kind)) throw new BadRequestException("Choose a link type from the list.");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.rel(tx, user, relationshipId);
      const org = user.organizationId;
      const cur = linkId ? await tx.crmLink.findFirst({ where: { id: linkId, organizationId: org, relationshipId } }) : null;
      if (linkId && !cur) throw new NotFoundException("Link not found.");
      let url = cur?.url ?? null;
      if (dto.url !== undefined) { url = safeUrl(dto.url); if (!url) throw new BadRequestException("Use a web address starting with http:// or https://."); if (url.length > 500) throw new BadRequestException("That web address is too long."); }
      if (!url) throw new BadRequestException("Give the link a web address.");
      const label = dto.label !== undefined ? txt(dto.label, 100) : cur?.label ?? null;
      if (!label) throw new BadRequestException("Give the link a label.");
      const kind = dto.kind ?? cur?.kind ?? "OTHER";
      if (!cur) {
        const row = await tx.crmLink.create({ data: { organizationId: org, relationshipId, createdById: user.id, kind, label, url } });
        await recordFieldChanges(tx, { organizationId: org, tableName: "crm_links", recordId: row.id, changedById: user.id, changes: [{ field: "created", oldValue: null, newValue: `${label} ${url}` }] });
        return { id: row.id, source: "crm", kind: row.kind as CrmLink["kind"], label: row.label, url: row.url };
      }
      const next = { kind, label, url };
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = (Object.keys(next) as (keyof typeof next)[]).filter((k) => (cur as any)[k] !== next[k]).map((k) => ({ field: k, oldValue: (cur as any)[k] ?? null, newValue: next[k] }));
      const data: Record<string, unknown> = { ...next };
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? new Date() : null; changes.push({ field: "archivedAt", oldValue: cur.archivedAt?.toISOString() ?? null, newValue: dto.archived ? "archived" : null }); }
      const row = await tx.crmLink.update({ where: { id: cur.id }, data });
      if (changes.length) await recordFieldChanges(tx, { organizationId: org, tableName: "crm_links", recordId: cur.id, changedById: user.id, changes });
      return { id: row.id, source: "crm", kind: row.kind as CrmLink["kind"], label: row.label, url: row.url };
    });
  }
}
