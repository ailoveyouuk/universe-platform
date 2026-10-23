import { supplierAggregate } from "./tender-performance";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { appendTenderEvent } from "./tender-events";
import { createNotifications, usersWithPermission } from "../notifications/notify";
import {
  chipsFor, evaluateEligibility, matchesSavedSearch,
  type EligibilityResult, type OrgProfile, type RuleLike, type SavedCriteria,
} from "./eligibility";
import { EXCLUSION_GROUNDS, scopeSubsForProduct } from "@universe/types";
import type {
  CreateTenderDto, InterestDto, InviteDto, SavedSearchDto, SetCriteriaDto, SetLinesDto, SetRulesDto, UpdateTenderDto,
} from "./dto/tenders.dto";

type Tx = Prisma.TransactionClient;

const DAY = 86_400_000;
const jsonArray = (s: string | null | undefined): string[] => {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
};
const toDate = (s?: string | null) => (s ? new Date(s) : undefined);
const chunk = <T,>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

/** The status a viewer should see: a published tender past its closing time reads as closed even before the closing job runs. */
export function effectiveStatus(t: { status: string; closingAt: Date | null }, now = new Date()): string {
  return t.status === "PUBLISHED" && t.closingAt && t.closingAt.getTime() < now.getTime() ? "CLOSED" : t.status;
}

/**
 * Tender Issuance & Management, step 1b (2026-10-19). Issuers build, publish and manage tenders; registered organisations browse
 * every published tender with a visible eligibility checklist, shortlist, save criteria and express interest. Cross-organisation
 * visibility is enforced by the database policies in infra/sql/tender-rls.sql, not here; this layer adds permissions, lifecycle
 * rules and the eligibility explanation. Bids, evaluation, award and contracts arrive in later steps.
 */
@Injectable()
export class TendersService {
  // ---------------------------------------------------------------- helpers

