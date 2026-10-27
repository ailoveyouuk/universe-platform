import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { STAKEHOLDER_CATEGORY_KEYS } from "@universe/types";
import type { CrmCategoryCertificate, CrmCategoryKey, CrmCategoryProfile, CrmCertState } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

const DAY = 86400000;
const QUALITY_TYPES = ["ISO_13485", "GMP"];
const ORG_CATEGORY: Record<string, CrmCategoryKey> = { TENDERING_PURCHASING_BODY: "TENDERING_PURCHASING_BODY", PROCUREMENT_SERVICE_AGENT: "PROCUREMENT_SERVICE_AGENT", FUNDER_DONOR: "FUNDER_DONOR" };
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/**
 * Category profile for a stakeholder (2026-10-27): what is particular to a manufacturer, supplier, freight forwarder, warehouse, client or a Universe
 * buyer or funder. Read from what the platform already holds (stakeholder details, certificates and their documents, batches, tenders). Tenders are
 * read in the caller's own tenant context, so the database rules decide which of the stakeholder's tenders the caller may see.
 */
@Injectable()
export class CrmCategoryService {
  async profile(user: RequestUser, relationshipId: string): Promise<CrmCategoryProfile> {
    assertHasPermission(user, "crm.view");
    const now = new Date(); const soon = new Date(now.getTime() + 60 * DAY);
    const base = await withTenantContext(user.organizationId, async (tx) => {
      const rel = await tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: user.organizationId }, select: { partnerId: true, counterpartyOrganizationId: true } });
      if (!rel) throw new NotFoundException("Relationship not found.");
      if (!rel.partnerId) return { rel, partner: null, certs: [], batches: [] as { manufacturedDate: Date | null; expiryDate: Date | null; status: string }[] };
      const partner = await tx.partner.findFirst({
        where: { id: rel.partnerId, organizationId: user.organizationId },
        select: { registryEntryId: true, roles: { where: { isActive: true }, select: { roleType: true } }, manufacturerDetail: true, supplierDetail: true, freightForwarderDetail: true, warehousingDetail: true, clientDetail: true, manufacturerSites: { select: { siteName: true, countryCode: true, isPrimary: true }, orderBy: [{ isPrimary: "desc" }, { siteName: "asc" }], take: 20 } },
      });
      const certs = await tx.partnerCertification.findMany({ where: { organizationId: user.organizationId, partnerId: rel.partnerId, status: "CURRENT" }, orderBy: { expiryDate: "asc" }, take: 50, select: { id: true, type: true, issuingBody: true, referenceNumber: true, issuedDate: true, expiryDate: true, verifiedAt: true, documentId: true } });
      const isMfr = partner?.roles.some((r) => r.roleType === "MANUFACTURER");
      const batches = isMfr ? await tx.productBatch.findMany({ where: { organizationId: user.organizationId, manufacturerId: rel.partnerId }, select: { manufacturedDate: true, expiryDate: true, status: true }, take: 20000 }) : [];
      return { rel, partner, certs, batches };
    });
    const { rel, partner } = base;
    const categories = new Set<CrmCategoryKey>();
    for (const r of partner?.roles ?? []) if ((STAKEHOLDER_CATEGORY_KEYS as string[]).includes(r.roleType)) categories.add(r.roleType as CrmCategoryKey);

    // The Universe organisation behind the stakeholder, if it has published its profile: its organisation type adds a category and its tenders can be listed.
    let linkedOrg: string | null = rel.counterpartyOrganizationId;
    if (!linkedOrg && partner?.registryEntryId) {
      const e = await prisma.stakeholderRegistryEntry.findUnique({ where: { id: partner.registryEntryId }, select: { linkedOrganizationId: true } });
      linkedOrg = e?.linkedOrganizationId ?? null;
    }
    let tenders: CrmCategoryProfile["tenders"] = null;
    if (linkedOrg) {
      const o = await withPlatformStaffContext((s) => s.organization.findFirst({ where: { id: linkedOrg!, supplierProfile: { is: { publishedAt: { not: null } } } }, select: { type: true, additionalTypes: true } }));
      if (o) {
        for (const t of [o.type, ...(o.additionalTypes ?? "").split(/[,;|]/).map((x) => x.trim())]) if (ORG_CATEGORY[t]) categories.add(ORG_CATEGORY[t]);
        tenders = await withTenantContext(user.organizationId, async (tx) => {
          const where = { organizationId: linkedOrg!, isPublished: true };
          const [total, items] = await Promise.all([tx.tender.count({ where }), tx.tender.findMany({ where, orderBy: { publishedAt: "desc" }, take: 10, select: { id: true, referenceNumber: true, title: true, status: true, publishedAt: true, closingAt: true } })]);
          return { total, items: items.map((t) => ({ id: t.id, reference: t.referenceNumber, title: t.title, status: t.status, publishedAt: iso(t.publishedAt), closingAt: iso(t.closingAt) })) };
        });
      }
    }

    const stateOf = (d: Date | null): CrmCertState => (!d ? "no_date" : d < now ? "expired" : d <= soon ? "expiring" : "valid");
    const certificates: CrmCategoryCertificate[] = base.certs.map((c) => ({ id: c.id, type: c.type, issuingBody: c.issuingBody, referenceNumber: c.referenceNumber, issuedDate: iso(c.issuedDate), expiryDate: iso(c.expiryDate), verifiedAt: iso(c.verifiedAt), hasDocument: !!c.documentId, state: stateOf(c.expiryDate) }));

    let batches: CrmCategoryProfile["batches"] = null;
    if (categories.has("MANUFACTURER")) {
      const quality = base.certs.filter((c) => QUALITY_TYPES.includes(c.type));
      const covers = (d: Date) => quality.some((c) => (!c.issuedDate || c.issuedDate <= d) && (!c.expiryDate || c.expiryDate >= d));
      let covered = 0, notCovered = 0, active = 0, expiringSoon = 0, expired = 0;
      for (const b of base.batches) {
        if (b.status === "ACTIVE") active++;
        if (b.expiryDate && b.expiryDate < now) expired++; else if (b.expiryDate && b.expiryDate <= new Date(now.getTime() + 90 * DAY)) expiringSoon++;
        if (b.manufacturedDate && quality.length) { if (covers(b.manufacturedDate)) covered++; else notCovered++; }
      }
      batches = { total: base.batches.length, active, expiringSoon, expired, covered: quality.length ? covered : null, notCovered: quality.length ? notCovered : null };
    }
    const m = partner?.manufacturerDetail, s = partner?.supplierDetail, f = partner?.freightForwarderDetail, w = partner?.warehousingDetail, c = partner?.clientDetail;
    return {
      categories: [...categories], certificates,
      sites: (partner?.manufacturerSites ?? []).map((x) => ({ name: x.siteName, countryCode: x.countryCode, isPrimary: x.isPrimary })),
      batches,
      manufacturer: m ? { countryOfManufacture: m.countryOfManufactureCode, scopeOfSupply: m.scopeOfSupply } : null,
      supplier: s ? { scopeOfSupply: s.scopeOfSupply, productCategory: s.productCategory, codeOfConductAcknowledged: s.codeOfConductAcknowledged } : null,
      logistics: f ? { modes: f.modesOfTransport, iataDgr: f.iataDgrCertified, aeo: f.aeoAccredited, gdpTransport: f.gdpTransportCapable, referencesProvided: f.referencesProvided } : null,
      warehousing: w ? { wdaNumber: w.wdaNumber, lastGdpAudit: iso(w.gdpAuditDate), nextGdpAuditDue: iso(w.nextGdpAuditDue) } : null,
      client: c ? { deliveryCity: c.deliveryCity, billingCountry: c.billingCountryCode } : null,
      tenders,
    };
  }
}
