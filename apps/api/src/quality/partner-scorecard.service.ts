import { Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { SCORECARD_THRESHOLDS as T } from "@universe/types";
import type { PartnerScorecard, ScorecardMetric } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { tenantScope } from "../common/tenant-scoped";
import { linearScore, onTimeWithin, pctStatus, summarise } from "./scorecard-scoring";

const ROLE_LABEL: Record<string, string> = { MANUFACTURER: "Manufacturer", SUPPLIER: "Supplier", FREIGHT_FORWARDER: "Freight forwarder" };
const DAY = 86_400_000;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

/**
 * A live, per-stakeholder score built from everything the platform already knows about them: delivery performance from project
 * lines, temperature excursions on their batches, approval, certification and evidence standing, source approvals, supplier
 * enquiries, and quality complaints (visible only to quality roles). Nothing is stored: it is recomputed on request, so it is
 * always current. The overall score is the weighted mean of the measures that have data; coverage says how much of the
 * applicable weighting that is, so a thin record is never mistaken for a strong one.
 */
@Injectable()
export class PartnerScorecardService {
  async get(user: RequestUser, partnerId: string): Promise<PartnerScorecard> {
    const org = user.organizationId;
    const now = new Date();
    const canComplaints = user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view");

    return withTenantContext(org, async (tx) => {
      const partner = await tx.partner.findFirst({ where: { id: partnerId, ...tenantScope(org) }, include: { roles: { where: { isActive: true } } } });
      if (!partner) throw new NotFoundException("Stakeholder not found.");
      const roles = partner.roles.map((r) => r.roleType);
      const isSupplier = roles.includes("SUPPLIER");
      const metrics: ScorecardMetric[] = [];
      const add = (m: ScorecardMetric) => metrics.push(m);

      // ---- delivery (project lines) ----
      const lines = await tx.projectLine.findMany({
        where: { ...tenantScope(org), archivedAt: null, OR: [{ manufacturerId: partnerId }, { supplierId: partnerId }, { project: { freightForwarderId: partnerId } }] },
        select: {
          id: true, manufacturerId: true, supplierId: true, internalOnTime: true, supplierOnTime: true, supplierInFull: true,
          projectedDeliveryDate: true, actualDeliveryDate: true, goodsCollectedDate: true, supplierGad: true, project: { select: { freightForwarderId: true } },
        },
        take: 5000,
      });
      const early = T.window.earlyBusinessDays, lateDays = T.window.lateBusinessDays;
      /** Window-based on-time per role: the client promise (projected date) for manufacturers and forwarders, the supplier's committed date for suppliers. */
      const timely = (l: { projectedDeliveryDate: Date | null; actualDeliveryDate: Date | null; goodsCollectedDate: Date | null; supplierGad: Date | null }, role: "SUPPLIER" | "OTHER") =>
        role === "SUPPLIER"
          ? (l.goodsCollectedDate && l.supplierGad ? onTimeWithin(l.goodsCollectedDate, l.supplierGad, early, lateDays) : null)
          : (l.actualDeliveryDate && l.projectedDeliveryDate ? onTimeWithin(l.actualDeliveryDate, l.projectedDeliveryDate, early, lateDays) : null);
      let otFlags = 0, otYes = 0, ifFlags = 0, ifYes = 0, lateN = 0, lateSum = 0, otifN = 0, otifYes = 0;
      for (const l of lines) {
        const flags: (boolean | null)[] = [];
        if (l.manufacturerId === partnerId) flags.push(timely(l, "OTHER"));
        if (l.supplierId === partnerId) flags.push(timely(l, "SUPPLIER"));
        if (l.project.freightForwarderId === partnerId) flags.push(timely(l, "OTHER"));
        for (const f of flags) if (f !== null) { otFlags++; if (f) otYes++; }
        if (l.supplierId === partnerId && l.supplierInFull !== null) { ifFlags++; if (l.supplierInFull) ifYes++; }
        if (l.supplierId === partnerId && l.supplierInFull !== null) {
          const t = timely(l, "SUPPLIER");
          if (t !== null) { otifN++; if (t && l.supplierInFull) otifYes++; }
        }
        if (l.projectedDeliveryDate && l.actualDeliveryDate) { lateN++; lateSum += Math.max(0, Math.round((l.actualDeliveryDate.getTime() - l.projectedDeliveryDate.getTime()) / DAY)); }
      }

      // Benchmark: the organisation's own average across all stakeholders in the same role, measured the same way.
      const mainRole = isSupplier ? "SUPPLIER" : roles.includes("MANUFACTURER") ? "MANUFACTURER" : "FREIGHT_FORWARDER";
      const roleWhere = mainRole === "SUPPLIER" ? { supplierId: { not: null } } : mainRole === "MANUFACTURER" ? { manufacturerId: { not: null } } : { project: { freightForwarderId: { not: null } } };
      const orgLines = await tx.projectLine.findMany({
        where: { ...tenantScope(org), archivedAt: null, ...roleWhere },
        select: { projectedDeliveryDate: true, actualDeliveryDate: true, goodsCollectedDate: true, supplierGad: true, supplierInFull: true }, take: 20000,
      });
      let orgOtAll = 0, orgOtYes = 0, orgIfAll = 0, orgIfYes = 0;
      for (const l of orgLines) {
        const t = timely(l, mainRole === "SUPPLIER" ? "SUPPLIER" : "OTHER");
        if (t !== null) { orgOtAll++; if (t) orgOtYes++; }
        if (mainRole === "SUPPLIER" && l.supplierInFull !== null) { orgIfAll++; if (l.supplierInFull) orgIfYes++; }
      }
      const roleName = (ROLE_LABEL[mainRole] ?? "stakeholder").toLowerCase();
      const otBench = pct(orgOtYes, orgOtAll);
      const ifBench = pct(orgIfYes, orgIfAll);
      const windowNote = `On time = from ${early} working days early to ${lateDays} late.`;

      const otP = pct(otYes, otFlags);
      add({
        key: "on_time", group: "DELIVERY", label: "On-time delivery", weight: 20, href: null,
        display: otP === null ? "No data" : `${otP}%`, score: otP, status: otP === null ? "neutral" : pctStatus(otP, T.onTime.good, T.onTime.warn),
        detail: otP === null ? "No delivery has been marked on time or late yet." : `${otYes} of ${otFlags} deliveries on time. ${windowNote}`,
        benchmark: otBench === null ? null : `All your ${roleName}s: ${otBench}%`,
      });
      if (isSupplier) {
        const p = pct(ifYes, ifFlags);
        add({
          key: "in_full", group: "DELIVERY", label: "In-full delivery", weight: 15, href: null,
          display: p === null ? "No data" : `${p}%`, score: p, status: p === null ? "neutral" : pctStatus(p, T.inFull.good, T.inFull.warn),
          detail: p === null ? "No delivery has been marked in full or short yet." : `${ifYes} of ${ifFlags} deliveries in full.`,
          benchmark: ifBench === null ? null : `All your suppliers: ${ifBench}%`,
        });
        const o = pct(otifYes, otifN);
        add({
          key: "otif", group: "DELIVERY", label: "On-time in-full (OTIF)", weight: 10, href: null,
          display: o === null ? "No data" : `${o}%`, score: o, status: o === null ? "neutral" : pctStatus(o, T.otif.good, T.otif.warn),
          detail: o === null ? "Needs deliveries with both on-time and in-full recorded." : `${otifYes} of ${otifN} deliveries both on time and in full. Target ${T.otif.good}% (USAID GHSC-PSM).`, benchmark: null,
        });
      }
      const avgLate = lateN ? Math.round((lateSum / lateN) * 10) / 10 : null;
      add({
        key: "days_late", group: "DELIVERY", label: "Average days late", weight: 10, href: null,
        display: avgLate === null ? "No data" : `${avgLate} day${avgLate === 1 ? "" : "s"}`, score: avgLate === null ? null : linearScore(avgLate, 0, 10),
        status: avgLate === null ? "neutral" : avgLate <= 1 ? "good" : avgLate <= 5 ? "warning" : "critical",
        detail: avgLate === null ? "Needs lines with promised and actual delivery dates." : `Across ${lateN} deliveries with both dates (early counts as 0).`, benchmark: null,
      });

      // ---- cold chain (temperature logs on their batches or on lines they handled) ----
      const lineIds = lines.map((l) => l.id).slice(0, 2000);
      const logs = await tx.batchTemperatureLog.findMany({
        where: { ...tenantScope(org), OR: [{ productBatch: { manufacturerId: partnerId } }, ...(lineIds.length ? [{ projectLineId: { in: lineIds } }] : [])] },
        select: { hasExcursion: true, reviewed: true }, take: 5000,
      });
      const exc = logs.filter((l) => l.hasExcursion);
      const unrev = exc.filter((l) => !l.reviewed).length;
      const excRate = logs.length ? (exc.length / logs.length) * 100 : null;
      add({
        key: "temperature", group: "QUALITY", label: "Temperature excursions", weight: 10, href: "/batches",
        display: logs.length === 0 ? "No logs" : `${exc.length} of ${logs.length} logs`, score: excRate === null ? null : linearScore(excRate, 0, 20),
        status: excRate === null ? "neutral" : exc.length === 0 ? "good" : excRate <= 5 && unrev === 0 ? "warning" : "critical",
        detail: logs.length === 0 ? "No temperature logs on their batches or deliveries." : `${exc.length} excursion${exc.length === 1 ? "" : "s"}${unrev ? `, ${unrev} not yet reviewed` : ""}.`, benchmark: null,
      });

      // ---- complaints (quality roles only) ----
      const hasTrade = lines.length > 0;
      if (canComplaints) {
        const cs = await tx.qualityComplaint.findMany({
          where: { ...tenantScope(org), partnerId, archivedAt: null, status: { not: "WITHDRAWN" } },
          select: { id: true, status: true, outcome: true, isSerious: true, receivedAt: true, closedAt: true }, take: 2000,
        });
        const upheld = cs.filter((c) => c.outcome === "UPHELD" || c.outcome === "PARTLY_UPHELD").length;
        const concluded = cs.filter((c) => c.outcome).length;
        const rate = concluded ? (upheld / concluded) * 100 : null;
        add({
          key: "complaints_upheld", group: "QUALITY", label: "Complaints upheld", weight: 15, href: "/quality/complaints",
          display: cs.length === 0 ? "None logged" : `${upheld} of ${concluded || cs.length}${concluded ? "" : " (open)"}`,
          score: cs.length === 0 ? (hasTrade ? 100 : null) : rate === null ? null : Math.round(100 - rate),
          status: cs.length === 0 ? "good" : rate === null ? "neutral" : rate === 0 ? "good" : rate <= 25 ? "warning" : "critical",
          detail: cs.length === 0 ? "No complaints in either direction." : `${cs.length} complaint${cs.length === 1 ? "" : "s"} in total; ${concluded} investigated, ${upheld} upheld or partly upheld.`, benchmark: null,
        });
        const serious = cs.filter((c) => c.isSerious && !["CLOSED"].includes(c.status)).length;
        add({
          key: "serious_open", group: "QUALITY", label: "Open serious complaints", weight: 10, href: "/quality/complaints",
          display: String(serious), score: serious === 0 ? (hasTrade || cs.length ? 100 : null) : 0, status: serious === 0 ? "good" : "critical",
          detail: serious === 0 ? "No serious complaints are open." : "Possible patient harm, suspected falsified product or a temperature excursion is under investigation.", benchmark: null,
        });
        const acts = await tx.qualityComplaintAction.findMany({ where: { ...tenantScope(org), complaintId: { in: cs.map((c) => c.id) } }, select: { status: true, dueDate: true }, take: 2000 });
        const late = acts.filter((a) => a.status === "OPEN" && a.dueDate < now).length;
        add({
          key: "capa_overdue", group: "QUALITY", label: "Overdue corrective actions", weight: 5, href: "/quality/complaints",
          display: acts.length === 0 ? "None raised" : `${late} of ${acts.length}`, score: acts.length === 0 ? null : late === 0 ? 100 : Math.max(0, 100 - late * 40),
          status: acts.length === 0 || late === 0 ? "good" : late === 1 ? "warning" : "critical",
          detail: acts.length === 0 ? "No corrective or preventive actions have been raised from complaints." : `${late} overdue of ${acts.length} raised.`, benchmark: null,
        });
        const closed = cs.filter((c) => c.closedAt);
        const days = closed.length ? Math.round(closed.reduce((a, c) => a + (c.closedAt!.getTime() - c.receivedAt.getTime()) / DAY, 0) / closed.length) : null;
        add({
          key: "complaint_days", group: "QUALITY", label: "Average days to close a complaint", weight: 0, href: "/quality/complaints",
          display: days === null ? "—" : `${days} days`, score: null, status: "neutral", detail: "Informational: how long complaints involving them take to close.", benchmark: null,
        });
      }

      // ---- compliance ----
      const approvalScore = partner.approvalStatus === "APPROVED" ? 100 : partner.approvalStatus === "PENDING" ? 50 : 0;
      add({
        key: "approval", group: "COMPLIANCE", label: "Approval status", weight: 15, href: null,
        display: partner.approvalStatus.charAt(0) + partner.approvalStatus.slice(1).toLowerCase(), score: approvalScore,
        status: partner.approvalStatus === "APPROVED" ? "good" : partner.approvalStatus === "PENDING" ? "warning" : "critical",
        detail: partner.approvalStatus === "APPROVED" ? "Approved by quality assurance." : partner.approvalStatus === "PENDING" ? "Awaiting quality assurance approval." : "Removed from the approved list.", benchmark: null,
      });
      if (partner.riskTier) {
        add({
          key: "risk_tier", group: "COMPLIANCE", label: "Risk tier", weight: 0, href: null, display: partner.riskTier.charAt(0) + partner.riskTier.slice(1).toLowerCase(),
          score: null, status: partner.riskTier === "HIGH" ? "warning" : "neutral", detail: "Informational: the risk tier set on their record.", benchmark: null,
        });
      }
      const certs = await tx.partnerCertification.findMany({ where: { ...tenantScope(org), partnerId }, select: { expiryDate: true }, take: 500 });
      const expired = certs.filter((c) => c.expiryDate && c.expiryDate < now).length;
      const expiring = certs.filter((c) => c.expiryDate && c.expiryDate >= now && c.expiryDate.getTime() - now.getTime() < 90 * DAY).length;
      add({
        key: "certifications", group: "COMPLIANCE", label: "Certifications in date", weight: 10, href: null,
        display: certs.length === 0 ? "None recorded" : `${certs.length - expired} of ${certs.length}`,
        score: certs.length === 0 ? null : Math.round(((certs.length - expired - expiring * 0.5) / certs.length) * 100),
        status: certs.length === 0 ? "neutral" : expired ? "critical" : expiring ? "warning" : "good",
        detail: certs.length === 0 ? "No certifications are recorded for them." : `${expired} expired, ${expiring} expiring within 90 days.`, benchmark: null,
      });
      const ev = await tx.stakeholderEvidenceRecord.findMany({ where: { ...tenantScope(org), partnerId }, select: { status: true, expiryDate: true }, take: 500 });
      const evExpired = ev.filter((e) => e.status === "EXPIRED" || (e.expiryDate && e.expiryDate < now)).length;
      const evOk = ev.filter((e) => e.status === "VERIFIED" && !(e.expiryDate && e.expiryDate < now)).length;
      add({
        key: "evidence", group: "COMPLIANCE", label: "Evidence verified", weight: 10, href: null,
        display: ev.length === 0 ? "None recorded" : `${evOk} of ${ev.length}`, score: ev.length === 0 ? null : Math.round((evOk / ev.length) * 100),
        status: ev.length === 0 ? "neutral" : evExpired ? "critical" : evOk === ev.length ? "good" : "warning",
        detail: ev.length === 0 ? "No standards evidence has been logged." : `${evOk} verified and current; ${evExpired} expired; ${ev.length - evOk - evExpired} pending or rejected.`, benchmark: null,
      });
      const approvals = await tx.productSourceApproval.findMany({
        where: { ...tenantScope(org), isArchived: false, OR: [{ manufacturerId: partnerId }, { supplierId: partnerId }] }, select: { status: true, nextReviewDue: true }, take: 2000,
      });
      const sOk = approvals.filter((a) => a.status === "APPROVED" && !(a.nextReviewDue && a.nextReviewDue < now)).length;
      const sOverdue = approvals.filter((a) => a.nextReviewDue && a.nextReviewDue < now).length;
      add({
        key: "source_approvals", group: "COMPLIANCE", label: "Product sources in good standing", weight: 5, href: "/quality",
        display: approvals.length === 0 ? "None" : `${sOk} of ${approvals.length}`, score: approvals.length === 0 ? null : Math.round((sOk / approvals.length) * 100),
        status: approvals.length === 0 ? "neutral" : sOk === approvals.length ? "good" : sOverdue ? "warning" : "warning",
        detail: approvals.length === 0 ? "No product source approvals involve them." : `${sOk} approved and current; ${sOverdue} overdue for review.`, benchmark: null,
      });

      // ---- responsiveness (suppliers) ----
      if (isSupplier) {
        const en = await tx.supplierEnquiry.groupBy({ by: ["responseStatus"], where: { ...tenantScope(org), supplierId: partnerId }, _count: { _all: true } });
        const c = (s: string) => en.find((e) => e.responseStatus === s)?._count._all ?? 0;
        const quoted = c("QUOTED"), declined = c("DECLINED"), none = c("NO_RESPONSE"), waiting = c("WAITING");
        const answered = quoted + declined + none;
        const p = pct(quoted, answered);
        add({
          key: "enquiries", group: "RESPONSIVENESS", label: "Enquiries quoted", weight: 10, href: null,
          display: p === null ? "No data" : `${p}%`, score: p, status: p === null ? "neutral" : pctStatus(p, 80, 50),
          detail: p === null ? `${waiting} enquir${waiting === 1 ? "y" : "ies"} still waiting.` : `${quoted} quoted, ${declined} declined, ${none} no response${waiting ? `, ${waiting} waiting` : ""}.`, benchmark: null,
        });
      }

      // ---- activity (informational) ----
      add({ key: "lines", group: "ACTIVITY", label: "Project lines handled", weight: 0, href: null, display: String(lines.length), score: null, status: "neutral", detail: "Live project lines they supply, manufacture or forward.", benchmark: null });
      add({ key: "since", group: "ACTIVITY", label: "On your books since", weight: 0, href: null, display: partner.createdAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), score: null, status: "neutral", detail: "When the stakeholder was added.", benchmark: null });

      return {
        partnerId, partnerName: partner.name, roles: roles.map((r) => ROLE_LABEL[r] ?? r), ...summarise(metrics), metrics, includesComplaints: canComplaints, generatedAt: now.toISOString(),
      };
    });
  }
}
