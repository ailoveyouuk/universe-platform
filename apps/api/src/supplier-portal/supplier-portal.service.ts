import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { assertHasPermission } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import { KIND_LABEL, countByKind, isUrgent, sortWaiting, type WaitingItem } from "./supplier-dashboard";

const DAY = 86_400_000;
const num = (v: unknown) => (v == null ? 0 : Number(v));

@Injectable()
export class SupplierPortalService {
  /** GET /supplier-portal/dashboard: everything awaiting the caller's organisation as a supplier, drawn from the Tenders data it can already see. */
  async dashboard(user: RequestUser) {
    assertHasPermission(user, "tenders.view");
    const orgId = user.organizationId;
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * DAY);
    const data = await withTenantContext(orgId, async (tx) => {
      const [invites, bids, callOffs, quotes, variations, reviews, evidence, milestones, payments, contracts] = await Promise.all([
        tx.tenderInvitation.findMany({ where: { invitedOrganizationId: orgId }, select: { tenderId: true } }),
        tx.tenderBid.findMany({ where: { organizationId: orgId }, select: { tenderId: true, status: true } }),
        tx.tenderCallOff.findMany({ where: { awardedOrganizationId: orgId, status: "AWAITING_SUPPLIER" }, select: { id: true, tenderId: true, reference: true, totalValue: true, currency: true, requiredBy: true } }),
        tx.tenderCallOffQuote.findMany({ where: { awardedOrganizationId: orgId, status: "INVITED", closesAt: { gt: now } }, select: { id: true, tenderId: true, reference: true, closesAt: true } }),
        tx.tenderContractVariation.findMany({ where: { awardedOrganizationId: orgId, status: "PROPOSED", proposedByOrganizationId: { not: orgId } }, select: { id: true, contractId: true, title: true, createdAt: true } }),
        tx.tenderPriceReview.findMany({ where: { awardedOrganizationId: orgId, status: "PROPOSED", proposedByOrganizationId: { not: orgId } }, select: { id: true, contractId: true, createdAt: true } }),
        tx.tenderEvidence.findMany({ where: { awardedOrganizationId: orgId, recordedByOrganizationId: { not: orgId }, acknowledgedAt: null, withdrawnAt: null }, select: { id: true, contractId: true, title: true, evidenceDate: true } }),
        tx.tenderContractMilestone.findMany({ where: { awardedOrganizationId: orgId, status: "PENDING", dueDate: { not: null, lt: soon } }, select: { id: true, contractId: true, title: true, dueDate: true } }),
        tx.tenderContractPayment.findMany({ where: { awardedOrganizationId: orgId, paidDate: null, dueDate: { lt: soon } }, select: { id: true, contractId: true, reference: true, amount: true, currency: true, dueDate: true } }),
        tx.tenderContract.findMany({ where: { awardedOrganizationId: orgId }, select: { id: true, tenderId: true, reference: true, title: true, status: true, totalValue: true, currency: true, organizationId: true } }),
      ]);
      const tenderIds = [...new Set([...invites.map((i) => i.tenderId), ...bids.map((b) => b.tenderId), ...callOffs.map((c) => c.tenderId), ...quotes.map((q) => q.tenderId)])];
      const tenders = await tx.tender.findMany({ where: { id: { in: tenderIds } }, select: { id: true, referenceNumber: true, title: true, closingAt: true, status: true, organization: { select: { name: true } } } });
      const buyers = new Map((await tx.organization.findMany({ where: { id: { in: [...new Set(contracts.map((c) => c.organizationId))] } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
      return { invites, bids, callOffs, quotes, variations, reviews, evidence, milestones, payments, contracts, tenders, buyers };
    });

    const T = new Map(data.tenders.map((t) => [t.id, t]));
    const C = new Map(data.contracts.map((c) => [c.id, c]));
    const cref = (id: string) => C.get(id)?.reference ?? "contract";
    const items: WaitingItem[] = [];
    const bidded = new Set(data.bids.filter((b) => b.status !== "WITHDRAWN").map((b) => b.tenderId));
    for (const i of data.invites) {
      const t = T.get(i.tenderId);
      if (!t || t.status !== "PUBLISHED" || !t.closingAt || t.closingAt <= now || bidded.has(i.tenderId)) continue;
      items.push({ kind: "INVITATION", title: `${t.referenceNumber} ${t.title}`, detail: `Invited by ${t.organization.name}`, dueAt: t.closingAt, overdue: false, path: `/discover/view?id=${t.id}` });
    }
    for (const b of data.bids.filter((x) => x.status === "DRAFT")) {
      const t = T.get(b.tenderId);
      if (!t || t.status !== "PUBLISHED" || !t.closingAt || t.closingAt <= now) continue;
      items.push({ kind: "BID_DRAFT", title: `${t.referenceNumber} ${t.title}`, detail: `Draft bid for ${t.organization.name}, not yet submitted`, dueAt: t.closingAt, overdue: false, path: `/bids/edit?id=${t.id}` });
    }
    for (const c of data.callOffs) {
      const t = T.get(c.tenderId);
      items.push({ kind: "CALL_OFF", title: `${c.reference}${t ? ` (${t.referenceNumber})` : ""}`, detail: `${c.currency ?? ""} ${num(c.totalValue).toLocaleString("en-GB")} from ${t?.organization.name ?? "a buyer"}`.trim(), dueAt: c.requiredBy, overdue: !!c.requiredBy && c.requiredBy < now, path: `/tenders/framework?id=${c.tenderId}` });
    }
    for (const q of data.quotes) {
      const t = T.get(q.tenderId);
      items.push({ kind: "MINI_COMPETITION", title: `${q.reference}${t ? ` (${t.referenceNumber})` : ""}`, detail: `Quote requested by ${t?.organization.name ?? "a buyer"}`, dueAt: q.closesAt, overdue: false, path: `/tenders/framework?id=${q.tenderId}` });
    }
    for (const v of data.variations) items.push({ kind: "VARIATION", title: v.title ?? `Variation on ${cref(v.contractId)}`, detail: `Proposed on ${cref(v.contractId)}`, dueAt: null, overdue: false, path: `/contracts?view=attention` });
    for (const r of data.reviews) items.push({ kind: "PRICE_REVIEW", title: `Price review on ${cref(r.contractId)}`, detail: "The buyer proposed a new price", dueAt: null, overdue: false, path: `/contracts?view=attention` });
    for (const e of data.evidence) items.push({ kind: "EVIDENCE", title: e.title, detail: `Logged by the buyer on ${cref(e.contractId)}`, dueAt: null, overdue: false, path: `/contracts?view=attention` });
    for (const m of data.milestones) items.push({ kind: "MILESTONE", title: m.title, detail: `On ${cref(m.contractId)}`, dueAt: m.dueDate, overdue: !!m.dueDate && m.dueDate < now, path: `/contracts?view=attention` });
    for (const p of data.payments) {
      const late = p.dueDate < now;
      items.push({ kind: late ? "PAYMENT_OVERDUE" : "PAYMENT_DUE", title: `${p.reference}: ${p.currency ?? ""} ${num(p.amount).toLocaleString("en-GB")}`.trim(), detail: `Payment on ${cref(p.contractId)}`, dueAt: p.dueDate, overdue: late, path: `/contracts?view=attention` });
    }

    const sorted = sortWaiting(items);
    const active = data.contracts.filter((c) => c.status === "ACTIVE");
    return {
      totals: {
        waiting: sorted.length,
        urgent: sorted.filter((i) => isUrgent(i, now)).length,
        overdue: sorted.filter((i) => i.overdue).length,
        activeContracts: active.length,
        activeContractValue: active.reduce((s, c) => s + num(c.totalValue), 0),
        openBids: data.bids.filter((b) => b.status === "DRAFT" || b.status === "SUBMITTED").length,
      },
      byKind: Object.entries(countByKind(sorted)).filter(([, n]) => n > 0).map(([kind, count]) => ({ kind, label: KIND_LABEL[kind as keyof typeof KIND_LABEL], count })),
      items: sorted.slice(0, 100).map((i) => ({ ...i, label: KIND_LABEL[i.kind], urgent: isUrgent(i, now) })),
    };
  }
}
