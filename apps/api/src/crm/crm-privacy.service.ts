import { createHash } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import {
  canUseApp, retentionRule, CRM_DECISION_ROLES, CRM_LAWFUL_BASES, CRM_PRIVACY_REQUEST_TYPES, CRM_SUBSCRIBER_TYPES,
  type CrmAccessCopy, type CrmAccessLogRow, type CrmContactStatus, type CrmDecisionRole, type CrmLawfulBasis, type CrmPerson, type CrmPersonMatch, type CrmPersonUpdate,
  type CrmPrivacyRequestInput, type CrmPrivacyRequestRow, type CrmPrivacyRequestType, type CrmPrivacyRequestUpdate, type CrmPrivacySummary, type CrmRetentionItem, type CrmSubscriberType,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";

type Tx = Prisma.TransactionClient;
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const hashEmail = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Periods come from the single platform schedule (packages/types/src/retention-schedule.ts).
const LEFT_RETENTION_MONTHS = retentionRule("crm-contact-left").months;
const VERIFY_STALE_MONTHS = retentionRule("crm-contact-unverified").months;

/**
 * The CRM's privacy tools (UK GDPR; docs/CRM-STANDARDS-AND-DATA-PROTECTION.md). The person record stays in `contacts` (Project Management); this adds the
 * lawful basis and status per person, a request log with the statutory clock, subject-access search and copy, objection and erasure (irreversible
 * anonymisation in place, with a hashed-email suppression entry kept so the person is not added back), a retention review queue and an access log.
 */
@Injectable()
export class CrmPrivacyService {
  private isStaff(u: RequestUser) { return u.platformStaffRole !== "NONE"; }
  private canSeePeople(u: RequestUser) { return this.isStaff(u) || canUseApp(u.apps, "project-management"); }
  private async log(tx: Tx, u: RequestUser, action: string, extra: { contactId?: string | null; relationshipId?: string | null; detail?: string | null } = {}) {
    await tx.crmAccessLog.create({ data: { organizationId: u.organizationId, userId: u.id, action, contactId: extra.contactId ?? null, relationshipId: extra.relationshipId ?? null, detail: extra.detail?.slice(0, 300) ?? null } });
  }
  private async contactOf(tx: Tx, u: RequestUser, contactId: string) {
    const c = await tx.contact.findFirst({ where: { id: contactId, organizationId: u.organizationId }, select: { id: true, partnerId: true, name: true, email: true, phone: true, title: true } });
    if (!c) throw new NotFoundException("Contact not found.");
    return c;
  }
  private async relationshipFor(tx: Tx, u: RequestUser, partnerId: string) {
    return tx.crmRelationship.findFirst({ where: { organizationId: u.organizationId, partnerId }, select: { id: true } });
  }

  private person(c: { id: string; name: string; title: string | null; email: string | null; phone: string | null }, relationshipId: string, p: Prisma.CrmContactProfileGetPayload<object> | undefined, suppressed: boolean): CrmPerson {
    return {
      id: c.id, relationshipId, name: c.name, title: c.title, email: c.email, phone: c.phone,
      decisionRole: (p?.decisionRole as CrmDecisionRole | null) ?? null, isPrimary: p?.isPrimary ?? false, lawfulBasis: (p?.lawfulBasis as CrmLawfulBasis) ?? "LEGITIMATE_INTERESTS", lawfulBasisReason: p?.lawfulBasisReason ?? null,
      subscriberType: (p?.subscriberType as CrmSubscriberType) ?? "UNKNOWN", status: (p?.status as CrmContactStatus) ?? "ACTIVE",
      lastVerifiedAt: p?.lastVerifiedAt?.toISOString() ?? null, noticeSentAt: p?.noticeSentAt?.toISOString() ?? null, suppressed,
    };
  }

  /** The people at a stakeholder, with their CRM profile. Viewing is logged. */
  async people(u: RequestUser, relationshipId: string): Promise<CrmPerson[]> {
    assertHasPermission(u, "crm.view");
    if (!this.canSeePeople(u)) throw new ForbiddenException("Contacts are held in Project Management; you need access to that app to see them.");
    return withTenantContext(u.organizationId, async (tx) => {
      const rel = await tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: u.organizationId }, select: { partnerId: true } });
      if (!rel) throw new NotFoundException("Relationship not found.");
      if (!rel.partnerId) return [];
      const contacts = await tx.contact.findMany({ where: { organizationId: u.organizationId, partnerId: rel.partnerId }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, title: true, email: true, phone: true } });
      const profiles = contacts.length ? await tx.crmContactProfile.findMany({ where: { organizationId: u.organizationId, contactId: { in: contacts.map((c) => c.id) } } }) : [];
      const byId = new Map(profiles.map((p) => [p.contactId, p]));
      const hashes = contacts.filter((c) => c.email).map((c) => hashEmail(c.email!));
      const sup = hashes.length ? new Set((await tx.crmSuppression.findMany({ where: { organizationId: u.organizationId, emailHash: { in: hashes } }, select: { emailHash: true } })).map((s) => s.emailHash)) : new Set<string>();
      await this.log(tx, u, "VIEW_PEOPLE", { relationshipId, detail: `${contacts.length} people` });
      return contacts.map((c) => this.person(c, relationshipId, byId.get(c.id), !!c.email && sup.has(hashEmail(c.email))));
    });
  }

  async updateProfile(u: RequestUser, contactId: string, dto: CrmPersonUpdate): Promise<CrmPerson> {
    assertHasPermission(u, "crm.manage");
    if (dto.decisionRole && !CRM_DECISION_ROLES.includes(dto.decisionRole)) throw new BadRequestException("Choose a role from the list.");
    if (dto.lawfulBasis && !CRM_LAWFUL_BASES.includes(dto.lawfulBasis)) throw new BadRequestException("Choose a lawful basis from the list.");
    if (dto.subscriberType && !CRM_SUBSCRIBER_TYPES.includes(dto.subscriberType)) throw new BadRequestException("Choose a type from the list.");
    if (dto.status && !["ACTIVE", "LEFT", "RESTRICTED"].includes(dto.status)) throw new BadRequestException("Use the objection or anonymise actions for that status.");
    return withTenantContext(u.organizationId, async (tx) => {
      const c = await this.contactOf(tx, u, contactId);
      const rel = await this.relationshipFor(tx, u, c.partnerId);
      if (!rel) throw new NotFoundException("This contact's stakeholder has no relationship record yet.");
      const cur = await tx.crmContactProfile.findFirst({ where: { contactId, organizationId: u.organizationId } });
      if (cur && (cur.status === "ANONYMISED" || cur.status === "OBJECTED")) throw new BadRequestException("This person has been anonymised or has objected; their record can no longer be changed.");
      const now = new Date();
      const data: Prisma.CrmContactProfileUncheckedUpdateInput = {};
      if (dto.decisionRole !== undefined) data.decisionRole = dto.decisionRole;
      // One primary contact per stakeholder: choosing one clears the previous one. Someone who has left or is restricted cannot be the main contact.
      const leaving = dto.status === "LEFT" || dto.status === "RESTRICTED";
      if (dto.isPrimary === true) {
        const effective = dto.status ?? cur?.status ?? "ACTIVE";
        if (effective !== "ACTIVE") throw new BadRequestException("Only a current contact can be the primary contact.");
        const mates = await tx.contact.findMany({ where: { organizationId: u.organizationId, partnerId: c.partnerId, id: { not: contactId } }, select: { id: true }, take: 500 });
        if (mates.length) await tx.crmContactProfile.updateMany({ where: { organizationId: u.organizationId, contactId: { in: mates.map((m) => m.id) }, isPrimary: true }, data: { isPrimary: false } });
        data.isPrimary = true;
      } else if (dto.isPrimary === false || leaving) data.isPrimary = false;
      if (dto.lawfulBasis) data.lawfulBasis = dto.lawfulBasis;
      if (dto.lawfulBasisReason !== undefined) data.lawfulBasisReason = dto.lawfulBasisReason?.trim().slice(0, 500) || null;
      if (dto.subscriberType) data.subscriberType = dto.subscriberType;
      if (dto.status) { data.status = dto.status; data.leftAt = dto.status === "LEFT" ? now : null; }
      if (dto.markVerified) data.lastVerifiedAt = now;
      if (dto.noticeSent) data.noticeSentAt = now;
      const row = cur
        ? await tx.crmContactProfile.update({ where: { id: cur.id }, data })
        : await tx.crmContactProfile.create({ data: { organizationId: u.organizationId, contactId, ...(data as object) } as Prisma.CrmContactProfileUncheckedCreateInput });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_contact_profiles", recordId: row.id, changedById: u.id,
        changes: diffForAudit(cur ?? { decisionRole: null, isPrimary: false, lawfulBasis: "LEGITIMATE_INTERESTS", lawfulBasisReason: null, subscriberType: "UNKNOWN", status: "ACTIVE", lastVerifiedAt: null, noticeSentAt: null }, row, ["decisionRole", "isPrimary", "lawfulBasis", "lawfulBasisReason", "subscriberType", "status", "lastVerifiedAt", "noticeSentAt"]) });
      await this.log(tx, u, "EDIT_PROFILE", { contactId, relationshipId: rel.id });
      const suppressed = !!c.email && !!(await tx.crmSuppression.findFirst({ where: { organizationId: u.organizationId, emailHash: hashEmail(c.email) }, select: { id: true } }));
      return this.person(c, rel.id, row, suppressed);
    });
  }

  private async addSuppression(tx: Tx, u: RequestUser, email: string | null, reason: "OBJECTION" | "ERASURE" | "OTHER") {
    if (!email?.trim()) return;
    const emailHash = hashEmail(email);
    const exists = await tx.crmSuppression.findFirst({ where: { organizationId: u.organizationId, emailHash }, select: { id: true } });
    if (!exists) await tx.crmSuppression.create({ data: { organizationId: u.organizationId, emailHash, reason, createdById: u.id } });
  }

  /** A person objects: they are marked, and their email goes on the suppression list. Their record is otherwise left for a reviewer to decide. */
  async object(u: RequestUser, contactId: string): Promise<CrmPerson> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const c = await this.contactOf(tx, u, contactId);
      const rel = await this.relationshipFor(tx, u, c.partnerId);
      const cur = await tx.crmContactProfile.findFirst({ where: { contactId, organizationId: u.organizationId } });
      if (cur?.status === "ANONYMISED") throw new BadRequestException("This person has already been anonymised.");
      const row = cur ? await tx.crmContactProfile.update({ where: { id: cur.id }, data: { status: "OBJECTED" } }) : await tx.crmContactProfile.create({ data: { organizationId: u.organizationId, contactId, status: "OBJECTED" } });
      await this.addSuppression(tx, u, c.email, "OBJECTION");
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_contact_profiles", recordId: row.id, changedById: u.id, changes: [{ field: "status", oldValue: cur?.status ?? "ACTIVE", newValue: "OBJECTED" }] });
      await this.log(tx, u, "OBJECTION", { contactId, relationshipId: rel?.id });
      return this.person(c, rel?.id ?? "", row, !!c.email);
    });
  }

  /**
   * Erasure by irreversible anonymisation in place: the person's name, email, phone and title are removed from the contact, their name and email are
   * replaced in interaction text and complaint complainant fields, the contact is removed from interaction participant lists, old values are scrubbed from the
   * change log, and only a one-way hash of the email stays (suppression list). The business facts remain. The outcome says what was found, because a
   * nickname or a reference to someone's role in free text cannot be found by a machine and needs a human check.
   */
  async anonymise(u: RequestUser, contactId: string, body: { reason?: string; privacyRequestId?: string | null }): Promise<{ interactionsScrubbed: number; complaintsScrubbed: number; note: string }> {
    assertHasPermission(u, "crm.manage");
    const reason = body.reason?.trim();
    if (!reason) throw new BadRequestException("Say why this person is being anonymised.");
    return withTenantContext(u.organizationId, async (tx) => {
      const c = await this.contactOf(tx, u, contactId);
      const org = u.organizationId;
      const rel = await this.relationshipFor(tx, u, c.partnerId);
      const cur = await tx.crmContactProfile.findFirst({ where: { contactId, organizationId: org } });
      if (cur?.status === "ANONYMISED") throw new BadRequestException("This person has already been anonymised.");
      const needles = [c.name, c.email].filter((x): x is string => !!x && x.trim().length >= 3).map((x) => x.trim());
      const textHit: Prisma.CrmInteractionWhereInput[] = needles.flatMap((n) => [{ title: { contains: n } }, { summary: { contains: n } }, { outcome: { contains: n } }]);
      const rows = await tx.crmInteraction.findMany({ where: { organizationId: org, OR: [{ contactIds: { contains: contactId } }, ...textHit] }, take: 2000 });
      let scrubbed = 0;
      const scrub = (t: string | null) => { if (!t) return t; let out = t; for (const n of needles) out = out.replace(new RegExp(escapeRe(n), "gi"), "[removed]"); return out; };
      for (const r of rows) {
        let ids: string[] = []; try { ids = JSON.parse(r.contactIds ?? "[]"); } catch { ids = []; }
        const nextIds = ids.filter((i) => i !== contactId);
        const title = scrub(r.title) ?? r.title, summary = scrub(r.summary), outcome = scrub(r.outcome);
        const changed = nextIds.length !== ids.length || title !== r.title || summary !== r.summary || outcome !== r.outcome;
        if (!changed) continue;
        await tx.crmInteraction.update({ where: { id: r.id }, data: { title, summary, outcome, contactIds: nextIds.length ? JSON.stringify(nextIds) : null } });
        scrubbed++;
      }
      const complaints = await tx.qualityComplaint.updateMany({ where: { organizationId: org, contactId }, data: { complainantName: "Anonymised", complainantEmail: null, complainantPhone: null } });
      await tx.fieldChangeLog.updateMany({ where: { organizationId: org, tableName: "contacts", recordId: contactId, fieldName: { in: ["name", "email", "phone", "title"] } }, data: { oldValue: "[anonymised]", newValue: "[anonymised]" } });
      await this.addSuppression(tx, u, c.email, "ERASURE");
      await tx.contact.update({ where: { id: contactId }, data: { name: "Anonymised contact", email: null, phone: null, title: null } });
      const now = new Date();
      const prof = cur ? await tx.crmContactProfile.update({ where: { id: cur.id }, data: { status: "ANONYMISED", anonymisedAt: now, lawfulBasisReason: null } })
        : await tx.crmContactProfile.create({ data: { organizationId: org, contactId, status: "ANONYMISED", anonymisedAt: now } });
      await recordFieldChanges(tx, { organizationId: org, tableName: "crm_contact_profiles", recordId: prof.id, changedById: u.id, reason: reason.slice(0, 500), changes: [{ field: "status", oldValue: cur?.status ?? "ACTIVE", newValue: "ANONYMISED" }] });
      if (body.privacyRequestId) {
        await tx.crmPrivacyRequest.updateMany({ where: { id: body.privacyRequestId, organizationId: org, status: { in: ["OPEN", "WAITING"] } }, data: { status: "COMPLETED", completedAt: now, decision: "Erased by anonymisation." } });
      }
      await this.log(tx, u, "ANONYMISE", { contactId, relationshipId: rel?.id, detail: `${scrubbed} interactions and ${complaints.count} complaints scrubbed` });
      return { interactionsScrubbed: scrubbed, complaintsScrubbed: complaints.count, note: "Names and emails were replaced wherever they appeared exactly. Check free-text notes for nicknames or descriptions that still point to this person. Backups are put beyond use and overwritten on the normal schedule." };
    });
  }

  /** Subject-access search: everyone in the organisation matching a name or email, with how many records mention them. */
  async findPerson(u: RequestUser, q: string): Promise<CrmPersonMatch[]> {
    assertHasPermission(u, "crm.manage");
    const needle = q.trim();
    if (needle.length < 3) throw new BadRequestException("Type at least three characters of a name or email address.");
    return withTenantContext(u.organizationId, async (tx) => {
      const org = u.organizationId;
      const cs = await tx.contact.findMany({ where: { organizationId: org, OR: [{ name: { contains: needle } }, { email: { contains: needle } }] }, take: 25, include: { partner: { select: { name: true } } } });
      const profiles = cs.length ? await tx.crmContactProfile.findMany({ where: { organizationId: org, contactId: { in: cs.map((c) => c.id) } }, select: { contactId: true, status: true } }) : [];
      const st = new Map(profiles.map((p) => [p.contactId, p.status as CrmContactStatus]));
      const out: CrmPersonMatch[] = [];
      for (const c of cs) {
        const rel = await this.relationshipFor(tx, u, c.partnerId);
        const names = [c.name, c.email].filter((x): x is string => !!x && x.length >= 3);
        const [inter, mentions] = await Promise.all([
          tx.crmInteraction.count({ where: { organizationId: org, contactIds: { contains: c.id } } }),
          names.length ? tx.crmInteraction.count({ where: { organizationId: org, OR: names.flatMap((n) => [{ title: { contains: n } }, { summary: { contains: n } }, { outcome: { contains: n } }]) } }) : Promise.resolve(0),
        ]);
        out.push({ contactId: c.id, name: c.name, email: c.email, partnerName: c.partner?.name ?? null, relationshipId: rel?.id ?? null, status: st.get(c.id) ?? "ACTIVE", interactions: inter, mentions });
      }
      await this.log(tx, u, "SEARCH_PERSON", { detail: `search "${needle.slice(0, 60)}": ${out.length} found` });
      return out;
    });
  }

  /** A copy of everything the CRM holds about one person, for a subject access request. Confidential items are included (the person is entitled to them). */
  async accessCopy(u: RequestUser, contactId: string): Promise<CrmAccessCopy> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const org = u.organizationId;
      const c = await this.contactOf(tx, u, contactId);
      const rel = await this.relationshipFor(tx, u, c.partnerId);
      const names = [c.name, c.email].filter((x): x is string => !!x && x.length >= 3);
      const [profile, inter, projects, complaints] = await Promise.all([
        tx.crmContactProfile.findFirst({ where: { contactId, organizationId: org } }),
        tx.crmInteraction.findMany({ where: { organizationId: org, OR: [{ contactIds: { contains: contactId } }, ...names.flatMap((n) => [{ title: { contains: n } }, { summary: { contains: n } }, { outcome: { contains: n } }])] }, orderBy: { occurredAt: "desc" }, take: 500 }),
        tx.projectContact.findMany({ where: { contactId, project: { organizationId: org } }, include: { project: { select: { referenceNumber: true, title: true } } }, take: 200 }),
        tx.qualityComplaint.findMany({ where: { organizationId: org, contactId }, select: { referenceNumber: true, title: true, status: true, receivedAt: true, complainantName: true, complainantEmail: true, complainantPhone: true }, take: 200 }),
      ]);
      await this.log(tx, u, "EXPORT_COPY", { contactId, relationshipId: rel?.id });
      const linked = inter.filter((i) => (i.contactIds ?? "").includes(contactId));
      return {
        generatedAt: new Date().toISOString(),
        contact: { name: c.name, title: c.title, email: c.email, phone: c.phone },
        profile: profile ? { decisionRole: profile.decisionRole, lawfulBasis: profile.lawfulBasis, lawfulBasisReason: profile.lawfulBasisReason, subscriberType: profile.subscriberType, status: profile.status, lastVerifiedAt: profile.lastVerifiedAt, noticeSentAt: profile.noticeSentAt } : null,
        interactions: linked.map((i) => ({ date: i.occurredAt, type: i.type, title: i.title, summary: i.summary, outcome: i.outcome, confidential: i.confidential })),
        mentions: inter.filter((i) => !linked.includes(i)).map((i) => ({ date: i.occurredAt, type: i.type, title: i.title, summary: i.summary, outcome: i.outcome, confidential: i.confidential })),
        projects: projects.map((p) => ({ project: `${p.project.referenceNumber} ${p.project.title}`, removed: !!p.removedAt })),
        complaints: complaints.map((x) => ({ reference: x.referenceNumber, title: x.title, status: x.status, received: x.receivedAt, complainantName: x.complainantName, complainantEmail: x.complainantEmail, complainantPhone: x.complainantPhone })),
        note: "Review before sending: entries under 'mentions' name the person in notes about others and may include information about other people, which must be redacted. Check any exemption that applies.",
      };
    });
  }

  // ---- Requests ----------------------------------------------------------------------------------------------------------------------------------

  private shapeReq(r: Prisma.CrmPrivacyRequestGetPayload<object>): CrmPrivacyRequestRow {
    const open = r.status === "OPEN" || r.status === "WAITING";
    return {
      id: r.id, type: r.type as CrmPrivacyRequestType, contactId: r.contactId, requesterName: r.requesterName, requesterEmail: r.requesterEmail, receivedAt: r.receivedAt.toISOString(),
      identityConfirmedAt: r.identityConfirmedAt?.toISOString() ?? null, dueAt: r.dueAt.toISOString(), clockStoppedAt: r.clockStoppedAt?.toISOString() ?? null, extendedUntil: r.extendedUntil?.toISOString() ?? null,
      status: r.status as CrmPrivacyRequestRow["status"], decision: r.decision, exemptionReason: r.exemptionReason, completedAt: r.completedAt?.toISOString() ?? null,
      overdue: open && !r.clockStoppedAt && r.dueAt.getTime() < Date.now(),
    };
  }

  async requests(u: RequestUser, status?: string, q?: string, type?: string): Promise<CrmPrivacyRequestRow[]> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const where: Prisma.CrmPrivacyRequestWhereInput = { organizationId: u.organizationId, ...(status === "open" ? { status: { in: ["OPEN", "WAITING"] } } : status === "closed" ? { status: { in: ["COMPLETED", "REFUSED"] } } : {}), ...(type ? { type } : {}), ...(q?.trim() ? { AND: q.trim().split(/\s+/).slice(0, 5).map((w) => ({ OR: [{ requesterName: { contains: w } }, { requesterEmail: { contains: w } }, { decision: { contains: w } }] })) } : {}) };
      return (await tx.crmPrivacyRequest.findMany({ where, orderBy: [{ dueAt: "asc" }], take: 200 })).map((r) => this.shapeReq(r));
    });
  }

  async createRequest(u: RequestUser, dto: CrmPrivacyRequestInput): Promise<CrmPrivacyRequestRow> {
    assertHasPermission(u, "crm.manage");
    if (!CRM_PRIVACY_REQUEST_TYPES.includes(dto.type)) throw new BadRequestException("Choose a type of request.");
    if (!dto.requesterName?.trim()) throw new BadRequestException("Enter the name of the person making the request.");
    const received = new Date(dto.receivedAt);
    if (isNaN(received.getTime()) || received.getTime() > Date.now() + 86400000) throw new BadRequestException("Enter the date the request was received (not in the future).");
    return withTenantContext(u.organizationId, async (tx) => {
      if (dto.contactId) await this.contactOf(tx, u, dto.contactId);
      const r = await tx.crmPrivacyRequest.create({ data: { organizationId: u.organizationId, type: dto.type, contactId: dto.contactId ?? null, requesterName: dto.requesterName.trim().slice(0, 200), requesterEmail: dto.requesterEmail?.trim().slice(0, 300) || null, receivedAt: received, dueAt: addMonths(received, 1), createdById: u.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_privacy_requests", recordId: r.id, changedById: u.id, changes: [{ field: "created", oldValue: null, newValue: dto.type }] });
      return this.shapeReq(r);
    });
  }

  async updateRequest(u: RequestUser, id: string, dto: CrmPrivacyRequestUpdate): Promise<CrmPrivacyRequestRow> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const cur = await tx.crmPrivacyRequest.findFirst({ where: { id, organizationId: u.organizationId } });
      if (!cur) throw new NotFoundException("Request not found.");
      if (cur.status === "COMPLETED" || cur.status === "REFUSED") throw new BadRequestException("This request is closed.");
      const now = new Date();
      const data: Prisma.CrmPrivacyRequestUncheckedUpdateInput = {};
      if (dto.identityConfirmed) data.identityConfirmedAt = now;
      if (dto.pauseClock) { if (cur.clockStoppedAt) throw new BadRequestException("The clock is already paused."); data.clockStoppedAt = now; data.status = "WAITING"; }
      if (dto.resumeClock) { if (!cur.clockStoppedAt) throw new BadRequestException("The clock is not paused."); data.dueAt = new Date(cur.dueAt.getTime() + (now.getTime() - cur.clockStoppedAt.getTime())); data.clockStoppedAt = null; data.status = "OPEN"; }
      if (dto.extendTwoMonths) { if (cur.extendedUntil) throw new BadRequestException("This request has already been extended."); data.dueAt = addMonths((data.dueAt as Date) ?? cur.dueAt, 2); data.extendedUntil = data.dueAt; }
      if (dto.status === "COMPLETED" || dto.status === "REFUSED") {
        if (!dto.decision?.trim()) throw new BadRequestException("Record what was decided and what was done.");
        if (dto.status === "REFUSED" && !dto.exemptionReason?.trim()) throw new BadRequestException("A refusal needs the exemption or reason relied on.");
        data.status = dto.status; data.completedAt = now; data.decision = dto.decision.trim().slice(0, 1000); data.exemptionReason = dto.exemptionReason?.trim().slice(0, 500) || null; data.clockStoppedAt = null;
      }
      const row = await tx.crmPrivacyRequest.update({ where: { id }, data });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_privacy_requests", recordId: id, changedById: u.id, changes: diffForAudit(cur, row, ["status", "dueAt", "clockStoppedAt", "identityConfirmedAt", "extendedUntil", "completedAt"]) });
      return this.shapeReq(row);
    });
  }

  // ---- Retention, suppression, access log, summary --------------------------------------------------------------------------------------------------

  /** People nobody has a reason to keep any more, by rule: left more than 24 months ago, not verified for 36 months, or at a stakeholder whose relationship ended more than 24 months ago. A person decides: keep (for another year) or anonymise. */
  async retention(u: RequestUser): Promise<CrmRetentionItem[]> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const org = u.organizationId; const now = new Date();
      const notKept: Prisma.CrmContactProfileWhereInput = { OR: [{ retentionReviewDue: null }, { retentionReviewDue: { lt: now } }] };
      const [left, stale, ended] = await Promise.all([
        tx.crmContactProfile.findMany({ where: { organizationId: org, status: "LEFT", leftAt: { lt: addMonths(now, -LEFT_RETENTION_MONTHS) }, ...notKept }, select: { contactId: true }, take: 100 }),
        tx.crmContactProfile.findMany({ where: { organizationId: org, status: { in: ["ACTIVE", "RESTRICTED"] }, lastVerifiedAt: { lt: addMonths(now, -VERIFY_STALE_MONTHS) }, ...notKept }, select: { contactId: true }, take: 100 }),
        tx.crmRelationship.findMany({ where: { organizationId: org, status: "ENDED", updatedAt: { lt: addMonths(now, -LEFT_RETENTION_MONTHS) } }, select: { partnerId: true }, take: 100 }),
      ]);
      const reasons = new Map<string, string[]>();
      const add = (id: string, r: string) => reasons.set(id, [...(reasons.get(id) ?? []), r]);
      left.forEach((p) => add(p.contactId, `Left more than ${LEFT_RETENTION_MONTHS} months ago`));
      stale.forEach((p) => add(p.contactId, `Not verified for ${VERIFY_STALE_MONTHS} months`));
      const endedPartners = ended.map((r) => r.partnerId).filter((x): x is string => !!x);
      if (endedPartners.length) {
        const cs = await tx.contact.findMany({ where: { organizationId: org, partnerId: { in: endedPartners } }, select: { id: true }, take: 300 });
        const profs = cs.length ? await tx.crmContactProfile.findMany({ where: { organizationId: org, contactId: { in: cs.map((c) => c.id) } }, select: { contactId: true, status: true, retentionReviewDue: true } }) : [];
        const pm = new Map(profs.map((p) => [p.contactId, p]));
        for (const c of cs) { const p = pm.get(c.id); if (p?.status === "ANONYMISED") continue; if (p?.retentionReviewDue && p.retentionReviewDue > now) continue; add(c.id, `Relationship ended more than ${LEFT_RETENTION_MONTHS} months ago`); }
      }
      const ids = [...reasons.keys()].slice(0, 100);
      if (!ids.length) return [];
      const contacts = await tx.contact.findMany({ where: { organizationId: org, id: { in: ids } }, include: { partner: { select: { name: true } } } });
      const out: CrmRetentionItem[] = [];
      for (const c of contacts) { const rel = await this.relationshipFor(tx, u, c.partnerId); out.push({ contactId: c.id, name: c.name, partnerName: c.partner?.name ?? null, relationshipId: rel?.id ?? null, reasons: reasons.get(c.id) ?? [] }); }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async keep(u: RequestUser, contactId: string): Promise<void> {
    assertHasPermission(u, "crm.manage");
    await withTenantContext(u.organizationId, async (tx) => {
      await this.contactOf(tx, u, contactId);
      const cur = await tx.crmContactProfile.findFirst({ where: { contactId, organizationId: u.organizationId } });
      const until = addMonths(new Date(), 12);
      const row = cur ? await tx.crmContactProfile.update({ where: { id: cur.id }, data: { retentionReviewDue: until } }) : await tx.crmContactProfile.create({ data: { organizationId: u.organizationId, contactId, retentionReviewDue: until } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_contact_profiles", recordId: row.id, changedById: u.id, changes: [{ field: "retentionReviewDue", oldValue: cur?.retentionReviewDue?.toISOString() ?? null, newValue: until.toISOString() }] });
      await this.log(tx, u, "EDIT_PROFILE", { contactId, detail: "kept after retention review for 12 months" });
    });
  }

  async suppressions(u: RequestUser): Promise<{ total: number; recent: { id: string; reason: string; createdAt: string }[] }> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const [total, rows] = await Promise.all([tx.crmSuppression.count({ where: { organizationId: u.organizationId } }), tx.crmSuppression.findMany({ where: { organizationId: u.organizationId }, orderBy: { createdAt: "desc" }, take: 50 })]);
      return { total, recent: rows.map((r) => ({ id: r.id, reason: r.reason, createdAt: r.createdAt.toISOString() })) };
    });
  }

  /** Add an address to the suppression list without needing a contact record (for example an objection received by email). Only the hash is kept. */
  async suppress(u: RequestUser, email: string): Promise<void> {
    assertHasPermission(u, "crm.manage");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new BadRequestException("Enter a valid email address.");
    await withTenantContext(u.organizationId, async (tx) => { await this.addSuppression(tx, u, email, "OTHER"); await this.log(tx, u, "OBJECTION", { detail: "address added to the suppression list" }); });
  }

  async accessLog(u: RequestUser): Promise<CrmAccessLogRow[]> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const rows = await tx.crmAccessLog.findMany({ where: { organizationId: u.organizationId }, orderBy: { at: "desc" }, take: 100 });
      const users = rows.length ? await tx.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.userId))] }, organizationId: u.organizationId }, select: { id: true, forename: true, surname: true } }) : [];
      const name = new Map(users.map((x) => [x.id, `${x.forename} ${x.surname}`.trim()]));
      return rows.map((r) => ({ id: r.id, userName: name.get(r.userId) ?? null, action: r.action, contactId: r.contactId, detail: r.detail, at: r.at.toISOString() }));
    });
  }

  async summary(u: RequestUser): Promise<CrmPrivacySummary> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const org = u.organizationId;
      const [open, overdue, supp] = await Promise.all([
        tx.crmPrivacyRequest.count({ where: { organizationId: org, status: { in: ["OPEN", "WAITING"] } } }),
        tx.crmPrivacyRequest.count({ where: { organizationId: org, status: "OPEN", dueAt: { lt: new Date() } } }),
        tx.crmSuppression.count({ where: { organizationId: org } }),
      ]);
      return { openRequests: open, overdueRequests: overdue, retentionDue: -1, suppressions: supp };
    }).then(async (r) => ({ ...r, retentionDue: (await this.retention(u)).length }));
  }
}
