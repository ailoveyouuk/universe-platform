import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { ClientComplaintDetail, ClientComplaintInput, ClientComplaintItem, ClientInviteInput, ClientUserRow } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { createNotifications, usersWithPermission } from "../notifications/notify";
import { QualityComplaintsService } from "../quality/quality-complaints.service";

type Tx = any;
const VISIBLE_EVENTS = ["STAGE", "COMMUNICATION_OUT", "COMMUNICATION_IN", "CLIENT_MESSAGE"];
const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Quality client login (2026-11-01). A client user (User.clientPartnerId set) is blocked from every route except /me and /client by EntraAuthGuard.
 * Everything here is filtered to the organisation AND the client's own partner, inbound complaints only, and returns a deliberately small set of fields
 * (no investigation, root cause, severity, owner, other people's details or internal notes).
 */
@Injectable()
export class ClientService {
  constructor(private readonly complaints: QualityComplaintsService) {}

  private partnerOf(u: RequestUser): string { if (!u.clientPartnerId) throw new ForbiddenException("This is for client logins."); return u.clientPartnerId; }
  private scope(u: RequestUser) { return { organizationId: u.organizationId, partnerId: this.partnerOf(u), direction: "INBOUND_CLIENT", archivedAt: null }; }

  async list(u: RequestUser): Promise<ClientComplaintItem[]> {
    const where = this.scope(u);
    const rows: any[] = await withTenantContext(u.organizationId, (tx: Tx) => tx.qualityComplaint.findMany({ where, orderBy: { receivedAt: "desc" }, take: 200 }));
    return rows.map(this.item);
  }

  private item = (r: any): ClientComplaintItem => ({ id: r.id, referenceNumber: r.referenceNumber, title: r.title, status: r.status, receivedAt: r.receivedAt.toISOString(), acknowledgedAt: iso(r.acknowledgedAt), resolvedAt: iso(r.resolvedAt), closedAt: iso(r.closedAt) });

  async detail(u: RequestUser, id: string): Promise<ClientComplaintDetail> {
    const where = { ...this.scope(u), id };
    return withTenantContext(u.organizationId, async (tx: Tx) => {
      const r = await tx.qualityComplaint.findFirst({ where });
      if (!r) throw new NotFoundException("Complaint not found.");
      const ev: any[] = await tx.qualityComplaintEvent.findMany({ where: { complaintId: id, organizationId: u.organizationId, kind: { in: VISIBLE_EVENTS } }, orderBy: { createdAt: "asc" } });
      return {
        ...this.item(r), description: r.description,
        responseSummary: r.responseSentAt ? r.responseSummary ?? null : null, responseSentAt: iso(r.responseSentAt),
        events: ev.map((e) => ({ id: e.id, kind: e.kind, summary: e.summary, body: e.kind === "STAGE" ? null : e.body ?? null, at: e.createdAt.toISOString() })),
      };
    });
  }

  async log(u: RequestUser, dto: ClientComplaintInput) {
    const partnerId = this.partnerOf(u);
    if (!dto.title?.trim() || !dto.description?.trim()) throw new BadRequestException("Give a short title and describe what happened.");
    if (dto.title.length > 300 || dto.description.length > 8000) throw new BadRequestException("That is too long.");
    // Logged through the normal complaint service so numbering, response clocks and notifications to the quality team are identical.
    const created = await this.complaints.create(
      { ...u, permissions: ["quality.complaints.log"] },
      { direction: "INBOUND_CLIENT", title: dto.title, description: dto.description, partnerId, channel: "PORTAL", complainantName: `${u.forename} ${u.surname}`, complainantEmail: u.email, flagPatientSafety: !!dto.urgentSafety } as any,
    );
    return { id: created.id, referenceNumber: created.referenceNumber };
  }

  async message(u: RequestUser, id: string, text: string) {
    const body = (text ?? "").trim();
    if (!body) throw new BadRequestException("Write your message.");
    if (body.length > 4000) throw new BadRequestException("That is too long.");
    const where = { ...this.scope(u), id };
    return withTenantContext(u.organizationId, async (tx: Tx) => {
      const r = await tx.qualityComplaint.findFirst({ where });
      if (!r) throw new NotFoundException("Complaint not found.");
      if (["WITHDRAWN"].includes(r.status)) throw new ConflictException("This complaint was withdrawn.");
      await tx.qualityComplaintEvent.create({ data: { organizationId: u.organizationId, complaintId: id, kind: "CLIENT_MESSAGE", summary: `Message from ${u.forename} ${u.surname}`, body, actorUserId: u.id } });
      const who = new Set<string>([...(r.ownerId ? [r.ownerId] : []), ...(r.investigatorId ? [r.investigatorId] : [])]);
      if (!who.size) for (const x of await usersWithPermission(tx, u.organizationId, "quality.complaints.investigate")) who.add(x);
      await createNotifications(tx, [...who].map((rid) => ({ organizationId: u.organizationId, recipientUserId: rid, actorUserId: u.id, kind: "COMPLAINT_ACTION", category: "QUALITY", title: `Client message on ${r.referenceNumber}`, body: "A client has added a message. Open the complaint to read it.", link: `/quality/complaints?id=${id}`, subjectType: "complaint", subjectId: id, requiresAction: true })));
      return { id };
    });
  }

  // ---- admin side: who has a client login ----------------------------------------------------------------------------

  private guard(u: RequestUser) { if (u.platformStaffRole === "NONE" && !u.permissions.includes("org.users.manage")) throw new ForbiddenException("Client logins are managed by organisation administrators."); }

  async clients(u: RequestUser): Promise<ClientUserRow[]> {
    this.guard(u);
    const run = <T>(fn: (tx: Tx) => Promise<T>) => (u.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(u.organizationId, fn));
    return run(async (tx) => {
      const users: any[] = await tx.user.findMany({ where: { organizationId: u.organizationId, clientPartnerId: { not: null }, archivedAt: null }, select: { id: true, forename: true, surname: true, email: true, status: true, clientPartnerId: true }, orderBy: { surname: "asc" } });
      const ps: any[] = users.length ? await tx.partner.findMany({ where: { id: { in: users.map((x) => x.clientPartnerId) } }, select: { id: true, name: true } }) : [];
      const name = new Map(ps.map((p) => [p.id, p.name]));
      return users.map((x) => ({ id: x.id, name: `${x.forename} ${x.surname}`, email: x.email, status: x.status, partnerId: x.clientPartnerId, partnerName: name.get(x.clientPartnerId) ?? null }));
    });
  }

  async invite(u: RequestUser, dto: ClientInviteInput) {
    this.guard(u);
    const email = dto.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Enter a valid email address.");
    if (!dto.forename?.trim() || !dto.surname?.trim()) throw new BadRequestException("Enter the first and last name.");
    const existing = await withPlatformStaffContext((tx: Tx) => tx.user.findUnique({ where: { email }, select: { id: true } }));
    if (existing) throw new ConflictException(`${email} has already been added to Universe.`);
    const run = <T>(fn: (tx: Tx) => Promise<T>) => (u.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(u.organizationId, fn));
    return run(async (tx) => {
      const p = await tx.partner.findFirst({ where: { id: dto.partnerId, organizationId: u.organizationId }, select: { id: true } });
      if (!p) throw new NotFoundException("Client not found in this organisation.");
      const created = await tx.user.create({ data: { email, forename: dto.forename.trim(), surname: dto.surname.trim(), organizationId: u.organizationId, invitedById: u.id, clientPartnerId: p.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "users", recordId: created.id, changedById: u.id, changes: [{ field: "clientLogin", oldValue: null, newValue: `INVITED for client ${p.id}` }], source: "API" });
      return { id: created.id };
    });
  }
}
