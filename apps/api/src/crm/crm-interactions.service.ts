import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import { CRM_INTERACTION_TYPES, type CrmFollowUp, type CrmInteraction, type CrmInteractionInput, type CrmInteractionPage, type CrmInteractionType } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { createNotifications } from "../notifications/notify";

type Tx = Prisma.TransactionClient;
const parseIds = (s: string | null): string[] => { try { const v = JSON.parse(s ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

/**
 * Interactions: a dated record of what happened with a stakeholder. Private to the organisation. A confidential interaction is visible only to
 * its author, the relationship's owner and people who manage the CRM. Nothing is deleted (archive); every edit goes to the field change log.
 * A follow-up is an ordinary action in the assignee's bell (same system as every other app), so it shows in every app and on the dashboard.
 */
@Injectable()
export class CrmInteractionsService {
  private isManager(user: RequestUser) { return user.platformStaffRole !== "NONE" || user.permissions.includes("crm.manage"); }

  /** The visibility rule, as a database condition. */
  private visible(user: RequestUser, ownerUserId: string | null): Prisma.CrmInteractionWhereInput {
    if (this.isManager(user) || ownerUserId === user.id) return {};
    return { OR: [{ confidential: false }, { createdById: user.id }] };
  }

  private async shape(tx: Tx, user: RequestUser, rows: Prisma.CrmInteractionGetPayload<object>[], ownerUserId: string | null): Promise<CrmInteraction[]> {
    const userIds = new Set<string>(); const contactIds = new Set<string>();
    for (const r of rows) { parseIds(r.participantUserIds).forEach((i) => userIds.add(i)); parseIds(r.contactIds).forEach((i) => contactIds.add(i)); if (r.createdById) userIds.add(r.createdById); }
    const [users, contacts] = await Promise.all([
      userIds.size ? tx.user.findMany({ where: { id: { in: [...userIds] }, organizationId: user.organizationId }, select: { id: true, forename: true, surname: true } }) : Promise.resolve([]),
      contactIds.size ? tx.contact.findMany({ where: { id: { in: [...contactIds] }, organizationId: user.organizationId }, select: { id: true, name: true } }) : Promise.resolve([]),
    ]);
    const uname = new Map(users.map((u) => [u.id, `${u.forename} ${u.surname}`.trim()]));
    const cname = new Map(contacts.map((c) => [c.id, c.name]));
    const manager = this.isManager(user);
    return rows.map((r) => ({
      id: r.id, relationshipId: r.relationshipId, type: r.type as CrmInteractionType, occurredAt: r.occurredAt.toISOString(), title: r.title, summary: r.summary, outcome: r.outcome,
      participants: parseIds(r.participantUserIds).filter((i) => uname.has(i)).map((i) => ({ id: i, name: uname.get(i)! })),
      contacts: parseIds(r.contactIds).filter((i) => cname.has(i)).map((i) => ({ id: i, name: cname.get(i)! })),
      linkedType: r.linkedType, linkedId: r.linkedId, linkedLabel: r.linkedLabel, confidential: r.confidential,
      createdById: r.createdById, createdByName: r.createdById ? uname.get(r.createdById) ?? null : null, createdAt: r.createdAt.toISOString(),
      canEdit: false,
    })).map((i) => ({ ...i, canEdit: manager || ownerUserId === user.id }));
  }

  async list(user: RequestUser, relationshipId: string, q: { type?: string; q?: string; page?: number; pageSize?: number }): Promise<CrmInteractionPage> {
    assertHasPermission(user, "crm.view");
    const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 100); const page = Math.max(q.page ?? 1, 1);
    return withTenantContext(user.organizationId, async (tx) => {
      const rel = await tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: user.organizationId }, select: { ownerUserId: true } });
      if (!rel) throw new NotFoundException("Relationship not found.");
      const where: Prisma.CrmInteractionWhereInput = { AND: [{ organizationId: user.organizationId, relationshipId, archivedAt: null }, this.visible(user, rel.ownerUserId), ...(q.type ? [{ type: q.type }] : []), ...(q.q?.trim() ? q.q.trim().split(/\s+/).slice(0, 5).map((w) => ({ OR: [{ title: { contains: w } }, { summary: { contains: w } }, { outcome: { contains: w } }, { linkedLabel: { contains: w } }] })) : [])] };
      const [total, rows] = await Promise.all([tx.crmInteraction.count({ where }), tx.crmInteraction.findMany({ where, orderBy: [{ occurredAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize })]);
      return { items: await this.shape(tx, user, rows, rel.ownerUserId), total, page, pageSize };
    });
  }

  private async validate(tx: Tx, user: RequestUser, relationshipId: string, partnerId: string | null, dto: Partial<CrmInteractionInput>) {
    if (dto.type !== undefined && !CRM_INTERACTION_TYPES.includes(dto.type)) throw new BadRequestException("Choose a type from the list.");
    if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException("Give the interaction a short title.");
    if (dto.occurredAt !== undefined) {
      const d = new Date(dto.occurredAt);
      if (isNaN(d.getTime())) throw new BadRequestException("Enter a valid date.");
      if (d.getTime() > Date.now() + 86400000) throw new BadRequestException("An interaction cannot be dated in the future. Use a follow-up for what is still to happen.");
    }
    if (dto.participantUserIds?.length) {
      const n = await tx.user.count({ where: { id: { in: dto.participantUserIds }, organizationId: user.organizationId } });
      if (n !== new Set(dto.participantUserIds).size) throw new BadRequestException("Participants must be people in your organisation.");
    }
    if (dto.contactIds?.length) {
      const n = await tx.contact.count({ where: { id: { in: dto.contactIds }, organizationId: user.organizationId, partnerId: partnerId ?? "none" } });
      if (n !== new Set(dto.contactIds).size) throw new BadRequestException("Those contacts do not belong to this stakeholder.");
    }
    let linked: { type: string; id: string; label: string } | null = null;
    if (dto.linkedProjectId) {
      const p = await tx.project.findFirst({ where: { id: dto.linkedProjectId, organizationId: user.organizationId }, select: { id: true, referenceNumber: true, title: true } });
      if (!p) throw new BadRequestException("That project was not found.");
      linked = { type: "PROJECT", id: p.id, label: `${p.referenceNumber} · ${p.title}`.slice(0, 300) };
    }
    return linked;
  }

  async create(user: RequestUser, relationshipId: string, dto: CrmInteractionInput): Promise<CrmInteraction> {
    assertHasPermission(user, "crm.manage");
    if (!dto.type || !dto.title?.trim() || !dto.occurredAt) throw new BadRequestException("A type, a title and a date are needed.");
    if (dto.followUp) {
      if (!dto.followUp.assigneeUserId || isNaN(new Date(dto.followUp.dueDate).getTime())) throw new BadRequestException("A follow-up needs a person and a due date.");
    }
    return withTenantContext(user.organizationId, async (tx) => {
      const rel = await tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: user.organizationId }, select: { id: true, partnerId: true, ownerUserId: true, archivedAt: true, partner: { select: { name: true } } } });
      if (!rel) throw new NotFoundException("Relationship not found.");
      if (rel.archivedAt) throw new BadRequestException("This relationship is archived.");
      const linked = await this.validate(tx, user, relationshipId, rel.partnerId, { ...dto, type: dto.type, title: dto.title ?? "", occurredAt: dto.occurredAt });
      const row = await tx.crmInteraction.create({ data: {
        organizationId: user.organizationId, relationshipId, type: dto.type, occurredAt: new Date(dto.occurredAt), title: dto.title.trim().slice(0, 200),
        summary: dto.summary?.trim().slice(0, 4000) || null, outcome: dto.outcome?.trim().slice(0, 1000) || null,
        participantUserIds: dto.participantUserIds?.length ? JSON.stringify([...new Set(dto.participantUserIds)]) : null, contactIds: dto.contactIds?.length ? JSON.stringify([...new Set(dto.contactIds)]) : null,
        linkedType: linked?.type ?? null, linkedId: linked?.id ?? null, linkedLabel: linked?.label ?? null, confidential: !!dto.confidential, createdById: user.id } });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_interactions", recordId: row.id, changedById: user.id, changes: [{ field: "created", oldValue: null, newValue: `${row.type}: ${row.title}` }] });
      if (dto.followUp) {
        await createNotifications(tx, [{
          organizationId: user.organizationId, recipientUserId: dto.followUp.assigneeUserId, actorUserId: user.id, kind: "CRM_FOLLOW_UP", category: "CRM",
          title: `Follow up with ${rel.partner?.name ?? "stakeholder"}: ${row.title}`.slice(0, 300), body: dto.followUp.note?.trim().slice(0, 500) || null,
          link: `/relationships?id=${relationshipId}`, subjectType: "CRM_INTERACTION", subjectId: row.id, requiresAction: true, dueDate: new Date(dto.followUp.dueDate),
        }]);
      }
      return (await this.shape(tx, user, [row], rel.ownerUserId))[0];
    });
  }

  async update(user: RequestUser, id: string, dto: Partial<CrmInteractionInput>): Promise<CrmInteraction> {
    assertHasPermission(user, "crm.manage");
    return withTenantContext(user.organizationId, async (tx) => {
      const cur = await tx.crmInteraction.findFirst({ where: { id, organizationId: user.organizationId }, include: { relationship: { select: { ownerUserId: true, partnerId: true } } } });
      if (!cur) throw new NotFoundException("Interaction not found.");
      const vis = this.visible(user, cur.relationship.ownerUserId);
      if (vis.OR && !(cur.createdById === user.id || !cur.confidential)) throw new NotFoundException("Interaction not found.");
      const linked = await this.validate(tx, user, cur.relationshipId, cur.relationship.partnerId, dto);
      const data: Prisma.CrmInteractionUncheckedUpdateInput = {};
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.occurredAt !== undefined) data.occurredAt = new Date(dto.occurredAt);
      if (dto.title !== undefined) data.title = dto.title.trim().slice(0, 200);
      if (dto.summary !== undefined) data.summary = dto.summary?.trim().slice(0, 4000) || null;
      if (dto.outcome !== undefined) data.outcome = dto.outcome?.trim().slice(0, 1000) || null;
      if (dto.participantUserIds !== undefined) data.participantUserIds = dto.participantUserIds.length ? JSON.stringify([...new Set(dto.participantUserIds)]) : null;
      if (dto.contactIds !== undefined) data.contactIds = dto.contactIds.length ? JSON.stringify([...new Set(dto.contactIds)]) : null;
      if (dto.linkedProjectId !== undefined) { data.linkedType = linked?.type ?? null; data.linkedId = linked?.id ?? null; data.linkedLabel = linked?.label ?? null; }
      if (dto.confidential !== undefined) data.confidential = dto.confidential;
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? new Date() : null; data.archivedById = dto.archived ? user.id : null; }
      const row = await tx.crmInteraction.update({ where: { id }, data });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_interactions", recordId: id, changedById: user.id,
        changes: diffForAudit(cur, data, ["type", "occurredAt", "title", "summary", "outcome", "participantUserIds", "contactIds", "linkedId", "confidential", "archivedAt"]) });
      return (await this.shape(tx, user, [row], cur.relationship.ownerUserId))[0];
    });
  }

  /** The signed-in person's open CRM follow-ups, soonest first. */
  async myFollowUps(user: RequestUser): Promise<CrmFollowUp[]> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.notification.findMany({ where: { organizationId: user.organizationId, recipientUserId: user.id, kind: "CRM_FOLLOW_UP", requiresAction: true, actionStatus: "OPEN" }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 50 });
      const now = Date.now();
      return rows.map((n) => ({ id: n.id, title: n.title, body: n.body, dueDate: n.dueDate?.toISOString() ?? null, relationshipId: (n.link ?? "").split("id=")[1] ?? "", overdue: !!n.dueDate && n.dueDate.getTime() < now }));
    });
  }
}
