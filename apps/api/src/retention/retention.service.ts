import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import { RETENTION_SCHEDULE, effectiveRetentionMonths, retentionRule } from "@universe/types";
import type {
  ComplaintSubjectAccessCopy, ComplaintSubjectMatch, RetentionDecisionInput, RetentionEffectiveRule, RetentionOverrideInput, RetentionQueueItem,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { isProtectedAdminEmail } from "../users/protected-accounts";

type Tx = any;
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const run = <T = any>(u: RequestUser, fn: (tx: Tx) => Promise<T>): Promise<T> => (u.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(u.organizationId, fn));
const canManage = (u: RequestUser) => u.platformStaffRole !== "NONE" || u.permissions.includes("org.users.manage");

/**
 * Retention (2026-10-31). The schedule is code (packages/types retention-schedule.ts); an organisation can set its own period for a rule (with a reason).
 * The queue lists records whose period has ended. NOTHING is deleted: a person keeps a record (with a reason, for 12 months), archives it, or anonymises
 * the complainant's personal details. Every decision is recorded and audited.
 */
@Injectable()
export class RetentionService {
  private guard(u: RequestUser) { if (!canManage(u)) throw new ForbiddenException("Retention is managed by organisation administrators."); }

  async rules(u: RequestUser): Promise<RetentionEffectiveRule[]> {
    this.guard(u);
    const ov: any[] = await run(u, (tx) => tx.retentionOverride.findMany({ where: { organizationId: u.organizationId } }));
    return RETENTION_SCHEDULE.map((r) => {
      const o = ov.find((x: any) => x.ruleKey === r.key);
      return { ...r, months: o?.months ?? r.months, defaultMonths: r.months, overridden: !!o, overrideReason: o?.reason ?? null };
    });
  }

  async setOverride(u: RequestUser, dto: RetentionOverrideInput) {
    this.guard(u);
    const rule = RETENTION_SCHEDULE.find((r) => r.key === dto.ruleKey);
    if (!rule) throw new NotFoundException("Unknown retention rule.");
    if (rule.months === 0) throw new BadRequestException("This rule has no end date to change.");
    if (!Number.isInteger(dto.months) || dto.months < 1 || dto.months > 240) throw new BadRequestException("Choose between 1 and 240 months.");
    if (!dto.reason || dto.reason.trim().length < 10) throw new BadRequestException("Give the reason for a different period (at least a sentence).");
    return run(u, async (tx) => {
      const cur = await tx.retentionOverride.findFirst({ where: { organizationId: u.organizationId, ruleKey: dto.ruleKey } });
      const row = cur
        ? await tx.retentionOverride.update({ where: { id: cur.id }, data: { months: dto.months, reason: dto.reason.trim(), setById: u.id } })
        : await tx.retentionOverride.create({ data: { organizationId: u.organizationId, ruleKey: dto.ruleKey, months: dto.months, reason: dto.reason.trim(), setById: u.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "retention_overrides", recordId: row.id, changedById: u.id, changes: [{ field: dto.ruleKey, oldValue: String(cur?.months ?? rule.months), newValue: String(dto.months) }] });
      return { ruleKey: dto.ruleKey, months: dto.months };
    });
  }

  async clearOverride(u: RequestUser, ruleKey: string) {
    this.guard(u);
    return run(u, async (tx) => {
      const cur = await tx.retentionOverride.findFirst({ where: { organizationId: u.organizationId, ruleKey } });
      if (!cur) return { ruleKey };
      await tx.retentionOverride.delete({ where: { id: cur.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "retention_overrides", recordId: cur.id, changedById: u.id, changes: [{ field: ruleKey, oldValue: String(cur.months), newValue: `default (${retentionRule(ruleKey).months})` }] });
      return { ruleKey };
    });
  }

  /** Records whose period has ended and that nobody has dealt with yet. */
  async queue(u: RequestUser): Promise<RetentionQueueItem[]> {
    this.guard(u);
    const org = u.organizationId;
    const now = new Date();
    return run(u, async (tx) => {
      const ov = await tx.retentionOverride.findMany({ where: { organizationId: org } });
      const months = (k: string) => effectiveRetentionMonths(k, ov);
      const decisions = await tx.retentionDecision.findMany({ where: { organizationId: org }, select: { recordId: true, ruleKey: true, decision: true, keptUntil: true } });
      const dealt = (ruleKey: string, id: string) => decisions.some((d: any) => d.ruleKey === ruleKey && d.recordId === id && (d.decision !== "KEEP" || (d.keptUntil && d.keptUntil > now)));
      const out: RetentionQueueItem[] = [];

      const tm = months("tender-file");
      const tenders = await tx.tender.findMany({
        where: { organizationId: org, archivedAt: null, OR: [{ status: { in: ["AWARDED", "CONTRACTED"] }, awardedAt: { lt: addMonths(now, -tm) } }, { status: "CANCELLED", updatedAt: { lt: addMonths(now, -tm) } }] },
        select: { id: true, referenceNumber: true, title: true, awardedAt: true, updatedAt: true }, take: 200, orderBy: { updatedAt: "asc" },
      });
      for (const t of tenders) if (!dealt("tender-file", t.id)) out.push({ ruleKey: "tender-file", recordType: "TENDER", recordId: t.id, label: `${t.referenceNumber}: ${t.title}`, dueSince: addMonths(t.awardedAt ?? t.updatedAt, tm).toISOString(), months: tm, actions: ["KEEP", "ARCHIVED"], link: `/tenders/detail?id=${t.id}` });

      const cm = months("contract");
      const contracts = await tx.tenderContract.findMany({
        where: { organizationId: org, status: { in: ["COMPLETED", "TERMINATED"] }, OR: [{ closedAt: { lt: addMonths(now, -cm) } }, { closedAt: null, endDate: { lt: addMonths(now, -cm) } }] },
        select: { id: true, reference: true, title: true, closedAt: true, endDate: true }, take: 200,
      });
      for (const c of contracts) if (!dealt("contract", c.id)) out.push({ ruleKey: "contract", recordType: "CONTRACT", recordId: c.id, label: `${c.reference}: ${c.title}`, dueSince: addMonths((c.closedAt ?? c.endDate) as Date, cm).toISOString(), months: cm, actions: ["KEEP", "ARCHIVED"], link: `/tenders/contracts?id=${c.id}` });

      const qm = months("quality-complaint");
      const openRegulator = { NOT: { regulatorDecision: "UNDER_CONSIDERATION" } };
      const complaints = await tx.qualityComplaint.findMany({
        where: { organizationId: org, archivedAt: null, status: { in: ["CLOSED", "WITHDRAWN"] }, ...openRegulator, OR: [{ closedAt: { lt: addMonths(now, -qm) } }, { closedAt: null, updatedAt: { lt: addMonths(now, -qm) } }] },
        select: { id: true, referenceNumber: true, title: true, closedAt: true, updatedAt: true }, take: 200,
      });
      for (const c of complaints) if (!dealt("quality-complaint", c.id)) out.push({ ruleKey: "quality-complaint", recordType: "COMPLAINT", recordId: c.id, label: `${c.referenceNumber}: ${c.title}`, dueSince: addMonths(c.closedAt ?? c.updatedAt, qm).toISOString(), months: qm, actions: ["KEEP", "ARCHIVED"], link: `/quality/complaints/detail?id=${c.id}` });

      const pm = months("quality-complainant-person");
      const people = await tx.qualityComplaint.findMany({
        where: { organizationId: org, complainantAnonymisedAt: null, status: { in: ["CLOSED", "WITHDRAWN"] }, ...openRegulator, OR: [{ complainantName: { not: null } }, { complainantEmail: { not: null } }, { complainantPhone: { not: null } }], AND: [{ OR: [{ closedAt: { lt: addMonths(now, -pm) } }, { closedAt: null, updatedAt: { lt: addMonths(now, -pm) } }] }] },
        select: { id: true, referenceNumber: true, title: true, closedAt: true, updatedAt: true }, take: 200,
      });
      for (const c of people) if (!dealt("quality-complainant-person", c.id)) out.push({ ruleKey: "quality-complainant-person", recordType: "COMPLAINANT", recordId: c.id, label: `Complainant on ${c.referenceNumber}: ${c.title}`, dueSince: addMonths(c.closedAt ?? c.updatedAt, pm).toISOString(), months: pm, actions: ["KEEP", "ANONYMISED"], link: `/quality/complaints/detail?id=${c.id}` });

      // ---- the remaining record types (2026-11-01) ----
      const push = (ruleKey: string, recordType: RetentionQueueItem["recordType"], id: string, label: string, since: Date, mo: number, actions: RetentionQueueItem["actions"], link: string | null) => {
        if (!dealt(ruleKey, id)) out.push({ ruleKey, recordType, recordId: id, label, dueSince: addMonths(since, mo).toISOString(), months: mo, actions, link });
      };
      const certM = months("certification");
      const certs = await tx.partnerCertification.findMany({ where: { organizationId: org, status: { not: "ARCHIVED" }, expiryDate: { lt: addMonths(now, -certM) } }, select: { id: true, type: true, referenceNumber: true, expiryDate: true, partner: { select: { name: true } } }, take: 200 });
      for (const c of certs) push("certification", "CERTIFICATION", c.id, `${c.partner?.name ?? "Stakeholder"}: ${c.type}${c.referenceNumber ? ` ${c.referenceNumber}` : ""}`, c.expiryDate as Date, certM, ["KEEP", "ARCHIVED"], null);

      const gm = months("gifts-hospitality");
      const gifts = await tx.crmHospitalityRecord.findMany({ where: { organizationId: org, archivedAt: null, occurredOn: { lt: addMonths(now, -gm) } }, select: { id: true, description: true, occurredOn: true, relationshipId: true }, take: 200 });
      for (const g of gifts) push("gifts-hospitality", "HOSPITALITY", g.id, `Gift or hospitality: ${g.description}`.slice(0, 160), g.occurredOn, gm, ["KEEP", "ARCHIVED"], `/relationships?id=${g.relationshipId}`);

      const pm2 = months("privacy-requests");
      const reqs = await tx.crmPrivacyRequest.findMany({ where: { organizationId: org, completedAt: { not: null, lt: addMonths(now, -pm2) } }, select: { id: true, type: true, requesterName: true, completedAt: true }, take: 200 });
      for (const r of reqs) push("privacy-requests", "PRIVACY_REQUEST", r.id, `${r.type.toLowerCase().replace(/_/g, " ")} request from ${r.requesterName}`, r.completedAt as Date, pm2, ["KEEP", "ARCHIVED"], null);

      const fm = months("financial");
      const pays = await tx.tenderContractPayment.findMany({ where: { organizationId: org, OR: [{ paidDate: { lt: addMonths(now, -fm) } }, { paidDate: null, dueDate: { lt: addMonths(now, -fm) } }] }, select: { id: true, reference: true, paidDate: true, dueDate: true }, take: 200 });
      for (const p of pays) push("financial", "PAYMENT", p.id, `Payment record ${p.reference}`, (p.paidDate ?? p.dueDate) as Date, fm, ["KEEP", "ARCHIVED"], null);

      const um = months("user-account");
      const users = await tx.user.findMany({ where: { organizationId: org, archivedAt: { not: null, lt: addMonths(now, -um) }, NOT: { forename: "Former" } }, select: { id: true, forename: true, surname: true, email: true, archivedAt: true }, take: 200 });
      for (const x of users) if (!isProtectedAdminEmail(x.email)) push("user-account", "USER", x.id, `Archived account: ${x.forename} ${x.surname}`, x.archivedAt as Date, um, ["KEEP", "ANONYMISED"], `/users/detail?id=${x.id}`);

      const em = months("enquiry-unsuccessful");
      const enq = await tx.supplierEnquiry.findMany({ where: { organizationId: org, responseStatus: { not: "WAITING" }, quotedPrice: null, createdAt: { lt: addMonths(now, -em) } }, select: { id: true, createdAt: true, supplier: { select: { name: true } } }, take: 200 });
      for (const e of enq) push("enquiry-unsuccessful", "ENQUIRY", e.id, `Enquiry to ${e.supplier?.name ?? "a supplier"} that led nowhere`, e.createdAt, em, ["KEEP", "ARCHIVED"], null);

      const bm = months("product-regulatory");
      const batches = await tx.productBatch.findMany({ where: { organizationId: org, expiryDate: { lt: addMonths(now, -bm) } }, select: { id: true, batchNumber: true, expiryDate: true, productMaster: { select: { name: true } } }, take: 200 });
      for (const b of batches) push("product-regulatory", "BATCH", b.id, `Batch ${b.batchNumber}${b.productMaster?.name ? `: ${b.productMaster.name}` : ""}`, b.expiryDate as Date, bm, ["KEEP", "ARCHIVED"], null);

      return out.sort((a, b) => a.dueSince.localeCompare(b.dueSince));
    });
  }

  async decide(u: RequestUser, dto: RetentionDecisionInput) {
    this.guard(u);
    const rule = RETENTION_SCHEDULE.find((r) => r.key === dto.ruleKey);
    if (!rule) throw new NotFoundException("Unknown retention rule.");
    const reason = dto.reason?.trim() ?? "";
    if (dto.decision === "KEEP" && reason.length < 10) throw new BadRequestException("Say why this record should be kept (at least a sentence).");
    const valid: Record<string, string[]> = { TENDER: ["KEEP", "ARCHIVED"], CONTRACT: ["KEEP", "ARCHIVED"], COMPLAINT: ["KEEP", "ARCHIVED"], COMPLAINANT: ["KEEP", "ANONYMISED"], CERTIFICATION: ["KEEP", "ARCHIVED"], HOSPITALITY: ["KEEP", "ARCHIVED"], PRIVACY_REQUEST: ["KEEP", "ARCHIVED"], PAYMENT: ["KEEP", "ARCHIVED"], USER: ["KEEP", "ANONYMISED"], ENQUIRY: ["KEEP", "ARCHIVED"], BATCH: ["KEEP", "ARCHIVED"] };
    if (RETENTION_SCHEDULE.find((r) => r.key === dto.ruleKey)?.policyOnly) throw new BadRequestException("This rule is applied by the platform and is not reviewed record by record.");
    if (!valid[dto.recordType]?.includes(dto.decision)) throw new BadRequestException("That choice is not available for this kind of record.");
    const org = u.organizationId;
    const now = new Date();
    return run(u, async (tx) => {
      if (dto.recordType === "TENDER") {
        const t = await tx.tender.findFirst({ where: { id: dto.recordId, organizationId: org }, select: { id: true } });
        if (!t) throw new NotFoundException("Tender not found.");
        if (dto.decision === "ARCHIVED") { await tx.tender.update({ where: { id: t.id }, data: { archivedAt: now } }); await recordFieldChanges(tx, { organizationId: org, tableName: "tenders", recordId: t.id, changedById: u.id, changes: [{ field: "archivedAt", oldValue: null, newValue: now.toISOString() }] }); }
      } else if (dto.recordType === "CONTRACT") {
        const c = await tx.tenderContract.findFirst({ where: { id: dto.recordId, organizationId: org }, select: { id: true } });
        if (!c) throw new NotFoundException("Contract not found.");
      } else if (dto.recordType === "CERTIFICATION") {
        const c = await tx.partnerCertification.findFirst({ where: { id: dto.recordId, organizationId: org }, select: { id: true, status: true } });
        if (!c) throw new NotFoundException("Certification not found.");
        if (dto.decision === "ARCHIVED") { await tx.partnerCertification.update({ where: { id: c.id }, data: { status: "ARCHIVED" } }); await recordFieldChanges(tx, { organizationId: org, tableName: "partner_certifications", recordId: c.id, changedById: u.id, changes: [{ field: "status", oldValue: c.status, newValue: "ARCHIVED" }] }); }
      } else if (dto.recordType === "HOSPITALITY") {
        const g = await tx.crmHospitalityRecord.findFirst({ where: { id: dto.recordId, organizationId: org }, select: { id: true } });
        if (!g) throw new NotFoundException("Record not found.");
        if (dto.decision === "ARCHIVED") { await tx.crmHospitalityRecord.update({ where: { id: g.id }, data: { archivedAt: now, archivedById: u.id } }); await recordFieldChanges(tx, { organizationId: org, tableName: "crm_hospitality_records", recordId: g.id, changedById: u.id, changes: [{ field: "archivedAt", oldValue: null, newValue: now.toISOString() }] }); }
      } else if (dto.recordType === "PRIVACY_REQUEST" || dto.recordType === "PAYMENT" || dto.recordType === "ENQUIRY" || dto.recordType === "BATCH") {
        // Reviewed and recorded; the record itself stays as it is (no archive marker exists on these tables), and the queue no longer offers it.
        const model = ({ PRIVACY_REQUEST: tx.crmPrivacyRequest, PAYMENT: tx.tenderContractPayment, ENQUIRY: tx.supplierEnquiry, BATCH: tx.productBatch } as any)[dto.recordType];
        const found = await model.findFirst({ where: { id: dto.recordId, organizationId: org }, select: { id: true } });
        if (!found) throw new NotFoundException("Record not found.");
      } else if (dto.recordType === "USER") {
        const x = await tx.user.findFirst({ where: { id: dto.recordId, organizationId: org, archivedAt: { not: null } }, select: { id: true, email: true } });
        if (!x) throw new NotFoundException("Archived account not found.");
        if (isProtectedAdminEmail(x.email)) throw new BadRequestException("This account is protected and is never anonymised.");
        if (dto.decision === "ANONYMISED") {
          await tx.user.update({ where: { id: x.id }, data: { forename: "Former", surname: "user", jobTitle: null, email: `anonymised-${x.id}@invalid.universe`, entraObjectId: null } });
          await recordFieldChanges(tx, { organizationId: org, tableName: "users", recordId: x.id, changedById: u.id, changes: [{ field: "personalDetails", oldValue: "held", newValue: "removed" }] });
        }
      } else {
        const c = await tx.qualityComplaint.findFirst({ where: { id: dto.recordId, organizationId: org }, select: { id: true, complainantName: true, complainantEmail: true, complainantPhone: true, regulatorDecision: true } });
        if (!c) throw new NotFoundException("Complaint not found.");
        if (dto.decision !== "KEEP" && c.regulatorDecision === "UNDER_CONSIDERATION") throw new BadRequestException("A regulator decision is still being considered for this complaint, so it cannot be archived or anonymised yet.");
        if (dto.decision === "ARCHIVED") { await tx.qualityComplaint.update({ where: { id: c.id }, data: { archivedAt: now, archivedById: u.id } }); await recordFieldChanges(tx, { organizationId: org, tableName: "quality_complaints", recordId: c.id, changedById: u.id, changes: [{ field: "archivedAt", oldValue: null, newValue: now.toISOString() }] }); }
        if (dto.decision === "ANONYMISED") {
          await tx.qualityComplaint.update({ where: { id: c.id }, data: { complainantName: null, complainantEmail: null, complainantPhone: null, complainantAnonymisedAt: now } });
          await tx.qualityComplaintEvent.create({ data: { organizationId: org, complaintId: c.id, kind: "NOTE", summary: "Complainant's personal details removed under the retention schedule.", actorUserId: u.id } });
          await recordFieldChanges(tx, { organizationId: org, tableName: "quality_complaints", recordId: c.id, changedById: u.id, changes: [{ field: "complainantDetails", oldValue: "held", newValue: "removed" }] });
        }
      }
      const row = await tx.retentionDecision.create({ data: { organizationId: org, ruleKey: dto.ruleKey, recordType: dto.recordType, recordId: dto.recordId, decision: dto.decision, reason: reason || null, keptUntil: dto.decision === "KEEP" ? addMonths(now, 12) : null, decidedById: u.id } });
      return { id: row.id, decision: row.decision, keptUntil: row.keptUntil?.toISOString() ?? null };
    });
  }

  // ---- Complaint subject access -----------------------------------------------------------------------------------------------------------

  private matchWhere(org: string, q: string) {
    const s = q.trim();
    return { organizationId: org, OR: [{ complainantName: { contains: s } }, { complainantEmail: { contains: s } }, { complainantPhone: { contains: s } }, { contact: { OR: [{ email: { contains: s } }, { name: { contains: s } }, { phone: { contains: s } }] } }] };
  }

  async findComplainant(u: RequestUser, q: string): Promise<ComplaintSubjectMatch[]> {
    this.guard(u);
    if (!q || q.trim().length < 3) throw new BadRequestException("Enter at least three characters of a name, email or phone number.");
    const rows: any[] = await run(u, (tx) => tx.qualityComplaint.findMany({ where: this.matchWhere(u.organizationId, q), select: { id: true, referenceNumber: true, title: true, status: true, complainantName: true, complainantAnonymisedAt: true, contact: { select: { name: true } } }, take: 50, orderBy: { receivedAt: "desc" } }));
    return rows.map((r: any) => ({ id: r.id, referenceNumber: r.referenceNumber, title: r.title, status: r.status, complainant: r.complainantName ?? (r.contact?.name ?? null), anonymised: !!r.complainantAnonymisedAt }));
  }

  async subjectAccessCopy(u: RequestUser, q: string): Promise<ComplaintSubjectAccessCopy> {
    this.guard(u);
    if (!q || q.trim().length < 3) throw new BadRequestException("Enter at least three characters of a name, email or phone number.");
    const rows: any[] = await run(u, (tx) => tx.qualityComplaint.findMany({ where: this.matchWhere(u.organizationId, q), include: { events: { orderBy: { createdAt: "asc" } } }, take: 100, orderBy: { receivedAt: "desc" } }));
    return {
      generatedAt: new Date().toISOString(), query: q.trim(),
      complaints: rows.map((c: any) => ({
        id: c.id, referenceNumber: c.referenceNumber, title: c.title, status: c.status, direction: c.direction, receivedAt: c.receivedAt.toISOString(), closedAt: c.closedAt?.toISOString() ?? null,
        complainantName: c.complainantName, complainantEmail: c.complainantEmail, complainantPhone: c.complainantPhone, anonymisedAt: c.complainantAnonymisedAt?.toISOString() ?? null,
        description: c.description, findings: c.findings, outcome: c.outcome, responseSummary: c.responseSummary,
        timeline: c.events.map((e: any) => ({ when: e.createdAt.toISOString(), kind: e.kind, summary: e.summary, body: e.body })),
      })),
    };
  }
}
