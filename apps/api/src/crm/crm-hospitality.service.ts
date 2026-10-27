import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import {
  CRM_HOSPITALITY_CATEGORIES, CRM_HOSPITALITY_DIRECTIONS, CRM_HOSPITALITY_STATUSES,
  type CrmComplianceSummary, type CrmGiftPolicy, type CrmGiftPolicyInput, type CrmHospitalityCategory, type CrmHospitalityDecision, type CrmHospitalityDirection,
  type CrmHospitalityInput, type CrmHospitalityPage, type CrmHospitalityRecord, type CrmHospitalityStatus,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { completeActionsFor, createNotifications, usersWithPermission } from "../notifications/notify";
import { convertAmount } from "../tenders/tender-framework";
import { evaluateHospitality, type PolicyRules } from "./crm-hospitality-rules";

type Tx = Prisma.TransactionClient;
const DEFAULTS = { currency: "GBP", giftThreshold: 50, hospitalityThreshold: 150, annualThreshold: 300, alwaysApprovePublicOfficial: true };
const DAY = 86400000;
const ccy = (s: string | undefined | null) => (s ?? "").trim().toUpperCase();
const parseIds = (s: string | null): string[] => { try { const v = JSON.parse(s ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
const dateOnly = (s: string) => { const d = new Date(`${s.slice(0, 10)}T00:00:00Z`); return isNaN(d.getTime()) ? null : d; };
const AUDITED = ["direction", "category", "occurredOn", "description", "businessReason", "amount", "currency", "publicOfficial", "contactId", "personName", "linkedId", "evidenceDocumentId", "additionalInfo", "status", "decisionNote", "archivedAt"] as const;

type Row = Prisma.CrmHospitalityRecordGetPayload<{ include: { relationship: { select: { ownerUserId: true; partner: { select: { name: true } } } } } }>;
const include = { relationship: { select: { ownerUserId: true, partner: { select: { name: true } } } } } as const;

/**
 * Gifts and hospitality (anti-bribery register; UK Bribery Act 2010 and ISO 37001 expect a policy, approval where needed and a record that can be audited).
 * The organisation sets its own thresholds and attaches its policy (a file or a link); this only applies them. A record is judged when saved, the reasons are
 * kept on it, and one that needs approval waits for a different person. Nothing is deleted (archive); every change is written to the audit log.
 */
@Injectable()
export class CrmHospitalityService {
  constructor(@Optional() private readonly fx?: ExchangeRatesService) {}

  private rulesOf(p: { currency: string; giftThreshold: unknown; hospitalityThreshold: unknown; annualThreshold: unknown; alwaysApprovePublicOfficial: boolean }): PolicyRules {
    return { currency: p.currency, giftThreshold: Number(p.giftThreshold), hospitalityThreshold: Number(p.hospitalityThreshold), annualThreshold: Number(p.annualThreshold), alwaysApprovePublicOfficial: p.alwaysApprovePublicOfficial };
  }
  private async policyRow(tx: Tx, org: string) { return tx.crmGiftPolicy.findUnique({ where: { organizationId: org } }); }
  private async rules(tx: Tx, org: string): Promise<{ rules: PolicyRules; approverIds: string[] }> {
    const p = await this.policyRow(tx, org);
    return { rules: p ? this.rulesOf(p) : DEFAULTS, approverIds: p ? parseIds(p.approverUserIds) : [] };
  }

  // ---- policy ----
  async policy(user: RequestUser): Promise<CrmGiftPolicy> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => this.shapePolicy(tx, user.organizationId, await this.policyRow(tx, user.organizationId)));
  }

  private async shapePolicy(tx: Tx, org: string, p: Awaited<ReturnType<CrmHospitalityService["policyRow"]>>): Promise<CrmGiftPolicy> {
    const ids = p ? parseIds(p.approverUserIds) : [];
    const us = ids.length ? await tx.user.findMany({ where: { id: { in: ids }, organizationId: org }, select: { id: true, forename: true, surname: true } }) : [];
    const upd = p?.updatedById ? await tx.user.findFirst({ where: { id: p.updatedById, organizationId: org }, select: { forename: true, surname: true } }) : null;
    const d = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : null);
    return {
      currency: p?.currency ?? DEFAULTS.currency, giftThreshold: Number(p?.giftThreshold ?? DEFAULTS.giftThreshold), hospitalityThreshold: Number(p?.hospitalityThreshold ?? DEFAULTS.hospitalityThreshold),
      annualThreshold: Number(p?.annualThreshold ?? DEFAULTS.annualThreshold), alwaysApprovePublicOfficial: p?.alwaysApprovePublicOfficial ?? DEFAULTS.alwaysApprovePublicOfficial,
      approverUserIds: ids, approvers: us.map((u) => ({ id: u.id, name: `${u.forename} ${u.surname}`.trim() })),
      policyDocumentId: p?.policyDocumentId ?? null, policyTitle: p?.policyTitle ?? null, policyVersion: p?.policyVersion ?? null, policyEffectiveFrom: d(p?.policyEffectiveFrom), policyReviewDue: d(p?.policyReviewDue),
      confirmed: !!p?.confirmedAt, updatedAt: p?.updatedAt.toISOString() ?? null, updatedByName: upd ? `${upd.forename} ${upd.surname}`.trim() : null,
      reviewOverdue: !!p?.policyReviewDue && p.policyReviewDue.getTime() < Date.now(),
    };
  }

  async savePolicy(user: RequestUser, dto: CrmGiftPolicyInput): Promise<CrmGiftPolicy> {
    assertHasPermission(user, "crm.manage");
    const money = (v: number | undefined, label: string) => {
      if (v === undefined) return undefined;
      if (typeof v !== "number" || !isFinite(v) || v < 0 || v > 1e9) throw new BadRequestException(`${label} must be a number from 0 upwards.`);
      return Math.round(v * 100) / 100;
    };
    const currency = dto.currency === undefined ? undefined : ccy(dto.currency);
    if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) throw new BadRequestException("Use a three-letter currency code, such as GBP.");
    const gift = money(dto.giftThreshold, "The gift threshold"); const hosp = money(dto.hospitalityThreshold, "The hospitality threshold"); const annual = money(dto.annualThreshold, "The yearly threshold");
    const eff = dto.policyEffectiveFrom === undefined ? undefined : dto.policyEffectiveFrom ? dateOnly(dto.policyEffectiveFrom) : null;
    const rev = dto.policyReviewDue === undefined ? undefined : dto.policyReviewDue ? dateOnly(dto.policyReviewDue) : null;
    if (eff === null && dto.policyEffectiveFrom) throw new BadRequestException("Enter a valid effective date.");
    if (rev === null && dto.policyReviewDue) throw new BadRequestException("Enter a valid review date.");
    return withTenantContext(user.organizationId, async (tx) => {
      const org = user.organizationId;
      if (dto.approverUserIds !== undefined) {
        const uniq = [...new Set(dto.approverUserIds)];
        const ok = uniq.length ? await usersWithPermission(tx, org, "crm.manage") : [];
        if (uniq.some((id) => !ok.includes(id))) throw new BadRequestException("Approvers must be people in your organisation who can manage the CRM.");
      }
      if (dto.policyDocumentId) {
        const d = await tx.projectDocument.findFirst({ where: { id: dto.policyDocumentId, organizationId: org, projectId: null, archivedAt: null }, select: { id: true } });
        if (!d) throw new BadRequestException("That policy document was not found.");
      }
      const cur = await this.policyRow(tx, org);
      const data: Prisma.CrmGiftPolicyUncheckedUpdateInput = { updatedById: user.id, confirmedAt: new Date() };
      if (currency !== undefined) data.currency = currency;
      if (gift !== undefined) data.giftThreshold = gift;
      if (hosp !== undefined) data.hospitalityThreshold = hosp;
      if (annual !== undefined) data.annualThreshold = annual;
      if (dto.alwaysApprovePublicOfficial !== undefined) data.alwaysApprovePublicOfficial = !!dto.alwaysApprovePublicOfficial;
      if (dto.approverUserIds !== undefined) data.approverUserIds = dto.approverUserIds.length ? JSON.stringify([...new Set(dto.approverUserIds)]) : null;
      if (dto.policyDocumentId !== undefined) data.policyDocumentId = dto.policyDocumentId || null;
      if (dto.policyTitle !== undefined) data.policyTitle = dto.policyTitle?.trim().slice(0, 200) || null;
      if (dto.policyVersion !== undefined) data.policyVersion = dto.policyVersion?.trim().slice(0, 50) || null;
      if (eff !== undefined) data.policyEffectiveFrom = eff;
      if (rev !== undefined) data.policyReviewDue = rev;
      const row = cur
        ? await tx.crmGiftPolicy.update({ where: { organizationId: org }, data })
        : await tx.crmGiftPolicy.create({ data: { ...data, organizationId: org } as Prisma.CrmGiftPolicyUncheckedCreateInput });
      await recordFieldChanges(tx, { organizationId: org, tableName: "crm_gift_policies", recordId: row.id, changedById: user.id,
        changes: cur ? diffForAudit(cur, data, ["currency", "giftThreshold", "hospitalityThreshold", "annualThreshold", "alwaysApprovePublicOfficial", "approverUserIds", "policyDocumentId", "policyTitle", "policyVersion", "policyEffectiveFrom", "policyReviewDue"]) : [{ field: "created", oldValue: null, newValue: "policy set" }] });
      return this.shapePolicy(tx, org, row);
    });
  }

  // ---- records ----
  private shape(user: RequestUser, rows: Row[], names: Map<string, string>, approverIds: string[]): CrmHospitalityRecord[] {
    const manager = user.platformStaffRole !== "NONE" || user.permissions.includes("crm.manage");
    return rows.map((r) => {
      let reasons: string[] = []; try { reasons = JSON.parse(r.approvalReasons ?? "[]"); } catch { /* none */ }
      const canDecide = manager && r.status === "PENDING_APPROVAL" && r.createdById !== user.id && (!approverIds.length || approverIds.includes(user.id));
      return {
        id: r.id, relationshipId: r.relationshipId, relationshipName: r.relationship.partner?.name ?? "Unknown", direction: r.direction as CrmHospitalityDirection, category: r.category as CrmHospitalityCategory,
        occurredOn: r.occurredOn.toISOString().slice(0, 10), description: r.description, businessReason: r.businessReason, amount: Number(r.amount), currency: r.currency,
        valueInPolicyCurrency: r.valueInPolicyCurrency === null ? null : Number(r.valueInPolicyCurrency), policyCurrency: r.policyCurrency, contactId: r.contactId, personName: r.personName, publicOfficial: r.publicOfficial,
        linkedType: r.linkedType, linkedId: r.linkedId, linkedLabel: r.linkedLabel, status: r.status as CrmHospitalityStatus, approvalReasons: reasons,
        decidedByName: r.decidedById ? names.get(r.decidedById) ?? null : null, decidedAt: r.decidedAt?.toISOString() ?? null, decisionNote: r.decisionNote, evidenceDocumentId: r.evidenceDocumentId, additionalInfo: r.additionalInfo,
        createdById: r.createdById, createdByName: r.createdById ? names.get(r.createdById) ?? null : null, createdAt: r.createdAt.toISOString(), canDecide, canEdit: manager,
      };
    });
  }
  private async namesFor(tx: Tx, org: string, rows: Row[]) {
    const ids = [...new Set(rows.flatMap((r) => [r.createdById, r.decidedById]).filter((x): x is string => !!x))];
    const us = ids.length ? await tx.user.findMany({ where: { id: { in: ids }, organizationId: org }, select: { id: true, forename: true, surname: true } }) : [];
    return new Map(us.map((u) => [u.id, `${u.forename} ${u.surname}`.trim()]));
  }

  async list(user: RequestUser, q: { relationshipId?: string; status?: string; direction?: string; category?: string; publicOfficial?: string; q?: string; page?: number; pageSize?: number }): Promise<CrmHospitalityPage> {
    assertHasPermission(user, "crm.view");
    const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 100); const page = Math.max(q.page ?? 1, 1);
    return withTenantContext(user.organizationId, async (tx) => {
      const and: Prisma.CrmHospitalityRecordWhereInput[] = [{ organizationId: user.organizationId, archivedAt: null }];
      if (q.relationshipId) and.push({ relationshipId: q.relationshipId });
      if (q.status && (CRM_HOSPITALITY_STATUSES as readonly string[]).includes(q.status)) and.push({ status: q.status });
      if (q.direction && (CRM_HOSPITALITY_DIRECTIONS as readonly string[]).includes(q.direction)) and.push({ direction: q.direction });
      if (q.category && (CRM_HOSPITALITY_CATEGORIES as readonly string[]).includes(q.category)) and.push({ category: q.category });
      if (q.publicOfficial === "true") and.push({ publicOfficial: true });
      const needle = q.q?.trim();
      if (needle) and.push({ OR: [{ description: { contains: needle } }, { personName: { contains: needle } }, { relationship: { partner: { name: { contains: needle } } } }] });
      const where: Prisma.CrmHospitalityRecordWhereInput = { AND: and };
      const [total, rows, { approverIds }] = await Promise.all([
        tx.crmHospitalityRecord.count({ where }),
        tx.crmHospitalityRecord.findMany({ where, include, orderBy: [{ occurredOn: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
        this.rules(tx, user.organizationId),
      ]);
      return { items: this.shape(user, rows, await this.namesFor(tx, user.organizationId, rows), approverIds), total, page, pageSize };
    });
  }

  async summary(user: RequestUser): Promise<CrmComplianceSummary> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const org = user.organizationId; const since = new Date(Date.now() - 365 * DAY);
      const live: Prisma.CrmHospitalityRecordWhereInput = { organizationId: org, archivedAt: null };
      const p = await this.policyRow(tx, org); const { rules, approverIds } = await this.rules(tx, org);
      const pend = await tx.crmHospitalityRecord.findMany({ where: { ...live, status: "PENDING_APPROVAL" }, select: { createdById: true } });
      const canApprove = (user.platformStaffRole !== "NONE" || user.permissions.includes("crm.manage")) && (!approverIds.length || approverIds.includes(user.id));
      const [recent, pubs, given, received] = await Promise.all([
        tx.crmHospitalityRecord.count({ where: { ...live, occurredOn: { gte: since } } }),
        tx.crmHospitalityRecord.count({ where: { ...live, occurredOn: { gte: since }, publicOfficial: true } }),
        tx.crmHospitalityRecord.aggregate({ _sum: { valueInPolicyCurrency: true }, where: { ...live, occurredOn: { gte: since }, direction: "GIVEN", policyCurrency: rules.currency, status: { not: "REJECTED" } } }),
        tx.crmHospitalityRecord.aggregate({ _sum: { valueInPolicyCurrency: true }, where: { ...live, occurredOn: { gte: since }, direction: "RECEIVED", policyCurrency: rules.currency, status: { not: "REJECTED" } } }),
      ]);
      return {
        pendingApproval: pend.length, awaitingMyDecision: canApprove ? pend.filter((x) => x.createdById !== user.id).length : 0, publicOfficialLast12Months: pubs, recordsLast12Months: recent,
        givenLast12Months: Number(given._sum.valueInPolicyCurrency ?? 0), receivedLast12Months: Number(received._sum.valueInPolicyCurrency ?? 0), policyCurrency: rules.currency,
        policyConfigured: !!p?.confirmedAt, policyReviewOverdue: !!p?.policyReviewDue && p.policyReviewDue.getTime() < Date.now(), noPolicyDocument: !p?.policyDocumentId,
      };
    });
  }

  /** The value in the policy currency at the rate for the day, or null when no rate is available. Done outside the transaction (it may call the rate feed). */
  private async valueIn(amount: number, from: string, to: string, on: Date): Promise<number | null> {
    if (amount === 0 || from === to) return amount;
    const snap = this.fx ? await this.fx.getSnapshotForDate(on).catch(() => null) : null;
    return convertAmount(amount, from, to, snap?.rates ?? null);
  }

  private async prior(tx: Tx, org: string, relationshipId: string, on: Date, policyCurrency: string, excludeId?: string) {
    const r = await tx.crmHospitalityRecord.aggregate({ _sum: { valueInPolicyCurrency: true }, where: {
      organizationId: org, relationshipId, archivedAt: null, direction: { not: "DECLINED" }, status: { not: "REJECTED" }, policyCurrency,
      occurredOn: { gt: new Date(on.getTime() - 365 * DAY), lte: on }, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    return Number(r._sum.valueInPolicyCurrency ?? 0);
  }

  private validateInput(dto: CrmHospitalityInput, creating: boolean) {
    if (creating || dto.direction !== undefined) if (!dto.direction || !(CRM_HOSPITALITY_DIRECTIONS as readonly string[]).includes(dto.direction)) throw new BadRequestException("Say whether it was given, received or declined.");
    if (creating || dto.category !== undefined) if (!dto.category || !(CRM_HOSPITALITY_CATEGORIES as readonly string[]).includes(dto.category)) throw new BadRequestException("Choose a category from the list.");
    if (creating || dto.occurredOn !== undefined) {
      const d = dto.occurredOn ? dateOnly(dto.occurredOn) : null;
      if (!d) throw new BadRequestException("Enter a valid date.");
      if (d.getTime() > Date.now() + DAY) throw new BadRequestException("The date cannot be in the future.");
    }
    if (creating || dto.description !== undefined) if (!dto.description?.trim()) throw new BadRequestException("Describe what it was.");
    if (creating || dto.businessReason !== undefined) if (!dto.businessReason?.trim()) throw new BadRequestException("Give the business reason.");
    if (creating || dto.amount !== undefined) if (typeof dto.amount !== "number" || !isFinite(dto.amount) || dto.amount < 0 || dto.amount > 1e9) throw new BadRequestException("Enter the amount as a number from 0 upwards (estimate it if you do not know).");
    if (creating || dto.currency !== undefined) if (!/^[A-Z]{3}$/.test(ccy(dto.currency))) throw new BadRequestException("Choose a currency.");
  }

  private async checkLinks(tx: Tx, user: RequestUser, partnerId: string | null, dto: CrmHospitalityInput) {
    let contactName: string | null | undefined;
    if (dto.contactId) {
      const c = await tx.contact.findFirst({ where: { id: dto.contactId, organizationId: user.organizationId, partnerId: partnerId ?? "none" }, select: { name: true } });
      if (!c) throw new BadRequestException("That contact does not belong to this stakeholder.");
      contactName = c.name;
    }
    let linked: { type: string; id: string; label: string } | null = null;
    if (dto.linkedProjectId) {
      const p = await tx.project.findFirst({ where: { id: dto.linkedProjectId, organizationId: user.organizationId }, select: { id: true, referenceNumber: true, title: true } });
      if (!p) throw new BadRequestException("That project was not found.");
      linked = { type: "PROJECT", id: p.id, label: `${p.referenceNumber} · ${p.title}`.slice(0, 300) };
    }
    if (dto.evidenceDocumentId) {
      const d = await tx.projectDocument.findFirst({ where: { id: dto.evidenceDocumentId, organizationId: user.organizationId, projectId: null, archivedAt: null }, select: { id: true } });
      if (!d) throw new BadRequestException("That evidence file was not found.");
    }
    return { contactName, linked };
  }

  private async askForApproval(tx: Tx, user: RequestUser, row: { id: string; relationshipId: string }, ownerUserId: string | null, partnerName: string, what: string, approverIds: string[]) {
    let to = approverIds.length ? approverIds : await usersWithPermission(tx, user.organizationId, "crm.manage");
    to = to.filter((id) => id !== user.id);
    if (!to.length && ownerUserId && ownerUserId !== user.id) to = [ownerUserId];
    await createNotifications(tx, to.map((id) => ({
      organizationId: user.organizationId, recipientUserId: id, actorUserId: user.id, kind: "CRM_HOSPITALITY_APPROVAL", category: "CRM",
      title: `Approve ${what} with ${partnerName}`.slice(0, 300), body: "Recorded against the gifts and hospitality policy. Review the reasons and approve or decline.",
      link: `/compliance?id=${row.id}`, subjectType: "CRM_HOSPITALITY", subjectId: row.id, requiresAction: true, dueDate: new Date(Date.now() + 7 * DAY),
    })));
  }

  async create(user: RequestUser, relationshipId: string, dto: CrmHospitalityInput): Promise<CrmHospitalityRecord> {
    assertHasPermission(user, "crm.manage");
    this.validateInput(dto, true);
    const currency = ccy(dto.currency); const on = dateOnly(dto.occurredOn!)!;
    const policyCcy = await withTenantContext(user.organizationId, async (tx) => (await this.rules(tx, user.organizationId)).rules.currency);
    const value = await this.valueIn(dto.amount!, currency, policyCcy, on);
    return withTenantContext(user.organizationId, async (tx) => {
      const org = user.organizationId;
      const rel = await tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: org }, select: { id: true, partnerId: true, ownerUserId: true, archivedAt: true, partner: { select: { name: true } } } });
      if (!rel) throw new NotFoundException("Relationship not found.");
      if (rel.archivedAt) throw new BadRequestException("This relationship is archived.");
      const { contactName, linked } = await this.checkLinks(tx, user, rel.partnerId, dto);
      const { rules, approverIds } = await this.rules(tx, org);
      if (rules.currency !== policyCcy) throw new BadRequestException("The policy currency changed while you were saving. Please try again.");
      const verdict = evaluateHospitality(rules, { direction: dto.direction!, category: dto.category!, publicOfficial: !!dto.publicOfficial, value, priorTwelveMonths: await this.prior(tx, org, relationshipId, on, rules.currency) });
      const row = await tx.crmHospitalityRecord.create({ include, data: {
        organizationId: org, relationshipId, direction: dto.direction!, category: dto.category!, occurredOn: on, description: dto.description!.trim().slice(0, 500), businessReason: dto.businessReason!.trim().slice(0, 500),
        amount: Math.round(dto.amount! * 100) / 100, currency, valueInPolicyCurrency: value, policyCurrency: rules.currency, contactId: dto.contactId || null, personName: contactName ?? (dto.personName?.trim().slice(0, 150) || null),
        publicOfficial: !!dto.publicOfficial, linkedType: linked?.type ?? null, linkedId: linked?.id ?? null, linkedLabel: linked?.label ?? null,
        status: verdict.requiresApproval ? "PENDING_APPROVAL" : "RECORDED", approvalReasons: verdict.reasons.length ? JSON.stringify(verdict.reasons) : null,
        evidenceDocumentId: dto.evidenceDocumentId || null, additionalInfo: dto.additionalInfo?.trim().slice(0, 2000) || null, createdById: user.id } });
      await recordFieldChanges(tx, { organizationId: org, tableName: "crm_hospitality_records", recordId: row.id, changedById: user.id, changes: [{ field: "created", oldValue: null, newValue: `${row.direction} ${row.category}: ${row.description}`.slice(0, 300) }] });
      if (verdict.requiresApproval) await this.askForApproval(tx, user, row, rel.ownerUserId, rel.partner?.name ?? "stakeholder", `${row.category.toLowerCase()} ${row.direction === "GIVEN" ? "given to" : "from"}`.replace("_", " "), approverIds);
      return this.shape(user, [row], await this.namesFor(tx, org, [row]), approverIds)[0];
    });
  }

  async update(user: RequestUser, id: string, dto: CrmHospitalityInput): Promise<CrmHospitalityRecord> {
    assertHasPermission(user, "crm.manage");
    this.validateInput(dto, false);
    const before = await withTenantContext(user.organizationId, async (tx) => {
      const cur = await tx.crmHospitalityRecord.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!cur) throw new NotFoundException("Record not found.");
      return { cur, policyCcy: (await this.rules(tx, user.organizationId)).rules.currency };
    });
    const decided = before.cur.status === "APPROVED" || before.cur.status === "REJECTED";
    const touchesAssessed = ["direction", "category", "occurredOn", "amount", "currency", "publicOfficial", "description", "businessReason"].some((k) => (dto as Record<string, unknown>)[k] !== undefined);
    if (decided && touchesAssessed) throw new BadRequestException("This record has been decided, so its details are locked. You can still add evidence or notes, or archive it and record a corrected one.");
    const currency = dto.currency !== undefined ? ccy(dto.currency) : before.cur.currency; const on = dto.occurredOn !== undefined ? dateOnly(dto.occurredOn)! : before.cur.occurredOn;
    const amount = dto.amount !== undefined ? Math.round(dto.amount * 100) / 100 : Number(before.cur.amount);
    const reassess = !decided && touchesAssessed;
    const value = reassess ? await this.valueIn(amount, currency, before.policyCcy, on) : undefined;
    return withTenantContext(user.organizationId, async (tx) => {
      const org = user.organizationId;
      const cur = await tx.crmHospitalityRecord.findFirst({ where: { id, organizationId: org }, include });
      if (!cur) throw new NotFoundException("Record not found.");
      const { contactName, linked } = await this.checkLinks(tx, user, (await tx.crmRelationship.findFirst({ where: { id: cur.relationshipId, organizationId: org }, select: { partnerId: true } }))?.partnerId ?? null, dto);
      const data: Prisma.CrmHospitalityRecordUncheckedUpdateInput = {};
      if (dto.direction !== undefined) data.direction = dto.direction;
      if (dto.category !== undefined) data.category = dto.category;
      if (dto.occurredOn !== undefined) data.occurredOn = on;
      if (dto.description !== undefined) data.description = dto.description.trim().slice(0, 500);
      if (dto.businessReason !== undefined) data.businessReason = dto.businessReason.trim().slice(0, 500);
      if (dto.amount !== undefined) data.amount = amount;
      if (dto.currency !== undefined) data.currency = currency;
      if (dto.publicOfficial !== undefined) data.publicOfficial = dto.publicOfficial;
      if (dto.contactId !== undefined) { data.contactId = dto.contactId || null; if (contactName) data.personName = contactName; }
      if (dto.personName !== undefined && !dto.contactId) data.personName = dto.personName?.trim().slice(0, 150) || null;
      if (dto.linkedProjectId !== undefined) { data.linkedType = linked?.type ?? null; data.linkedId = linked?.id ?? null; data.linkedLabel = linked?.label ?? null; }
      if (dto.evidenceDocumentId !== undefined) data.evidenceDocumentId = dto.evidenceDocumentId || null;
      if (dto.additionalInfo !== undefined) data.additionalInfo = dto.additionalInfo?.trim().slice(0, 2000) || null;
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? new Date() : null; data.archivedById = dto.archived ? user.id : null; }
      const { rules, approverIds } = await this.rules(tx, org);
      let wasPending = cur.status === "PENDING_APPROVAL"; let nowPending = wasPending;
      if (reassess) {
        data.valueInPolicyCurrency = value; data.policyCurrency = rules.currency;
        const verdict = evaluateHospitality(rules, { direction: (data.direction as CrmHospitalityDirection) ?? (cur.direction as CrmHospitalityDirection), category: (data.category as CrmHospitalityCategory) ?? (cur.category as CrmHospitalityCategory),
          publicOfficial: (data.publicOfficial as boolean | undefined) ?? cur.publicOfficial, value: value ?? null, priorTwelveMonths: await this.prior(tx, org, cur.relationshipId, on, rules.currency, id) });
        data.status = verdict.requiresApproval ? "PENDING_APPROVAL" : "RECORDED"; data.approvalReasons = verdict.reasons.length ? JSON.stringify(verdict.reasons) : null; nowPending = verdict.requiresApproval;
      }
      const row = await tx.crmHospitalityRecord.update({ where: { id }, data, include });
      await recordFieldChanges(tx, { organizationId: org, tableName: "crm_hospitality_records", recordId: id, changedById: user.id, changes: diffForAudit(cur, data, [...AUDITED]) });
      if (nowPending && !wasPending) await this.askForApproval(tx, user, row, row.relationship.ownerUserId, row.relationship.partner?.name ?? "stakeholder", "a gift or hospitality record", approverIds);
      if ((wasPending && !nowPending) || (data.archivedAt)) await completeActionsFor(tx, org, "CRM_HOSPITALITY", id);
      return this.shape(user, [row], await this.namesFor(tx, org, [row]), approverIds)[0];
    });
  }

  async decide(user: RequestUser, id: string, dto: CrmHospitalityDecision): Promise<CrmHospitalityRecord> {
    assertHasPermission(user, "crm.manage");
    if (dto.decision !== "APPROVED" && dto.decision !== "REJECTED") throw new BadRequestException("Approve or decline.");
    if (dto.decision === "REJECTED" && !dto.note?.trim()) throw new BadRequestException("Say why it is not approved.");
    return withTenantContext(user.organizationId, async (tx) => {
      const org = user.organizationId;
      const cur = await tx.crmHospitalityRecord.findFirst({ where: { id, organizationId: org, archivedAt: null }, include });
      if (!cur) throw new NotFoundException("Record not found.");
      if (cur.status !== "PENDING_APPROVAL") throw new BadRequestException("This record is not waiting for approval.");
      if (cur.createdById === user.id) throw new ForbiddenException("A different person must approve this. It cannot be approved by the person who recorded it.");
      const { approverIds } = await this.rules(tx, org);
      if (approverIds.length && !approverIds.includes(user.id)) throw new ForbiddenException("Only the approvers named in your gifts and hospitality policy can decide this.");
      const row = await tx.crmHospitalityRecord.update({ where: { id }, include, data: { status: dto.decision, decidedById: user.id, decidedAt: new Date(), decisionNote: dto.note?.trim().slice(0, 500) || null } });
      await recordFieldChanges(tx, { organizationId: org, tableName: "crm_hospitality_records", recordId: id, changedById: user.id, changes: [{ field: "status", oldValue: "PENDING_APPROVAL", newValue: dto.decision }, ...(dto.note ? [{ field: "decisionNote", oldValue: null, newValue: dto.note.trim().slice(0, 500) }] : [])] });
      await completeActionsFor(tx, org, "CRM_HOSPITALITY", id);
      if (cur.createdById) await createNotifications(tx, [{ organizationId: org, recipientUserId: cur.createdById, actorUserId: user.id, kind: "CRM_HOSPITALITY_DECISION", category: "CRM",
        title: `${dto.decision === "APPROVED" ? "Approved" : "Not approved"}: ${cur.description}`.slice(0, 300), body: dto.note?.trim().slice(0, 500) || null, link: `/compliance?id=${id}`, subjectType: "CRM_HOSPITALITY", subjectId: id }]);
      return this.shape(user, [row], await this.namesFor(tx, org, [row]), approverIds)[0];
    });
  }

  /** A policy or evidence file may be opened only if a policy or a record in the organisation points at it. */
  async assertDocumentVisible(user: RequestUser, documentId: string): Promise<void> {
    assertHasPermission(user, "crm.view");
    const ok = await withTenantContext(user.organizationId, async (tx) => {
      const [p, r] = await Promise.all([
        tx.crmGiftPolicy.count({ where: { organizationId: user.organizationId, policyDocumentId: documentId } }),
        tx.crmHospitalityRecord.count({ where: { organizationId: user.organizationId, evidenceDocumentId: documentId } }),
      ]);
      return p + r > 0;
    });
    if (!ok) throw new NotFoundException("Document not found.");
  }
}
