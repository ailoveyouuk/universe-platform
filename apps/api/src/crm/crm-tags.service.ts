import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { CrmTag } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Tags are an organisation's own segments for grouping relationships. Viewing needs crm.view; creating, renaming, archiving and applying need crm.manage.
 * A tag is archived, never deleted; taking a tag off a relationship stamps removedAt on the link so the history stays. Every change is audited.
 */
@Injectable()
export class CrmTagsService {
  async list(user: RequestUser): Promise<CrmTag[]> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const tags = await tx.crmTag.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { name: "asc" }, take: 500 });
      const counts = await tx.crmRelationshipTag.groupBy({ by: ["tagId"], where: { organizationId: user.organizationId, removedAt: null, relationship: { archivedAt: null } }, _count: { _all: true } });
      const byTag = new Map(counts.map((c) => [c.tagId, c._count._all]));
      return tags.map((t) => ({ id: t.id, name: t.name, count: byTag.get(t.id) ?? 0 }));
    });
  }

  private clean(name: string | undefined) {
    const n = (name ?? "").trim().replace(/\s+/g, " ");
    if (!n) throw new BadRequestException("Give the tag a name.");
    if (n.length > 60) throw new BadRequestException("Keep tag names to 60 characters.");
    return n;
  }

  async create(user: RequestUser, body: { name?: string }): Promise<CrmTag> {
    assertHasPermission(user, "crm.manage");
    const name = this.clean(body.name);
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.crmTag.findUnique({ where: { organizationId_normalizedName: { organizationId: user.organizationId, normalizedName: norm(name) } } });
      if (existing && !existing.archivedAt) throw new ConflictException("That tag already exists.");
      // An archived tag with the same name is brought back rather than duplicated.
      const tag = existing
        ? await tx.crmTag.update({ where: { id: existing.id }, data: { archivedAt: null, name } })
        : await tx.crmTag.create({ data: { organizationId: user.organizationId, name, normalizedName: norm(name), createdById: user.id } });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_tags", recordId: tag.id, changedById: user.id, changes: [{ field: "created", oldValue: null, newValue: name }] });
      return { id: tag.id, name: tag.name, count: 0 };
    });
  }

  async update(user: RequestUser, id: string, body: { name?: string; archived?: boolean }): Promise<CrmTag> {
    assertHasPermission(user, "crm.manage");
    return withTenantContext(user.organizationId, async (tx) => {
      const cur = await tx.crmTag.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!cur) throw new NotFoundException("Tag not found.");
      const data: { name?: string; normalizedName?: string; archivedAt?: Date | null } = {};
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      if (body.name !== undefined) {
        const name = this.clean(body.name);
        const clash = await tx.crmTag.findUnique({ where: { organizationId_normalizedName: { organizationId: user.organizationId, normalizedName: norm(name) } } });
        if (clash && clash.id !== id) throw new ConflictException("Another tag already has that name.");
        data.name = name; data.normalizedName = norm(name); changes.push({ field: "name", oldValue: cur.name, newValue: name });
      }
      if (body.archived !== undefined) { data.archivedAt = body.archived ? new Date() : null; changes.push({ field: "archivedAt", oldValue: cur.archivedAt?.toISOString() ?? null, newValue: data.archivedAt?.toISOString() ?? null }); }
      const tag = await tx.crmTag.update({ where: { id }, data });
      if (changes.length) await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_tags", recordId: id, changedById: user.id, changes });
      return { id: tag.id, name: tag.name, count: 0 };
    });
  }

  /** Puts a tag on a relationship (or brings back one that was taken off). Idempotent. */
  async apply(user: RequestUser, relationshipId: string, tagId: string): Promise<void> {
    assertHasPermission(user, "crm.manage");
    await withTenantContext(user.organizationId, async (tx) => {
      const [rel, tag] = await Promise.all([
        tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: user.organizationId, archivedAt: null }, select: { id: true } }),
        tx.crmTag.findFirst({ where: { id: tagId, organizationId: user.organizationId, archivedAt: null }, select: { id: true, name: true } }),
      ]);
      if (!rel) throw new NotFoundException("Relationship not found.");
      if (!tag) throw new NotFoundException("Tag not found.");
      const link = await tx.crmRelationshipTag.findUnique({ where: { relationshipId_tagId: { relationshipId, tagId } } });
      if (link && !link.removedAt) return;
      if (link) await tx.crmRelationshipTag.update({ where: { relationshipId_tagId: { relationshipId, tagId } }, data: { removedAt: null, addedAt: new Date(), addedById: user.id } });
      else await tx.crmRelationshipTag.create({ data: { relationshipId, tagId, organizationId: user.organizationId, addedById: user.id } });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_relationships", recordId: relationshipId, changedById: user.id, changes: [{ field: "tag added", oldValue: null, newValue: tag.name }] });
    });
  }

  async remove(user: RequestUser, relationshipId: string, tagId: string): Promise<void> {
    assertHasPermission(user, "crm.manage");
    await withTenantContext(user.organizationId, async (tx) => {
      const link = await tx.crmRelationshipTag.findFirst({ where: { relationshipId, tagId, organizationId: user.organizationId, removedAt: null }, include: { tag: { select: { name: true } } } });
      if (!link) return;
      await tx.crmRelationshipTag.update({ where: { relationshipId_tagId: { relationshipId, tagId } }, data: { removedAt: new Date() } });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_relationships", recordId: relationshipId, changedById: user.id, changes: [{ field: "tag removed", oldValue: link.tag.name, newValue: null }] });
    });
  }
}