  private async event(_tx: Tx, t: { id: string; organizationId: string }, user: RequestUser, kind: string, summary: string, counterparty?: string | null, details?: unknown) {
    await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: counterparty ?? null, tenderId: t.id, actorOrganizationId: user.organizationId, actorUserId: user.id, kind, summary, details });
  }

  /** The compliance options. A simulated tender can never be a public notice; standstill defaults to 8 working days (the UK Procurement Act period) when switched on. */
  private complianceFields(dto: UpdateTenderDto, simulated: boolean) {
    const standstill = dto.standstillEnabled;
    return {
      timeZone: dto.timeZone, standstillEnabled: dto.standstillEnabled,
      standstillWorkingDays: standstill === false ? null : standstill ? dto.standstillWorkingDays ?? 8 : dto.standstillWorkingDays,
      publicNotice: simulated ? false : dto.publicNotice,
      frameworkTermMonths: dto.frameworkTermMonths, frameworkCeiling: dto.frameworkCeiling, frameworkCallOffMethod: dto.frameworkCallOffMethod, frameworkPriceHoldDays: dto.frameworkPriceHoldDays,
      requireIntegrityPledge: dto.requireIntegrityPledge, requireExclusionDeclaration: dto.requireExclusionDeclaration,
      allowTemplateSubmission: dto.allowTemplateSubmission,
      emergencyProcurement: dto.emergencyProcurement, emergencyReason: dto.emergencyProcurement === false ? null : dto.emergencyReason,
      allowSingleEvaluator: dto.allowSingleEvaluator, singleEvaluatorReason: dto.allowSingleEvaluator === false ? null : dto.singleEvaluatorReason,
    };
  }

  async ownTender(tx: Tx, user: RequestUser, id: string) {
    const t = await tx.tender.findUnique({ where: { id } });
    if (!t || t.organizationId !== user.organizationId || t.archivedAt) throw new NotFoundException("Tender not found.");
    return t;
  }

  private async nextReference(tx: Tx, orgId: string) {
    const year = new Date().getFullYear();
    const prefix = `TND-${year}-`;
    const last = await tx.tender.findFirst({ where: { organizationId: orgId, referenceNumber: { startsWith: prefix } }, orderBy: { referenceNumber: "desc" }, select: { referenceNumber: true } });
    const n = last ? Number(last.referenceNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(n + 1).padStart(4, "0")}`;
  }

  /** What the registry holds about an organisation, for the eligibility checks (never self-declared on the tender). */
  async loadProfile(tx: Tx, organizationId: string): Promise<OrgProfile> {
    const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { type: true, countryOfRegistrationCode: true } });
    const presence = await tx.organizationCountryPresence.findMany({ where: { organizationId }, select: { countryCode: true } });
    const supplied = await tx.supplierCountryPresence.findMany({ where: { organizationId }, select: { countryCode: true } });
    const products = await tx.supplierProduct.findMany({ where: { organizationId, isPublished: true }, select: { productMaster: { select: { category: true } } } });
    const mfr = await tx.manufacturerProfile.findUnique({ where: { organizationId } });
    const countries = new Set<string>([...(org?.countryOfRegistrationCode ? [org.countryOfRegistrationCode] : []), ...presence.map((p) => p.countryCode), ...supplied.map((p) => p.countryCode)]);
    const qualifications = new Set<string>();
    const categories = new Set<string>(products.map((p) => p.productMaster?.category).filter((c): c is string => !!c));
    if (mfr) {
      jsonArray(mfr.currentExportMarkets).forEach((c) => countries.add(c));
      jsonArray(mfr.nationalRegistrations).forEach((c) => { countries.add(c); qualifications.add(`REG_${c}`); });
      jsonArray(mfr.productCategoriesManufactured).forEach((c) => categories.add(c));
      if (mfr.whoPrequalified) qualifications.add("WHO_PQ");
      const sra = jsonArray(mfr.sraApprovals);
      if (sra.length) { qualifications.add("SRA"); sra.forEach((s) => qualifications.add(s)); }
      jsonArray(mfr.otherCertifications).forEach((c) => qualifications.add(c));
    }
    return {
      organizationId, orgType: org?.type ?? "", countries: [...countries], categories: [...categories],
      qualifications: [...qualifications], hasProfileEvidence: !!mfr || products.length > 0,
      performance: await supplierAggregate(organizationId),
    };
  }

  async notifyOrgs(orgIds: string[], build: (orgId: string) => { title: string; body: string; link: string; subjectId: string }, kind: string, actorUserId: string | null) {
    if (orgIds.length === 0) return;
    await withPlatformStaffContext(async (tx) => {
      for (const orgId of [...new Set(orgIds)]) {
        const recipients = await usersWithPermission(tx, orgId, "tenders.view");
        if (recipients.length === 0) continue;
        const b = build(orgId);
        await createNotifications(tx, recipients.map((recipientUserId) => ({
          organizationId: orgId, recipientUserId, actorUserId, kind, category: "TENDER", title: b.title.slice(0, 300), body: b.body.slice(0, 1000),
          link: b.link, subjectType: "TENDER", subjectId: b.subjectId,
        })));
      }
    });
  }

  // ---------------------------------------------------------------- issuer

  async create(user: RequestUser, dto: CreateTenderDto) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: user.organizationId }, select: { isDemo: true, isSimulated: true } });
      const visibility = dto.visibility ?? "ELIGIBLE_ORGANISATIONS";
      const t = await tx.tender.create({
        data: {
          organizationId: user.organizationId, referenceNumber: await this.nextReference(tx, user.organizationId), title: dto.title,
          summary: dto.summary, tenderType: dto.tenderType ?? "RFQ", visibility, visibleToAll: visibility !== "INVITED_ONLY",
          deliveryCountryCodes: dto.deliveryCountryCodes, currency: dto.currency?.toUpperCase(), incoterm: dto.incoterm, clientName: dto.clientName,
          clarificationDeadline: toDate(dto.clarificationDeadline), closingAt: toDate(dto.closingAt), evaluationDueAt: toDate(dto.evaluationDueAt),
          awardDueAt: toDate(dto.awardDueAt), bidValidityDays: dto.bidValidityDays, contractStartDate: toDate(dto.contractStartDate),
          acceptedFileTypes: dto.acceptedFileTypes, maxFileSizeMb: dto.maxFileSizeMb, allowTextSubmission: dto.allowTextSubmission,
          termsAndConditions: dto.termsAndConditions, isSimulated: !!(org?.isDemo || org?.isSimulated), createdById: user.id,
          ...this.complianceFields(dto, !!(org?.isDemo || org?.isSimulated)),
        },
      });
      await this.event(tx, t, user, "CREATED", `Draft ${t.referenceNumber} created`);
      return t;
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateTenderDto) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await this.ownTender(tx, user, id);
      const data: Prisma.TenderUpdateInput = {};
      if (t.status === "DRAFT") {
        Object.assign(data, {
          title: dto.title, summary: dto.summary, tenderType: dto.tenderType, deliveryCountryCodes: dto.deliveryCountryCodes,
          currency: dto.currency?.toUpperCase(), incoterm: dto.incoterm, clientName: dto.clientName, bidValidityDays: dto.bidValidityDays,
          contractStartDate: toDate(dto.contractStartDate), acceptedFileTypes: dto.acceptedFileTypes, maxFileSizeMb: dto.maxFileSizeMb,
          allowTextSubmission: dto.allowTextSubmission, termsAndConditions: dto.termsAndConditions,
          ...this.complianceFields(dto, t.isSimulated),
        });
        if (dto.visibility) { data.visibility = dto.visibility; data.visibleToAll = dto.visibility !== "INVITED_ONLY"; }
      } else if (t.status === "PUBLISHED") {
        // After publication only the timetable can move, and the closing date only later; everything else is what bidders relied on.
        const locked = ["frameworkTermMonths", "frameworkCeiling", "frameworkCallOffMethod", "frameworkPriceHoldDays", "title", "summary", "tenderType", "visibility", "deliveryCountryCodes", "currency", "incoterm", "clientName", "bidValidityDays", "acceptedFileTypes", "maxFileSizeMb", "allowTextSubmission", "termsAndConditions", "contractStartDate", "timeZone", "standstillEnabled", "standstillWorkingDays", "publicNotice", "requireIntegrityPledge", "requireExclusionDeclaration", "allowTemplateSubmission", "emergencyProcurement", "emergencyReason", "allowSingleEvaluator", "singleEvaluatorReason"] as const;
        if (locked.some((k) => dto[k] !== undefined)) throw new ConflictException("A published tender can only have its dates extended. Cancel and reissue to change anything else.");
      } else {
        throw new ConflictException(`A ${t.status.toLowerCase()} tender can no longer be edited.`);
      }
      const newClosing = toDate(dto.closingAt);
      if (newClosing && t.status === "PUBLISHED" && t.closingAt && newClosing <= t.closingAt) throw new BadRequestException("A closing date can only be moved later once the tender is published.");
      if (dto.clarificationDeadline !== undefined) data.clarificationDeadline = toDate(dto.clarificationDeadline);
      if (newClosing) data.closingAt = newClosing;
      if (dto.evaluationDueAt !== undefined) data.evaluationDueAt = toDate(dto.evaluationDueAt);
      if (dto.awardDueAt !== undefined) data.awardDueAt = toDate(dto.awardDueAt);
      Object.keys(data).forEach((k) => (data as Record<string, unknown>)[k] === undefined && delete (data as Record<string, unknown>)[k]);
      const updated = await tx.tender.update({ where: { id }, data });
      const extended = t.status === "PUBLISHED" && newClosing;
      if (extended) await this.event(tx, t, user, "DEADLINE_EXTENDED", `Closing date moved to ${newClosing.toISOString().slice(0, 10)}`, null, { from: t.closingAt?.toISOString() ?? null, to: newClosing.toISOString() });
      const timetable = { clarificationDeadline: [t.clarificationDeadline, updated.clarificationDeadline], evaluationDueAt: [t.evaluationDueAt, updated.evaluationDueAt], awardDueAt: [t.awardDueAt, updated.awardDueAt] } as const;
      const changed = Object.entries(timetable).filter(([, [x, y]]) => (x?.getTime() ?? null) !== (y?.getTime() ?? null));
      if (t.status === "PUBLISHED" && changed.length) await this.event(tx, t, user, "TIMETABLE_CHANGED", `Timetable changed: ${changed.map(([k]) => k).join(", ")}`, null, Object.fromEntries(changed.map(([k, [x, y]]) => [k, { from: x?.toISOString() ?? null, to: y?.toISOString() ?? null }])));
      return { tender: updated, extendedClosing: extended ? newClosing : null };
    }).then(async (r) => {
      if (r.extendedClosing) {
        const parts = await withTenantContext(user.organizationId, (tx) => tx.tenderParticipation.findMany({ where: { tenderId: id, withdrawnAt: null }, select: { organizationId: true } }));
        await this.notifyOrgs(parts.map((p) => p.organizationId), () => ({ title: `Deadline extended: ${r.tender.referenceNumber}`, body: `${r.tender.title} now closes on ${r.extendedClosing!.toISOString().slice(0, 10)}.`, link: `/tenders/detail?id=${id}`, subjectId: id }), "TENDER_DEADLINE_EXTENDED", user.id);
      }
      return r.tender;
    });
  }

  private async assertDraft(tx: Tx, user: RequestUser, id: string) {
    const t = await this.ownTender(tx, user, id);
    if (t.status !== "DRAFT") throw new ConflictException("Lines, criteria and eligibility rules are locked once a tender is published.");
    return t;
  }

  async setLines(user: RequestUser, id: string, dto: SetLinesDto) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.assertDraft(tx, user, id);
      // Lots (step 7): once any item has a lot, every item must, and one lot has one title.
      const lotted = dto.lines.filter((l) => l.lotNumber !== undefined && l.lotNumber !== null);
      const titles = new Map<number, string>();
      if (lotted.length > 0) {
        if (lotted.length !== dto.lines.length) throw new BadRequestException("Once one item is in a lot, every item must be in a lot.");
        for (const l of lotted) { const t = l.lotTitle?.trim(); if (t && !titles.has(l.lotNumber!)) titles.set(l.lotNumber!, t); }
        const untitled = [...new Set(lotted.map((l) => l.lotNumber!))].filter((n) => !titles.has(n));
        if (untitled.length) throw new BadRequestException(`Give lot ${untitled.join(", ")} a title.`);
      }
      await tx.tenderLine.deleteMany({ where: { tenderId: id } });
      for (const [i, l] of dto.lines.entries()) {
        await tx.tenderLine.create({ data: { organizationId: user.organizationId, tenderId: id, lineNumber: i + 1, ...l, lotTitle: l.lotNumber ? titles.get(l.lotNumber) ?? null : null, destinationCountryCode: l.destinationCountryCode?.toUpperCase() } });
      }
      return tx.tenderLine.findMany({ where: { tenderId: id }, orderBy: { lineNumber: "asc" } });
    });
  }

  async setCriteria(user: RequestUser, id: string, dto: SetCriteriaDto) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.assertDraft(tx, user, id);
      const metrics = dto.criteria.filter((c) => c.kind === "SCORED" && c.metric && c.metric !== "MANUAL").map((c) => c.metric);
      if (new Set(metrics).size !== metrics.length) throw new BadRequestException("Price, lead time and past performance can each be used once.");
      await tx.tenderCriterion.deleteMany({ where: { tenderId: id } });
      for (const [i, c] of dto.criteria.entries()) {
        await tx.tenderCriterion.create({ data: { organizationId: user.organizationId, tenderId: id, sortOrder: i, ...c, metric: c.kind === "SCORED" ? c.metric ?? "MANUAL" : "MANUAL", isMandatory: c.kind === "SCORED" && c.metric && c.metric !== "MANUAL" ? false : c.isMandatory, weight: c.kind === "SCORED" ? c.weight ?? 0 : null } });
      }
      return tx.tenderCriterion.findMany({ where: { tenderId: id }, orderBy: { sortOrder: "asc" } });
    });
  }

  async setRules(user: RequestUser, id: string, dto: SetRulesDto) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.assertDraft(tx, user, id);
      await tx.tenderEligibilityRule.deleteMany({ where: { tenderId: id } });
      for (const r of dto.rules) {
        await tx.tenderEligibilityRule.create({ data: { organizationId: user.organizationId, tenderId: id, ruleType: r.ruleType, ruleValue: r.ruleValue, explanation: r.explanation, isRequired: r.isRequired ?? true } });
      }
      return tx.tenderEligibilityRule.findMany({ where: { tenderId: id }, orderBy: { createdAt: "asc" } });
    });
  }

  /** Registered organisations an issuer can invite. A demo organisation only ever sees other demo organisations. */
  async searchOrganisations(user: RequestUser, q: string) {
    assertHasPermission(user, "tenders.issue");
    const term = q.trim();
    if (term.length < 2) return [];
    const demo = user.isDemoUser || user.inDemoOrganization;
    return withPlatformStaffContext(async (tx) => {
      const rows = await tx.organization.findMany({
        where: { id: { not: user.organizationId }, status: { not: "SUSPENDED" }, name: { contains: term }, ...(demo ? { isDemo: true } : { isDemo: false, isSimulated: false }) },
        select: { id: true, name: true, type: true }, orderBy: { name: "asc" }, take: 20,
      });
      return rows;
    });
  }

  async invite(user: RequestUser, id: string, dto: InviteDto) {
    assertHasPermission(user, "tenders.issue");
    const ids = [...new Set(dto.organizationIds)].filter((o) => o !== user.organizationId);
    if (ids.length === 0) throw new BadRequestException("Choose at least one organisation to invite.");
    const result = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.ownTender(tx, user, id);
      if (!["DRAFT", "PUBLISHED"].includes(t.status)) throw new ConflictException("Invitations can only be added to a draft or open tender.");
      const targets = await tx.organization.findMany({ where: { id: { in: ids } }, select: { id: true, isDemo: true } });
      if (targets.length !== ids.length) throw new BadRequestException("One or more organisations are not registered on Universe.");
      const demoIssuer = user.isDemoUser || user.inDemoOrganization;
      if (demoIssuer && targets.some((o) => !o.isDemo)) throw new ForbiddenException("A demo organisation can only invite other demo organisations.");
      const have = new Set((await tx.tenderInvitation.findMany({ where: { tenderId: id }, select: { invitedOrganizationId: true } })).map((i) => i.invitedOrganizationId));
      const fresh = ids.filter((o) => !have.has(o));
      for (const o of fresh) {
        await tx.tenderInvitation.create({ data: { organizationId: user.organizationId, tenderId: id, invitedOrganizationId: o, invitedById: user.id } });
        await this.event(tx, t, user, "INVITED", "An organisation was invited", o);
      }
      return { tender: t, fresh };
    });
    if (result.tender.status === "PUBLISHED") await this.notifyInvited(user, result.tender, result.fresh);
    return { invited: result.fresh.length };
  }

  private notifyInvited(user: RequestUser, t: { id: string; referenceNumber: string; title: string; closingAt: Date | null }, orgIds: string[]) {
    return this.notifyOrgs(orgIds, () => ({
      title: `You are invited to tender ${t.referenceNumber}`,
      body: `${t.title}${t.closingAt ? `. Closes ${t.closingAt.toISOString().slice(0, 10)}` : ""}.`,
      link: `/tenders/detail?id=${t.id}`, subjectId: t.id,
    }), "TENDER_INVITED", user.id);
  }

  async publish(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.issue");
    const published = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.ownTender(tx, user, id);
      if (t.status !== "DRAFT") throw new ConflictException("Only a draft can be published.");
      const [lines, criteria, invites] = await Promise.all([
        tx.tenderLine.count({ where: { tenderId: id } }),
        tx.tenderCriterion.findMany({ where: { tenderId: id } }),
        tx.tenderInvitation.count({ where: { tenderId: id } }),
      ]);
      const problems: string[] = [];
      if (!t.title.trim()) problems.push("Add a title.");
      if (!t.currency) problems.push("Choose the tender currency; bids are compared in it.");
      if (lines === 0) problems.push("Add at least one line item.");
      if (!t.closingAt) problems.push("Set a closing date.");
      else if (t.closingAt.getTime() < Date.now() + DAY / 2) problems.push("The closing date must be at least 12 hours from now.");
      if (t.clarificationDeadline && t.closingAt && t.clarificationDeadline > t.closingAt) problems.push("The clarification deadline must be before the closing date.");
      if (criteria.length === 0) problems.push("Add at least one evaluation criterion.");
      const scored = criteria.filter((c) => c.kind === "SCORED");
      const total = scored.reduce((s, c) => s + Number(c.weight ?? 0), 0);
      if (scored.length > 0 && Math.abs(total - 100) > 0.01) problems.push(`Scored criteria weights must total 100 (currently ${total}).`);
      if (t.emergencyProcurement && !t.emergencyReason?.trim()) problems.push("Emergency procurement needs a recorded reason.");
      if (t.allowSingleEvaluator && !t.singleEvaluatorReason?.trim()) problems.push("A single-evaluator decision needs a recorded reason (for example, below your financial threshold).");
      if (t.tenderType === "FRAMEWORK") {
        if (!t.frameworkTermMonths) problems.push("A framework agreement needs a term in months.");
        if (!t.frameworkCallOffMethod) problems.push("Choose how call-offs are placed (direct award or rotation).");
        if (t.frameworkPriceHoldDays === null || t.frameworkPriceHoldDays === undefined) problems.push("Set how many days framework prices are held (0 for none).");
      }
      if (t.visibility === "INVITED_ONLY" && invites === 0) problems.push("An invited-only tender needs at least one invited organisation.");
      if (problems.length) throw new BadRequestException({ message: "This tender is not ready to publish.", problems });
      const demoIssuer = user.isDemoUser || user.inDemoOrganization;
      // A demo organisation's tender must never reach real organisations: it is only ever visible to those it invites.
      const visibleToAll = demoIssuer ? false : t.visibility !== "INVITED_ONLY";
      const updated = await tx.tender.update({ where: { id }, data: { isPublished: true, visibleToAll, status: "PUBLISHED", publishedAt: new Date() } });
      // Freeze exactly what bidders were shown. The snapshot sits inside the hash-chained event, so any later change to it is detectable.
      const full = await tx.tender.findUnique({ where: { id }, include: { lines: true, criteria: true, rules: true, invitations: true } });
      await this.event(tx, t, user, "PUBLISHED", `Published ${t.referenceNumber}`, null, { snapshot: full });
      const invited = (await tx.tenderInvitation.findMany({ where: { tenderId: id }, select: { invitedOrganizationId: true } })).map((i) => i.invitedOrganizationId);
      return { tender: updated, invited, demoIssuer };
    });
    await this.notifyInvited(user, published.tender, published.invited);
    if (!published.demoIssuer) await this.alertSavedSearches(user, published.tender, new Set(published.invited));
    return published.tender;
  }

  /** "A new tender matches your saved search": runs after publication, across organisations, in a platform-staff context. */
  private async alertSavedSearches(user: RequestUser, t: { id: string; organizationId: string; referenceNumber: string; title: string; summary: string | null; tenderType: string; deliveryCountryCodes: string | null }, skip: Set<string>) {
    const categories = await withTenantContext(user.organizationId, async (tx) => {
      const lines = await tx.tenderLine.findMany({ where: { tenderId: t.id, productMasterId: { not: null } }, select: { productMasterId: true } });
      const ids = [...new Set(lines.map((l) => l.productMasterId!))];
      return [...new Set((await tx.productMaster.findMany({ where: { id: { in: ids } }, select: { category: true } })).map((p) => p.category))];
    });
    const matched = await withPlatformStaffContext(async (tx) => {
      const searches = await tx.tenderSavedSearch.findMany({ where: { alertsEnabled: true, organizationId: { not: t.organizationId } }, take: 5000 });
      const orgs = new Map<string, string>();
      for (const s of searches) {
        if (skip.has(s.organizationId) || orgs.has(s.organizationId)) continue;
        let c: SavedCriteria = {};
        try { c = JSON.parse(s.criteriaJson); } catch { continue; }
        if (matchesSavedSearch(c, { ...t, categories })) orgs.set(s.organizationId, s.name);
      }
      return orgs;
    });
    await this.notifyOrgs([...matched.keys()], (orgId) => ({
      title: `New tender matches "${matched.get(orgId)}"`, body: `${t.referenceNumber}: ${t.title}`, link: `/tenders/detail?id=${t.id}`, subjectId: t.id,
    }), "TENDER_MATCH", user.id);
  }

  async cancel(user: RequestUser, id: string, reason: string) {
    assertHasPermission(user, "tenders.issue");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.ownTender(tx, user, id);
      if (["CANCELLED", "AWARDED", "CONTRACTED"].includes(t.status)) throw new ConflictException(`A ${t.status.toLowerCase()} tender cannot be cancelled.`);
      const updated = await tx.tender.update({ where: { id }, data: { status: "CANCELLED", cancelledReason: reason } });
      await this.event(tx, t, user, "CANCELLED", `Cancelled: ${reason}`.slice(0, 500));
      const parts = await tx.tenderParticipation.findMany({ where: { tenderId: id, withdrawnAt: null }, select: { organizationId: true } });
      return { updated, parts: parts.map((p) => p.organizationId), wasPublished: t.isPublished };
    });
    if (out.wasPublished) await this.notifyOrgs(out.parts, () => ({ title: `Tender cancelled: ${out.updated.referenceNumber}`, body: `${out.updated.title}. Reason: ${reason}`, link: `/tenders/detail?id=${id}`, subjectId: id }), "TENDER_CANCELLED", user.id);
    return out.updated;
  }

  async listMine(user: RequestUser, status?: string) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.tender.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...(status ? { status } : {}) }, orderBy: { updatedAt: "desc" }, take: 200 });
      const interest = await tx.tenderParticipation.groupBy({ by: ["tenderId"], where: { issuerOrganizationId: user.organizationId, withdrawnAt: null, tenderId: { in: rows.map((r) => r.id) } }, _count: { _all: true } });
      const counts = new Map(interest.map((g) => [g.tenderId, g._count._all]));
      // A count only: nothing about a sealed bid's contents leaves this method.
      const bids = await tx.tenderBid.groupBy({ by: ["tenderId"], where: { issuerOrganizationId: user.organizationId, status: "SUBMITTED", tenderId: { in: rows.map((r) => r.id) } }, _count: { _all: true } });
      const bidCounts = new Map(bids.map((g) => [g.tenderId, g._count._all]));
      return rows.map((t) => ({ ...t, effectiveStatus: effectiveStatus(t), interestedOrganisations: counts.get(t.id) ?? 0, bidsReceived: bidCounts.get(t.id) ?? 0 }));
    });
  }

  /** Issuer dashboard: portfolio counts and what needs attention. Bid counts join in with step 3 (sealed bids). */
  async dashboard(user: RequestUser) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      const all = await tx.tender.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, select: { id: true, referenceNumber: true, title: true, status: true, closingAt: true, evaluationDueAt: true, awardDueAt: true, publishedAt: true } });
      const now = new Date();
      const eff = all.map((t) => ({ ...t, eff: effectiveStatus(t, now) }));
      const by = (s: string) => eff.filter((t) => t.eff === s);
      const open = by("PUBLISHED");
      const interest = await tx.tenderParticipation.groupBy({ by: ["tenderId"], where: { issuerOrganizationId: user.organizationId, withdrawnAt: null }, _count: { _all: true } });
      const counts = new Map(interest.map((g) => [g.tenderId, g._count._all]));
      const unanswered = await tx.tenderQuestion.count({ where: { issuerOrganizationId: user.organizationId, tenderId: { in: open.map((t) => t.id) } } });
      const closingSoon = open.filter((t) => t.closingAt && t.closingAt.getTime() - now.getTime() <= 7 * DAY).sort((a, b) => a.closingAt!.getTime() - b.closingAt!.getTime());
      const overdueEvaluation = eff.filter((t) => ["CLOSED", "EVALUATING"].includes(t.eff) && t.evaluationDueAt && t.evaluationDueAt < now);
      const overdueAward = eff.filter((t) => ["CLOSED", "EVALUATING"].includes(t.eff) && t.awardDueAt && t.awardDueAt < now);
      return {
        totals: { draft: by("DRAFT").length, open: open.length, closed: by("CLOSED").length, evaluating: by("EVALUATING").length, awarded: by("AWARDED").length + by("CONTRACTED").length, cancelled: by("CANCELLED").length },
        closingSoon: closingSoon.map((t) => ({ id: t.id, referenceNumber: t.referenceNumber, title: t.title, closingAt: t.closingAt, interested: counts.get(t.id) ?? 0 })),
        interestPerOpenTender: open.map((t) => ({ id: t.id, referenceNumber: t.referenceNumber, title: t.title, interested: counts.get(t.id) ?? 0 })),
        totalInterested: open.reduce((s, t) => s + (counts.get(t.id) ?? 0), 0),
        openWithNoInterest: open.filter((t) => !counts.get(t.id)).length,
        attention: { overdueEvaluation: overdueEvaluation.length, overdueAward: overdueAward.length, unansweredQuestions: unanswered },
        // A count only: it says nothing about what a sealed bid contains.
        bidsReceived: await tx.tenderBid.count({ where: { issuerOrganizationId: user.organizationId, status: "SUBMITTED" } }) as number | null,
      };
    });
  }

  async getMine(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await this.ownTender(tx, user, id);
      const [lines, criteria, rules, invitations, documents, events] = await Promise.all([
        tx.tenderLine.findMany({ where: { tenderId: id }, orderBy: { lineNumber: "asc" } }),
        tx.tenderCriterion.findMany({ where: { tenderId: id }, orderBy: { sortOrder: "asc" } }),
        tx.tenderEligibilityRule.findMany({ where: { tenderId: id }, orderBy: { createdAt: "asc" } }),
        tx.tenderInvitation.findMany({ where: { tenderId: id } }),
        tx.tenderDocument.findMany({ where: { tenderId: id, archivedAt: null }, orderBy: [{ uploadedAt: "asc" }], select: { id: true, title: true, docType: true, description: true, fileName: true, fileSizeBytes: true, version: true, documentKey: true, supersededAt: true, uploadedAt: true } }),
        tx.tenderEvent.findMany({ where: { tenderId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
      ]);
      const participants = await tx.tenderParticipation.findMany({ where: { tenderId: id, issuerOrganizationId: user.organizationId, withdrawnAt: null } });
      const [questionRows, clarifications, addenda, acks, screenings] = await Promise.all([
        tx.tenderQuestion.findMany({ where: { tenderId: id, issuerOrganizationId: user.organizationId }, orderBy: { askedAt: "desc" } }),
        tx.tenderClarification.findMany({ where: { tenderId: id }, orderBy: { answeredAt: "desc" } }),
        tx.tenderAddendum.findMany({ where: { tenderId: id }, orderBy: { number: "asc" } }),
        tx.tenderAddendumAck.findMany({ where: { tenderId: id, issuerOrganizationId: user.organizationId } }),
        tx.tenderScreening.findMany({ where: { tenderId: id }, orderBy: { recordedAt: "desc" } }),
      ]);
      const names = new Map((await tx.organization.findMany({ where: { id: { in: [...new Set([...participants.map((p) => p.organizationId), ...invitations.map((i) => i.invitedOrganizationId), ...questionRows.map((q) => q.organizationId), ...screenings.map((x) => x.screenedOrganisationId)])] } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
      const answeredIds = new Set(clarifications.map((c) => c.sourceQuestionId).filter((x): x is string => !!x));
      return {
        tender: { ...t, effectiveStatus: effectiveStatus(t) }, lines, criteria, rules, documents, events,
        invitations: invitations.map((i) => ({ ...i, organizationName: names.get(i.invitedOrganizationId) ?? null })),
        participants: participants.map((p) => ({
          organizationId: p.organizationId, organizationName: names.get(p.organizationId) ?? null, status: p.status, optedInAt: p.optedInAt,
          integrityPledgeAt: p.integrityPledgeAt, exclusionDeclaredAt: p.exclusionDeclaredAt, exclusionNoGrounds: p.exclusionNoGrounds,
          exclusionGrounds: jsonArray(p.exclusionGroundsJson), exclusionExplanation: p.exclusionExplanation,
        })),
        questions: questionRows.map((q) => ({ id: q.id, question: q.question, askedAt: q.askedAt, askedByOrganisation: names.get(q.organizationId) ?? null, answered: answeredIds.has(q.id) })),
        clarifications: clarifications.map(({ id: cid, question, answer, answeredAt }) => ({ id: cid, question, answer, answeredAt })),
        addenda: addenda.map((a) => {
          const acked = new Set(acks.filter((k) => k.addendumId === a.id).map((k) => k.organizationId));
          return { id: a.id, number: a.number, title: a.title, body: a.body, requiresAcknowledgement: a.requiresAcknowledgement, newClosingAt: a.newClosingAt, createdAt: a.createdAt, acknowledgedBy: acked.size, outstanding: participants.filter((p) => !acked.has(p.organizationId)).map((p) => names.get(p.organizationId) ?? "Unknown organisation") };
        }),
        screenings: screenings.map((x) => ({ id: x.id, screenedOrganisationId: x.screenedOrganisationId, organisationName: names.get(x.screenedOrganisationId) ?? null, lists: jsonArray(x.listsJson), outcome: x.outcome, notes: x.notes, screenedOn: x.screenedOn, recordedAt: x.recordedAt })),
      };
    });
  }

  // ----------------------------------------------------------- participant

  private ruleView(rules: { id: string; ruleType: string; ruleValue: string; explanation: string | null; isRequired: boolean }[]): RuleLike[] { return rules; }

  /** Every published tender, each with an eligibility chip and checklist summary. Filtering is by chip, never by hiding. */
  private async listAvailableBase(user: RequestUser, q: { chip?: string; type?: string; country?: string; category?: string; keyword?: string; sort?: string; shortlistedOnly?: boolean }) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const profile = await this.loadProfile(tx, user.organizationId);
      const tenders = await tx.tender.findMany({
        where: {
          isPublished: true, archivedAt: null, organizationId: { not: user.organizationId }, status: { in: ["PUBLISHED", "CLOSED", "EVALUATING", "AWARDED"] },
          ...(q.type ? { tenderType: q.type } : {}),
          ...(q.country ? { deliveryCountryCodes: { contains: `,${q.country.toUpperCase()},` } } : {}),
          ...(q.keyword ? { OR: [{ title: { contains: q.keyword } }, { summary: { contains: q.keyword } }, { referenceNumber: { contains: q.keyword } }] } : {}),
        },
        include: { organization: { select: { name: true } }, rules: true },
        orderBy: { publishedAt: "desc" }, take: 300,
      });
      const ids = tenders.map((t) => t.id);
      const [parts, shorts, invites, lines] = await Promise.all([
        tx.tenderParticipation.findMany({ where: { organizationId: user.organizationId, tenderId: { in: ids }, withdrawnAt: null }, select: { tenderId: true } }),
        tx.tenderShortlist.findMany({ where: { organizationId: user.organizationId, tenderId: { in: ids } }, select: { tenderId: true } }),
        tx.tenderInvitation.findMany({ where: { invitedOrganizationId: user.organizationId, tenderId: { in: ids } }, select: { tenderId: true } }),
        tx.tenderLine.findMany({ where: { tenderId: { in: ids }, productMasterId: { not: null } }, select: { tenderId: true, productMasterId: true } }),
      ]);
      const pmCategory = new Map<string, string>();
      for (const c of chunk([...new Set(lines.map((l) => l.productMasterId!))], 500)) {
        for (const p of await tx.productMaster.findMany({ where: { id: { in: c } }, select: { id: true, category: true } })) pmCategory.set(p.id, p.category);
      }
      const partSet = new Set(parts.map((p) => p.tenderId)), shortSet = new Set(shorts.map((p) => p.tenderId)), inviteSet = new Set(invites.map((p) => p.tenderId));
      const cats = new Map<string, Set<string>>();
      for (const l of lines) { const c = pmCategory.get(l.productMasterId!); if (c) (cats.get(l.tenderId) ?? cats.set(l.tenderId, new Set()).get(l.tenderId)!).add(c); }
      const now = new Date();
      let rows = tenders.map((t) => {
        const result = evaluateEligibility(this.ruleView(t.rules), profile, { invited: inviteSet.has(t.id) });
        const status = effectiveStatus(t, now);
        return {
          id: t.id, referenceNumber: t.referenceNumber, title: t.title, summary: t.summary, tenderType: t.tenderType, issuerName: t.organization.name,
          deliveryCountryCodes: t.deliveryCountryCodes, currency: t.currency, publishedAt: t.publishedAt, closingAt: t.closingAt, timeZone: t.timeZone, status,
          categories: [...(cats.get(t.id) ?? [])],
          chips: chipsFor({ result, participating: partSet.has(t.id), shortlisted: shortSet.has(t.id), closingAt: t.closingAt, status: t.status, now }),
          unmetRequired: result.unmetRequired, canBid: result.canBid && status === "PUBLISHED",
        };
      });
      if (q.category) rows = rows.filter((r) => r.categories.some((c) => c === q.category || c.startsWith(`${q.category}.`)));
      if (q.shortlistedOnly) rows = rows.filter((r) => r.chips.includes("SHORTLISTED"));
      if (q.chip) rows = rows.filter((r) => (r.chips as string[]).includes(q.chip!));
      const rank = { ELIGIBLE: 0, ALMOST_ELIGIBLE: 1, NOT_ELIGIBLE: 2 } as Record<string, number>;
      if (q.sort === "closing") rows.sort((a, b) => (a.closingAt?.getTime() ?? Infinity) - (b.closingAt?.getTime() ?? Infinity));
      else if (q.sort === "eligibility") rows.sort((a, b) => rank[a.chips[0]] - rank[b.chips[0]]);
      const counts = { eligible: 0, almostEligible: 0, notEligible: 0, invited: 0, participating: 0, shortlisted: 0, closingSoon: 0 };
      for (const r of rows) {
        if (r.chips.includes("ELIGIBLE")) counts.eligible++; else if (r.chips.includes("ALMOST_ELIGIBLE")) counts.almostEligible++; else counts.notEligible++;
        if (r.chips.includes("INVITED")) counts.invited++; if (r.chips.includes("PARTICIPATING")) counts.participating++;
        if (r.chips.includes("SHORTLISTED")) counts.shortlisted++; if (r.chips.includes("CLOSING_SOON")) counts.closingSoon++;
      }
      return { counts, tenders: rows };
    });
  }

  /**
   * Find tenders: every published tender, explained by chips, with the extra filters layered on top: status, closing and publication windows, issuer,
   * currency, delivery country, catalogue category and "matches my declared scope". Counts and the dashboard breakdowns reflect the filtered set.
   */
  async listAvailable(user: RequestUser, q: { chip?: string; type?: string; country?: string; category?: string; keyword?: string; sort?: string; shortlistedOnly?: boolean; status?: string; closingWithinDays?: number; publishedWithinDays?: number; issuer?: string; currency?: string; scopeMatch?: boolean }) {
    const base = await this.listAvailableBase(user, { chip: q.chip, type: q.type, country: q.country, category: q.category, keyword: q.keyword, sort: q.sort, shortlistedOnly: q.shortlistedOnly });
    const scope = await this.scopeMatches(user, base.tenders.map((t) => t.id));
    const now = Date.now();
    const day = 86_400_000;
    let rows = base.tenders.map((t) => ({ ...t, scopeMatches: scope.get(t.id) ?? [] }));
    if (q.status) rows = rows.filter((t) => t.status === q.status);
    if (q.closingWithinDays) rows = rows.filter((t) => t.status === "PUBLISHED" && t.closingAt && t.closingAt.getTime() >= now && t.closingAt.getTime() <= now + q.closingWithinDays! * day);
    if (q.publishedWithinDays) rows = rows.filter((t) => t.publishedAt && t.publishedAt.getTime() >= now - q.publishedWithinDays! * day);
    if (q.issuer) rows = rows.filter((t) => t.issuerName.toLowerCase().includes(q.issuer!.toLowerCase()));
    if (q.currency) rows = rows.filter((t) => t.currency === q.currency!.toUpperCase());
    if (q.scopeMatch) rows = rows.filter((t) => t.scopeMatches.length > 0);
    if (q.sort === "issuer") rows.sort((a, b) => a.issuerName.localeCompare(b.issuerName));
    const counts = { ...base.counts, eligible: 0, almostEligible: 0, notEligible: 0, invited: 0, participating: 0, shortlisted: 0, closingSoon: 0, open: 0, scopeMatch: 0 };
    for (const r of rows) {
      if (r.chips.includes("ELIGIBLE")) counts.eligible++; else if (r.chips.includes("ALMOST_ELIGIBLE")) counts.almostEligible++; else counts.notEligible++;
      if (r.chips.includes("INVITED")) counts.invited++;
      if (r.chips.includes("PARTICIPATING")) counts.participating++;
      if (r.chips.includes("SHORTLISTED")) counts.shortlisted++;
      if (r.chips.includes("CLOSING_SOON")) counts.closingSoon++;
      if (r.status === "PUBLISHED") counts.open++;
      if (r.scopeMatches.length) counts.scopeMatch++;
    }
    const tally = (keys: (t: (typeof rows)[number]) => string[]) => {
      const m = new Map<string, number>();
      for (const r of rows) for (const k of new Set(keys(r))) m.set(k, (m.get(k) ?? 0) + 1);
      return [...m].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    };
    const facets = {
      issuers: tally((t) => [t.issuerName]),
      countries: tally((t) => (t.deliveryCountryCodes ?? "").split(",").filter(Boolean)),
      categories: tally((t) => t.categories.map((c) => c.split(".")[0])),
      currencies: tally((t) => (t.currency ? [t.currency] : [])),
    };
    return { counts, facets, tenders: rows };
  }

  /** The participant's view of one tender: everything they need to prepare, plus their live eligibility checklist. */
  async getForParticipant(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id }, include: { organization: { select: { id: true, name: true } } } });
      if (!t || !t.isPublished || t.archivedAt) throw new NotFoundException("Tender not found.");
      const [addendaRows, ackRows, myQuestions] = await Promise.all([
        tx.tenderAddendum.findMany({ where: { tenderId: id }, orderBy: { number: "asc" } }),
        tx.tenderAddendumAck.findMany({ where: { tenderId: id, organizationId: user.organizationId } }),
        tx.tenderQuestion.findMany({ where: { tenderId: id, organizationId: user.organizationId }, orderBy: { askedAt: "desc" } }),
      ]);
      const [lines, criteria, rules, documents, clarifications, part, short, invite, profile] = await Promise.all([
        tx.tenderLine.findMany({ where: { tenderId: id }, orderBy: { lineNumber: "asc" } }),
        tx.tenderCriterion.findMany({ where: { tenderId: id }, orderBy: { sortOrder: "asc" } }),
        tx.tenderEligibilityRule.findMany({ where: { tenderId: id } }),
        tx.tenderDocument.findMany({ where: { tenderId: id, archivedAt: null }, orderBy: [{ uploadedAt: "asc" }], select: { id: true, title: true, docType: true, description: true, fileName: true, fileSizeBytes: true, version: true, documentKey: true, supersededAt: true, uploadedAt: true } }),
        tx.tenderClarification.findMany({ where: { tenderId: id }, orderBy: { answeredAt: "desc" } }),
        tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId: id, organizationId: user.organizationId } } }),
        tx.tenderShortlist.findUnique({ where: { organizationId_tenderId: { organizationId: user.organizationId, tenderId: id } } }),
        tx.tenderInvitation.findFirst({ where: { tenderId: id, invitedOrganizationId: user.organizationId } }),
        this.loadProfile(tx, user.organizationId),
      ]);
      const result = evaluateEligibility(this.ruleView(rules), profile, { invited: !!invite });
      const status = effectiveStatus(t);
      return {
        tender: { ...t, status, issuerName: t.organization.name, termsAndConditions: t.termsAndConditions },
        lines, criteria, documents, clarifications: clarifications.map(({ question, answer, answeredAt, id: cid }) => ({ id: cid, question, answer, answeredAt })),
        eligibility: { ...result, chips: chipsFor({ result, participating: !!part && !part.withdrawnAt, shortlisted: !!short, closingAt: t.closingAt, status: t.status }), canBid: result.canBid && status === "PUBLISHED" },
        participation: part && !part.withdrawnAt ? { status: part.status, optedInAt: part.optedInAt } : null,
        shortlisted: !!short,
        addenda: addendaRows.map((a) => ({ id: a.id, number: a.number, title: a.title, body: a.body, requiresAcknowledgement: a.requiresAcknowledgement, newClosingAt: a.newClosingAt, createdAt: a.createdAt, acknowledged: ackRows.some((k) => k.addendumId === a.id) })),
        myQuestions: myQuestions.map((q) => ({ id: q.id, question: q.question, askedAt: q.askedAt })),
      };
    });
  }

  async expressInterest(user: RequestUser, id: string, dto: InterestDto = {}) {
    assertHasPermission(user, "tenders.bid");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id } });
      if (!t || !t.isPublished || t.organizationId === user.organizationId) throw new NotFoundException("Tender not found.");
      if (effectiveStatus(t) !== "PUBLISHED") throw new ConflictException("This tender is no longer open.");
      const [rules, invite, profile] = await Promise.all([
        tx.tenderEligibilityRule.findMany({ where: { tenderId: id } }),
        tx.tenderInvitation.findFirst({ where: { tenderId: id, invitedOrganizationId: user.organizationId } }),
        this.loadProfile(tx, user.organizationId),
      ]);
      const result = evaluateEligibility(this.ruleView(rules), profile, { invited: !!invite });
      if (!result.canBid) throw new ForbiddenException({ message: "Your organisation does not yet meet this tender's requirements.", checklist: result.items.filter((i) => i.status !== "MET") });
      const existing = await tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId: id, organizationId: user.organizationId } } });
      if (existing && !existing.withdrawnAt) return { already: true, t, declaredGrounds: [] as string[] };
      const declarations = this.checkDeclarations(t, dto);
      const data = { status: "INTERESTED", withdrawnAt: null, optedInAt: new Date(), optedInById: user.id, ...declarations };
      if (existing) await tx.tenderParticipation.update({ where: { id: existing.id }, data });
      else await tx.tenderParticipation.create({ data: { organizationId: user.organizationId, issuerOrganizationId: t.organizationId, tenderId: id, ...data } });
      await tx.tenderEligibilityCheck.create({ data: { organizationId: user.organizationId, issuerOrganizationId: t.organizationId, tenderId: id, outcome: result.outcome, detailsJson: JSON.stringify(result.items) } });
      await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: user.organizationId, tenderId: id, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "INTEREST_EXPRESSED", summary: "An organisation expressed interest", details: { integrityPledge: !!declarations.integrityPledgeAt, exclusionDeclared: !!declarations.exclusionDeclaredAt, exclusionGrounds: jsonArray(declarations.exclusionGroundsJson) } });
      return { already: false, t, declaredGrounds: jsonArray(declarations.exclusionGroundsJson) };
    });
    if (!out.already) {
      const flagged = out.declaredGrounds.length > 0 ? " It declared grounds for exclusion, which need your review." : "";
      await this.notifyIssuer(out.t, user, "TENDER_INTEREST", `New interest in ${out.t.referenceNumber}`, `An eligible organisation has expressed interest in ${out.t.title}.${flagged}`);
    }
    return { participating: true };
  }

  /** Validates the integrity pledge and exclusion declaration a tender asks for, and returns what to record on the participation. */
  private checkDeclarations(t: { requireIntegrityPledge: boolean; requireExclusionDeclaration: boolean }, dto: InterestDto) {
    const out: { integrityPledgeAt?: Date; exclusionDeclaredAt?: Date; exclusionNoGrounds?: boolean; exclusionGroundsJson?: string; exclusionExplanation?: string } = {};
    if (t.requireIntegrityPledge) {
      if (!dto.integrityPledge) throw new BadRequestException("Accept the integrity pledge to continue.");
      out.integrityPledgeAt = new Date();
    }
    if (t.requireExclusionDeclaration) {
      const d = dto.exclusion;
      if (!d) throw new BadRequestException("Complete the exclusion declaration to continue.");
      const valid = new Set<string>(EXCLUSION_GROUNDS.map((g) => g.value));
      const grounds = (d.grounds ?? []).filter((g) => valid.has(g));
      if (d.noGrounds && grounds.length > 0) throw new BadRequestException("Either declare that no grounds apply, or list the grounds that do.");
      if (!d.noGrounds && grounds.length === 0) throw new BadRequestException("Declare that no grounds apply, or choose the grounds that do.");
      if (!d.noGrounds && !d.explanation?.trim()) throw new BadRequestException("Explain the grounds you have declared.");
      out.exclusionDeclaredAt = new Date(); out.exclusionNoGrounds = !!d.noGrounds; out.exclusionGroundsJson = JSON.stringify(grounds); out.exclusionExplanation = d.explanation?.trim() || undefined;
    }
    return out;
  }

  async notifyIssuer(t: { id: string; organizationId: string }, user: RequestUser, kind: string, title: string, body: string) {
    await withPlatformStaffContext(async (tx) => {
      const recipients = await usersWithPermission(tx, t.organizationId, "tenders.issue");
      await createNotifications(tx, recipients.map((r) => ({ organizationId: t.organizationId, recipientUserId: r, actorUserId: user.id, kind, category: "TENDER", title, body, link: `/tenders/manage?id=${t.id}`, subjectType: "TENDER", subjectId: t.id })));
    });
  }

  async withdrawInterest(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.bid");
    return withTenantContext(user.organizationId, async (tx) => {
      const p = await tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId: id, organizationId: user.organizationId } } });
      if (!p || p.withdrawnAt) throw new NotFoundException("You have not expressed interest in this tender.");
      await tx.tenderParticipation.update({ where: { id: p.id }, data: { status: "WITHDRAWN", withdrawnAt: new Date() } });
      await appendTenderEvent({ organizationId: p.issuerOrganizationId, counterpartyOrganizationId: user.organizationId, tenderId: id, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "INTEREST_WITHDRAWN", summary: "An organisation withdrew its interest" });
      return { participating: false };
    });
  }

  async addShortlist(user: RequestUser, id: string, note?: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id }, select: { id: true, isPublished: true } });
      if (!t?.isPublished) throw new NotFoundException("Tender not found.");
      await tx.tenderShortlist.upsert({ where: { organizationId_tenderId: { organizationId: user.organizationId, tenderId: id } }, update: { note }, create: { organizationId: user.organizationId, tenderId: id, note, addedById: user.id } });
      return { shortlisted: true };
    });
  }

  async removeShortlist(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      await tx.tenderShortlist.deleteMany({ where: { organizationId: user.organizationId, tenderId: id } });
      return { shortlisted: false };
    });
  }

  async listSavedSearches(user: RequestUser) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.tenderSavedSearch.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } });
      return rows.map((r) => ({ id: r.id, name: r.name, alertsEnabled: r.alertsEnabled, criteria: JSON.parse(r.criteriaJson) as SavedCriteria, createdAt: r.createdAt }));
    });
  }

  async saveSearch(user: RequestUser, dto: SavedSearchDto) {
    assertHasPermission(user, "tenders.view");
    const { name, alertsEnabled, ...criteria } = dto;
    return withTenantContext(user.organizationId, async (tx) => {
      if ((await tx.tenderSavedSearch.count({ where: { organizationId: user.organizationId } })) >= 25) throw new BadRequestException("You can save up to 25 searches.");
      const r = await tx.tenderSavedSearch.create({ data: { organizationId: user.organizationId, name, alertsEnabled: alertsEnabled ?? true, criteriaJson: JSON.stringify(criteria), createdById: user.id } });
      return { id: r.id };
    });
  }

  async deleteSearch(user: RequestUser, id: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => { await tx.tenderSavedSearch.deleteMany({ where: { id, organizationId: user.organizationId } }); return { deleted: true }; });
  }

  /** "Tenders for you": open tenders the organisation is eligible for, that fall inside its declared scope of supply, or that match a saved search. */
  async forYou(user: RequestUser) {
    const all = await this.listAvailable(user, { sort: "closing" });
    const searches = await this.listSavedSearches(user);
    const matching = all.tenders
      .filter((t) => t.status === "PUBLISHED")
      .filter((t) => t.chips.includes("ELIGIBLE") || t.chips.includes("INVITED") || t.scopeMatches.length > 0 || searches.some((s) => matchesSavedSearch(s.criteria, { title: t.title, summary: t.summary, tenderType: t.tenderType, deliveryCountryCodes: t.deliveryCountryCodes, categories: t.categories }) && (!s.criteria.onlyEligible || t.chips.includes("ELIGIBLE") || t.chips.includes("INVITED"))));
    return { tenders: matching.slice(0, 50), savedSearches: searches.length };
  }

  /** For each tender, the organisation's declared scope categories that the tender's catalogue lines fall into. Tender lines are read in a system context; only category ids come back. */
  private async scopeMatches(user: RequestUser, tenderIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (tenderIds.length === 0) return out;
    const declared = new Set<string>((await withTenantContext(user.organizationId, (tx) => tx.organizationScope.findMany({ where: { organizationId: user.organizationId, archivedAt: null } }))).map((r) => r.scopeSubId));
    if (declared.size === 0) return out;
    await withPlatformStaffContext(async (tx: any) => {
      const lines = await tx.tenderLine.findMany({ where: { tenderId: { in: tenderIds }, productMasterId: { not: null } }, select: { tenderId: true, productMasterId: true } });
      const products = await tx.productMaster.findMany({ where: { id: { in: [...new Set<string>(lines.map((l: any) => l.productMasterId))] } }, select: { id: true, category: true, hsCode: true, name: true, inn: true, brand: true, atcCode: true } });
      const subs = new Map<string, string[]>(products.map((p: any) => [p.id, scopeSubsForProduct(p)]));
      for (const l of lines) {
        const hit = (subs.get(l.productMasterId) ?? []).filter((s) => declared.has(s));
        if (hit.length) out.set(l.tenderId, [...new Set([...(out.get(l.tenderId) ?? []), ...hit])]);
      }
    });
    return out;
  }
}
