import { Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { ScorecardRecordRow, ScorecardRecordSet } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { tenantScope } from "../common/tenant-scoped";
import { lineTimeliness } from "./delivery-metrics";
import { loadSettings } from "./scorecard-settings.service";

const DAY = 86_400_000;
const LIMIT = 50;
const d = (x?: Date | null) => (x ? x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const ACTIVE = ["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED", "ON_HOLD"];

/**
 * The records behind each partner-scorecard measure, so a tile can be clicked to see exactly what it is built from. Same definitions as
 * PartnerScorecardService (shared on-time window, complaint visibility), returned as a small generic table.
 */
@Injectable()
export class ScorecardRecordsService {
  async get(user: RequestUser, partnerId: string, key: string): Promise<ScorecardRecordSet> {
    const org = user.organizationId;
    const now = new Date();
    const canComplaints = user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view");
    return withTenantContext(org, async (tx) => {
      const partner = await tx.partner.findFirst({ where: { id: partnerId, ...tenantScope(org) }, select: { id: true } });
      if (!partner) throw new NotFoundException("Stakeholder not found.");
      const cfg = await loadSettings(tx, org);
      const set = (title: string, columns: string[], rows: ScorecardRecordRow[], total: number, note: string | null = null): ScorecardRecordSet => ({ key, title, columns, rows: rows.slice(0, LIMIT), total, note });

      if (["on_time", "in_full", "otif", "days_late", "lines"].includes(key)) {
        const lines = await tx.projectLine.findMany({
          where: { ...tenantScope(org), archivedAt: null, OR: [{ manufacturerId: partnerId }, { supplierId: partnerId }, { project: { freightForwarderId: partnerId } }] },
          select: {
            id: true, projectId: true, manufacturerId: true, supplierId: true, quantity: true, quantityReceived: true, supplierInFull: true, internalOnTime: true, supplierOnTime: true,
            projectedDeliveryDate: true, actualDeliveryDate: true, goodsCollectedDate: true, supplierGad: true,
            project: { select: { referenceNumber: true, title: true, freightForwarderId: true } }, productMaster: { select: { name: true } },
          },
          take: 5000,
        });
        const rows = lines.map((l) => {
          const supplierSide = l.supplierId === partnerId;
          const t = lineTimeliness(l, supplierSide ? "SUPPLIER" : "OTHER", cfg);
          const late = l.projectedDeliveryDate && l.actualDeliveryDate ? Math.round((l.actualDeliveryDate.getTime() - l.projectedDeliveryDate.getTime()) / DAY) : null;
          const full = supplierSide ? l.supplierInFull : null;
          return { l, t, late, full, supplierSide };
        });
        let use = rows;
        if (key === "on_time") use = rows.filter((r) => r.t !== null);
        if (key === "in_full") use = rows.filter((r) => r.supplierSide && r.full !== null);
        if (key === "otif") use = rows.filter((r) => r.supplierSide && r.full !== null && r.t !== null);
        if (key === "days_late") use = rows.filter((r) => r.late !== null);
        const badness = (r: (typeof rows)[number]) => (key === "days_late" ? -(r.late ?? 0) : (r.t === false ? 0 : 1) + (r.full === false ? 0 : 1));
        use.sort((a, b) => badness(a) - badness(b));
        const title = { on_time: "Deliveries measured for on-time", in_full: "Deliveries measured for in-full", otif: "Deliveries measured for on-time in-full", days_late: "Deliveries with promised and actual dates", lines: "Project lines handled" }[key]!;
        return set(title, ["Project", "Product", "Promised", "Delivered", "Days late", "Result"],
          use.map((r) => ({
            id: r.l.id, cells: [`${r.l.project.referenceNumber ?? ""} ${r.l.project.title}`.trim(), r.l.productMaster?.name?.split(",")[0] ?? "—", d(r.l.projectedDeliveryDate), d(r.l.actualDeliveryDate), r.late === null ? "—" : String(Math.max(r.late, 0)),
              [r.t === null ? "" : r.t ? "On time" : "Late", r.full === null ? "" : r.full ? "In full" : "Short"].filter(Boolean).join(" · ") || "—"],
            href: `/projects/detail?id=${r.l.projectId}`, flag: r.t === false || r.full === false ? "critical" : r.t === true ? "good" : null,
          })), use.length, `On time = from ${cfg.earlyDays} working days early to ${cfg.lateDays} late. Worst first.`);
      }

      if (key === "temperature") {
        const lineIds = (await tx.projectLine.findMany({ where: { ...tenantScope(org), archivedAt: null, OR: [{ supplierId: partnerId }, { manufacturerId: partnerId }, { project: { freightForwarderId: partnerId } }] }, select: { id: true }, take: 2000 })).map((l) => l.id);
        const logs = await tx.batchTemperatureLog.findMany({
          where: { ...tenantScope(org), OR: [{ productBatch: { manufacturerId: partnerId } }, ...(lineIds.length ? [{ projectLineId: { in: lineIds } }] : [])] },
          select: { id: true, productBatchId: true, hasExcursion: true, reviewed: true, recordedAt: true, loggerReference: true, readingSummary: true, productBatch: { select: { batchNumber: true } } },
          orderBy: [{ hasExcursion: "desc" }, { recordedAt: "desc" }], take: 500,
        });
        return set("Temperature logs", ["Batch", "Logger", "Recorded", "Reading", "Result"],
          logs.map((l) => ({ id: l.id, cells: [l.productBatch.batchNumber, l.loggerReference ?? "—", d(l.recordedAt), l.readingSummary ?? "—", l.hasExcursion ? (l.reviewed ? "Excursion, reviewed" : "Excursion, not reviewed") : "Within range"], href: `/batches/detail?id=${l.productBatchId}`, flag: l.hasExcursion ? (l.reviewed ? "warning" : "critical") : "good" })), logs.length, "Excursions first.");
      }

      if (["complaints_upheld", "serious_open", "capa_overdue", "complaint_days"].includes(key)) {
        if (!canComplaints) return set("Complaints", ["Complaints are shown only to quality roles"], [], 0);
        if (key === "capa_overdue") {
          const acts = await tx.qualityComplaintAction.findMany({
            where: { ...tenantScope(org), complaint: { partnerId, archivedAt: null }, status: "OPEN" }, orderBy: { dueDate: "asc" }, take: 200,
            select: { id: true, type: true, description: true, dueDate: true, complaint: { select: { id: true, referenceNumber: true } } },
          });
          return set("Open corrective and preventive actions", ["Complaint", "Type", "Action", "Due", "State"],
            acts.map((a) => ({ id: a.id, cells: [a.complaint.referenceNumber, a.type.toLowerCase(), a.description.slice(0, 90), d(a.dueDate), a.dueDate < now ? "Overdue" : "Open"], href: `/quality/complaints?id=${a.complaint.id}`, flag: a.dueDate < now ? "critical" : null })), acts.length);
        }
        const where: Record<string, unknown> = { ...tenantScope(org), partnerId, archivedAt: null, status: { not: "WITHDRAWN" } };
        if (key === "complaints_upheld") where.outcome = { in: ["UPHELD", "PARTLY_UPHELD"] };
        if (key === "serious_open") { where.isSerious = true; where.status = { in: ACTIVE }; }
        if (key === "complaint_days") where.status = "CLOSED";
        const cs = await tx.qualityComplaint.findMany({ where, orderBy: [{ isSerious: "desc" }, { receivedAt: "desc" }], take: 200, select: { id: true, referenceNumber: true, title: true, status: true, outcome: true, isSerious: true, receivedAt: true, closedAt: true } });
        const title = { complaints_upheld: "Upheld and partly upheld complaints", serious_open: "Open serious complaints", complaint_days: "Closed complaints" }[key]!;
        return set(title, ["Reference", "Complaint", "Received", key === "complaint_days" ? "Closed" : "Status", "Outcome"],
          cs.map((c) => ({ id: c.id, cells: [c.referenceNumber, c.title.slice(0, 90), d(c.receivedAt), key === "complaint_days" ? d(c.closedAt) : c.status.toLowerCase().replace("_", " "), c.outcome ? c.outcome.toLowerCase().replace("_", " ") : "—"], href: `/quality/complaints?id=${c.id}`, flag: c.isSerious ? "critical" : null })), cs.length);
      }

      if (key === "certifications") {
        const certs = await tx.partnerCertification.findMany({ where: { ...tenantScope(org), partnerId }, orderBy: { expiryDate: "asc" }, take: 200, select: { id: true, type: true, issuingBody: true, expiryDate: true, status: true } });
        return set("Certifications", ["Certification", "Issued by", "Expires", "State"],
          certs.map((c) => ({ id: c.id, cells: [c.type, c.issuingBody ?? "—", d(c.expiryDate), c.expiryDate && c.expiryDate < now ? "Expired" : c.expiryDate && c.expiryDate.getTime() - now.getTime() < 90 * DAY ? "Expiring soon" : c.status.toLowerCase()], href: null, flag: c.expiryDate && c.expiryDate < now ? "critical" : c.expiryDate && c.expiryDate.getTime() - now.getTime() < 90 * DAY ? "warning" : "good" })), certs.length);
      }
      if (key === "evidence") {
        const ev = await tx.stakeholderEvidenceRecord.findMany({ where: { ...tenantScope(org), partnerId }, orderBy: { expiryDate: "asc" }, take: 200, select: { id: true, status: true, expiryDate: true, issuingBody: true, standard: { select: { name: true } } } });
        return set("Standards evidence", ["Standard", "Issued by", "Expires", "Status"],
          ev.map((e) => ({ id: e.id, cells: [e.standard.name, e.issuingBody ?? "—", d(e.expiryDate), e.expiryDate && e.expiryDate < now ? "Expired" : e.status.toLowerCase()], href: null, flag: e.status === "VERIFIED" && !(e.expiryDate && e.expiryDate < now) ? "good" : e.status === "EXPIRED" || (e.expiryDate && e.expiryDate < now) ? "critical" : "warning" })), ev.length);
      }
      if (key === "source_approvals") {
        const ap = await tx.productSourceApproval.findMany({ where: { ...tenantScope(org), isArchived: false, OR: [{ manufacturerId: partnerId }, { supplierId: partnerId }] }, orderBy: [{ nextReviewDue: "asc" }], take: 200, select: { id: true, status: true, nextReviewDue: true, productMaster: { select: { name: true } } } });
        return set("Product source approvals", ["Product", "Status", "Next review", "State"],
          ap.map((a) => ({ id: a.id, cells: [a.productMaster.name.split(",")[0], a.status.toLowerCase(), d(a.nextReviewDue), a.nextReviewDue && a.nextReviewDue < now ? "Review overdue" : a.status === "APPROVED" ? "In good standing" : "Not approved"], href: "/quality", flag: a.nextReviewDue && a.nextReviewDue < now ? "warning" : a.status === "APPROVED" ? "good" : "critical" })), ap.length);
      }
      if (key === "enquiries") {
        const en = await tx.supplierEnquiry.findMany({ where: { ...tenantScope(org), supplierId: partnerId }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, responseStatus: true, dateContacted: true, projectLine: { select: { projectId: true, project: { select: { referenceNumber: true, title: true } } } } } });
        return set("Supplier enquiries", ["Project", "Contacted", "Response"],
          en.map((e) => ({ id: e.id, cells: [`${e.projectLine.project.referenceNumber ?? ""} ${e.projectLine.project.title}`.trim(), d(e.dateContacted), e.responseStatus.toLowerCase().replace("_", " ")], href: `/projects/detail?id=${e.projectLine.projectId}`, flag: e.responseStatus === "QUOTED" ? "good" : e.responseStatus === "NO_RESPONSE" ? "critical" : null })), en.length);
      }
      // approval, risk tier, since: facts on the stakeholder's own record, shown in the page's compliance section.
      return set("On the stakeholder record", [], [], 0, "This measure comes from the stakeholder's own record; see the Compliance & evidence section below.");
    });
  }
}
