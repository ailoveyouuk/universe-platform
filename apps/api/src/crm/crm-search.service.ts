import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { withTenantContext } from "@universe/db";
import { CRM_SEARCH_TYPE_LABELS, CRM_SEARCH_TYPES, type CrmSearchGroup, type CrmSearchHit, type CrmSearchResult, type CrmSearchType, categoryLabel } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

const PER_GROUP = 8;
const pretty = (s: string | null | undefined) => (s ? s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "");
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Keyword search across everything the CRM holds (2026-10-27): stakeholders (name, registered name, country, summary, owner, tags, kind), contacts, interactions,
 * opportunities, places, certificates, gifts and hospitality, privacy requests. Every query runs inside the caller's tenant context, so the database rules decide
 * what exists for them; confidential interactions follow the same visibility rule as the interaction list. Each group returns a total and the first few hits, each
 * with the page that opens it. One word or several: every word must match somewhere in the record.
 */
@Injectable()
export class CrmSearchService {
  private isManager(user: RequestUser) { return user.platformStaffRole !== "NONE" || user.permissions.includes("crm.manage"); }

  async search(user: RequestUser, qRaw: string, only?: string): Promise<CrmSearchResult> {
    assertHasPermission(user, "crm.view");
    const q = (qRaw ?? "").trim().slice(0, 100);
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
    if (!words.length) return { q, groups: [] };
    const types = (only ? only.split(",") : [...CRM_SEARCH_TYPES]).filter((t): t is CrmSearchType => (CRM_SEARCH_TYPES as readonly string[]).includes(t));
    const org = user.organizationId;
    const every = <T,>(f: (w: string) => T): { AND: T[] } => ({ AND: words.map(f) });
    const c = (w: string) => ({ contains: w });
    const manager = this.isManager(user);

    return withTenantContext(org, async (tx) => {
      // A country can be typed by name ("Kenya"); records hold the two-letter code, so each word is also resolved to matching country codes.
      const codeMatches = new Map<string, string[]>();
      for (const c of await tx.country.findMany({ where: { OR: words.map((w) => ({ name: { contains: w } })) }, select: { code: true, name: true } })) for (const w of words) if (c.name.toLowerCase().includes(w.toLowerCase())) codeMatches.set(w, [...(codeMatches.get(w) ?? []), c.code]);
      const countryOr = (w: string, field: "partner" | "plain") => { const codes = codeMatches.get(w) ?? []; return codes.length ? [field === "partner" ? { partner: { countryCode: { in: codes } } } : { countryCode: { in: codes } }] : []; };
      const relName = (r: { id: string; partner?: { name: string } | null }) => r.partner?.name ?? "Stakeholder";
      const run: Record<CrmSearchType, () => Promise<CrmSearchGroup>> = {
        stakeholders: async () => {
          // Tag and kind words are resolved first so each word can match a name, a tag or a kind.
          const kindWords = (w: string) => ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "LOGISTICS", "WAREHOUSING", "CLIENT", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR"].filter((k) => categoryLabel(k).toLowerCase().includes(w.toLowerCase()) || k.toLowerCase().includes(w.toLowerCase().replace(/\s+/g, "_")));
          const owners = await tx.user.findMany({ where: { organizationId: org, OR: words.flatMap((w) => [{ forename: c(w) }, { surname: c(w) }]) }, select: { id: true, forename: true, surname: true }, take: 50 });
          const where: Prisma.CrmRelationshipWhereInput = { organizationId: org, archivedAt: null, ...every((w) => {
            const kinds = kindWords(w);
            return { OR: [
              { partner: { name: c(w) } }, { partner: { countryCode: c(w) } }, { summary: c(w) }, ...countryOr(w, "partner"),
              { partner: { registryEntry: { legalName: c(w) } } },
              { tagLinks: { some: { removedAt: null, tag: { name: c(w) } } } },
              ...(kinds.length ? [{ partner: { roles: { some: { isActive: true, roleType: { in: kinds } } } } }] : []),
              ...(owners.length ? [{ ownerUserId: { in: owners.map((o) => o.id) } }] : []),
            ] };
          }) };
          const [total, rows] = await Promise.all([tx.crmRelationship.count({ where }), tx.crmRelationship.findMany({ where, take: PER_GROUP, orderBy: { updatedAt: "desc" }, select: { id: true, tier: true, status: true, partner: { select: { name: true, countryCode: true, roles: { where: { isActive: true }, select: { roleType: true } } } } } })]);
          return { type: "stakeholders", label: CRM_SEARCH_TYPE_LABELS.stakeholders, total, hits: rows.map((r) => ({ id: r.id, title: relName(r), subtitle: [r.partner?.roles.map((x) => categoryLabel(x.roleType)).join(", "), pretty(r.tier), pretty(r.status), r.partner?.countryCode].filter(Boolean).join(" · "), link: `/relationships?id=${r.id}` })) };
        },
        contacts: async () => {
          const where: Prisma.ContactWhereInput = { organizationId: org, ...every((w) => ({ OR: [{ name: c(w) }, { email: c(w) }, { title: c(w) }, { phone: c(w) }] })), partner: { crmRelationships: { some: { archivedAt: null } } } };
          const [total, rows] = await Promise.all([tx.contact.count({ where }), tx.contact.findMany({ where, take: PER_GROUP, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, title: true, partner: { select: { name: true, crmRelationships: { where: { archivedAt: null }, select: { id: true }, take: 1 } } } } })]);
          return { type: "contacts", label: CRM_SEARCH_TYPE_LABELS.contacts, total, hits: rows.filter((r) => r.partner.crmRelationships[0]).map((r) => ({ id: r.id, title: r.name, subtitle: [r.title, r.partner.name, r.email].filter(Boolean).join(" · "), link: `/relationships?id=${r.partner.crmRelationships[0]!.id}&tab=people` })) };
        },
        interactions: async () => {
          const where: Prisma.CrmInteractionWhereInput = { organizationId: org, archivedAt: null, ...every((w) => ({ OR: [{ title: c(w) }, { summary: c(w) }, { outcome: c(w) }, { linkedLabel: c(w) }, { relationship: { partner: { name: c(w) } } }] })), ...(manager ? {} : { OR: [{ confidential: false }, { createdById: user.id }, { relationship: { ownerUserId: user.id } }] }) };
          const [total, rows] = await Promise.all([tx.crmInteraction.count({ where }), tx.crmInteraction.findMany({ where, take: PER_GROUP, orderBy: { occurredAt: "desc" }, select: { id: true, title: true, type: true, occurredAt: true, relationshipId: true, relationship: { select: { id: true, partner: { select: { name: true } } } } } })]);
          return { type: "interactions", label: CRM_SEARCH_TYPE_LABELS.interactions, total, hits: rows.map((r) => ({ id: r.id, title: r.title, subtitle: [pretty(r.type), day(r.occurredAt), relName(r.relationship)].filter(Boolean).join(" · "), link: `/relationships?id=${r.relationshipId}&tab=interactions` })) };
        },
        opportunities: async () => {
          const where: Prisma.CrmOpportunityWhereInput = { organizationId: org, archivedAt: null, ...every((w) => ({ OR: [{ title: c(w) }, { notes: c(w) }, { linkedLabel: c(w) }, { relationship: { partner: { name: c(w) } } }] })) };
          const [total, rows] = await Promise.all([tx.crmOpportunity.count({ where }), tx.crmOpportunity.findMany({ where, take: PER_GROUP, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, stage: true, kind: true, relationshipId: true, relationship: { select: { id: true, partner: { select: { name: true } } } } } })]);
          return { type: "opportunities", label: CRM_SEARCH_TYPE_LABELS.opportunities, total, hits: rows.map((r) => ({ id: r.id, title: r.title, subtitle: [pretty(r.stage), pretty(r.kind), relName(r.relationship)].join(" · "), link: `/relationships?id=${r.relationshipId}&tab=opportunities` })) };
        },
        places: async () => {
          const where: Prisma.CrmLocationWhereInput = { organizationId: org, archivedAt: null, ...every((w) => ({ OR: [{ name: c(w) }, { city: c(w) }, { address: c(w) }, { countryCode: c(w) }, { notes: c(w) }, ...countryOr(w, "plain")] })) };
          const [total, rows] = await Promise.all([tx.crmLocation.count({ where }), tx.crmLocation.findMany({ where, take: PER_GROUP, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, city: true, countryCode: true, relationshipId: true, relationship: { select: { id: true, partner: { select: { name: true } } } } } })]);
          return { type: "places", label: CRM_SEARCH_TYPE_LABELS.places, total, hits: rows.map((r) => ({ id: r.id, title: r.name, subtitle: [pretty(r.kind), [r.city, r.countryCode].filter(Boolean).join(", "), relName(r.relationship)].filter(Boolean).join(" · "), link: `/relationships?id=${r.relationshipId}&tab=places` })) };
        },
        certificates: async () => {
          const where: Prisma.PartnerCertificationWhereInput = { organizationId: org, status: "CURRENT", ...every((w) => ({ OR: [{ type: c(w) }, { type: c(w.toUpperCase().replace(/[\s-]+/g, "_")) }, { referenceNumber: c(w) }, { issuingBody: c(w) }, { partner: { name: c(w) } }] })), partner: { crmRelationships: { some: { archivedAt: null } } } };
          const [total, rows] = await Promise.all([tx.partnerCertification.count({ where }), tx.partnerCertification.findMany({ where, take: PER_GROUP, orderBy: { expiryDate: "asc" }, select: { id: true, type: true, referenceNumber: true, expiryDate: true, partner: { select: { name: true, crmRelationships: { where: { archivedAt: null }, select: { id: true }, take: 1 } } } } })]);
          return { type: "certificates", label: CRM_SEARCH_TYPE_LABELS.certificates, total, hits: rows.filter((r) => r.partner.crmRelationships[0]).map((r) => ({ id: r.id, title: `${pretty(r.type).replace(/iso /i, "ISO ")}${r.referenceNumber ? ` ${r.referenceNumber}` : ""}`, subtitle: [r.partner.name, r.expiryDate ? `expires ${day(r.expiryDate)}` : "no expiry date"].join(" · "), link: `/relationships?id=${r.partner.crmRelationships[0]!.id}` })) };
        },
        compliance: async () => {
          const where: Prisma.CrmHospitalityRecordWhereInput = { organizationId: org, archivedAt: null, ...every((w) => ({ OR: [{ description: c(w) }, { businessReason: c(w) }, { personName: c(w) }, { additionalInfo: c(w) }, { linkedLabel: c(w) }, { relationship: { partner: { name: c(w) } } }] })) };
          const [total, rows] = await Promise.all([tx.crmHospitalityRecord.count({ where }), tx.crmHospitalityRecord.findMany({ where, take: PER_GROUP, orderBy: { occurredOn: "desc" }, select: { id: true, description: true, direction: true, category: true, occurredOn: true, relationshipId: true, relationship: { select: { id: true, partner: { select: { name: true } } } } } })]);
          return { type: "compliance", label: CRM_SEARCH_TYPE_LABELS.compliance, total, hits: rows.map((r) => ({ id: r.id, title: r.description, subtitle: [pretty(r.direction), pretty(r.category), day(r.occurredOn), relName(r.relationship)].join(" · "), link: `/compliance?q=${encodeURIComponent(q)}` })) };
        },
        privacy: async () => {
          if (!manager) return { type: "privacy", label: CRM_SEARCH_TYPE_LABELS.privacy, total: 0, hits: [] };
          const where: Prisma.CrmPrivacyRequestWhereInput = { organizationId: org, ...every((w) => ({ OR: [{ requesterName: c(w) }, { requesterEmail: c(w) }, { decision: c(w) }] })) };
          const [total, rows] = await Promise.all([tx.crmPrivacyRequest.count({ where }), tx.crmPrivacyRequest.findMany({ where, take: PER_GROUP, orderBy: { receivedAt: "desc" }, select: { id: true, requesterName: true, type: true, status: true, receivedAt: true } })]);
          return { type: "privacy", label: CRM_SEARCH_TYPE_LABELS.privacy, total, hits: rows.map((r) => ({ id: r.id, title: r.requesterName, subtitle: [pretty(r.type), pretty(r.status), day(r.receivedAt)].join(" · "), link: "/privacy" })) };
        },
      };
      const groups = await Promise.all(types.map((t) => run[t]()));
      return { q, groups };
    });
  }
}
