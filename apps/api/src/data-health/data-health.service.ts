import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { DATA_HEALTH_APPS, type DataGap, type DataHealthApp, type DataHealthSection } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";

const LABELS: Record<DataHealthApp, string> = { "project-management": "Project Management", tenders: "Tenders", "product-database": "Product database", admin: "Admin" };

/**
 * "Make this richer" for the rest of the platform (2026-10-27, Lewis): where an app is being fed less than it could be, what filling it in would improve, and a link
 * straight to the fix. Counts of the organisation's own records only: no money, nothing from other organisations. Each app is shown only to people who can use it, and a gap
 * with nothing missing is left out. The CRM keeps its own, more detailed version (crm-gaps.service).
 */
@Injectable()
export class DataHealthService {
  async sections(user: RequestUser, app?: string): Promise<DataHealthSection[]> {
    const staff = user.platformStaffRole !== "NONE";
    const can = (p: string) => staff || user.permissions.includes(p);
    const wanted = (a: DataHealthApp) => !app || app === a;
    const org = user.organizationId;
    const out: DataHealthSection[] = [];
    await withTenantContext(org, async (tx) => {
      const gap = (g: Omit<DataGap, "fixLabel"> & { fixLabel?: string | null }): DataGap | null => (g.count > 0 ? ({ fixLabel: "Show them", ...g } as DataGap) : null);
      const add = (a: DataHealthApp, gaps: (DataGap | null)[]) => { const g = gaps.filter((x): x is DataGap => !!x); if (g.length) out.push({ app: a, label: LABELS[a], gaps: g }); };

      if (wanted("project-management") && can("projects.view")) {
        const live = { organizationId: org, isArchived: false };
        const lineOf = (w: Record<string, unknown>) => ({ ...live, lines: { some: { archivedAt: null, ...w } } });
        const [projects, noClient, noDue, noCountry, noLead, noMan, noSup, noReceived, noGad, noPrice, partners, partnersNoCountry] = await Promise.all([
          tx.project.count({ where: live }),
          tx.project.count({ where: { ...live, clientId: null } }),
          tx.project.count({ where: { ...live, dueDate: null } }),
          tx.project.count({ where: { ...live, deliveryCountryCode: null, deliveryCountryCodes: null } }),
          tx.project.count({ where: { ...live, leads: { none: { removedAt: null } } } }),
          tx.project.count({ where: lineOf({ manufacturerId: null }) }),
          tx.project.count({ where: lineOf({ supplierId: null }) }),
          tx.project.count({ where: lineOf({ actualDeliveryDate: { not: null }, quantityReceived: null }) }),
          tx.project.count({ where: lineOf({ supplierGad: null }) }),
          tx.project.count({ where: lineOf({ unitSalesPrice: null }) }),
          tx.partner.count({ where: { organizationId: org, isArchived: false } }),
          tx.partner.count({ where: { organizationId: org, isArchived: false, countryCode: null } }),
        ]);
        const l = (g: string) => `/projects?gap=${g}`;
        add("project-management", [
          gap({ key: "noClient", label: "Projects with no client named", benefit: "The CRM portfolio, client reporting and the stakeholder view cannot show that project against a client.", count: noClient, total: projects, href: l("noClient") }),
          gap({ key: "noDueDate", label: "Projects with no due date", benefit: "Days remaining, overdue reminders and the delivery calendar cannot include them.", count: noDue, total: projects, href: l("noDueDate") }),
          gap({ key: "noCountry", label: "Projects with no delivery country", benefit: "They are missing from the per-country views, route checks against export restrictions and the Insights geographies.", count: noCountry, total: projects, href: l("noCountry") }),
          gap({ key: "noLead", label: "Projects with no project lead", benefit: "Nobody is notified of changes, and the CRM cannot suggest an owner for related opportunities.", count: noLead, total: projects, href: l("noLead") }),
          gap({ key: "lineNoManufacturer", label: "Projects with lines that have no manufacturer", benefit: "Supplier scorecards, regulatory checks and quality complaints cannot link back to the maker.", count: noMan, total: projects, href: l("lineNoManufacturer") }),
          gap({ key: "lineNoSupplier", label: "Projects with lines that have no supplier", benefit: "On-time and in-full measures and supplier scorecards cannot be worked out for those lines.", count: noSup, total: projects, href: l("lineNoSupplier") }),
          gap({ key: "lineNoReceived", label: "Projects with delivered lines but no quantity received", benefit: "In-full delivery cannot be calculated, so the delivery view and scorecards are understated.", count: noReceived, total: projects, href: l("lineNoReceived") }),
          gap({ key: "lineNoSupplierGad", label: "Projects with lines that have no supplier's agreed delivery date", benefit: "The supplier on-time measure needs it.", count: noGad, total: projects, href: l("lineNoSupplierGad") }),
          gap({ key: "lineNoPrice", label: "Projects with lines that have no unit sales price", benefit: "Margins, the financial summary and the pipeline value lack the price.", count: noPrice, total: projects, href: l("lineNoPrice") }),
          gap({ key: "partnerNoCountry", label: "Stakeholders with no country", benefit: "They cannot be placed on the maps, in country filters or in the CRM portfolio.", count: partnersNoCountry, total: partners, href: "/partners" }),
        ]);
      }

      if (wanted("tenders") && can("tenders.view")) {
        const mine = { organizationId: org, archivedAt: null, status: { not: "CANCELLED" } };
        const [total, noClosing, noCriteria, noCountry, noSummary, fwTotal, fwNoCeiling, fwNoTerm, first] = await Promise.all([
          tx.tender.count({ where: mine }),
          tx.tender.count({ where: { ...mine, closingAt: null } }),
          tx.tender.count({ where: { ...mine, criteria: { none: {} } } }),
          tx.tender.count({ where: { ...mine, deliveryCountryCodes: null } }),
          tx.tender.count({ where: { ...mine, summary: null } }),
          tx.tender.count({ where: { ...mine, tenderType: "FRAMEWORK" } }),
          tx.tender.count({ where: { ...mine, tenderType: "FRAMEWORK", frameworkCeiling: null } }),
          tx.tender.count({ where: { ...mine, tenderType: "FRAMEWORK", frameworkTermMonths: null } }),
          tx.tender.findFirst({ where: { ...mine, criteria: { none: {} } }, select: { id: true } }),
        ]);
        add("tenders", [
          gap({ key: "noClosing", label: "Tenders with no closing date", benefit: "Bidders and the deadline reminders have nothing to work to, and the tender cannot be opened for bids on time.", count: noClosing, total, href: "/tenders/manage" }),
          gap({ key: "noCriteria", label: "Tenders with no evaluation criteria", benefit: "Scoring, compliance gates and the award record need weighted criteria to be defensible.", count: noCriteria, total, href: noCriteria === 1 && first ? `/tenders/builder?id=${first.id}` : "/tenders/manage" }),
          gap({ key: "noCountry", label: "Tenders with no delivery countries", benefit: "Suppliers cannot find them by country and the notice and Insights geographies leave them out.", count: noCountry, total, href: "/tenders/manage" }),
          gap({ key: "noSummary", label: "Tenders with no summary", benefit: "Suppliers see an empty description in Discover and in the public notice.", count: noSummary, total, href: "/tenders/manage" }),
          gap({ key: "fwNoCeiling", label: "Frameworks with no ceiling value", benefit: "The framework meter and call-off headroom cannot be shown.", count: fwNoCeiling, total: fwTotal, href: "/tenders/manage" }),
          gap({ key: "fwNoTerm", label: "Frameworks with no term", benefit: "Expiry reminders and the call-off window cannot be worked out.", count: fwNoTerm, total: fwTotal, href: "/tenders/manage" }),
        ]);
      }

      if (wanted("product-database") && (can("projects.view") || can("products.approve"))) {
        const mine = { addedByOrganizationId: org, isArchived: false };
        const [total, noGtin, noHs, noUnspsc, noUnit, noStorage, noBrand] = await Promise.all([
          tx.productMaster.count({ where: mine }),
          tx.productMaster.count({ where: { ...mine, gtin: null } }),
          tx.productMaster.count({ where: { ...mine, hsCode: null } }),
          tx.productMaster.count({ where: { ...mine, unspscCode: null } }),
          tx.productMaster.count({ where: { ...mine, standardUnit: null } }),
          tx.productMaster.count({ where: { ...mine, storageClass: null } }),
          tx.productMaster.count({ where: { ...mine, brand: null } }),
        ]);
        add("product-database", [
          gap({ key: "noGtin", label: "Products with no GTIN", benefit: "They cannot be matched by barcode, de-duplicated across the catalogue or traced through batches.", count: noGtin, total, href: "/" }),
          gap({ key: "noHs", label: "Products with no HS code", benefit: "Customs, export-restriction checks and freight analysis cannot classify them.", count: noHs, total, href: "/" }),
          gap({ key: "noUnspsc", label: "Products with no UNSPSC code", benefit: "Catalogue analysis and Insights category comparisons leave them out.", count: noUnspsc, total, href: "/" }),
          gap({ key: "noUnit", label: "Products with no standard unit", benefit: "Prices and quantities cannot be compared like for like.", count: noUnit, total, href: "/" }),
          gap({ key: "noStorage", label: "Products with no storage class", benefit: "Cold-chain checks and batch storage warnings cannot apply.", count: noStorage, total, href: "/" }),
          gap({ key: "noBrand", label: "Products with no brand", benefit: "Search and product matching are weaker.", count: noBrand, total, href: "/" }),
        ]);
      }

      if (wanted("admin") && (staff || user.permissions.some((p) => p.startsWith("users.") || p.startsWith("roles.") || p.startsWith("organizations.")))) {
        const [users, noRole, neverSignedIn, o] = await Promise.all([
          tx.user.count({ where: { organizationId: org, archivedAt: null } }),
          tx.user.count({ where: { organizationId: org, archivedAt: null, userRoles: { none: {} } } }),
          tx.user.count({ where: { organizationId: org, archivedAt: null, firstSignInAt: null, status: "INVITED" } }),
          tx.organization.findFirst({ where: { id: org }, select: { logoUrl: true, primaryColor: true, website: true, legalName: true, countryOfRegistrationCode: true, primaryContactEmail: true, welcomeMessage: true } }),
        ]);
        const missing = o ? [!o.logoUrl && "logo", !o.primaryColor && "brand colour", !o.legalName && "legal name", !o.countryOfRegistrationCode && "country of registration", !o.website && "website", !o.primaryContactEmail && "primary contact"].filter(Boolean) as string[] : [];
        add("admin", [
          gap({ key: "noRole", label: "People with no role", benefit: "They can sign in but see and do nothing until given a role, and they never appear in notifications that go to a role.", count: noRole, total: users, href: "/users" }),
          gap({ key: "neverSignedIn", label: "Invited people who have not signed in yet", benefit: "Actions assigned to them will not be seen; resend the invitation or check the address.", count: neverSignedIn, total: users, href: "/users" }),
          gap({ key: "orgProfile", label: `Your organisation profile is missing: ${missing.join(", ")}`, benefit: "The directory profile, branding on every screen and exports use these details.", count: missing.length ? 1 : 0, total: 1, href: `/organizations/detail?id=${org}`, fixLabel: "Update the profile" }),
        ]);
      }
    });
    return out.sort((a, b) => DATA_HEALTH_APPS.indexOf(a.app) - DATA_HEALTH_APPS.indexOf(b.app));
  }
}
