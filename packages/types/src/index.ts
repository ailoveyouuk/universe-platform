export * from "./pharma-links";
export * from "./supplier-scope";
export * from "./commodity-groups";
export * from "./service-categories";
export * from "./insights-activity";
export * from "./category-codes";
/**
 * Shared, hand-written types used across apps for shapes that don't map
 * 1:1 onto a Prisma model (API request/response DTOs, computed fields, etc.).
 * Prisma-generated model types themselves come from "@universe/db" directly —
 * don't duplicate those here.
 */

export interface ProjectSummary {
  id: string;
  /** The tender this project tracks, when it began as a tender bid (2026-10-24). */
  sourceTenderId?: string | null;
  referenceNumber: string;
  title: string;
  status: string;
  category: string;
  projectType: "PHARMACEUTICAL" | "NON_PHARMACEUTICAL";
  clientName: string | null;
  dueDate: string | null;
  /** Computed server-side from dueDate/submissionDate — never stored. */
  daysRemainingForSubmission: number | null;
  /** Sub-state within COMPLETED only — see Project.completionStage's doc
   * comment in schema.prisma. Added 2026-09-30. */
  completionStage: string | null;
  /** Soft-delete/retirement flag — see Project.isArchived's doc comment in
   * schema.prisma. A project is never hard-deleted (GDP/21 CFR Part 11
   * audit-trail posture — see claude/compliance-standards-gap-analysis.md);
   * archiving just retires it from the default list view. Added 2026-10-08
   * alongside PATCH /projects/:id/archive. */
  isArchived: boolean;
  archivedAt: string | null;
  archivedById: string | null;
  /** ISO 3166-1 alpha-2 — added 2026-10-09 for Stage 3b's "Delivery
   * countries" dashboard tile and the Projects list's country filter
   * (product-database-and-map-roadmap.md). The underlying Project row was
   * already being fetched in full by ProjectsService.findAll(); this was
   * just never mapped through toSummary() until now. */
  deliveryCountryCode: string | null;
  /** Every destination country (2026-10-18); the first is the primary, equal to deliveryCountryCode. */
  deliveryCountryCodes: string[];
}

/**
 * Added 2026-09-24, schema rework: Project is now a header only —
 * procurement/financial/logistics fields (and the pharma batch block) live
 * on ProjectLine instead (see architecture doc, "Schema rework"). Creating a
 * project still creates one initial line alongside the header in a single
 * call, matching the existing single-page intake UX; further lines are added
 * via the future line-management endpoints ("Duplicate line" etc. — not yet
 * built).
 */
export interface CreateProjectLineInput {
  clientProductDescription?: string;
  productCategory?: string;
  quantity?: number;
}

export interface CreateProjectInput {
  referenceNumber: string;
  title: string;
  category: "PROCUREMENT" | "TECHNICAL_ASSISTANCE";
  projectType: "PHARMACEUTICAL" | "NON_PHARMACEUTICAL";
  clientId?: string;
  /** Optional — only populated when an organization knows and wants to
   * track it. See architecture doc: not a required structural concept. */
  donorReference?: string;
  deliveryCountryCode?: string;
  /** All destination countries; the first becomes the primary. Takes precedence over deliveryCountryCode. */
  deliveryCountryCodes?: string[];
  startDate?: string;
  dueDate?: string;
  firstLine?: CreateProjectLineInput;
}

/** The apps a person can be given access to (2026-10-25). Keys match UNIVERSE_APPS in @universe/ui. */
export const UNIVERSE_APP_KEYS = ["project-management", "product-database", "tender-issuance", "insights", "admin"] as const;
export type UniverseAppKey = (typeof UNIVERSE_APP_KEYS)[number];
export const UNIVERSE_APP_LABELS: Record<UniverseAppKey, string> = {
  "project-management": "Project Management",
  "product-database": "Product Database",
  "tender-issuance": "Tender Issuance",
  insights: "Insights",
  admin: "Admin",
};
/** Stored form `,a,b,` to list. null/empty = no restriction (every app). */
export function parseAppAccess(raw: string | null | undefined): UniverseAppKey[] | null {
  if (!raw) return null;
  const list = raw.split(",").map((x) => x.trim()).filter((x): x is UniverseAppKey => (UNIVERSE_APP_KEYS as readonly string[]).includes(x));
  return list.length ? list : null;
}
export function encodeAppAccess(list: string[] | null | undefined): string | null {
  const keys = (list ?? []).filter((x) => (UNIVERSE_APP_KEYS as readonly string[]).includes(x));
  return keys.length ? `,${[...new Set(keys)].join(",")},` : null;
}
/** True when the person may use the app. null (no restriction) allows everything. */
export function canUseApp(apps: string[] | null | undefined, key: string): boolean {
  return !apps || apps.includes(key);
}

export interface AuthenticatedUser {
  /** Apps this person may use; null = every app (2026-10-25). Platform staff are never restricted. */
  apps?: string[] | null;
  id: string;
  /** The organisation the app is currently acting as — for platform staff,
   * the one chosen in the header switcher. */
  organizationId: string;
  /** The signed-in user's own organisation (differs from organizationId only
   * when platform staff are acting inside another organisation). */
  homeOrganizationId: string;
  email: string;
  forename: string;
  surname: string;
  /** Added 2026-09-26 for the personalized "powered by Universe" header —
   * see Organization.logoUrl's doc comment in schema.prisma and
   * @universe/ui's OrgHeader, which renders these two fields. */
  organizationName: string;
  organizationLogoUrl: string | null;
  /** Optional square icon variant of the logo. */
  organizationLogoIconUrl: string | null;
  /** Added 2026-09-26 for per-org brand accents — see Organization.primaryColor's
   * doc comment in schema.prisma and @universe/ui's OrgHeader. */
  organizationPrimaryColor: string | null;
  organizationSecondaryColor: string | null;
  /** Dashboard greeting line set by the organisation (branding). */
  organizationWelcomeMessage: string | null;
  platformStaffRole: "NONE" | "SUPPORT" | "SUPER_ADMIN";
  permissions: string[];
  /** True for non-staff users whose home organisation is a demo organisation (they may be offered the organisation picker). */
  isDemoUser?: boolean;
}

export interface InviteUserInput {
  email: string;
  forename: string;
  surname: string;
  organizationId: string;
  roleIds: string[];
}

export interface UserSummary {
  id: string;
  email: string;
  forename: string;
  surname: string;
  status: "INVITED" | "ACTIVE" | "DEACTIVATED";
  organizationId: string;
  organizationName: string;
  roleNames: string[];
  /** Parallel array to roleNames (same order, same length) — added
   * 2026-10-08 so a roles-editing UI can pre-check a user's current roles
   * without a second lookup. roleNames alone can't do this: role names
   * aren't guaranteed unique across appScope in theory, and matching by
   * name is fragile versus matching by id. */
  roleIds: string[];
  invitedAt: string;
  firstSignInAt: string | null;
  /** Set when the account was archived (status DEACTIVATED). Accounts are never deleted. */
  archivedAt: string | null;
  archiveReason: string | null;
}

/** Counts for the Users tiles, computed in the database (2026-10-17, scale work). */
export interface UserCounts {
  total: number;
  active: number;
  invited: number;
  archived: number;
}

/** Slim colleague record for pickers (project lead, risk owner, assign an action) — names only. */
export interface UserOption {
  id: string;
  forename: string;
  surname: string;
}

/** Stakeholder demo access (2026-10-17): the demo organisation and the people who hold the Stakeholder Demo role. */
export interface StakeholderAccessOverview {
  organizationId: string;
  organizationName: string;
  users: UserSummary[];
}

export interface GrantStakeholderAccessInput {
  email: string;
  forename: string;
  surname: string;
}

/** Full user record for the Admin app's user detail page (added 2026-10-16). */
export interface UserDetail extends UserSummary {
  jobTitle: string | null;
  platformStaffRole: "NONE" | "SUPPORT" | "SUPER_ADMIN";
  /** Apps this person may use; null = every app. */
  appAccess: string[] | null;
  /** True once the user has signed in and been linked to their Entra identity. */
  linkedToIdentity: boolean;
  invitedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PATCH /users/:id. platformStaffRole: platform staff only; granting or
 * revoking SUPER_ADMIN needs a SUPER_ADMIN caller; nobody can change their own. */
export interface UpdateUserInput {
  forename?: string;
  surname?: string;
  jobTitle?: string | null;
  platformStaffRole?: "NONE" | "SUPPORT" | "SUPER_ADMIN";
  /** Apps this person may use; null clears the restriction (every app). */
  appAccess?: string[] | null;
}

/** One entry in the global permission catalogue (GET /permissions). */
export interface PermissionSummary {
  key: string;
  description: string;
}

/** A role with its permission grants (GET /roles?organizationId=). */
export interface RoleDetail {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  appScope: string;
  permissionKeys: string[];
  /** Users currently assigned this role. */
  userCount: number;
}

export interface CreateRoleInput {
  organizationId: string;
  name: string;
  description?: string;
  appScope?: string;
  permissionKeys: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  permissionKeys?: string[];
}

export type OrganizationTypeValue = "PROCUREMENT_SERVICE_AGENT" | "TENDERING_PURCHASING_BODY" | "MANUFACTURER" | "SUPPLIER" | "FUNDER_DONOR" | "DATA_INSIGHTS_USER";
export const ORGANIZATION_TYPE_VALUES: OrganizationTypeValue[] = ["PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY", "MANUFACTURER", "SUPPLIER", "FUNDER_DONOR", "DATA_INSIGHTS_USER"];
/** Splits the stored ",A,B," form into a list; tolerant of null and stray spaces. */
export function parseAdditionalTypes(raw: string | null | undefined): OrganizationTypeValue[] {
  return (raw ?? "").split(",").map((x) => x.trim()).filter((x): x is OrganizationTypeValue => (ORGANIZATION_TYPE_VALUES as string[]).includes(x));
}
/** Every role an organisation holds: its primary type first, then the additional ones. */
export function orgTypesOf(o: { type: string; additionalTypes?: string[] | string | null }): string[] {
  const extra = Array.isArray(o.additionalTypes) ? o.additionalTypes : parseAdditionalTypes(o.additionalTypes);
  return [o.type, ...extra.filter((t) => t !== o.type)];
}
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: "PILOT" | "ACTIVE" | "SUSPENDED";
  /** One of six Organization.type values, defaulting to
   * PROCUREMENT_SERVICE_AGENT — expanded 2026-09-26, see Organization.type's
   * doc comment in schema.prisma. */
  type: "PROCUREMENT_SERVICE_AGENT" | "TENDERING_PURCHASING_BODY" | "MANUFACTURER" | "SUPPLIER" | "FUNDER_DONOR" | "DATA_INSIGHTS_USER";
  /** Other roles the organisation also holds (2026-10-24); never includes `type`. Absent on older responses. */
  additionalTypes?: OrganizationTypeValue[];
  /** Added 2026-09-26 — see Organization.logoUrl's doc comment. */
  logoUrl: string | null;
  /** Added 2026-09-26 — see Organization.primaryColor's doc comment. */
  primaryColor: string | null;
  secondaryColor: string | null;
  /** ISO alpha-2 code (Country.code), or null when not set — added
   * 2026-10-09 for Stage 0 point 2 (country display consistency audit).
   * Resolve against useCountries()/CountryOption for the full name, same
   * pattern as every other country field in the app; never render the raw
   * code. */
  countryOfRegistrationCode: string | null;
}

export type OrganizationLegalEntityType =
  | "GOVERNMENT_AGENCY"
  | "PRIVATE_COMPANY"
  | "REGISTERED_NGO"
  | "FAITH_BASED_NETWORK"
  | "MULTILATERAL_UN_BODY"
  | "COOPERATIVE"
  | "ACADEMIC_INSTITUTION"
  | "INDIVIDUAL"
  | "OTHER";

export type OrganizationOnboardingSource =
  | "SELF_REFERRED"
  | "INVITED_BY_PROCUREMENT_AGENT"
  | "INVITED_BY_FUNDER"
  | "PLATFORM_STAFF_OUTREACH"
  | "OTHER";

/** Full organisation record for the Admin app's detail/edit page (added
 * 2026-10-16). Superset of OrganizationSummary — the list endpoint stays
 * lean, this is fetched one org at a time. */
/** Cross-organisation access list for a demo organisation (2026-10-21). */
export interface OrganizationAccessItem {
  grantId: string;
  userId: string;
  name: string;
  email: string;
  homeOrganizationName: string;
  grantedBy: string | null;
  createdAt: string;
}
export interface OrganizationAccessList { isDemo: boolean; items: OrganizationAccessItem[] }

export interface OrganizationDetail extends OrganizationSummary {
  /** Identifiable to other organisations as a contributor ("share with Universe database"). Default false = anonymous. */
  shareIdentityWithUniverse: boolean;
  /** Optional square icon (phones/tablets, collapsed menu, tab icon). */
  logoIconUrl: string | null;
  legalName: string | null;
  legalEntityType: OrganizationLegalEntityType | null;
  registrationNumber: string | null;
  website: string | null;
  primaryContactName: string | null;
  primaryContactTitle: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  onboardingSource: OrganizationOnboardingSource | null;
  /** Dashboard greeting line (max 200 chars). */
  welcomeMessage: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  activeUserCount: number;
}

/** PATCH /organizations/:id. undefined = untouched, null = clear (nullable
 * fields only). name/slug/status/onboardingSource are platform-staff only —
 * enforced server-side in OrganizationsService.update; an org admin holding
 * org.profile.manage may change the rest for their own organisation. */
export interface UpdateOrganizationInput {
  /** Other roles the organisation also holds; the primary type is dropped if included. */
  additionalTypes?: OrganizationTypeValue[];
  shareIdentityWithUniverse?: boolean;
  name?: string;
  slug?: string;
  status?: "PILOT" | "ACTIVE" | "SUSPENDED";
  legalName?: string | null;
  legalEntityType?: OrganizationLegalEntityType | null;
  countryOfRegistrationCode?: string | null;
  registrationNumber?: string | null;
  website?: string | null;
  primaryContactName?: string | null;
  primaryContactTitle?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  welcomeMessage?: string | null;
  onboardingSource?: OrganizationOnboardingSource | null;
  notes?: string | null;
}

/**
 * Onboarding is platform-operator-provisioned only during the pilot (see
 * architecture doc) — creating a new tenant organization is platform-staff
 * only, enforced server-side in OrganizationsService.create via
 * assertPlatformStaff. This is the input for that one call: name plus a
 * URL-safe slug (lowercase letters, numbers, hyphens — enforced by
 * CreateOrganizationDto). Provisioning the org itself creates its default
 * role template (createOrganizationWithDefaultRoles) — nothing else to pass
 * in here, there is no per-org customization at creation time.
 */
export interface CreateOrganizationInput {
  name: string;
  slug: string;
  /** One of six Organization.type values, defaulting to
   * PROCUREMENT_SERVICE_AGENT — see Organization.type's doc comment in
   * schema.prisma. */
  type?: "PROCUREMENT_SERVICE_AGENT" | "TENDERING_PURCHASING_BODY" | "MANUFACTURER" | "SUPPLIER" | "FUNDER_DONOR" | "DATA_INSIGHTS_USER";
  /** ISO alpha-2 code (Country.code) — optional, added 2026-10-09 alongside
   * the rest of Stage 0 point 2. */
  countryOfRegistrationCode?: string;
  /** Must be true — see CreateOrganizationDto's doc comment (apps/api). */
  confirmedAgreementOnFile: boolean;
}

export interface RoleSummary {
  id: string;
  name: string;
  appScope: string;
}

/** DataSharingConsent (added 2026-10-14, was schema-only until now — see
 * backend-frontend-wiring-audit.md). Read-only: consent is auto-created,
 * unconditional, contractual (see DataSharingConsent's own schema.prisma
 * doc comment) — there is deliberately no write endpoint here, this is
 * "what's on file for us", not a toggle. scope is the parsed JSON array
 * (see organizations.ts's DEFAULT_DATA_SHARING_SCOPE), never the raw
 * JSON string. */
export interface DataSharingConsentSummary {
  organizationId: string;
  scope: string[];
  termsVersion: string;
  acceptedById: string | null;
  acceptedByName: string | null;
  acceptedAt: string;
  revokedAt: string | null;
}

// ---------------------------------------------------------------------------
// Supplier/manufacturer marketplace (added 2026-09-24 — see architecture
// doc, "Supplier/manufacturer marketplace"). Types the future Supplier
// Portal app and any buyer-side search-and-add UI will use — the backend
// (apps/api/src/supplier-directory) is built; these are its contract.
// ---------------------------------------------------------------------------

export interface SupplierProfile {
  id: string;
  organizationId: string;
  description: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  publishedAt: string | null;
}

/** An organisation's supplier-directory profile as edited in the Admin hub (all fields; arrays already parsed). */
export interface OrgDirectoryProfile {
  organizationId: string;
  description: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  principalManufacturersRepresented: string[];
  wholesaleDistributionLicense: string | null;
  warehousingCapability: "OWN" | "THIRD_PARTY" | "MIXED" | null;
  yearsInOperation: number | null;
  publishedAt: string | null;
}

export type UpsertOrgDirectoryProfileInput = Partial<Omit<OrgDirectoryProfile, "organizationId" | "publishedAt">>;

export interface UpsertSupplierProfileInput {
  description?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface SupplierProduct {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  productMasterId: string | null;
  specifications: string | null;
  gtin: string | null;
  manufacturerPartNumber: string | null;
  isPublished: boolean;
}

export interface CreateSupplierProductInput {
  name: string;
  description?: string;
  productMasterId?: string;
  specifications?: string;
  gtin?: string;
  manufacturerPartNumber?: string;
}

export interface UpdateSupplierProductInput extends CreateSupplierProductInput {
  isPublished?: boolean;
}

/** One row from a directory search — includes the supplier org's name/slug
 * deliberately (this is the identifiable, searchable side of the platform,
 * the opposite of the anonymized Insights pool). */
export interface SupplierSearchResult extends SupplierProduct {
  organization: { id: string; name: string; slug: string };
  productMaster: { category: string } | null;
}

export interface SupplierLead {
  id: string;
  buyerOrganization: { id: string; name: string };
  supplierProduct: { id: string; name: string };
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Project Lines, full detail, and header updates (added 2026-09-27 — Phase 1
// of the Project Management app build-out: exposes ProjectLine's full
// procurement/financial/logistics/pharma-batch field set, previously only
// on the Prisma model with no API surface at all).
// ---------------------------------------------------------------------------

/** Full ProjectLine shape as returned by the API. Decimals/dates come back
 * as strings (JSON has no Decimal/Date type) — parse with Number()/Date()
 * in the UI as needed. */
export interface ProjectLineSummary {
  id: string;
  projectId: string;
  clientProductDescription: string | null;
  /** Links this line to the shared, central product catalogue once it's
   * been matched/added via the ProductPicker (@universe/ui) — see
   * ProductCatalogMatch below and claude/product-catalog-build.md. Not
   * required; plenty of lines will never be matched, especially early on. */
  productMasterId: string | null;
  productMasterName: string | null;
  quantity: number | null;
  productCategory: string | null;
  /** Net cargo weight in kg — added 2026-10-08 for the supply-chain CO2/
   * distance feature. Optional/retrofit; most existing lines won't have
   * it. */
  weightKg: string | null;
  countryOfManufactureCode: string | null;
  /** One of the project's delivery countries; null means the project's primary country. */
  destinationCountryCode: string | null;
  manufacturerId: string | null;
  manufacturerName: string | null;
  /** What the bidder quoted on the tender bid (tender-sourced projects). */
  quotedManufacturerName: string | null;
  quotedLeadTimeDays: number | null;
  /** Services lines only (productCategory SERVICES): the kind of service and how its price is stated. */
  serviceCategory: string | null;
  servicePricingBasis: string | null;
  supplierId: string | null;
  supplierName: string | null;
  clientPoNumber: string | null;
  clientPoReceiptDate: string | null;
  internalPoNumber: string | null;
  internalPoDatePlaced: string | null;
  gad: string | null;
  supplierGad: string | null;
  /** Freight cost/vendor/terms fields moved to ProjectSummary/ProjectDetail
   * 2026-10-03 — freight is now a per-project charge, not per-line. See
   * ProjectDetail's "Freight & Logistics" fields. */
  warehouseReferenceNumber: string | null;
  goodsCollectedDate: string | null;
  goodsManufacturedDate: string | null;
  goodsDeliveredToClientDate: string | null;
  /** Renamed from promisedDeliveryDate 2026-10-03. */
  projectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  /** The quantity actually received from the supplier — added 2026-10-03
   * so supplierInFull below has something real to compare against. */
  quantityReceived: number | null;
  /** Computed server-side 2026-10-03 (previously a manual dropdown) —
   * actualDeliveryDate <= projectedDeliveryDate. Null until both dates
   * are set. */
  internalOnTime: boolean | null;
  /** Computed server-side 2026-10-03 (previously a manual dropdown) —
   * goodsCollectedDate <= supplierGad. Null until both dates are set. */
  supplierOnTime: boolean | null;
  /** Computed server-side 2026-10-03 (previously a manual dropdown) —
   * quantityReceived >= quantity. Null until quantityReceived is set. */
  supplierInFull: boolean | null;
  /** Computed server-side: internalOnTime && supplierOnTime && supplierInFull
   * (null if any contributing flag is unset) — the industry-standard
   * On-Time In-Full metric this field pairing already implemented, just
   * unlabeled. See procurement-lifecycle-benchmarking.md rec. #3. */
  otif: boolean | null;
  supplierUnitPrice: string | null;
  supplierPaymentAmountTotal: string | null;
  supplierPaymentCurrency: string | null;
  supplierPaymentDate: string | null;
  supplierDocumentsReceivedDate: string | null;
  /** Added 2026-09-30, replacing supplierPaymentStatusPercent — see that
   * field's removal note in schema.prisma / benchmarking doc rec. #2. */
  supplierAmountPaid: string | null;
  supplierPaymentStatus: string | null;
  /** Computed server-side (supplierPaymentAmountTotal - supplierAmountPaid),
   * never stored — same convention as daysRemainingForSubmission above. */
  supplierRemainingBalance: string | null;
  /** Computed server-side: clientPaymentAmount / quantity. Added 2026-10-03
   * — previously manual entry. See ProjectLine's "Margin-based client
   * invoice build" doc comment in schema.prisma. */
  unitSalesPrice: string | null;
  /** Computed server-side. PRODUCT ONLY as of 2026-10-03 (manufacturer/
   * supplier product total + productMarginAmount), converted into
   * clientPaymentCurrency — freight is no longer folded into any one
   * line's invoice total; it's billed to the client as its own separate
   * project-level charge instead. See ProjectDetail's "Freight &
   * Logistics" fields and ProjectFinancialSummary. */
  clientPaymentAmount: string | null;
  clientPaymentCurrency: string | null;
  clientPaymentDate: string | null;
  internalInvoiceNumber: string | null;
  internalInvoiceDate: string | null;
  /** Legacy manual-entry fields, predating the margin-based invoice build
   * — no longer populated or read. See schema.prisma's doc comment. */
  grossMargin: string | null;
  margin: string | null;
  /** Input: markup % applied to supplierPaymentAmountTotal on the way to
   * the client invoice. Added 2026-10-03. */
  productMarginPercent: string | null;
  /** Computed: supplierPaymentAmountTotal x productMarginPercent / 100, in
   * supplierPaymentCurrency. */
  productMarginAmount: string | null;
  // freightMarginPercent/freightMarginAmount moved to ProjectDetail
  // 2026-10-03 — freight margin is now a per-project figure.
  /** Currency conversion (added 2026-10-02, generalized 2026-10-03 — see
   * ExchangeRatesService's doc comment: Universe is currency-agnostic,
   * not built around any one organisation's home currency).
   * supplierPaymentAmountTotal/clientPaymentAmount/freightTotalCost above
   * are now server-computed, in their own NATIVE currencies; the fields
   * below are each converted into the platform's neutral base currency
   * (ExchangeRatesService.DEFAULT_BASE_CURRENCY, currently "USD") and
   * LOCKED to the FX rate on the date last saved — never read-write from
   * the frontend, display-only. The dashboard/financial-view's currency
   * SELECTOR re-expresses these LIVE into whatever currency a viewer
   * picks; see ProjectFinancialSummary. */
  reportingCurrencyCode: string | null;
  supplierPriceLockedAt: string | null;
  supplierUnitPriceReportingCcy: string | null;
  supplierTotalPriceReportingCcy: string | null;
  /** Repurposed 2026-10-03 — now the CLIENT INVOICE's lock (previously the
   * manually-entered "sales" side's lock). */
  salesPriceLockedAt: string | null;
  salesUnitPriceReportingCcy: string | null;
  salesTotalPriceReportingCcy: string | null;
  strength: string | null;
  form: string | null;
  packSize: string | null;
  batchNumber: string | null;
  /** Added 2026-10-07 (GDP gap-closing build, Gaps 5/6) — see
   * ProductBatch in schema.prisma. */
  productBatchId: string | null;
  expiryDate: string | null;
  storageConditions: string | null;
  dataLoggerReference: string | null;
  dataLoggerReportReviewed: boolean | null;
  excursionReview: string | null;
  customerApproved: boolean | null;
  rpApproved: boolean | null;
  maPl: string | null;
  /** Added 2026-09-30 — see ProjectLine.qualificationPathway's doc comment
   * in schema.prisma / benchmarking doc rec. #4. */
  qualificationPathway: string | null;
  qualificationPathwayExpiryDate: string | null;
  /** Supplier Enquiries — structured RFQ tracking per line, added to the
   * schema 2026-09-24, given an API/UI in Phase 2, 2026-09-30. Newest
   * dateContacted first — see ProjectsService's PROJECT_DETAIL_INCLUDE. */
  enquiries: SupplierEnquirySummary[];
  /** Added 2026-10-08 — the computed distance/CO2/efficiency metric for
   * this line, null until there's enough data (manufacture country,
   * project delivery country, freight mode) to calculate from. See
   * LogisticsMetricSummary below. */
  logisticsMetric: LogisticsMetricSummary | null;
}

/** One computed row per ProjectLine — see ProjectLineLogisticsMetric in
 * schema.prisma for the full methodology writeup. Org-private by
 * default (this is the host organisation's own view of its own line);
 * the separate, anonymized cross-tenant aggregate is
 * AggregatedLogisticsMetric (@universe/insights-db), read via the
 * /logistics-insights endpoints, never this interface. */
export interface LogisticsMetricSummary {
  manufactureCountryCode: string | null;
  destinationCountryCode: string | null;
  transportMode: string | null;
  incoterm: string | null;
  commodityGroup: string | null;
  weightKgUsed: string;
  weightEstimated: boolean;
  distanceKm: string;
  co2FactorKgPerTonneKm: string;
  co2TotalKg: string;
  durationDays: number | null;
  efficiencyScore: number;
  scoreBand: string;
  methodologyVersion: string;
  calculatedAt: string;
}

/** One structured RFQ record against a ProjectLine — see
 * SupplierEnquiriesService for the full design note. Decimals/dates come
 * back as strings, same convention as ProjectLineSummary above. */
export interface SupplierEnquirySummary {
  id: string;
  projectLineId: string;
  supplierId: string;
  supplierName: string | null;
  dateContacted: string | null;
  /** WAITING | QUOTED | DECLINED | NO_RESPONSE — see
   * SupplierEnquiryResponseStatus in packages/db/src/enums.ts. */
  responseStatus: string;
  quotedPrice: string | null;
  quotedCurrency: string | null;
  notes: string | null;
  createdAt: string;
}

/** POST /projects/:projectId/lines/:lineId/enquiries — supplierId is the
 * one required field; everything else about the response is naturally
 * unknown on a freshly-logged enquiry. */
export interface CreateSupplierEnquiryInput {
  supplierId: string;
  dateContacted?: string;
  responseStatus?: string;
  quotedPrice?: number;
  quotedCurrency?: string;
  notes?: string;
}

/** PATCH /projects/:projectId/lines/:lineId/enquiries/:enquiryId — every
 * field optional, same convention as ProjectLineInput/UpdateProjectInput. */
export interface UpdateSupplierEnquiryInput {
  supplierId?: string;
  dateContacted?: string | null;
  responseStatus?: string;
  quotedPrice?: number | null;
  quotedCurrency?: string | null;
  notes?: string | null;
}

/** Every field optional — used for both creating a new line (POST
 * /projects/:id/lines) and patching an existing one (PATCH
 * /projects/:id/lines/:lineId). Distinct from CreateProjectLineInput above,
 * which stays minimal since it's only ever the *first* line bundled into
 * project creation. */
export interface ProjectLineInput {
  clientProductDescription?: string | null;
  productMasterId?: string | null;
  quantity?: number | null;
  productCategory?: string | null;
  /** Added 2026-10-08 — see ProjectLineSummary's doc comment. */
  weightKg?: number | null;
  countryOfManufactureCode?: string | null;
  destinationCountryCode?: string | null;
  manufacturerId?: string | null;
  quotedManufacturerName?: string | null;
  quotedLeadTimeDays?: number | null;
  serviceCategory?: string | null;
  servicePricingBasis?: string | null;
  supplierId?: string | null;
  clientPoNumber?: string | null;
  clientPoReceiptDate?: string | null;
  internalPoNumber?: string | null;
  internalPoDatePlaced?: string | null;
  gad?: string | null;
  supplierGad?: string | null;
  // Freight fields removed 2026-10-03 — freight moved to
  // UpdateProjectInput, see that interface below.
  warehouseReferenceNumber?: string | null;
  goodsCollectedDate?: string | null;
  goodsManufacturedDate?: string | null;
  goodsDeliveredToClientDate?: string | null;
  projectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  /** Added 2026-10-03 — see ProjectLineSummary's doc comment; this is
   * what internalOnTime/supplierOnTime/supplierInFull now compute from.
   * internalOnTime/supplierOnTime/supplierInFull themselves are NOT in
   * this input any more — they're server-computed on every save, never
   * client-settable (the API rejects them via forbidNonWhitelisted if
   * sent). */
  quantityReceived?: number | null;
  supplierUnitPrice?: number | null;
  supplierPaymentAmountTotal?: number | null;
  supplierPaymentCurrency?: string | null;
  supplierPaymentDate?: string | null;
  supplierDocumentsReceivedDate?: string | null;
  supplierAmountPaid?: number | null;
  supplierPaymentStatus?: string | null;
  unitSalesPrice?: number | null;
  clientPaymentAmount?: number | null;
  clientPaymentCurrency?: string | null;
  clientPaymentDate?: string | null;
  internalInvoiceNumber?: string | null;
  internalInvoiceDate?: string | null;
  grossMargin?: number | null;
  margin?: number | null;
  productMarginPercent?: number | null;
  strength?: string | null;
  form?: string | null;
  packSize?: string | null;
  batchNumber?: string | null;
  productBatchId?: string | null;
  expiryDate?: string | null;
  storageConditions?: string | null;
  dataLoggerReference?: string | null;
  dataLoggerReportReviewed?: boolean | null;
  excursionReview?: string | null;
  customerApproved?: boolean | null;
  rpApproved?: boolean | null;
  maPl?: string | null;
  qualificationPathway?: string | null;
  qualificationPathwayExpiryDate?: string | null;
}

/** The ~30 currencies Frankfurter (the FX data source — see
 * ExchangeRatesService) publishes ECB reference rates for. This is a hard
 * practical ceiling on which currencies can ever be converted/displayed
 * via the currency selector — a line priced in anything outside this list
 * still saves its native-currency price fine, it just can't be converted.
 * Used to populate the currency-selector dropdown on the dashboard and
 * per-project financial summary. Kept here (not generated) since it
 * changes only if Frankfurter's own coverage changes. */
export const SUPPORTED_CURRENCIES = [
  "AUD", "BGN", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP",
  "HKD", "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR",
  "NOK", "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD",
  "ZAR",
] as const;
export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Full English names for every SUPPORTED_CURRENCIES code, added
 * 2026-10-03 so every currency picker in the app (freight/insured/
 * supplier-payment/client-payment currency, and any future one) can show
 * "British Pound Sterling (GBP)" rather than asking the user to type a
 * bare 3-letter code from memory — see @universe/ui's CurrencySelect.
 * A static list (not fetched from anywhere) since it changes only if
 * SUPPORTED_CURRENCIES itself does. */
export const CURRENCY_NAMES: Record<SupportedCurrencyCode, string> = {
  AUD: "Australian Dollar",
  BGN: "Bulgarian Lev",
  BRL: "Brazilian Real",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  CZK: "Czech Koruna",
  DKK: "Danish Krone",
  EUR: "Euro",
  GBP: "British Pound Sterling",
  HKD: "Hong Kong Dollar",
  HUF: "Hungarian Forint",
  IDR: "Indonesian Rupiah",
  ILS: "Israeli New Shekel",
  INR: "Indian Rupee",
  ISK: "Icelandic Krona",
  JPY: "Japanese Yen",
  KRW: "South Korean Won",
  MXN: "Mexican Peso",
  MYR: "Malaysian Ringgit",
  NOK: "Norwegian Krone",
  NZD: "New Zealand Dollar",
  PHP: "Philippine Peso",
  PLN: "Polish Zloty",
  RON: "Romanian Leu",
  SEK: "Swedish Krona",
  SGD: "Singapore Dollar",
  THB: "Thai Baht",
  TRY: "Turkish Lira",
  USD: "US Dollar",
  ZAR: "South African Rand",
};

/** Incoterms 2020 (ICC), the single shared list. Added 2026-10-19 for the
 * Tender Issuance app; other apps/DTOs still carry their own copies of this
 * list and should migrate to it. */
export const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
export type IncotermCode = (typeof INCOTERMS)[number];
export const INCOTERM_NAMES: Record<IncotermCode, string> = {
  EXW: "Ex Works", FCA: "Free Carrier", FAS: "Free Alongside Ship", FOB: "Free On Board", CPT: "Carriage Paid To", CIP: "Carriage and Insurance Paid To",
  CFR: "Cost and Freight", CIF: "Cost, Insurance and Freight", DAP: "Delivered at Place", DPU: "Delivered at Place Unloaded", DDP: "Delivered Duty Paid",
};

/** Units of measure: the common metric and imperial units plus pack/count units used in health procurement. Anything not here is
 * entered as free text via the "Other" choice (UnitSelect in @universe/ui). A stored unit is the label string, so values already in
 * the database stay valid. Added 2026-10-19. */
export const UNIT_OPTIONS = [
  { value: "each", label: "each", group: "Count" }, { value: "tablet", label: "tablet", group: "Count" }, { value: "capsule", label: "capsule", group: "Count" },
  { value: "dose", label: "dose", group: "Count" }, { value: "test", label: "test", group: "Count" }, { value: "pair", label: "pair", group: "Count" },
  { value: "dozen", label: "dozen", group: "Count" },
  { value: "blister pack", label: "blister pack", group: "Pack" }, { value: "vial", label: "vial", group: "Pack" }, { value: "ampoule", label: "ampoule", group: "Pack" },
  { value: "bottle", label: "bottle", group: "Pack" }, { value: "box", label: "box", group: "Pack" }, { value: "carton", label: "carton", group: "Pack" },
  { value: "pack", label: "pack", group: "Pack" }, { value: "kit", label: "kit", group: "Pack" }, { value: "sachet", label: "sachet", group: "Pack" },
  { value: "tube", label: "tube", group: "Pack" }, { value: "strip", label: "strip", group: "Pack" }, { value: "roll", label: "roll", group: "Pack" },
  { value: "set", label: "set", group: "Pack" }, { value: "pallet", label: "pallet", group: "Pack" },
  { value: "mg", label: "mg (milligram)", group: "Metric" }, { value: "g", label: "g (gram)", group: "Metric" }, { value: "kg", label: "kg (kilogram)", group: "Metric" },
  { value: "t", label: "t (tonne)", group: "Metric" }, { value: "mL", label: "mL (millilitre)", group: "Metric" }, { value: "L", label: "L (litre)", group: "Metric" },
  { value: "mm", label: "mm (millimetre)", group: "Metric" }, { value: "cm", label: "cm (centimetre)", group: "Metric" }, { value: "m", label: "m (metre)", group: "Metric" },
  { value: "km", label: "km (kilometre)", group: "Metric" }, { value: "m2", label: "m² (square metre)", group: "Metric" }, { value: "m3", label: "m³ (cubic metre)", group: "Metric" },
  { value: "oz", label: "oz (ounce)", group: "Imperial" }, { value: "lb", label: "lb (pound)", group: "Imperial" }, { value: "fl oz", label: "fl oz (fluid ounce)", group: "Imperial" },
  { value: "pt", label: "pt (pint)", group: "Imperial" }, { value: "gal", label: "gal (gallon)", group: "Imperial" }, { value: "in", label: "in (inch)", group: "Imperial" },
  { value: "ft", label: "ft (foot)", group: "Imperial" }, { value: "yd", label: "yd (yard)", group: "Imperial" }, { value: "mi", label: "mi (mile)", group: "Imperial" },
] as const;
export const isKnownUnit = (u: string | null | undefined): boolean => !!u && UNIT_OPTIONS.some((o) => o.value === u);

/** Qualifications a tender can require, used by eligibility rules and an item's required registration. The values are the codes the
 * eligibility check matches against an organisation's registry evidence; "Other" is typed free text. Added 2026-10-19. */
export const QUALIFICATION_OPTIONS = [
  { value: "WHO_PQ", label: "WHO prequalification" },
  { value: "SRA", label: "Stringent Regulatory Authority (SRA) approval" },
  { value: "WLA", label: "WHO Listed Authority (WLA) authorisation" },
  { value: "ERP", label: "Expert Review Panel (ERP) approval" },
  { value: "PICS_GMP", label: "GMP inspection by a WHO PQ, SRA or PIC/S authority" },
  { value: "NATIONAL_MA", label: "National marketing authorisation" },
  { value: "WHO_GDP", label: "Good Distribution Practice (GDP) compliance" },
  { value: "MQAS", label: "WHO Model Quality Assurance System (MQAS) compliance" },
  { value: "ISO_13485", label: "ISO 13485 (medical devices quality)" },
  { value: "ISO_9001", label: "ISO 9001 (quality management)" },
  { value: "ISO_17025", label: "ISO/IEC 17025 (testing laboratories)" },
] as const;
export const qualificationLabel = (v: string): string => QUALIFICATION_OPTIONS.find((o) => o.value === v)?.label ?? v;

/** Grounds a bidder declares against when expressing interest (exclusion declaration). */
export const EXCLUSION_GROUNDS = [
  { value: "INSOLVENCY", label: "Insolvency, bankruptcy or winding-up" },
  { value: "FRAUD_CORRUPTION", label: "Fraud, bribery or corruption conviction or finding" },
  { value: "TAX_ARREARS", label: "Unpaid taxes or social-security contributions" },
  { value: "PROFESSIONAL_MISCONDUCT", label: "Grave professional misconduct" },
  { value: "FORCED_LABOUR", label: "Forced labour, child labour or modern slavery" },
  { value: "SANCTIONS_DEBARMENT", label: "Sanctions or debarment by a government or development bank" },
  { value: "CONFLICT_OF_INTEREST", label: "Conflict of interest with the issuer" },
] as const;

/** Lists an issuer can record having screened a bidder against. */
export const SCREENING_LISTS = [
  { value: "UN_SECURITY_COUNCIL", label: "UN Security Council consolidated list" },
  { value: "WORLD_BANK_DEBARMENT", label: "World Bank debarred firms" },
  { value: "UK_DEBARMENT", label: "UK procurement debarment list" },
  { value: "UK_OFSI", label: "UK financial sanctions (OFSI)" },
  { value: "EU_SANCTIONS", label: "EU consolidated sanctions list" },
  { value: "OFAC_SDN", label: "US OFAC SDN list" },
  { value: "OTHER", label: "Other list (see notes)" },
] as const;
export const SCREENING_OUTCOMES = [
  { value: "CLEAR", label: "No match" },
  { value: "MATCH_CLEARED", label: "Possible match, reviewed and cleared" },
  { value: "EXCLUDED", label: "Match confirmed, organisation excluded" },
] as const;

/** One currency option for CurrencySelect — { code, name } pairs, same
 * shape convention as CountryOption below, built from SUPPORTED_CURRENCIES
 * + CURRENCY_NAMES rather than fetched, since it's a fixed, small list. */
export interface CurrencyOption {
  code: SupportedCurrencyCode;
  name: string;
}
export const CURRENCY_OPTIONS: CurrencyOption[] = SUPPORTED_CURRENCIES.map((code) => ({
  code,
  name: CURRENCY_NAMES[code],
}));

/** GET /projects/financial-summary (and GET /projects/:id/financial-
 * summary for a single project's own lines) — a rollup across every
 * ProjectLine's LOCKED base-currency amounts (see ProjectLine's "Currency
 * conversion"/"Margin-based client invoice build" doc comments in
 * schema.prisma), for the main dashboard's and a project's own financial
 * view. Added 2026-10-02, reworked 2026-10-03 to be currency-agnostic —
 * see ExchangeRatesService's doc comment: Universe is a global platform,
 * not built around any one organisation's home currency, so the
 * dashboard/financial-view now carry an explicit currency SELECTOR
 * (`?currency=` on the endpoint) rather than a fixed reporting currency.
 * `baseCurrencyCode` is the platform's neutral internal computation
 * currency (every line's LOCKED conversion target); `displayCurrencyCode`
 * is whatever the viewer actually asked to see this in (defaults to
 * baseCurrencyCode, converted LIVE — not locked — when it differs, via
 * ExchangeRatesService.convertFromBase()). linesWithPricing vs totalLines
 * lets the UI show "N of M lines priced" rather than silently
 * understating the total when most lines have no price yet. */
export interface ProjectFinancialSummary {
  baseCurrencyCode: string;
  displayCurrencyCode: string;
  /** true when displayCurrencyCode differs from baseCurrencyCode AND the
   * live conversion for one or more figures below couldn't be computed
   * (currency not covered by Frankfurter, or the FX feed was unreachable)
   * — the UI should flag this rather than silently show a wrong number. */
  conversionUnavailable: boolean;
  /** Pre-margin manufacturer/supplier product cost, summed across lines. */
  totalProductCost: string;
  /** Pre-margin freight cost, summed across every project in scope's OWN
   * single freight record — freight moved to the project level 2026-10-03,
   * so this is no longer a per-line sum (see ProjectDetail's "Freight &
   * Logistics" fields). */
  totalFreightCost: string;
  /** Combined product margin (summed across lines) + freight margin
   * (summed across projects). */
  totalMargin: string;
  /** The full client-side rollup — each line's own product-only invoice
   * total, plus each project's own separate freight invoice charge. */
  totalInvoiceValue: string;
  linesWithPricing: number;
  totalLines: number;
}

/** One row of a project's status-transition history — see
 * ProjectStatusHistory's doc comment in schema.prisma. Added 2026-09-30
 * to support the StageTracker's time-in-stage display. */
export interface ProjectStatusHistoryEntry {
  status: string;
  enteredAt: string;
  changedByName: string | null;
}

/** One Project Lead (a User assigned to a project) — see ProjectLead's doc
 * comment in schema.prisma. Added/removed independently via
 * POST/DELETE /projects/:id/leads, not via the full project PATCH. */
export interface ProjectLeadSummary {
  userId: string;
  userName: string;
}

/** One Project Contact (an external Contact, belonging to a Partner,
 * attached to a project) — see ProjectContact's doc comment in
 * schema.prisma. Added/removed independently via
 * POST/DELETE /projects/:id/contacts. */
export interface ProjectContactSummary {
  contactId: string;
  contactName: string;
  partnerName: string | null;
}

/** One row of a Partner's Contact book — GET /contacts, used to populate
 * the project Team & Contacts picker. partnerName is denormalized here so
 * the picker can show "Jane Doe — Acme Logistics" without a second
 * lookup. */
export interface ContactSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  partnerId: string;
  partnerName: string;
}

/** Body of POST /projects/:id/leads. */
export interface AddProjectLeadInput {
  userId: string;
}

/** Body of POST /projects/:id/contacts. */
export interface AddProjectContactInput {
  contactId: string;
}

/** Dashboard/list-tile data for Projects, computed in the database (2026-10-17, scale work). Archived projects are excluded. */
export interface ProjectOverview {
  counts: { total: number; active: number; submitted: number; awarded: number; completed: number; overdue: number; /** Projects that track a tender. */ fromTenders: number };
  /** Distinct delivery countries (for the dashboard tile and the list's country filter). */
  deliveryCountryCodes: string[];
  recentActive: ProjectSummary[];
  recentAwarded: ProjectSummary[];
}

/** One delivery country on the dashboard: how many live projects deliver there and the five most recent/active of them. */
export interface ProjectCountryOverview {
  countryCode: string;
  /** Non-archived projects delivering to this country (any status). */
  projectCount: number;
  /** Of those, projects still live (identified, in progress, submitted or awarded). */
  liveCount: number;
  /** Up to five: live projects first, then by most recent update. */
  projects: ProjectSummary[];
}

/** Full project detail (header + lines) — what GET /projects/:id returns.
 * ProjectSummary stays as the list-row shape (GET /projects). */
export interface ProjectDetail extends ProjectSummary {
  /** True when the caller lacks projects.financials.view: every price, cost,
   * margin, payment and invoice figure below has been blanked server-side. */
  financialsRedacted: boolean;
  clientId: string | null;
  donorReference: string | null;
  deliveryCountryCode: string | null;
  startDate: string | null;
  submissionDate: string | null;
  managementResponsibility: string | null;
  reasonForCancellation: string | null;
  projectNotes: string | null;
  projectFolderUrl: string | null;
  // --- Freight & Logistics (moved here from each ProjectLine 2026-10-03,
  // per Lewis's request — freight is arranged once for the whole
  // project, not per line. See Project's doc comment in schema.prisma. ---
  incoterm: string | null;
  freightMode: string | null;
  freightForwarderId: string | null;
  freightForwarderName: string | null;
  freightCost: string | null;
  freightCurrency: string | null;
  insuredValue: string | null;
  insuredCurrency: string | null;
  freightInsuranceCost: string | null;
  freightAdditionalCost: string | null;
  freightAdditionalCostDescription: string | null;
  /** Computed server-side: freightCost + freightInsuranceCost +
   * freightAdditionalCost, in freightCurrency. */
  freightTotalCost: string | null;
  /** Input: markup % applied to freightTotalCost on the way to the
   * freight charge shown to the client. */
  freightMarginPercent: string | null;
  /** Computed: freightTotalCost x freightMarginPercent / 100, in
   * freightCurrency. */
  freightMarginAmount: string | null;
  /** Freight's own currency-conversion lock — freight can be, and often
   * is, priced in a different native currency than any one line's
   * product. Display-only, same convention as ProjectLineSummary's
   * reporting-currency fields. */
  freightPriceLockedAt: string | null;
  /** Freight's base-currency code lock — see ProjectLineSummary's
   * reportingCurrencyCode doc comment for the full mechanism. */
  reportingCurrencyCode: string | null;
  /** Base-currency equivalent of freightTotalCost — PRE-margin. */
  freightTotalCostReportingCcy: string | null;
  /** Base-currency equivalent of freightTotalCost x (1 +
   * freightMarginPercent/100) — the WITH-margin figure actually charged
   * to the client. This is what ProjectFinancialSummary's totalFreightCost/
   * totalInvoiceValue roll up, alongside each line's own invoice total. */
  freightInvoiceAmountReportingCcy: string | null;
  lines: ProjectLineSummary[];
  /** Ordered oldest-first — see ProjectStatusHistoryEntry above. Added
   * 2026-09-30. */
  statusHistory: ProjectStatusHistoryEntry[];
  /** Ordered newest-first. Added 2026-10-01 (Phase 2b, Blob Storage). */
  documents: ProjectDocumentSummary[];
  /** Added 2026-10-08 — see ProjectLeadSummary above. Unordered (a join
   * table, no natural ordering of its own). */
  leads: ProjectLeadSummary[];
  /** Added 2026-10-08 — see ProjectContactSummary above. */
  contacts: ProjectContactSummary[];
}

/** One uploaded document against a Project (Phase 2b, Blob Storage —
 * decided 2026-10-01, see architecture-decisions.md). Deliberately carries
 * NO url/blobName — a document's actual download link is only ever a
 * short-lived SAS URL, minted on demand via
 * GET /projects/:projectId/documents/:id/download-url, never a value that
 * sits in a cached ProjectDetail response. See BlobStorageService's doc
 * comment in apps/api for the full design. */
export interface ProjectDocumentSummary {
  id: string;
  /** Nullable since 20261008100000_standalone_documents (2026-10-08) — a
   * document can now be uploaded against something other than a Project
   * (e.g. StakeholderEvidenceRecord.documentId via the standalone
   * /documents endpoints). Always non-null for documents reached through
   * ProjectDetail.documents specifically, since those are only ever
   * project-scoped, but the field itself is nullable at the type level to
   * match the actual (correctly nullable) database column. */
  projectId: string | null;
  /** CHECKLIST | ISSUES | CLOSEOUT_REPORT | OTHER — see the allowed-values
   * reference comment at the top of schema.prisma. */
  type: string;
  title: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
}

/** POST /projects/:projectId/documents/upload-url — step 1 of the two-step
 * upload flow (see DocumentsService's doc comment in apps/api). */
export interface RequestDocumentUploadInput {
  fileName: string;
  contentType: string;
}

export interface RequestDocumentUploadResult {
  uploadUrl: string;
  blobName: string;
}

/** POST /projects/:projectId/documents — step 2, called once the direct-
 * to-blob PUT using step 1's uploadUrl has succeeded. */
export interface ConfirmDocumentUploadInput {
  blobName: string;
  fileName: string;
  type: string;
  title: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

/** Added 2026-10-08 (stakeholder-evidence document upload). A document
 * uploaded through the standalone (non-project) /documents endpoints —
 * same underlying ProjectDocument row as a project document, just with
 * projectId null, so this is its own read shape rather than reusing
 * ProjectDocument's (which assumes a project context for display). */
export interface StandaloneDocumentSummary {
  id: string;
  title: string;
  type: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
}

/** POST /documents/link — added 2026-10-08. Records a pasted URL (e.g. a
 * cloud storage share link) as a standalone document with no blob upload
 * involved — see LinkStandaloneDocumentDto's doc comment in apps/api. */
export interface LinkStandaloneDocumentInput {
  url: string;
  title: string;
  type: string;
}


/** PATCH /projects/:id — header fields only; line data goes through the
 * dedicated line endpoints above. */
export interface UpdateProjectInput {
  title?: string;
  status?: string;
  clientId?: string | null;
  donorReference?: string | null;
  deliveryCountryCode?: string | null;
  /** All destination countries; replaces the list when sent (empty array clears it). */
  deliveryCountryCodes?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  submissionDate?: string | null;
  managementResponsibility?: string | null;
  reasonForCancellation?: string | null;
  projectNotes?: string | null;
  /** Only meaningful when status is COMPLETED — see
   * Project.completionStage's doc comment in schema.prisma. */
  completionStage?: string | null;
  // --- Freight & Logistics (moved here from ProjectLineInput 2026-10-03)
  incoterm?: string | null;
  freightMode?: string | null;
  freightForwarderId?: string | null;
  freightCost?: number | null;
  freightCurrency?: string | null;
  insuredValue?: number | null;
  insuredCurrency?: string | null;
  freightInsuranceCost?: number | null;
  freightAdditionalCost?: number | null;
  freightAdditionalCostDescription?: string | null;
  freightMarginPercent?: number | null;
}

// ---------------------------------------------------------------------------
// Partners — real-world companies a tenant does business with (client,
// supplier, manufacturer, freight forwarder). See Partner/PartnerRole in
// schema.prisma. Added 2026-09-27 alongside the Project Line work above —
// lines need real Partner records to reference as manufacturer/supplier/
// freight forwarder rather than free text.
// ---------------------------------------------------------------------------

export interface PartnerRoleSummary {
  roleType: string;
  isActive: boolean;
}

export interface PartnerSupplierDetail {
  supplierCode?: string | null;
  productCategory?: string | null;
  fdaRegistrationNumber?: string | null;
  scopeOfSupply?: string | null;
  scopeOfServicesDescription?: string | null;
  codeOfConductAcknowledged?: boolean;
  codeOfConductAcknowledgedDate?: string | null;
}

export interface PartnerManufacturerDetail {
  partNumberConvention?: string | null;
  countryOfManufactureCode?: string | null;
  scopeOfSupply?: string | null;
  scopeOfServicesDescription?: string | null;
}

export interface PartnerFreightForwarderDetail {
  modesOfTransport?: string | null;
  iataDgrCertified?: boolean;
  aeoAccredited?: boolean;
  gdpTransportCapable?: boolean;
  referencesProvided?: boolean;
}

export interface PartnerClientDetail {
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingRegion?: string | null;
  billingPostcode?: string | null;
  billingCountryCode?: string | null;
  deliveryAddressLine1?: string | null;
  deliveryAddressLine2?: string | null;
  deliveryCity?: string | null;
  deliveryRegion?: string | null;
  deliveryPostcode?: string | null;
  deliveryCountryCode?: string | null;
  paymentTerms?: string | null;
  productCategoryLicenses?: string | null;
  productCategoryLicensingOtherNotes?: string | null;
  destinationCountryRestrictionsNotes?: string | null;
  isPharmaApprovedCustomer?: boolean;
  approvedCustomerLogRef?: string | null;
}

/** Added 2026-10-02 — see WarehousingDetail in schema.prisma. */
export interface PartnerWarehousingDetail {
  wdaNumber?: string | null;
  technicalAgreementRef?: string | null;
  gdpAuditDate?: string | null;
  nextGdpAuditDue?: string | null;
  monthlyReconciliationContact?: string | null;
}

/** Added 2026-10-03 — see PartnerFinancialDetail in schema.prisma.
 * Standard banking/financial information, applies to every stakeholder
 * role, not gated to a specific one. */
export interface PartnerFinancialDetail {
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  sortCode?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  branchAddress?: string | null;
  currencyCode?: string | null;
}

/** A manufacturer's registered manufacturing site — see ManufacturerSite
 * in schema.prisma (the Becton Dickinson folder pattern). */
export interface PartnerManufacturerSite {
  id: string;
  siteName: string;
  countryCode: string | null;
  address: string | null;
  isPrimary: boolean;
}

/** One generic document/certificate row — see PartnerCertification's doc
 * comment in schema.prisma, expanded 2026-10-02. */
export interface PartnerCertificationSummary {
  id: string;
  type: string;
  referenceNumber: string | null;
  revision: string | null;
  issuingBody: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  verifiedAt: string | null;
  status: string; // CURRENT | ARCHIVED
  notes: string | null;
  manufacturerSiteId: string | null;
  /** See PartnerCertification.relatedCompanyCheckType's doc comment in
   * schema.prisma — the PartnerCompanyCheckSummary.checkType this document
   * is attached to as evidence, if any. */
  relatedCompanyCheckType: string | null;
  /** True if expiryDate is set and in the past — convenience flag so every
   * consumer doesn't re-derive the same date comparison. */
  isExpired: boolean;
}

/** Bioconnections FORM 008.1's "Company Checks" table — see
 * PartnerCompanyCheck in schema.prisma. */
export interface PartnerCompanyCheckSummary {
  id: string;
  checkType: string;
  /** Only meaningful when checkType is "OTHER" — see
   * PartnerCompanyCheck.customLabel's doc comment in schema.prisma. */
  customLabel: string | null;
  result: string; // YES | NO | NOT_APPLICABLE
  checkedDate: string | null;
  referenceOrSource: string | null;
  comment: string | null;
}

/** PartnerFinancialDetail (added 2026-10-14, was schema-only until now —
 * see backend-frontend-wiring-audit.md) — one-to-one with Partner, keyed
 * by partnerId, gated behind partners.financials.view/edit rather than
 * the open partner create/update flow (see
 * partner-financial-detail.dto.ts's doc comment). All fields nullable:
 * GET returns null (not a 404) when no row has been entered yet, so the
 * frontend can render an empty form rather than treating "not set up
 * yet" as an error. */
export interface PartnerFinancialDetailSummary {
  partnerId: string;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  sortCode: string | null;
  iban: string | null;
  swiftBic: string | null;
  branchAddress: string | null;
  currencyCode: string | null;
}

/** Server-paged list shape (2026-10-17, scale work — see docs/SCALE-AUDIT.md). */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Slim partner row for lists: no per-role detail, certifications or checks (those load on the detail screen). */
export interface PartnerListItem {
  id: string;
  name: string;
  countryCode: string | null;
  website: string | null;
  approvalStatus: string;
  riskTier: string | null;
  companyRegistrationNumber: string | null;
  vatNumber: string | null;
  roles: PartnerRoleSummary[];
  createdAt: string;
}

export interface PartnerOverview {
  counts: { byRole: Record<string, number>; approved: number; approvedMfgSup: number };
  /** Up to five most recently added per role type. */
  recent: Record<string, PartnerListItem[]>;
}

/** Minimal partner for dropdown pickers. */
export interface PartnerOption {
  id: string;
  name: string;
  countryCode: string | null;
}

export interface PartnerSummary {
  id: string;
  name: string;
  countryCode: string | null;
  website: string | null;
  approvalStatus: string;
  riskTier: string | null;
  companyRegistrationNumber: string | null;
  vatNumber: string | null;
  /** See StakeholderRegistryEntry's doc comment in schema.prisma — links
   * this Partner to the shared, cross-tenant identity registry row for the
   * same real-world company, if one has been matched/confirmed. */
  registryEntryId: string | null;
  /** See Partner.sharedWithUniverseRegistry's doc comment in schema.prisma
   * — the New Stakeholder form's consent toggle. */
  sharedWithUniverseRegistry: boolean;
  lastApprovalReviewDate: string | null;
  nextApprovalReviewDue: string | null;
  roles: PartnerRoleSummary[];
  supplierDetail: PartnerSupplierDetail | null;
  manufacturerDetail: PartnerManufacturerDetail | null;
  freightForwarderDetail: PartnerFreightForwarderDetail | null;
  clientDetail: PartnerClientDetail | null;
  warehousingDetail: PartnerWarehousingDetail | null;
  financialDetail: PartnerFinancialDetail | null;
  manufacturerSites: PartnerManufacturerSite[];
  certifications: PartnerCertificationSummary[];
  companyChecks: PartnerCompanyCheckSummary[];
  createdAt: string;
}

/** Matches CreatePartnerDto's PartnerCertificationDto — see
 * apps/api/src/partners/dto/create-partner.dto.ts. */
export interface CreatePartnerCertificationInput {
  type: string;
  referenceNumber?: string;
  revision?: string;
  issuingBody?: string;
  issuedDate?: string;
  expiryDate?: string;
  verifiedAt?: string;
  status?: string;
  notes?: string;
  manufacturerSiteIndex?: number;
  /** See PartnerCertification.relatedCompanyCheckType's doc comment in
   * schema.prisma. */
  relatedCompanyCheckType?: string;
}

export interface CreatePartnerCompanyCheckInput {
  checkType: string;
  /** Only meaningful when checkType is "OTHER". */
  customLabel?: string;
  result: string;
  checkedDate?: string;
  referenceOrSource?: string;
  comment?: string;
}

export interface CreatePartnerManufacturerSiteInput {
  siteName: string;
  countryCode?: string;
  address?: string;
  isPrimary?: boolean;
}

export interface CreatePartnerInput {
  name: string;
  countryCode?: string;
  website?: string;
  riskTier?: string;
  companyRegistrationNumber?: string;
  vatNumber?: string;
  /** Set when the caller already confirmed a match from the
   * duplicate-prevention prompt — see CreatePartnerDto.registryEntryId. */
  registryEntryId?: string;
  /** Off-by-default consent to share this stakeholder with the cross-tenant
   * registry — see Partner.sharedWithUniverseRegistry's doc comment in
   * schema.prisma and the New Stakeholder form's consent toggle. */
  sharedWithUniverseRegistry?: boolean;
  /** At least one role required — a Partner with no role is meaningless. */
  roleTypes: string[];
  supplierDetail?: PartnerSupplierDetail;
  manufacturerDetail?: PartnerManufacturerDetail;
  freightForwarderDetail?: PartnerFreightForwarderDetail;
  clientDetail?: PartnerClientDetail;
  warehousingDetail?: PartnerWarehousingDetail;
  financialDetail?: PartnerFinancialDetail;
  manufacturerSites?: CreatePartnerManufacturerSiteInput[];
  certifications?: CreatePartnerCertificationInput[];
  companyChecks?: CreatePartnerCompanyCheckInput[];
}

export interface UpdatePartnerInput {
  name?: string;
  countryCode?: string | null;
  website?: string | null;
  approvalStatus?: string;
  /** Optional free-text reason for an approvalStatus change, carried onto
   * the resulting PartnerApprovalHistory row — see UpdatePartnerDto's
   * doc comment in apps/api. Only meaningful alongside approvalStatus.
   * Added 2026-10-08 — the DTO already had this field; it was missing
   * here. */
  approvalReason?: string;
  riskTier?: string;
  companyRegistrationNumber?: string;
  vatNumber?: string;
  /** See Partner.sharedWithUniverseRegistry's doc comment in schema.prisma. */
  sharedWithUniverseRegistry?: boolean;
  /** Adds any role types not already present — does not remove existing
   * ones (see PartnersService.update's doc comment). */
  addRoleTypes?: string[];
  supplierDetail?: PartnerSupplierDetail;
  manufacturerDetail?: PartnerManufacturerDetail;
  freightForwarderDetail?: PartnerFreightForwarderDetail;
  clientDetail?: PartnerClientDetail;
  warehousingDetail?: PartnerWarehousingDetail;
  financialDetail?: PartnerFinancialDetail;
  addManufacturerSites?: CreatePartnerManufacturerSiteInput[];
  addCertifications?: CreatePartnerCertificationInput[];
  addCompanyChecks?: CreatePartnerCompanyCheckInput[];
}

// ---------------------------------------------------------------------------
// Certifications / company checks / approval history sub-resources (added
// 2026-10-08, compliance-standards-gap-analysis.md) — POST/PATCH endpoints
// for a SINGLE PartnerCertification or PartnerCompanyCheck, filling the gap
// CreatePartnerInput.certifications/companyChecks and
// UpdatePartnerInput.addCertifications/addCompanyChecks left open (add-only,
// whole-object-at-a-time). See apps/api/src/partners/dto/
// partner-certification.dto.ts and partner-company-check.dto.ts.

/** Matches AddPartnerCertificationDto. Unlike
 * CreatePartnerCertificationInput.manufacturerSiteIndex (an array index,
 * used only on the create-partner path where the site doesn't have a real
 * id yet), this takes the site's real id — the partner it's being added to
 * already exists. */
export interface AddPartnerCertificationInput {
  type: string;
  referenceNumber?: string;
  revision?: string;
  issuingBody?: string;
  issuedDate?: string;
  expiryDate?: string;
  verifiedAt?: string;
  status?: string;
  notes?: string;
  manufacturerSiteId?: string;
  relatedCompanyCheckType?: string;
}

/** Matches UpdatePartnerCertificationDto. All fields optional — a PATCH
 * edits only what's provided. Retiring a certification (no hard delete —
 * compliance history must be retained) is this same shape with just
 * `{ status: "ARCHIVED" }`. */
export interface UpdatePartnerCertificationInput {
  type?: string;
  referenceNumber?: string;
  revision?: string;
  issuingBody?: string;
  issuedDate?: string;
  expiryDate?: string;
  verifiedAt?: string;
  status?: string;
  notes?: string;
  manufacturerSiteId?: string;
  relatedCompanyCheckType?: string;
}

/** Matches AddPartnerCompanyCheckDto. */
export interface AddPartnerCompanyCheckInput {
  checkType: string;
  customLabel?: string;
  result: string;
  checkedDate?: string;
  referenceOrSource?: string;
  comment?: string;
}

/** Matches UpdatePartnerCompanyCheckDto. */
export interface UpdatePartnerCompanyCheckInput {
  checkType?: string;
  customLabel?: string;
  result?: string;
  checkedDate?: string;
  referenceOrSource?: string;
  comment?: string;
}

/** One PartnerApprovalHistory row, as returned by GET
 * /partners/:id/approval-history — see PartnerApprovalHistory's doc
 * comment in schema.prisma. Append-only: there is no corresponding create/
 * update input type, matching AuditLogService/AuditLogEntry's own
 * read-only posture. */
export interface PartnerApprovalHistorySummary {
  id: string;
  partnerId: string;
  action: string; // e.g. "APPROVED" | "REMOVED" | "REINSTATED"
  reason: string | null;
  certificationStatement: string | null;
  actionDate: string;
  actionById: string | null;
  actionByName: string | null;
}

// ---------------------------------------------------------------------------
// Quality Assurance (added 2026-10-01, round 3 feedback) — product/partner
// sourcing approvals plus freight/supplier/manufacturer performance
// scorecards. See architecture-decisions.md's "Quality Assurance" section
// for the full design rationale, in particular why "qualified product" is
// its own first-class ProductSourceApproval record rather than something
// derived purely from order history.
// ---------------------------------------------------------------------------

/** Search-or-create result for the shared product catalog's own
 * search/create flow (ProductCatalogService). Carries the provenance tag
 * (see ProductMaster.addedByOrganizationId's
 * doc comment in schema.prisma) purely for display ("added by Acme
 * Manufacturing") — never used for access control; ProductMaster stays
 * globally readable/writable. Added 2026-10-02 alongside the Project
 * Management line-item product picker — see
 * claude/product-catalog-build.md for the full design and the intended
 * reuse path for CRM / the future Supplier Portal app. */
export interface ProductCatalogMatch {
  id: string;
  name: string;
  category: string;
  hsCode: string | null;
  unspscCode: string | null;
  gtin: string | null;
  standardUnit: string | null;
  addedByOrganizationName: string | null;
  /** Added 2026-10-09 alongside hasPendingAmendment — lets the frontend
   * determine "did MY organisation add this" (the gate update() enforces
   * server-side regardless) without a name-string comparison, e.g. to
   * decide whether the catalogue edit panel should even attempt a direct
   * save vs. a proposed amendment. Null for the originally-seeded
   * reference data, same as the underlying ProductMaster column. */
  addedByOrganizationId: string | null;
  /** Added 2026-10-03 — archived entries are excluded from search() and
   * list() by default (see ProductCatalogService), surfaced here only
   * when the caller explicitly asks to include them. */
  isArchived: boolean;
  /** Added 2026-10-09 — catalogue edit-rights + ratification workflow
   * (ProductAmendment, see schema.prisma). True when this entry has at
   * least one PENDING ProductAmendment awaiting QA/RP ratification.
   * Lewis's explicit instruction: this is a WARNING, never a block — a
   * product with a pending amendment can still be selected onto a new
   * ProjectLine. See ProductPickerOption in @universe/ui for the picker's
   * own copy of this flag. */
  hasPendingAmendment: boolean;
  /** Added 2026-10-18 — DRAFT | ACTIVE | RESTRICTED | DISCONTINUED | WITHDRAWN | RECALLED. */
  lifecycleStatus: string;
  /** Step 3b follow-up (2026-10-18): family and variant details so every picker can show "Family — variant". */
  familyId?: string | null;
  familyName?: string | null;
  variantLabel?: string | null;
  packSize: string | null;
  strength: string | null;
  brand: string | null;
  /** Pharma interconnection (2026-10-23): INN and ATC for medicines, and the register sources this product is confirmed against (list view). */
  atcCode?: string | null;
  isSimulated?: boolean;
  pharmaVerifiedSources?: Array<"EMA" | "MHRA">;
  pharmaSuggestedCount?: number;
  /** True when the contributing organisation is hidden from the viewer (pooled-database rule): the name reads "A Universe member". */
  contributorAnonymised?: boolean;
}

/** One category-scoped dynamic field from ProductAttributeDefinition — see
 * that model's doc comment in schema.prisma. Zero rows are seeded today
 * (no importer built yet); this plumbing is ready regardless. */
export interface ProductCatalogAttribute {
  attributeKey: string;
  label: string;
  dataType: string;
  enumOptions: string[] | null;
  required: boolean;
}

/** One row of GET /product-catalog/:id/price-history — ProductPriceHistory
 * rows recorded for this ProductMaster, tenant-scoped to the caller's own
 * organisation. unitPrice follows this file's Decimal-to-string wire
 * convention (see ProjectLine.unitSalesPrice above). Added 2026-10-09:
 * ProductPriceHistory existed in the schema with zero API/frontend
 * exposure until now. */
export interface ProductPriceHistoryPoint {
  id: string;
  unitPrice: string;
  currency: string;
  effectiveDate: string;
  recordedByName: string | null;
}

export interface ProductIdentifierSummary {
  id: string;
  identifierType: string;
  value: string;
  label: string | null;
  /** UNIT | INNER | OUTER | PALLET */
  packagingLevel: string | null;
  unitsPerPack: number | null;
  isActive: boolean;
}

/** Product-record fields added 2026-10-18 (shared catalogue, see docs/PRODUCT-DATABASE-GAP-ANALYSIS.md). */
export interface ProductRecordFields {
  lifecycleReason: string | null;
  lifecycleChangedAt: string | null;
  storageClass: string | null;
  coldChain: boolean;
  shelfLifeMonths: number | null;
  hazardClass: string | null;
  controlledSubstance: boolean;
  inn: string | null;
  strength: string | null;
  dosageForm: string | null;
  brand: string | null;
  packSize: string | null;
  regulatoryClass: string | null;
  intendedUse: string | null;
  nextReviewDue: string | null;
  version: number;
}

export interface ProductRecordCompleteness {
  /** 0–100, share of applicable record fields filled. */
  score: number;
  filled: number;
  total: number;
  /** Human-readable names of the applicable fields still empty. */
  missing: string[];
}

/** Family link shown on a variant's page (step 3b). */
export interface ProductFamilyLink {
  id: string;
  name: string;
  variantCount: number;
}

export interface ProductCatalogDetail extends ProductCatalogMatch, ProductRecordFields {
  canonicalManufacturerPartNumber: string | null;
  expectedQualityDocumentation: string | null;
  attributeDefinitions: ProductCatalogAttribute[];
  identifiers: ProductIdentifierSummary[];
  completeness: ProductRecordCompleteness;
  compliance: ProductComplianceStatus;
  family: ProductFamilyLink | null;
  variantLabel: string | null;
  /** Other variants in the same family (excluding this one), up to 50. */
  siblings: ProductFamilyVariant[];
  sourceStandard: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One applied change to a shared catalogue entry (ProductMasterChange). */
export interface ProductChangeEntry {
  id: string;
  version: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  source: string;
  reason: string | null;
  changedByName: string | null;
  changedByOrganizationName: string | null;
  changedAt: string;
}

/** A registration's current position for the calling organisation (its newest ProductRegistrationVerification). */
export interface RegistrationVerificationSummary {
  id: string;
  outcome: string;
  jurisdiction: string | null;
  notes: string | null;
  nextReverificationDue: string | null;
  verifiedByName: string;
  verifiedAt: string;
}

/** Product Database step 2 (2026-10-18): a shared regulatory registration plus the caller's own latest verification. */
export interface ProductRegistrationSummary {
  id: string;
  /** Set for a variant-level registration; null when the registration belongs to the family. */
  productMasterId: string | null;
  /** Set when the registration belongs to a product family (applies to every variant). */
  productFamilyId: string | null;
  /** True when shown on a variant but held by its family. */
  inherited: boolean;
  authority: string;
  scheme: string | null;
  referenceNumber: string;
  regulatoryClass: string | null;
  countryCode: string | null;
  holderName: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  /** Stored status. */
  status: string;
  /** Stored status, except ACTIVE with a past expiry date reads EXPIRED. */
  effectiveStatus: string;
  daysToExpiry: number | null;
  sourceUrl: string | null;
  notes: string | null;
  /** CONTRIBUTED | SOURCE_VERIFIED */
  verificationLevel: string;
  contributedByOrganizationName: string | null;
  isArchived: boolean;
  myVerification: RegistrationVerificationSummary | null;
}

export interface CreateRegistrationInput {
  authority: string;
  scheme?: string;
  referenceNumber: string;
  regulatoryClass?: string;
  countryCode?: string;
  holderName?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: string;
  sourceUrl?: string;
  notes?: string;
}

export interface UpdateRegistrationInput extends Partial<CreateRegistrationInput> {
  isArchived?: boolean;
  /** Platform staff only. */
  verificationLevel?: string;
}

export interface VerifyRegistrationInput {
  outcome: string;
  jurisdiction?: string;
  notes?: string;
  nextReverificationDue?: string;
}

/** Product Database step 4 (2026-10-18): an organisation's own review of a safety notice (private to it). */
export interface SafetyNoticeReviewSummary {
  id: string;
  /** CHECKED_NO_IMPACT | NOT_APPLICABLE | ACTION_TAKEN | AFFECTED */
  outcome: string;
  notes: string | null;
  reviewedByName: string;
  reviewedAt: string;
}

/** A shared safety notice / recall / field safety notice plus the caller's organisation's own latest review. */
export interface ProductSafetyNoticeSummary {
  id: string;
  productMasterId: string | null;
  productFamilyId: string | null;
  /** True when shown on a variant but held by its family. */
  inherited: boolean;
  /** Name of the variant or family the notice is attached to. */
  productName: string;
  /** RECALL | FIELD_SAFETY_NOTICE | SAFETY_ALERT | FALSIFIED_ALERT | SUPPLY_ALERT */
  noticeType: string;
  /** CRITICAL | HIGH | MEDIUM | LOW */
  severity: string;
  authority: string;
  referenceNumber: string | null;
  title: string;
  summary: string;
  actionRequired: string | null;
  affectedBatches: string | null;
  countryCodes: string | null;
  issueDate: string;
  /** OPEN | CLOSED */
  status: string;
  closedDate: string | null;
  closedReason: string | null;
  sourceUrl: string | null;
  contributedByOrganizationName: string | null;
  isArchived: boolean;
  /** The caller's organisation's newest review, if any. */
  myReview: SafetyNoticeReviewSummary | null;
  /** Open and not yet reviewed by the caller's organisation. */
  needsReview: boolean;
}

export interface CreateSafetyNoticeInput {
  noticeType: string;
  severity: string;
  authority: string;
  referenceNumber?: string;
  title: string;
  summary: string;
  actionRequired?: string;
  affectedBatches?: string;
  countryCodes?: string;
  issueDate: string;
  sourceUrl?: string;
}

export interface UpdateSafetyNoticeInput extends Partial<CreateSafetyNoticeInput> {
  status?: string;
  closedReason?: string;
  isArchived?: boolean;
  /** Platform staff only. */
  verificationLevel?: string;
}

export interface ReviewSafetyNoticeInput {
  outcome: string;
  notes?: string;
}

/** Per-product safety position for the caller's organisation (used to flag project lines). */
export interface ProductSafetyFlag {
  productMasterId: string;
  openNotices: number;
  criticalOpen: number;
  /** Open notices this organisation has not yet reviewed. */
  unreviewed: number;
  /** Title of the most severe open notice. */
  headline: string | null;
}

export interface SafetyNoticeDashboard {
  totals: { open: number; critical: number; closedLast90Days: number; productsAffected: number };
  mine: { awaitingReview: number; affected: number; actionTaken: number; onMyProjectLines: number };
  items: ProductSafetyNoticeSummary[];
}

/** Regulatory watch (Product Database step 4b, 2026-10-18): public regulator items and advisory matches to catalogue products. */
export interface WatchItemSummary {
  id: string;
  /** OPENFDA_DEVICE | OPENFDA_DRUG | MHRA_ALERTS */
  source: string;
  authority: string;
  noticeType: string;
  severity: string;
  title: string;
  summary: string;
  firmName: string | null;
  issueDate: string;
  status: string;
  url: string | null;
  isSimulated: boolean;
}

export interface WatchMatchSummary {
  id: string;
  /** PENDING | CONFIRMED | DISMISSED */
  status: string;
  confidence: number;
  /** IDENTIFIER | NAME */
  matchBasis: string;
  matchDetail: string | null;
  productMasterId: string;
  productName: string;
  item: WatchItemSummary;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  /** The safety notice created when the match was confirmed. */
  safetyNoticeId: string | null;
}

export interface WatchSourceHealth {
  source: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  /** No successful run in the last 36 hours. */
  stale: boolean;
}

export interface WatchRunSummary {
  id: string;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  fetched: number;
  newItems: number;
  changedItems: number;
  newMatches: number;
  error: string | null;
}

export interface RegulatoryWatchDashboard {
  sources: WatchSourceHealth[];
  totals: { itemsLast30Days: number; pendingMatches: number; confirmed: number; dismissed: number };
  runs: WatchRunSummary[];
  pending: WatchMatchSummary[];
  recentItems: WatchItemSummary[];
  exportRestrictions: ExportRestrictionSummary[];
}

/** Export / hoarding restrictions (2026-10-18): medicines a country restricts, matched to products and to project-line routes. */
export interface ExportRestrictionSummary {
  id: string;
  restrictingCountryCode: string;
  /** UK_DHSC_CSV (fetched daily) | MANUAL (curated by platform staff) */
  source: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  /** EXPORT | HOARDING | BOTH */
  scope: string;
  restrictionDate: string | null;
  /** ACTIVE | REMOVED */
  status: string;
  removedAt: string | null;
  sourceUrl: string | null;
  notes: string | null;
}

export interface ProductExportRestrictionMatch {
  restriction: ExportRestrictionSummary;
  /** MATCH = name, strength and form agree; CHECK = name agrees but the product record lacks a strength or form to confirm. */
  certainty: string;
  detail: string;
}

export interface CreateExportRestrictionInput {
  restrictingCountryCode: string;
  medicineName: string;
  strength?: string;
  form?: string;
  scope?: string;
  restrictionDate?: string;
  sourceUrl: string;
  notes?: string;
}

export interface UpdateExportRestrictionInput {
  status?: string;
  notes?: string;
  sourceUrl?: string;
}

export interface ProjectExportCheckItem {
  lineId: string;
  lineDescription: string | null;
  productMasterId: string;
  productName: string;
  restriction: ExportRestrictionSummary;
  certainty: string;
  detail: string;
  /** APPLIES = goods originate in the restricting country and the delivery country is elsewhere; DESTINATION_UNKNOWN = no delivery country set on the project. */
  route: string;
  originCountryCode: string;
  originBasis: string;
  destinationCountryCode: string | null;
}

/** Computed per product from lifecycle, registrations and open safety notices. */
export interface ProductComplianceStatus {
  status: "OK" | "WARNING" | "BLOCKED";
  reasons: string[];
}

export interface RegulatoryDashboard {
  totals: { registrations: number; active: number; expiringSoon: number; expired: number; suspendedOrWithdrawn: number; productsWithoutRegistration: number };
  mine: { unverified: number; reverificationDue: number; issuesFound: number; documentsExpiringSoon: number; documentsExpired: number; documentsAwaitingApproval: number };
  attention: { registrationId: string; productMasterId: string | null; productFamilyId: string | null; productName: string; authority: string; referenceNumber: string; expiryDate: string | null; effectiveStatus: string; daysToExpiry: number | null }[];
}

/** One row of the regulatory registers behind the dashboard tiles (registrations, products with none, safety notices). */
export interface RegulatoryRegisterRow {
  id: string;
  name: string;
  detail: string;
  status: string;
  tone: "good" | "warning" | "critical" | "neutral";
  date: string | null;
  href: string;
}
export interface RegulatoryRegisterPage { rows: RegulatoryRegisterRow[]; total: number }

/** GET /product-catalog/:id/usage — the caller's own organisation's use of a product. */
export interface ProductUsageSummary {
  lineCount: number;
  projectCount: number;
  recentProjects: { projectId: string; reference: string; name: string; status: string; lineCount: number }[];
}

/** POST /product-catalog body — adds a new entry to the shared catalogue.
 * See CreateProductMasterDto's doc comment in apps/api for the full
 * design. */
export interface CreateProductMasterInput {
  /** Optional when a family is given: the name is then "<family name>, <variant label>". */
  name?: string;
  category: string;
  /** Add the product as a variant of an existing family (all organisations). */
  familyId?: string;
  variantLabel?: string;
  /** Platform staff only: create a new family for this product. */
  newFamilyName?: string;
  brand?: string;
  inn?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  regulatoryClass?: string;
  /** Show (true) or hide (false) this organisation as the contributor of this product; omitted = the organisation setting. */
  showContributor?: boolean;
  /** Barcodes per packaging level (UNIT | INNER | OUTER | PALLET). */
  identifiers?: { value: string; packagingLevel: string; unitsPerPack?: number }[];
  hsCode?: string;
  unspscCode?: string;
  gtin?: string;
  standardUnit?: string;
  canonicalManufacturerPartNumber?: string;
  expectedQualityDocumentation?: string;
}

/** GET /product-catalog — paginated browse for the Product Database
 * Management app's catalogue screen. Added 2026-10-03. */
export interface ProductCatalogListResult {
  items: ProductCatalogMatch[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET /product-catalog/completeness-stats — headline counts for the
 * catalogue's data-completeness pass (product-database-and-map-roadmap.md
 * Stage 0 point 3, 2026-10-09). Scoped to non-archived entries only, same
 * default scope as list()'s own default view, since an archived entry's
 * missing fields aren't anyone's action item. Deliberately just four
 * plain counts rather than one blanket "% complete" figure: GTIN and the
 * rest are genuinely optional on some legitimate entries (not every
 * commodity has one), so there is no single correct completeness
 * threshold — these are a work queue ("how many rows need a GTIN"), not
 * a score. */
export interface ProductCatalogCompletenessStats {
  total: number;
  missingGtin: number;
  missingHsCode: number;
  missingUnspscCode: number;
  missingStandardUnit: number;
}

/** GET /product-catalog/dashboard-stats — the catalogue's standardised
 * section mini-dashboard (product-database-and-map-roadmap.md Stage 1,
 * 2026-10-09), the same StatTile/StatTileGrid pattern already used on
 * Project Management's home page, Stakeholders, Quality, Logistics & CO2,
 * and Admin's Organisations/Users screens — Product Database was the one
 * section with none. Scoped to non-archived entries, same as
 * completeness-stats above. `byCategory` is every TOP-LEVEL category
 * group with at least one entry (e.g. "Pharmaceuticals", never the full
 * hierarchical "Pharmaceuticals.Antibiotics" path ProductMaster.category
 * actually stores — see schema.prisma — collapsed server-side; fixed
 * 2026-10-09 after an initial version showed one chip per Group.Subgroup
 * pair instead), sorted by count descending, for the "products per
 * category" breakdown panel. */
export interface ProductCatalogDashboardStats {
  total: number;
  addedLast30Days: number;
  byCategory: { category: string; count: number }[];
}

/** PATCH /product-catalog/:id body — every field optional, provenance
 * fields excluded. See UpdateProductMasterDto's doc comment in apps/api.
 * Added 2026-10-03. */
export interface UpdateProductMasterInput {
  name?: string;
  category?: string;
  hsCode?: string;
  unspscCode?: string;
  gtin?: string;
  standardUnit?: string;
  canonicalManufacturerPartNumber?: string;
  expectedQualityDocumentation?: string;
  isArchived?: boolean;
  /** Product-record fields (2026-10-18). An empty string clears a text field. */
  lifecycleStatus?: string;
  lifecycleReason?: string;
  storageClass?: string;
  coldChain?: boolean;
  shelfLifeMonths?: number;
  hazardClass?: string;
  controlledSubstance?: boolean;
  inn?: string;
  strength?: string;
  dosageForm?: string;
  brand?: string;
  packSize?: string;
  regulatoryClass?: string;
  intendedUse?: string;
  nextReviewDue?: string;
}

/** One row of a POST /product-catalog/import request body. See
 * ImportProductMasterDto's doc comment in apps/api for the full design.
 * Added 2026-10-03. */
export interface ImportProductMasterRow {
  name: string;
  category: string;
  hsCode?: string;
  unspscCode?: string;
  gtin?: string;
  standardUnit?: string;
}

export type ProductSourceStandardForImport = "HS_CODE" | "WHO_EML" | "UNSPSC" | "GS1_GTIN";

/** POST /product-catalog/import response — per-row outcome counts plus any
 * row-level errors (never a hard failure for the whole batch; one bad row
 * doesn't block the rest). Added 2026-10-03. */
export interface ImportProductMasterResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

/** PATCH /product-catalog/:id response — distinguishes a direct apply
 * (platform staff) from a proposal that now needs QA/RP ratification
 * (everyone else editing their own organisation's contribution). Added
 * 2026-10-09 — see ProductCatalogService.update()'s doc comment for the
 * full gating rules this reflects. */
export type UpdateProductMasterResult =
  | { status: "APPLIED"; product: ProductCatalogMatch }
  | { status: "PENDING_AMENDMENT"; amendmentId: string };

/** One ProductAmendment row — a proposed change to a ProductMaster entry,
 * awaiting QA/RP ratification. Added 2026-10-09. proposedChanges mirrors
 * UpdateProductMasterInput's shape (only the fields actually proposed are
 * present). */
export interface ProductAmendmentSummary {
  id: string;
  productMasterId: string;
  productMasterName: string;
  organizationId: string;
  organizationName: string;
  proposedChanges: UpdateProductMasterInput;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedById: string;
  submittedByName: string;
  submittedAt: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

/** POST /product-catalog/amendments/:id/reject body. Added 2026-10-09. */
export interface RejectProductAmendmentInput {
  notes?: string;
}

/** A country from the shared, non-tenant-scoped Country reference table
 * (see schema.prisma) — powers the CountrySelect picker everywhere a
 * country field used to be a free-text ISO alpha-2 input. `latitude`/
 * `longitude` added 2026-10-09 (product-database-and-map-roadmap.md
 * Stage 2) so WorldMap callers can go straight from a CountryOption
 * (already fetched via useCountries() everywhere) to a plottable point
 * without a second request — null until a country's centroid has been
 * seeded (see Country.latitude's doc comment in schema.prisma; not every
 * country is seeded yet). CountrySelect itself still only reads
 * code/name — these are extra, unused fields from its point of view. */
export interface CountryOption {
  code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  /** WHO-region code this country rolls up into (e.g. "AFRO", "AMRO"),
   * or null if ungrouped — added 2026-10-14 when Region (previously dead
   * schema, see backend-frontend-wiring-audit.md) was wired up. Resolve
   * against RegionSummary/listRegions() for the full name. */
  regionCode: string | null;
}

/** A WHO-region grouping (AFRO/AMRO/EMRO/EURO/SEARO/WPRO) that countries
 * roll up into — GET /countries/regions (same controller as
 * listCountries(), which is why it isn't "/geo/regions" despite the
 * service class being GeoService). Added 2026-10-14; see Region's own
 * schema.prisma doc comment for why this rollup exists (it was built but
 * never queried anywhere until now). */
export interface RegionSummary {
  code: string;
  name: string;
  countryCount: number;
}

/** One row of OrganizationCountryPresence — "which countries does this org
 * operate in", the general onboarding fact for any Organization.type,
 * distinct from SupplierCountryPresence (the SUPPLIER-type marketplace's
 * narrower "countries of distribution" concept). Added 2026-10-14 (see
 * backend-frontend-wiring-audit.md's dead-schema findings). Deliberately
 * just the code, same as setMySupplierCountryPresence's return shape on
 * the supplier side — resolve the display name via useCountries()/
 * CountryOption, don't duplicate it here. */
export interface OrganizationCountryPresenceSummary {
  countryCode: string;
}

/**
 * The five org-type detail tables wired up 2026-10-14 (see
 * backend-frontend-wiring-audit.md's dead-schema findings) — one per
 * Organization.type. List-shaped fields are exposed as real string[] here
 * (parsed from the JSON-stringified NVarChar(Max) column by
 * OrganizationsService — see that service's doc comment on each getter).
 * Enum fields (logisticsCapability, bodyType, institutionType) match the
 * allowed-values list schema.prisma keeps at its own top-of-file reference
 * comment.
 */
export interface ProcurementAgentProfileSummary {
  organizationId: string;
  fundersProgramsOperatedUnder: string[];
  productCategoriesProcured: string[];
  clientTypesServed: string[];
  accreditations: string[];
  logisticsCapability: "OWN" | "SUBCONTRACTED" | "MIXED" | null;
  yearsOperatingInRole: number | null;
  insuranceCoverSummary: string | null;
  insuranceExpiryDate: string | null;
  trackRecordSummary: string | null;
}

export interface TenderingBodyProfileSummary {
  organizationId: string;
  bodyType: "GOVERNMENT" | "FAITH_BASED_NETWORK" | "NGO_IMPLEMENTING_PARTNER" | "MULTILATERAL" | null;
  fundingSources: string[];
  hasDirectProcurementAuthority: boolean | null;
  usesExternalProcurementAgent: boolean;
  procurementAgentOrganizationId: string | null;
  /** Resolved for display — see TenderingBodyProfile's doc comment on why
   * this relationship is a recorded fact, not an access grant. */
  procurementAgentOrganizationName: string | null;
  diseaseProgramAreas: string[];
  scaleServedSummary: string | null;
}

/** One manufacturing site — a manufacturer can have several, each
 * independently certified (OrganizationManufacturerSite is one-to-many,
 * unlike the other four tables here). Country name isn't resolved here,
 * same convention as OrganizationCountryPresenceSummary — resolve via
 * useCountries()/CountryOption. */
export interface OrganizationManufacturerSiteSummary {
  id: string;
  organizationId: string;
  locationCountryCode: string | null;
  locationDetail: string | null;
  gmpCertified: boolean;
  gmpCertificationDetail: string | null;
  createdAt: string;
}

export type CertificationStatus = "VALID" | "EXPIRING" | "EXPIRED" | "NO_EXPIRY";

export interface OrganizationCertificationSummary {
  id: string;
  organizationId: string;
  type: string;
  title: string | null;
  reference: string | null;
  issuingBody: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
  /** Name of the attached certificate file, if any. */
  documentFileName: string | null;
  /** Derived from expiresOn: EXPIRING = within 90 days. */
  status: CertificationStatus;
  daysToExpiry: number | null;
}

export interface SaveOrganizationCertificationInput {
  type: string;
  title?: string;
  reference?: string;
  issuingBody?: string;
  issuedOn?: string | null;
  expiresOn?: string | null;
  notes?: string;
}

/** Read-only view of an organisation for other parts of Universe. Detail beyond name and type appears only when the organisation has published its profile (or the caller is that organisation or platform staff). */
export interface OrganizationCard {
  id: string;
  name: string;
  type: string;
  /** False when the organisation has not published a profile and the caller is someone else. */
  detailVisible: boolean;
  canEdit: boolean;
  description: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  yearsInOperation: number | null;
  /** Declared scope of supply: ids from SCOPE_TAXONOMY. */
  scope: string[];
  /** No certificate numbers: type, issuer and status only. */
  certifications: { type: string; title: string | null; issuingBody: string | null; expiresOn: string | null; status: CertificationStatus }[];
}

/** One organisation in the network directory (published profiles only). */
export interface NetworkOrganization {
  id: string;
  name: string;
  type: string;
  /** Every role the organisation holds, primary first. */
  types?: string[];
  description: string | null;
  countryCodes: string[];
  scope: string[];
  certificationTypes: string[];
  yearsInOperation: number | null;
}

export interface NetworkFacet { key: string; count: number }

/** The filters of a Find suppliers search, as saved. Lists are arrays of codes/ids. */
export interface NetworkSearchCriteria {
  q?: string; type?: string; scope?: string[]; country?: string[]; certType?: string[];
  certified?: boolean; whoPq?: boolean; localMfr?: boolean; minYears?: number; warehousing?: string;
}
export interface NetworkSavedSearchRecord { id: string; name: string; alertsEnabled: boolean; criteria: NetworkSearchCriteria; createdAt: string }

export interface NetworkSearchResult {
  /** Organisations matching the filters (the page below holds at most 50 of them). */
  total: number;
  /** Headline figures for the dashboard tiles, over the whole matching set. */
  stats: { suppliers: number; countries: number; categories: number; certified: number };
  /** Breakdowns of the matching set, for drilldown. */
  facets: { countries: NetworkFacet[]; scope: NetworkFacet[]; certifications: NetworkFacet[]; types: NetworkFacet[] };
  organizations: NetworkOrganization[];
}

export interface OrganizationScopeSummary {
  organizationId: string;
  /** Declared: ids from SCOPE_TAXONOMY. */
  declared: string[];
  /** Derived, never stored: taxonomy ids seen in this organisation's submitted bids and awards. */
  demonstrated: { scopeSubId: string; bids: number; awards: number }[];
}

export interface ManufacturerProfileSummary {
  organizationId: string;
  productCategoriesManufactured: string[];
  whoPrequalified: boolean;
  sraApprovals: string[];
  /** ISO 3166-1 alpha-2 codes. */
  nationalRegistrations: string[];
  otherCertifications: string[];
  productionCapacitySummary: string | null;
  /** ISO 3166-1 alpha-2 codes. */
  currentExportMarkets: string[];
  isLocalManufacturer: boolean;
}

export interface FunderProfileSummary {
  organizationId: string;
  fundingFocusAreas: string[];
  notes: string | null;
}

export interface DataInsightsUserProfileSummary {
  organizationId: string;
  institutionType: "ACADEMIC" | "NGO_NONPROFIT_RESEARCH" | "MULTILATERAL_MARKET_INTELLIGENCE" | "COMMERCIAL_MARKET_INTELLIGENCE" | "INDIVIDUAL_RESEARCHER" | null;
  affiliatedInstitution: string | null;
  purposeIntendedUse: string | null;
  publicationIntent: string | null;
  fundingSourceOfResearch: string | null;
  dataUseAgreementVersion: string | null;
  dataUseAgreementAcceptedAt: string | null;
}

export interface ProductSourceApprovalSummary {
  id: string;
  productMasterId: string;
  productMasterName: string;
  productCategory: string;
  manufacturerId: string;
  manufacturerName: string;
  /** ISO alpha-2 code (Country.code), or null when the manufacturer hasn't
   * set one — added 2026-10-09, Stage 0 point 2 (country display
   * consistency audit). Resolve via useCountries()/CountryOption for the
   * full name; never render the raw code. */
  manufacturerCountryCode: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierCountryCode: string | null;
  status: string; // PENDING | APPROVED | REJECTED
  approvedAt: string | null;
  nextReviewDue: string | null;
  notes: string | null;
  /** Live cross-reference — the manufacturer/supplier's CURRENT
   * Partner.approvalStatus, re-checked on every read rather than cached on
   * this row, so a partner losing approval after this record was approved
   * shows up immediately as a warning rather than silently going stale. */
  manufacturerApprovalStatus: string;
  supplierApprovalStatus: string | null;
  /** True if the manufacturer or (when set) the supplier has any
   * PartnerCertification with an expiryDate in the past. */
  hasExpiredCertification: boolean;
  /** True if nextReviewDue is set and in the past. */
  isReviewOverdue: boolean;
  /** True only when status === "APPROVED" AND the manufacturer (and
   * supplier, if set) are both currently Partner.approvalStatus ===
   * "APPROVED" AND there's no expired certification AND the review isn't
   * overdue. This is the one field the QA dashboard's "qualified products"
   * count is built from. */
  isQualified: boolean;
  createdAt: string;
}

export interface CreateProductSourceApprovalInput {
  productMasterId: string;
  manufacturerId: string;
  supplierId?: string;
  status?: string;
  nextReviewDue?: string;
  notes?: string;
}

export interface UpdateProductSourceApprovalInput {
  status?: string;
  nextReviewDue?: string | null;
  notes?: string | null;
}

export interface QualityDashboardSummary {
  totalProducts: number;
  qualifiedCount: number;
  /** Approved at the sourcing-decision level but currently failing the
   * live cross-reference (expired cert, partner no longer approved, or an
   * overdue review) — the "subtle warning" case Lewis asked for. */
  warningCount: number;
  pendingCount: number;
  rejectedCount: number;
  /** Up to 10 approvals needing attention (warnings first, then overdue
   * reviews), for a dashboard "needs attention" panel. */
  needsAttention: ProductSourceApprovalSummary[];
}

export interface PartnerPerformanceMetric {
  partnerId: string;
  partnerName: string;
  roleType: string; // MANUFACTURER | SUPPLIER | FREIGHT_FORWARDER
  totalLines: number;
  onTimeCount: number;
  /** null when totalLines with a recorded on-time flag is 0 (nothing to
   * compute a percentage from yet), not 0 — avoids implying a 0% score for
   * a partner simply not used yet. */
  onTimePercent: number | null;
  inFullCount: number;
  inFullPercent: number | null;
  otifPercent: number | null;
  /** Count of SupplierEnquiry rows against this partner with
   * responseStatus DECLINED or NO_RESPONSE — only meaningful for
   * roleType === "SUPPLIER" (enquiries are supplier-only in the schema);
   * 0 for other role types. */
  issueCount: number;
  /** Average days late across lines with both promisedDeliveryDate and
   * actualDeliveryDate set, floored at 0 (an early delivery counts as 0
   * days late, not negative). null when no line has both dates. */
  avgDaysLate: number | null;
  /** Quality complaints about this stakeholder (any direction, withdrawn excluded) and how many were upheld or partly upheld. */
  complaintsTotal: number;
  complaintsUpheld: number;
}

// ---------------------------------------------------------------------------
// Stakeholder registry (added 2026-10-02) — cross-tenant duplicate-
// prevention + identity-consent gating. See StakeholderRegistryEntry's doc
// comment in schema.prisma and claude/sop-driven-quality-roadmap.md
// Section B3/C for the full design.
// ---------------------------------------------------------------------------

/** One search/match result — GET /stakeholder-registry/search. Identity
 * (linkedOrganizationName) is only ever populated when
 * isLinkedToPublishedOrganization is true; otherwise the match is "known to
 * Universe" but deliberately anonymous, per the consent-gating design. */
export interface StakeholderRegistryMatch {
  id: string;
  legalName: string;
  countryCode: string | null;
  website: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  stakeholderTypes: string[];
  isKnownToUniverse: boolean;
  linkedOrganizationName: string | null;
  isLinkedToPublishedOrganization: boolean;
}

/** The duplicate-prevention lightbox's full detail view — GET
 * /stakeholder-registry/:id. manufacturerProfile/countryPresence are only
 * populated when isLinkedToPublishedOrganization is true (the linked
 * company's own self-published data, never another tenant's private
 * assessment of them). */
export interface StakeholderRegistryDetail extends StakeholderRegistryMatch {
  manufacturerProfile: {
    whoPrequalified: boolean;
    sraApprovals: string | null;
    nationalRegistrations: string | null;
    otherCertifications: string | null;
    isLocalManufacturer: boolean;
  } | null;
  countryPresence: string[];
}

/** "Products belonging to that manufacturer" — GET
 * /stakeholder-registry/:id/products. Only ever populated when the entry's
 * identity is public (see StakeholderRegistryService.isIdentityPublic) —
 * the linked organisation's own published SupplierProduct catalogue.
 * Deliberately carries no pricing field; SupplierProduct never has one. */
export interface StakeholderRegistryProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  specifications: string | null;
  gtin: string | null;
}

/** Gap 4 (compliance-standards-gap-analysis.md) — a minimal, generic risk
 * register entry (ICH Q9/ISO 14971/ISO 31000's shared shape: identify,
 * assess, mitigate, assign an owner, review periodically). subjectType/
 * subjectId is a free-text polymorphic reference (e.g. "PARTNER" + a
 * Partner id, "PROJECT" + a Project id) rather than a nullable FK per
 * possible subject — see RiskAssessment's doc comment in schema.prisma. */
export interface RiskAssessmentSummary {
  id: string;
  subjectType: string;
  subjectId: string;
  title: string;
  description: string | null;
  severity: string;
  likelihood: string;
  mitigation: string | null;
  ownerId: string | null;
  ownerName: string | null;
  status: string;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRiskAssessmentInput {
  subjectType: string;
  subjectId: string;
  title: string;
  description?: string | null;
  severity: string;
  likelihood: string;
  mitigation?: string | null;
  ownerId?: string | null;
  reviewDate?: string | null;
}

export interface UpdateRiskAssessmentInput {
  title?: string;
  description?: string | null;
  severity?: string;
  likelihood?: string;
  mitigation?: string | null;
  ownerId?: string | null;
  status?: string;
  reviewDate?: string | null;
}

/** PATCH /risk-assessments/:id/close body — a dedicated "Close" action,
 * distinct from the generic update() above, because closing a risk is a
 * deliberate decision that always needs a stated reason (the risk was
 * resolved, accepted as a residual, found not to apply, etc.) — the
 * generic status field alone (via UpdateRiskAssessmentInput) doesn't
 * capture WHY. `reason` is carried onto the FieldChangeLog row for this
 * change (see RecordFieldChangesOptions.reason), not stored on the
 * RiskAssessment itself. Added 2026-10-08. */
export interface CloseRiskAssessmentInput {
  reason: string;
}

/** Gap 4 follow-up — a cross-cutting, org-wide view of the risk register
 * (GET /risk-assessments/all), as opposed to RiskAssessmentSummary's
 * per-subject list. Adds the subject's own display name (Partner.name,
 * or Project's "REF — Title", or ProductBatch.batchNumber, resolved
 * server-side) so a single table can read "Risk: Cold chain failure —
 * Partner: Rhein Pharma" without a second round-trip per row. */
export interface RiskAssessmentListItem extends RiskAssessmentSummary {
  subjectName: string;
}

/** Risk register tile counts, computed in the database. */
export interface RiskRegisterCounts {
  total: number;
  open: number;
  highOrCritical: number;
  overdue: number;
}

/** Gap 1 (compliance-standards-gap-analysis.md) — one row of the generic
 * audit trail, as read back for an "Audit history" view on a record. See
 * FieldChangeLog's doc comment in schema.prisma. */
export interface FieldChangeLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedById: string | null;
  changedByName: string | null;
  changedAt: string;
  reason: string | null;
  source: string;
  certificationStatement: string | null;
}

/** One row of the Admin app's global activity feed (GET /audit-log/feed). */
export interface FieldChangeFeedEntry extends FieldChangeLogEntry {
  organizationId: string;
  organizationName: string | null;
  /** Human label for the changed record (user name, org name, role name,
   * partner name, project reference), or "<table> <short id>". */
  recordLabel: string;
}

export interface FieldChangeFeedPage {
  entries: FieldChangeFeedEntry[];
  /** Pass as `before` to fetch the next (older) page; null when exhausted. */
  nextBefore: string | null;
}

/** Gap 3 (compliance-standards-gap-analysis.md's GDP compliance assessment
 * addendum) — one row of an organisation's own Standards & Evidence
 * catalog. appliesToStakeholderTypes is a real string[] at this boundary
 * (PartnerRoleType values) — the API encodes/decodes the comma-joined
 * storage form, callers never see it. */
export interface EvidenceStandardSummary {
  id: string;
  name: string;
  description: string | null;
  category: string;
  appliesToStakeholderTypes: string[];
  evidenceType: string;
  isMandatory: boolean;
  requiresExpiry: boolean;
  reVerificationFrequencyMonths: number | null;
  active: boolean;
  sortOrder: number;
}

/** One piece of evidence logged against a standard, for one partner. */
export interface StakeholderEvidenceRecordSummary {
  id: string;
  partnerId: string;
  standardId: string;
  standardName?: string;
  referenceNumber: string | null;
  issuingBody: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  result: string | null;
  documentId: string | null;
  status: string;
  verifiedById: string | null;
  verifiedAt: string | null;
  notes: string | null;
}

/** Gaps 5/6 — a first-class, searchable batch record. See ProductBatch's
 * doc comment in schema.prisma. */
export interface ProductBatchSummary {
  id: string;
  productMasterId: string | null;
  manufacturerId: string | null;
  manufacturerName?: string;
  batchNumber: string;
  manufacturedDate: string | null;
  expiryDate: string | null;
  storageConditions: string | null;
  qualificationPathway: string | null;
  qualificationPathwayExpiryDate: string | null;
  maPl: string | null;
  status: string;
  notes: string | null;
}

/** One cold-chain data-logger reading/excursion event against a batch. */
export interface BatchTemperatureLogSummary {
  id: string;
  productBatchId: string;
  projectLineId: string | null;
  loggerReference: string | null;
  readingSummary: string | null;
  hasExcursion: boolean;
  excursionNotes: string | null;
  reviewed: boolean;
  reviewedById: string | null;
  reviewedAt: string | null;
  recordedAt: string;
}

// --- Evidence & batch traceability inputs (GDP gap-closing frontend,
// 2026-10-08) — mirrors apps/api/src/evidence and apps/api/src/batches'
// DTOs. See EvidenceStandardSummary/StakeholderEvidenceRecordSummary/
// ProductBatchSummary/BatchTemperatureLogSummary above for the matching
// read shapes. ---

export interface CreateEvidenceStandardInput {
  name: string;
  description?: string;
  category: string;
  appliesToStakeholderTypes: string[];
  evidenceType: string;
  isMandatory?: boolean;
  requiresExpiry?: boolean;
  reVerificationFrequencyMonths?: number;
  sortOrder?: number;
}

export interface UpdateEvidenceStandardInput {
  name?: string;
  description?: string;
  category?: string;
  appliesToStakeholderTypes?: string[];
  evidenceType?: string;
  isMandatory?: boolean;
  requiresExpiry?: boolean;
  reVerificationFrequencyMonths?: number;
  active?: boolean;
  sortOrder?: number;
}

export interface CreateEvidenceRecordInput {
  partnerId: string;
  standardId: string;
  referenceNumber?: string;
  issuingBody?: string;
  issuedDate?: string;
  expiryDate?: string;
  result?: string;
  documentId?: string;
  notes?: string;
  /** Added 2026-10-08 — only takes effect for the identity-allowlisted
   * self-service-verify user (see SELF_SERVICE_VERIFY_EMAILS in
   * EvidenceService); ignored for everyone else. The frontend only ever
   * shows the control that sets this to the one account it's for. */
  verifyImmediately?: boolean;
}

export interface UpdateEvidenceRecordInput {
  referenceNumber?: string;
  issuingBody?: string;
  issuedDate?: string;
  expiryDate?: string;
  result?: string;
  documentId?: string;
  notes?: string;
}

export interface VerifyEvidenceRecordInput {
  approve: boolean;
  notes?: string;
}

export interface CreateProductBatchInput {
  batchNumber: string;
  productMasterId?: string;
  manufacturerId?: string;
  manufacturedDate?: string;
  expiryDate?: string;
  storageConditions?: string;
  qualificationPathway?: string;
  qualificationPathwayExpiryDate?: string;
  maPl?: string;
  notes?: string;
}

export interface UpdateProductBatchInput {
  productMasterId?: string | null;
  manufacturerId?: string | null;
  manufacturedDate?: string | null;
  expiryDate?: string | null;
  storageConditions?: string | null;
  qualificationPathway?: string | null;
  qualificationPathwayExpiryDate?: string | null;
  maPl?: string | null;
  status?: string;
  notes?: string | null;
}

export interface SearchProductBatchesInput {
  batchNumber?: string;
  productMasterId?: string;
  manufacturerId?: string;
  status?: string;
}

export interface CreateTemperatureLogInput {
  projectLineId?: string;
  loggerReference?: string;
  readingSummary?: string;
  hasExcursion?: boolean;
  excursionNotes?: string;
  recordedAt?: string;
}

export interface ReviewTemperatureLogInput {
  excursionNotes?: string;
}

/** Richer read shape for GET /batches/:id — one batch plus its product/
 * manufacturer names, its full temperature-log history, and every project
 * line it has ever been placed on (the "every place batch X went" view —
 * see ProductBatchesService.getDetail's doc comment in apps/api). */
export interface ProductBatchDetail extends ProductBatchSummary {
  productMasterName: string | null;
  temperatureLogs: BatchTemperatureLogSummary[];
  projectLines: {
    id: string;
    projectId: string;
    projectReferenceNumber: string;
    clientName: string | null;
  }[];
}

// --- Follow-up frontend pass (added 2026-10-07/08) — closes the
// remaining UI-less items from compliance-standards-gap-analysis.md's
// "What still needs doing" list: Gap 1's audit-log viewer, Gap 2's
// certification-statement display, Gap 3's re-verification dashboard,
// Gap 4's risk-register screen, and Gap 7's controlled-document module. ---

/** Gap 2 — the versioned "e-signature meaning" statement text itself,
 * moved here (single source of truth) so the frontend can display the
 * exact wording next to an approval/verification control instead of just
 * capturing it blind on the backend. apps/api/src/common/certification-
 * statements.ts re-exports this rather than duplicating it. Append-only
 * by convention — see that file's original doc comment, preserved here. */
export const CERTIFICATION_STATEMENTS = {
  PARTNER_APPROVAL_V1:
    "By approving this stakeholder, I certify that I have reviewed the evidence on file, that it meets this organisation's qualification requirements, and that I am an authorised approver acting on this organisation's behalf.",
  EVIDENCE_VERIFICATION_V1:
    "By marking this evidence as verified, I certify that I have examined the supporting document/record myself and confirm it is genuine, current, and satisfies the standard it is being logged against.",
} as const;

export type CertificationStatementKey = keyof typeof CERTIFICATION_STATEMENTS;

/** Gap 3 — one row of the re-verification-due dashboard (GET
 * /evidence-records/due-for-review), replacing the raw Prisma rows the
 * endpoint returned before this pass (a latent instance of the same
 * mapped-type-vs-raw-row mismatch fixed elsewhere in evidence.service.ts
 * — see EvidenceService.listDueForReVerification). dueDate is computed
 * server-side from verifiedAt + the standard's reVerificationFrequencyMonths
 * so the frontend never has to re-derive it. */
export interface EvidenceDueForReviewSummary {
  id: string;
  partnerId: string;
  partnerName: string;
  standardId: string;
  standardName: string;
  verifiedAt: string;
  dueDate: string;
  isOverdue: boolean;
}

/** Gap 7 (compliance-standards-gap-analysis.md) — a minimal controlled-
 * document register for an organisation's own SOPs/policies: version
 * numbers, an effective date, who approved the current version, and a
 * clear current-vs-superseded chain. Deliberately NOT a general document-
 * management system — no workflow beyond "create the next version,"
 * matching this whole round's "core scaffolding, not a full process
 * suite" principle. */
export interface ControlledDocumentSummary {
  id: string;
  title: string;
  category: string;
  version: string;
  effectiveDate: string | null;
  supersedesId: string | null;
  supersededById: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  documentId: string | null;
  isCurrent: boolean;
  createdAt: string;
}

export interface CreateControlledDocumentInput {
  title: string;
  category: string;
  version: string;
  effectiveDate?: string | null;
  supersedesId?: string | null;
  documentId?: string | null;
}

export interface UpdateControlledDocumentInput {
  title?: string;
  effectiveDate?: string | null;
  approvedById?: string | null;
  documentId?: string | null;
}

// ---------------------------------------------------------------------------
// QA Queue (added 2026-10-08) — Lewis's QA/procurement segregation-of-duties
// request: everything currently waiting on a Quality Assurance / Responsible
// Person review, in one place, categorised by what kind of thing it is
// (stakeholder role type, or product), with a flat concatenated view too.
// Three underlying sources are normalized into one QaQueueItem shape so the
// frontend can render them uniformly: a Partner awaiting approval, a
// StakeholderEvidenceRecord awaiting verification, and a
// ProductSourceApproval awaiting sourcing sign-off.

export type QaQueueItemKind = "PARTNER_APPROVAL" | "EVIDENCE_VERIFICATION" | "PRODUCT_APPROVAL" | "PRODUCT_AMENDMENT";

export interface QaQueueItem {
  kind: QaQueueItemKind;
  /** The record this item is actually about — the evidence record's own
   * id for EVIDENCE_VERIFICATION, the partner's id for PARTNER_APPROVAL,
   * the product-source-approval's id for PRODUCT_APPROVAL. */
  id: string;
  title: string;
  /** Short line of extra context (e.g. the evidence standard's name, or
   * "Manufacturer · Supplier" for a product source). */
  detail: string;
  /** Every stakeholder-role-type / "PRODUCT" category this item belongs
   * to — a multi-role Partner's approval appears once per applicable role
   * in the categorised view, but once in the flat `all` list. */
  categories: string[];
  queuedAt: string;
  ageDays: number;
  /** Deep links to everything relevant this item touches, so QA doesn't
   * have to go hunting — partner/product detail pages, and (where this
   * item's partner/product is itself referenced by other records) a
   * short list of related entities. Paths are relative, app-root-based
   * (e.g. "/partners/detail?id=..."). */
  links: { label: string; path: string }[];
}

export interface QaQueueCategory {
  key: string;
  label: string;
  /** Items in this category — present on the legacy summary only. */
  items?: QaQueueItem[];
  /** Pending count in this category — present on the paged queue (database count). */
  count?: number;
}

/** One page of the QA queue (oldest first) plus database-computed totals (2026-10-17, scale work). */
export interface QaQueuePage {
  total: number;
  oldestAgeDays: number;
  categories: QaQueueCategory[];
  items: QaQueueItem[];
  /** Total for the selected category (or all, when none selected). */
  filteredTotal: number;
  page: number;
  pageSize: number;
}

export interface QaQueueSummary {
  categories: QaQueueCategory[];
  all: QaQueueItem[];
}


// ---------------------------------------------------------------------------
// Supply-chain CO2 / distance / efficiency — frontend-facing types for both
// the org-private line list and the global anonymized dashboard (added
// 2026-10-08). See LogisticsMetricSummary above for the per-line shape.
// ---------------------------------------------------------------------------

/** One page of the org-private logistics lines plus totals over the whole filtered set (database-computed). */
export interface LogisticsLinesPage extends PagedResult<OrgLogisticsLineSummary> {
  totals: { count: number; totalCo2Kg: number; totalDistanceKm: number; avgScore: number };
}

/** One row in the org-private "Logistics & CO2" view — a line's computed
 * metric plus just enough project/line context to be useful in a list
 * (reference number, title, product description, manufacturer/supplier
 * names). Org-scoped like everything else under /logistics-insights/lines
 * — this is NOT the anonymized global data. */
export interface OrgLogisticsLineSummary {
  projectLineId: string;
  projectId: string;
  projectReferenceNumber: string;
  projectTitle: string;
  clientProductDescription: string | null;
  manufacturerName: string | null;
  supplierName: string | null;
  metric: LogisticsMetricSummary;
}

/** Filters accepted by GET /logistics-insights/lines (org-private) and
 * GET /logistics-insights/global/routes (anonymized, cross-tenant). The
 * same shape serves both — "full filtering and search of all metrics...
 * commodity groupings, countries, transport modes, incoterms, and all
 * other deep filtering with duration" per Lewis's request. */
export interface LogisticsFilters {
  manufactureCountryCode?: string;
  destinationCountryCode?: string;
  transportMode?: string;
  incoterm?: string;
  commodityGroup?: string;
  scoreBand?: string;
  minDurationDays?: number;
  maxDurationDays?: number;
  search?: string;
}

/** One row of the global, anonymized, cross-tenant "most common" /
 * "most CO2-efficient" route breakdown — see getAggregatedLogisticsRoutes
 * in @universe/insights-db for the full methodology. sourceCount is the
 * number of distinct contributing organizations (never which ones); a
 * route combination with fewer than MINIMUM_COHORT_SIZE contributors is
 * never returned at all. */
export interface LogisticsRouteSummary {
  manufactureCountryCode: string | null;
  destinationCountryCode: string | null;
  transportMode: string | null;
  incoterm: string | null;
  commodityGroup: string | null;
  sourceCount: number;
  shipmentCount: number;
  avgDistanceKm: number;
  avgCo2TotalKg: number;
  avgDurationDays: number | null;
  avgEfficiencyScore: number;
}

/** One row of the anonymized, cross-tenant "products by category and
 * country of manufacture" breakdown — Stage 3c of
 * product-database-and-map-roadmap.md, same cohort-floor convention as
 * LogisticsRouteSummary above (see getAggregatedProductSourcing in
 * @universe/insights-db). category is always the TOP-LEVEL group (e.g.
 * "Pharmaceuticals"), never the full "Group.Subgroup" path — matches the
 * Product Database dashboard's own byCategory breakdown and the Stage 2
 * design decision recorded in the roadmap doc. sourceCount is the number
 * of distinct contributing organizations (never which ones); a
 * category/country combination with fewer than MINIMUM_COHORT_SIZE
 * contributors is never returned at all. */
export interface ProductSourcingSummary {
  category: string;
  manufactureCountryCode: string | null;
  sourceCount: number;
  approvalCount: number;
}

/** One bucket of the global stakeholder-rating distribution — Lewis's "25
 * projects 6/10, 50 8/10, 10 manufacturers are 4/10..." request. Counts
 * only, never a named entity; a bucket below MINIMUM_COHORT_SIZE entities
 * is never returned. */
export interface StakeholderRatingSummary {
  entityType: "PROJECT" | "MANUFACTURER" | "SUPPLIER" | "PROCURING_ORGANIZATION";
  /** Mean of the entities' own average scores (1-10), one decimal place. */
  averageScore: number;
  scoreBand: string;
  /** Entities rated; a category below the minimum cohort size is not returned at all. */
  entityCount: number;
}

/** Who to contact for help inside an organisation: the primary contact if one
 * is set, otherwise the organisation's active administrators. */
export interface SupportContact {
  name: string;
  role: string;
  email: string;
}

// --- Notifications & actions (added 2026-10-16) ---------------------------

export type NotificationKind =
  | "PROJECT_ASSIGNED"
  | "PROJECT_STATUS_CHANGED"
  | "ACTION_ASSIGNED"
  | "ACTION_COMPLETED"
  | "RISK_ASSIGNED"
  | "RISK_CLOSED"
  | "TEMPERATURE_EXCURSION"
  | "BATCH_STATUS_CHANGED"
  | "AMENDMENT_REVIEW"
  | "AMENDMENT_DECISION"
  | "STAKEHOLDER_APPROVAL";
export type NotificationCategory = "PROJECT" | "QUALITY" | "LOGISTICS" | "RISK" | "SYSTEM" | "TENDER";

/** One notification or action addressed to the signed-in user. */
export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  title: string;
  body: string | null;
  /** In-app path, e.g. "/projects/detail?id=…". */
  link: string | null;
  actorName: string | null;
  requiresAction: boolean;
  /** Only set when requiresAction. */
  actionStatus: "OPEN" | "DONE" | null;
  dueDate: string | null;
  read: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface NotificationSummary {
  unread: number;
  openActions: number;
  overdueActions: number;
  /** The few most pressing open actions (overdue first, then soonest due). */
  nextActions: NotificationItem[];
}

export interface AssignProjectActionInput {
  assigneeUserId: string;
  title: string;
  note?: string;
  /** ISO date (yyyy-mm-dd). */
  dueDate?: string;
}

// --- Global search (added 2026-10-17) -------------------------------------

export type SearchResultType = "project" | "stakeholder" | "contact" | "batch" | "risk" | "product";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  /** In-app path within `app`. */
  link: string;
  /** Which app the path belongs to. */
  app: "project-management" | "product-database";
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}


/** Controlled product documents (Product Database step 3, 2026-10-18). Private to the caller's organisation. */
export interface ProductDocumentSummary {
  id: string;
  productMasterId: string | null;
  productFamilyId: string | null;
  /** True when shown on a variant but held by its family. */
  inherited: boolean;
  registrationId: string | null;
  docType: string;
  title: string;
  version: string;
  /** DRAFT | APPROVED | SUPERSEDED */
  status: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  reviewDueDate: string | null;
  /** True when an APPROVED document is past its expiry date. */
  isExpired: boolean;
  daysToExpiry: number | null;
  supersedesId: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  hasFile: boolean;
  /** NOT_SCANNED | CLEAN | INFECTED */
  scanStatus: string;
  notes: string | null;
  uploadedByName: string;
  uploadedAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
  archived: boolean;
}

export interface RequestProductDocumentUploadInput {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface CreateProductDocumentInput {
  docType: string;
  title: string;
  version?: string;
  registrationId?: string;
  effectiveDate?: string;
  expiryDate?: string;
  reviewDueDate?: string;
  supersedesId?: string;
  notes?: string;
  /** From the upload-url step; omitted for a record with no file. */
  blobName?: string;
  fileName?: string;
}


/** One of the caller's organisation's source approvals for a product (product + manufacturer + optional supplier). */
export interface ProductApprovedSource {
  approvalId: string;
  status: string;
  manufacturerId: string;
  manufacturerName: string | null;
  supplierId: string | null;
  supplierName: string | null;
}

/** GET /product-catalog/search-scoped — a catalogue match tagged with this organisation's own approval status. */
export interface ProductSearchResult extends ProductCatalogMatch {
  /** APPROVED | IN_REVIEW | REJECTED | null (no approval record for this organisation). Most favourable status wins. */
  orgApproval: "APPROVED" | "IN_REVIEW" | "REJECTED" | null;
  approvedSources: ProductApprovedSource[];
}

export type ProductSearchScope = "ALL" | "APPROVED" | "CATALOGUE";

/** Product families (step 3b, 2026-10-18): the generic product above its variants. */
export interface ProductFamilySummary {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  inn: string | null;
  regulatoryClass: string | null;
  variantCount: number;
  isArchived: boolean;
}

export interface ProductFamilyVariant {
  id: string;
  name: string;
  variantLabel: string | null;
  strength: string | null;
  packSize: string | null;
  dosageForm: string | null;
  gtin: string | null;
  lifecycleStatus: string;
  isArchived: boolean;
}

export interface ProductFamilyDetail extends ProductFamilySummary {
  intendedUse: string | null;
  description: string | null;
  addedByOrganizationName: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: ProductFamilyVariant[];
  compliance: ProductComplianceStatus;
}

export interface ProductFamilyListResult {
  items: ProductFamilySummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateProductFamilyInput {
  name: string;
  category: string;
  brand?: string;
  inn?: string;
  regulatoryClass?: string;
  intendedUse?: string;
  description?: string;
}

export type UpdateProductFamilyInput = Partial<CreateProductFamilyInput> & { isArchived?: boolean };

/** Product Database exports (step 5, 2026-10-18). */
/** Record types an organisation can always export for itself (its own additions only). */
export const ORGANISATION_EXPORT_ENTITIES = ["partners", "projects", "project-lines", "contacts", "batches", "logistics", "certifications", "evidence", "risks"] as const;
export type OrganisationExportEntity = (typeof ORGANISATION_EXPORT_ENTITIES)[number];

export interface ProductExportFile {
  filename: string;
  /** UTF-8 CSV with a byte-order mark so spreadsheets open it correctly. */
  csv: string;
  rowCount: number;
  /** True when the row ceiling was hit and the file is incomplete. */
  truncated: boolean;
}

/** One product's whole record, as seen by the calling organisation. */
export interface ProductDossier {
  generatedAt: string;
  generatedFor: string;
  product: ProductCatalogDetail;
  registrations: ProductRegistrationSummary[];
  /** Metadata only; files are downloaded separately through the document controls. */
  documents: ProductDocumentSummary[];
  safetyNotices: ProductSafetyNoticeSummary[];
  exportRestrictions: ProductExportRestrictionMatch[];
  history: ProductChangeEntry[];
}

/** A request to export the shared catalogue; decided by a global admin (2026-10-18). */
export interface DataExportRequestSummary {
  id: string;
  /** CATALOGUE | REGISTRATIONS */
  scope: string;
  filters: Record<string, string | boolean | null>;
  reason: string;
  /** PENDING | APPROVED | REJECTED | DOWNLOADED | EXPIRED (an approval past its time reads EXPIRED) */
  status: string;
  organizationName: string;
  requestedByName: string;
  requestedById: string;
  createdAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  approvedUntil: string | null;
  downloadedAt: string | null;
  rowCount: number | null;
  /** True for the requester while an approval is unused and unexpired. */
  canDownload: boolean;
}

export interface CreateDataExportRequestInput {
  scope: "CATALOGUE" | "REGISTRATIONS";
  reason: string;
  filters?: { q?: string; category?: string; sourceStandard?: string; status?: string; includeArchived?: boolean };
}

export interface DecideDataExportRequestInput {
  approve: boolean;
  note?: string;
}

/** What the signed-in user may export directly. */
export interface ExportCapabilities {
  /** True for global admins: the catalogue and registrations exports cover everything. */
  wholeCatalogue: boolean;
}


// ---------------------------------------------------------------------------
// Tender Issuance & Management (2026-10-19)
// ---------------------------------------------------------------------------
export type TenderStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "EVALUATING" | "AWARDED" | "CONTRACTED" | "CANCELLED";
export type TenderType = "RFQ" | "RFP" | "ITT" | "OPEN_TENDER" | "FRAMEWORK";
export type TenderVisibility = "ELIGIBLE_ORGANISATIONS" | "ALL_REGISTERED" | "INVITED_ONLY";
export type TenderRuleType = "ORG_TYPE" | "COUNTRY" | "CATEGORY" | "QUALIFICATION" | "EXCLUDED_ORG" | "MIN_SUPPLIER_RATING";

export interface TenderRecord {
  id: string; organizationId: string; referenceNumber: string; title: string; summary: string | null; tenderType: TenderType; visibility: TenderVisibility;
  isPublished: boolean; status: TenderStatus; effectiveStatus?: TenderStatus; deliveryCountryCodes: string | null; currency: string | null; incoterm: string | null; clientName: string | null;
  publishedAt: string | null; clarificationDeadline: string | null; closingAt: string | null; evaluationDueAt: string | null; awardDueAt: string | null;
  bidValidityDays: number | null; contractStartDate: string | null; acceptedFileTypes: string | null; maxFileSizeMb: number | null; allowTextSubmission: boolean;
  termsAndConditions: string | null; cancelledReason: string | null; isSimulated: boolean; createdAt: string; updatedAt: string;
  timeZone: string | null; standstillEnabled: boolean; standstillWorkingDays: number | null; publicNotice: boolean;
  requireIntegrityPledge: boolean; requireExclusionDeclaration: boolean; allowTemplateSubmission: boolean;
  emergencyProcurement: boolean; emergencyReason: string | null; allowSingleEvaluator: boolean; singleEvaluatorReason: string | null;
  bidsOpenedAt: string | null; evaluationStartedAt: string | null; scoringFinalisedAt: string | null; awardedAt: string | null; standstillEndsAt: string | null;
  frameworkTermMonths: number | null; frameworkCeiling: number | string | null; frameworkCallOffMethod: "DIRECT" | "ROTATION" | null; frameworkPriceHoldDays: number | null;
}
export interface TenderListItem extends TenderRecord { interestedOrganisations: number; /** Submitted bids: a count only, bids stay sealed until close. */ bidsReceived?: number }
export interface TenderLineRecord {
  id?: string; lineNumber?: number; lotNumber: number | null; lotTitle: string | null; description: string; productMasterId: string | null; specification: string | null;
  quantity: string | number | null; unit: string | null; destinationCountryCode: string | null; requiredRegistration: string | null; minShelfLifePercent: number | null; coldChainRequired: boolean;
}
export interface TenderCriterionRecord { id?: string; title: string; description: string | null; kind: "GATE" | "SCORED"; weight: string | number | null; isMandatory: boolean; responseFormat: "UPLOAD" | "TEXT" | "EITHER"; metric?: "MANUAL" | "PRICE" | "LEAD_TIME" | "PAST_PERFORMANCE"; acceptedFileTypes: string | null }
export interface TenderRuleRecord { id?: string; ruleType: TenderRuleType; ruleValue: string; explanation: string | null; isRequired: boolean }
export interface TenderEventRecord { id: string; kind: string; summary: string; actorOrganizationId: string; createdAt: string }
/** Tender contracts (step 5, 2026-10-21). */
export type ContractStatus = "DRAFT" | "AWAITING_SIGNATURE" | "ACTIVE" | "COMPLETED" | "TERMINATED";
export const CONTRACT_STATUS_LABELS: Record<string, string> = { DRAFT: "Draft", AWAITING_SIGNATURE: "Awaiting signature", ACTIVE: "Active", COMPLETED: "Completed", TERMINATED: "Terminated" };
export const CONTRACT_FILE_KIND_LABELS: Record<string, string> = { DRAFT: "Draft contract", SIGNED: "Signed copy", CERTIFICATE: "Signing certificate or audit trail", VARIATION: "Variation", OTHER: "Other" };
export const EVIDENCE_KINDS = ["DELIVERY_NOTE", "PROOF_OF_DELIVERY", "INSPECTION_REPORT", "CERTIFICATE_OF_ANALYSIS", "QUALITY_RECORD", "INVOICE", "PAYMENT_CONFIRMATION", "CORRESPONDENCE", "PHOTO", "OTHER"] as const;
export const EVIDENCE_KIND_LABELS: Record<string, string> = { DELIVERY_NOTE: "Delivery note", PROOF_OF_DELIVERY: "Proof of delivery", INSPECTION_REPORT: "Inspection report", CERTIFICATE_OF_ANALYSIS: "Certificate of analysis", QUALITY_RECORD: "Quality record", INVOICE: "Invoice", PAYMENT_CONFIRMATION: "Payment confirmation", CORRESPONDENCE: "Correspondence", PHOTO: "Photograph", OTHER: "Other" };
/** Evidence logged on a contract: typed, dated, linked, fingerprinted, append-only (it can be withdrawn with a reason, never edited). */
export interface EvidenceView {
  id: string; contractId: string; kind: string; title: string; description: string | null; reference: string | null; evidenceDate: string; linkType: "MILESTONE" | "PAYMENT" | "VARIATION" | "CALL_OFF" | null; linkId: string | null; linkLabel: string | null;
  fileName: string | null; fileSizeBytes: number | null; sha256: string | null; recordedBy: string | null; recordedByYou: boolean; recordedAt: string;
  acknowledgedBy: string | null; acknowledgedAt: string | null; canAcknowledge: boolean; withdrawnAt: string | null; withdrawnReason: string | null; canWithdraw: boolean;
}
/** One row of the contract list (owner or supplier side). The tiles on the list page filter these rows. */
export interface ContractListItem {
  id: string; tenderId: string; tenderReference: string; tenderTitle: string; isFramework: boolean; reference: string; title: string; status: ContractStatus; role: "OWNER" | "SUPPLIER"; counterparty: string | null;
  currency: string | null; totalValue: number | null; startDate: string | null; endDate: string | null; executedAt: string | null; closedAt: string | null; daysToEnd: number | null;
  milestonesTotal: number; milestonesDone: number; overdueMilestones: number; overduePayments: number; unpaidPayments: number; variationsWaiting: number; variationsWaitingOnYou: number; openCallOffs: number;
  endingSoon: boolean; expired: boolean; awaitingSignature: boolean;
}
/** A formal change to a signed contract; applies only once the other party accepts (step 7 part 3). */
export interface ContractVariationView {
  id: string; contractId: string; number: number; title: string; reason: string; status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"; proposedBy: string | null; byYou: boolean;
  newTotalValue: number | null; previousTotalValue: number | null; newEndDate: string | null; previousEndDate: string | null; termsAmendment: string | null;
  createdAt: string; respondedAt: string | null; responseNote: string | null; appliedAt: string | null; canRespond: boolean; canWithdraw: boolean;
}
export interface TenderContractView {
  id: string; awardId: string; reference: string; title: string; status: ContractStatus; currency: string | null; totalValue: number | null;
  startDate: string | null; endDate: string | null; terms: string | null; sentAt: string | null; executedAt: string | null; closedAt: string | null; closeNote: string | null;
  supplierProjectId: string | null; issuerName: string | null; supplierName: string | null; createdAt: string;
  milestones: { id: string; title: string; dueDate: string | null; status: string; completedAt: string | null; notes: string | null }[];
  files: { id: string; kind: string; version: number; title: string; fileName: string; fileSizeBytes: number | null; uploadedBy: string | null; uploadedAt: string; note: string | null }[];
  signatories: { id: string; party: "ISSUER" | "SUPPLIER"; signerName: string; signerRole: string | null; signedOn: string; own: boolean }[];
  signature: { status: "NOT_STARTED" | "AWAITING" | "PARTLY_SIGNED" | "EXECUTED"; missing: string[] };
  variations: ContractVariationView[];
  evidence: EvidenceView[];
  performance: PerformanceRecordView | null;
  payments: ContractPaymentView[];
}
/** Step 6 (2026-10-21): the frozen performance record for a closed contract, and the manual payment log. */
export interface OwnerFeedback { quality: number; communication: number; documentation: number; flexibility: number; wouldUseAgain: number; reasons: Record<string, string>; comment: string | null }
export const FEEDBACK_LABELS: Record<string, string> = { quality: "Quality of goods", communication: "Communication", documentation: "Documentation", flexibility: "Flexibility", wouldUseAgain: "Would use again" };
export interface PerformanceRecordView {
  id: string; contractId: string; outcome: string; closedAt: string; overallScore: number | null; band: string; coverage: number;
  measures: ScorecardMetric[]; feedback: OwnerFeedback | null; feedbackAverage: number | null;
  replyDeadline: string; canRespond: boolean; withdrawn: boolean; withdrawnReason: string | null; openDisputes: number;
  responses: { id: string; kind: "REPLY" | "DISPUTE" | "ANSWER"; measureKey: string | null; body: string; own: boolean; createdAt: string }[];
}
export interface StaffPerformanceRow { id: string; contractReference: string | null; ownerName: string | null; supplierName: string | null; outcome: string; closedAt: string; overallScore: number | null; band: string; disputes: number; withdrawn: boolean; withdrawnReason: string | null }
export interface QualityEvidence {
  canComplaints: boolean; locked: boolean;
  complaints: { id: string; reference: string; title: string; status: string; outcome: string | null; serious: boolean; receivedAt: string; linked: boolean }[];
  logs: { id: string; batchNumber: string; summary: string | null; excursion: boolean; recordedAt: string; linked: boolean }[];
}
export interface ContractPaymentView {
  id: string; contractId: string; reference: string; description: string | null; amount: number | null; currency: string | null; invoiceDate: string | null; dueDate: string; paidDate: string | null;
  status: "PAID_ON_TIME" | "PAID_LATE" | "OVERDUE" | "OPEN"; recordedBy: "you" | "the other party";
}
export interface MyPerformanceItem { id: string; contractId: string; tenderId: string; contractReference: string | null; title: string | null; role: "SUPPLIER" | "ISSUER"; counterpartyName: string | null; outcome: string; closedAt: string; overallScore: number | null; band: string; coverage: number; feedbackAverage: number | null; replyDeadline: string }
export type SupplierBandName = "STRONG" | "GOOD" | "WATCH" | "INSUFFICIENT_HISTORY";
export interface SupplierPerformanceSummary { sufficient: boolean; band: SupplierBandName; contracts: number | null; owners: number | null; milestonesMetPercent: number | null; onTimePercent: number | null; inFullPercent: number | null; averageScore: number | null }
export interface PaymentPracticeSummary { sufficient: boolean; payments: number | null; paidOnTimePercent: number | null; averageDaysLate: number | null }
export interface TenderContractsForTender {
  role: "ISSUER" | "SUPPLIER"; standstillEndsAt: string | null; openComplaints: number;
  contracts: TenderContractView[]; awardsWithoutContract: { awardId: string; supplierName: string | null }[];
}
/** A tender document version (2026-10-21). Every version of one document shares a documentKey; superseded ones remain as history. */
export interface TenderDocumentRecord { id: string; title: string; docType: string; description: string | null; fileName: string | null; fileSizeBytes: number | null; version: number; documentKey: string | null; supersededAt: string | null; uploadedAt: string }
export const TENDER_DOC_TYPE_LABELS: Record<string, string> = { SPECIFICATION: "Specification", TERMS: "Terms and conditions", DRAWING: "Drawing", TEMPLATE: "Template", OTHER: "Other" };
export interface TenderDetailForIssuer {
  documents: TenderDocumentRecord[];
  tender: TenderRecord; lines: TenderLineRecord[]; criteria: TenderCriterionRecord[]; rules: TenderRuleRecord[]; events: TenderEventRecord[];
  invitations: { id: string; invitedOrganizationId: string; organizationName: string | null; invitedAt: string }[];
  participants: TenderParticipantRecord[];
  questions: TenderQuestionRecord[];
  clarifications: TenderClarificationRecord[];
  addenda: TenderAddendumRecord[];
  screenings: TenderScreeningRecord[];
}
export interface TenderParticipantRecord {
  organizationId: string; organizationName: string | null; status: string; optedInAt: string;
  integrityPledgeAt: string | null; exclusionDeclaredAt: string | null; exclusionNoGrounds: boolean | null; exclusionGrounds: string[]; exclusionExplanation: string | null;
}
export interface TenderQuestionRecord { id: string; question: string; askedAt: string; askedByOrganisation: string | null; answered: boolean }
export interface TenderClarificationRecord { id: string; question: string; answer: string; answeredAt: string }
export interface TenderAddendumRecord { id: string; number: number; title: string; body: string; requiresAcknowledgement: boolean; newClosingAt: string | null; createdAt: string; acknowledgedBy?: number; outstanding?: string[] }
export interface TenderScreeningRecord { id: string; screenedOrganisationId: string; organisationName: string | null; lists: string[]; outcome: string; notes: string | null; screenedOn: string; recordedAt: string }
export interface TenderChainCheck { ok: boolean; events: number; brokenAt: string | null }
export interface PublicNoticeRecord {
  id: string; referenceNumber: string; title: string; summary: string | null; issuerName: string; tenderType: TenderType; status: TenderStatus; publishedAt: string | null; closingAt: string | null; timeZone: string | null;
  deliveryCountryCodes: string | null; currency: string | null; incoterm: string | null;
  lines: { description: string; quantity: string | number | null; unit: string | null }[]; criteria: { title: string; kind: string; weight: string | number | null }[];
}
export interface TenderDashboard {
  totals: { draft: number; open: number; closed: number; evaluating: number; awarded: number; cancelled: number };
  closingSoon: { id: string; referenceNumber: string; title: string; closingAt: string; interested: number }[];
  interestPerOpenTender: { id: string; referenceNumber: string; title: string; interested: number }[];
  totalInterested: number; openWithNoInterest: number;
  attention: { overdueEvaluation: number; overdueAward: number; unansweredQuestions: number };
  bidsReceived: number | null;
}
export interface SupplierWaitingItem { kind: string; label: string; title: string; detail: string; dueAt: string | null; overdue: boolean; urgent: boolean; path: string }
export interface SupplierPortalDashboard {
  totals: { waiting: number; urgent: number; overdue: number; activeContracts: number; activeContractValue: number; openBids: number };
  byKind: { kind: string; label: string; count: number }[];
  items: SupplierWaitingItem[];
}
export interface TenderOrganisationOption { id: string; name: string; type: string }

// ---------------------------------------------------------------------------
// Tender bids and the participant view (step 3, 2026-10-19)
// ---------------------------------------------------------------------------
export type TenderBidStatus = "NONE" | "DRAFT" | "SUBMITTED" | "WITHDRAWN";
export interface TenderChecklistItem { ok: boolean; label: string }
export interface TenderBidLineValue {
  tenderLineId: string; noBid: boolean; unitPrice: string | null; leadTimeDays: number | null; countryOfOrigin: string | null; manufacturerName: string | null; remarks: string | null;
}
export interface TenderBidWorkspaceLine extends TenderBidLineValue {
  lineNumber: number; lotNumber: number | null; lotTitle: string | null; description: string; quantity: string | null; unit: string | null; destinationCountryCode: string | null;
  requiredRegistration: string | null; minShelfLifePercent: number | null; coldChainRequired: boolean; specification: string | null;
}
export interface TenderBidFileRecord { id: string; fileName: string; fileSizeBytes: number | null; criterionId: string | null }
export interface TenderBidWorkspaceCriterion {
  id: string; title: string; description: string | null; kind: "GATE" | "SCORED"; weight: string | null; isMandatory: boolean;
  responseFormat: "UPLOAD" | "TEXT" | "EITHER"; text: string | null; files: TenderBidFileRecord[];
}
export interface TenderBidWorkspace {
  tender: {
    id: string; referenceNumber: string; title: string; issuerName: string; status: TenderStatus; closingAt: string | null; timeZone: string | null; currency: string | null;
    bidValidityDays: number | null; acceptedFileTypes: string | null; maxFileSizeMb: number | null; allowTextSubmission: boolean; allowTemplateSubmission: boolean;
  };
  bid: {
    id: string | null; status: TenderBidStatus; bidCurrency: string | null; validityConfirmed: boolean; notes: string | null; submittedAt: string | null;
    fxRate: string | null; fxRateDate: string | null; totalBidCurrency: string | null; totalTenderCurrency: string | null;
  };
  lines: TenderBidWorkspaceLine[];
  criteria: TenderBidWorkspaceCriterion[];
  addenda: { id: string; number: number; title: string; requiresAcknowledgement: boolean; acknowledged: boolean }[];
  checklist: TenderChecklistItem[];
  /** The tender is still open for bids and this organisation may bid. */
  open: boolean;
  canSubmit: boolean;
}
export interface TenderBidSaveInput {
  bidCurrency?: string | null; validityConfirmed?: boolean; notes?: string | null;
  lines?: (Omit<TenderBidLineValue, "unitPrice"> & { unitPrice: string | number | null })[]; responses?: { criterionId: string; text: string | null }[];
}
export interface MyBidItem {
  tenderId: string; referenceNumber: string; title: string; issuerName: string; closingAt: string | null; timeZone: string | null; tenderStatus: TenderStatus;
  status: TenderBidStatus; submittedAt: string | null; bidCurrency: string | null; totalBidCurrency: string | null;
}
export interface IssuerBidRecord {
  bidId: string; organizationId: string; organizationName: string | null; submittedAt: string | null; bidCurrency: string | null; fxRate: string | null; fxRateDate: string | null;
  totalBidCurrency: string | null; totalTenderCurrency: string | null; validityDays: number | null; notes: string | null;
  lines: (TenderBidLineValue & { lineNumber: number; description: string; quantity: string | null; unit: string | null })[];
  responses: { criterionId: string; criterionTitle: string; text: string | null; files: TenderBidFileRecord[] }[];
}
export interface TenderParticipantView {
  tender: TenderRecord & { issuerName: string };
  documents: TenderDocumentRecord[];
  lines: TenderLineRecord[]; criteria: TenderCriterionRecord[];
  clarifications: { id: string; question: string; answer: string; answeredAt: string }[];
  eligibility: {
    outcome: "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_ELIGIBLE"; canBid: boolean; invited: boolean; unmetRequired: number; chips: string[];
    items: { ruleId: string; ruleType: string; required: boolean; status: "MET" | "NOT_MET" | "NEEDS_EVIDENCE"; requirement: string; action: string | null }[];
  };
  participation: { status: string; optedInAt: string } | null;
  shortlisted: boolean;
  addenda: { id: string; number: number; title: string; body: string; requiresAcknowledgement: boolean; newClosingAt: string | null; createdAt: string; acknowledged: boolean }[];
  myQuestions: { id: string; question: string; askedAt: string }[];
}
export interface TenderAvailableItem {
  id: string; referenceNumber: string; title: string; summary: string | null; tenderType: TenderType; issuerName: string; deliveryCountryCodes: string | null; currency: string | null;
  publishedAt: string | null; closingAt: string | null; timeZone: string | null; status: TenderStatus; categories: string[]; chips: string[]; unmetRequired: number; canBid: boolean;
  /** Declared scope-of-supply categories (SCOPE_TAXONOMY ids) that this tender's catalogue lines fall into; only set on "Tenders for you". */
  scopeMatches?: string[];
}
export interface TenderFacet { key: string; count: number }
export interface TenderAvailableResult {
  counts: Record<string, number>;
  /** Breakdowns of the filtered set, for the dashboard drilldowns. */
  facets?: { issuers: TenderFacet[]; countries: TenderFacet[]; categories: TenderFacet[]; currencies: TenderFacet[] };
  tenders: TenderAvailableItem[];
}
export interface TenderSavedSearchCriteria {
  categories?: string[]; countries?: string[]; types?: string[]; onlyEligible?: boolean; keyword?: string;
  issuer?: string; currency?: string; scopeMatch?: boolean;
  chip?: string; status?: string; closingWithinDays?: number; publishedWithinDays?: number; shortlisted?: boolean;
}
export interface TenderSavedSearchRecord { id: string; name: string; alertsEnabled: boolean; criteria: TenderSavedSearchCriteria; createdAt: string }

export type BidTemplateKind = "financial" | "technical";
export interface BidTemplateFile { fileName: string; contentType: string; contentBase64: string }
/** The result of uploading a completed template. When not accepted nothing was changed and `problems` says why. */
export interface BidTemplateResult { accepted: boolean; problems: string[]; workspace: TenderBidWorkspace | null }

// ---------------------------------------------------------------------------
// Tender evaluation, award and participant status (step 4, 2026-10-20)
// ---------------------------------------------------------------------------
export const CRITERION_METRICS = [
  { value: "PRICE", label: "Price", hint: "Calculated: the lowest compliant price scores 100." },
  { value: "LEAD_TIME", label: "Lead time", hint: "Calculated: the shortest average lead time scores 100." },
  { value: "PAST_PERFORMANCE", label: "Past performance on Universe", hint: "Calculated: the supplier's average score on closed Universe contracts (3 contracts from 2 owners needed). No history scores 70." },
  { value: "MANUAL", label: "Scored by evaluators", hint: "Quality, technical merit, sustainability or anything else you want judged." },
] as const;
export type EvalPhase = "OPEN" | "CLOSED" | "OPENED" | "EVALUATING" | "SCORED" | "AWARDED";
export interface EvalCriterion { id: string; title: string; kind: "GATE" | "SCORED"; weight: number | null; metric: "MANUAL" | "PRICE" | "LEAD_TIME" | "PAST_PERFORMANCE"; description: string | null }
export interface EvalEvaluator { userId: string; name: string; role: "CHAIR" | "EVALUATOR"; coiDeclaredAt: string | null; coiNoConflict: boolean | null; conflictCount: number }
export interface EvalBid {
  bidId: string; organizationId: string; organizationName: string | null; submittedAt: string | null; total: number | null; avgLeadDays: number | null;
  pricedLineIds: string[]; partial: boolean; gatesComplete: boolean; failedGate: boolean; compliant: boolean;
  calculated: Record<string, number | null>; scores: Record<string, number | undefined>; totalScore: number | null; rank: number | null;
  gates: Record<string, { passed: boolean; notes: string | null }>;
  mine: Record<string, { score: number | null; rationale: string | null; submitted: boolean }>; mySubmitted: boolean;
  others?: Record<string, { evaluator: string; score: number | null; rationale: string | null }[]>;
  proposed: Record<string, number | null>; spreadFlag: Record<string, boolean>;
  moderated: Record<string, { score: number | null; rationale: string | null }>;
}
/** Per-lot ranking (step 7). A bidder appears only if it priced every item in the lot. */
export interface EvalLot { lotNumber: number; lotTitle: string | null; lineIds: string[]; rows: { bidId: string; organizationId: string; organizationName: string | null; lotTotal: number; avgLeadDays: number | null; totalScore: number | null; rank: number | null }[] }
export interface DebriefLot { lotNumber: number; lotTitle: string | null; bid: boolean; rank?: number | null; of?: number; totalScore?: number | null; itemsAwarded?: number; itemsInLot?: number }
export interface EvalAward { awardId: string; bidId: string; organizationId: string; organizationName: string | null; reason: string; awardedAt: string; lines: { tenderLineId: string; sharePercent: number | null }[] }
export interface EvaluationOverview {
  tender: {
    id: string; referenceNumber: string; title: string; currency: string | null; status: string; closingAt: string | null; timeZone: string | null;
    emergencyProcurement: boolean; emergencyReason: string | null; allowSingleEvaluator: boolean; singleEvaluatorReason: string | null;
    standstillEnabled: boolean; standstillWorkingDays: number | null; bidsOpenedAt: string | null; evaluationStartedAt: string | null;
    scoringFinalisedAt: string | null; awardedAt: string | null; standstillEndsAt: string | null;
  };
  phase: EvalPhase;
  viewer: { isIssuer: boolean; isEvaluator: boolean; role: "CHAIR" | "EVALUATOR" | null; coiDeclared: boolean; coiRequired: boolean };
  evaluators: EvalEvaluator[];
  canStart: boolean; startProblems: string[];
  criteria: EvalCriterion[];
  lines: { id: string; lineNumber: number; lotNumber: number | null; lotTitle: string | null; description: string; quantity: string | null; unit: string | null }[];
  bids: EvalBid[];
  lots: EvalLot[];
  awards: EvalAward[];
  complaints: { id: string; organizationId: string; body: string; status: string; response: string | null; lodgedAt: string; respondedAt: string | null }[];
}
export interface TenderStatusView {
  tender: {
    tenderType: TenderType; id: string; referenceNumber: string; title: string; issuerName: string; status: string; closingAt: string | null; timeZone: string | null; currency: string | null;
    emergencyProcurement: boolean; emergencyReason: string | null; standstillEnabled: boolean; standstillEndsAt: string | null; cancelledReason: string | null;
  };
  milestones: { key: string; label: string; at: string | null; target: string | null; done: boolean }[];
  next: { label: string; at: string | null } | null;
  bidsSubmitted: number | null;
  my: {
    participating: boolean;
    bid: { status: string; submittedAt: string | null; bidCurrency: string | null; totalTenderCurrency: number | null } | null;
    debrief: { lots: DebriefLot[]; outcome: "AWARDED" | "NOT_AWARDED" | "NOT_COMPLIANT"; totalScore: number | null; rank: number | null; bidCount: number | null; feedback: string | null; releasedAt: string;
      scores: { criterionId: string; title: string; kind: string; weight: number | null; metric: string; score: number | null; passed: boolean | null; comment: string | null }[] } | null;
    awards: { reason: string; awardedAt: string; lines: { description: string; sharePercent: number | null }[] }[];
    complaints: { id: string; body: string; status: string; response: string | null; lodgedAt: string; respondedAt: string | null }[];
    canComplain: boolean;
  };
}

/** Rescales weights so they total exactly `total` (default 100) to one decimal place, keeping their proportions. All-zero weights share equally. */
export function normaliseWeights(weights: number[], total = 100): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = sum > 0 ? weights.map((w) => (w / sum) * total) : weights.map(() => total / weights.length);
  const out = raw.map((w) => Math.floor(w * 10 + 1e-9) / 10);
  let rem = Math.round((total - out.reduce((a, b) => a + b, 0)) * 10);
  const order = raw.map((w, i) => ({ i, frac: w * 10 - Math.floor(w * 10 + 1e-9) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; rem > 0; k = (k + 1) % order.length, rem--) out[order[k]!.i] = Math.round((out[order[k]!.i]! + 0.1) * 10) / 10;
  return out;
}

// ---------------------------------------------------------------------------
// Quality complaints (2026-10-20)
// ---------------------------------------------------------------------------
export const COMPLAINT_DIRECTIONS = ["INBOUND_CLIENT", "OUTBOUND_SUPPLY_CHAIN"] as const;
export const COMPLAINT_STATUSES = ["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED", "CLOSED", "ON_HOLD", "WITHDRAWN"] as const;
export const COMPLAINT_SEVERITIES = ["CRITICAL", "MAJOR", "MINOR"] as const;
export const COMPLAINT_CATEGORIES = ["PRODUCT_QUALITY", "DELIVERY", "DOCUMENTATION", "COLD_CHAIN", "SERVICE", "SAFETY", "CONDUCT", "OTHER"] as const;
export const COMPLAINT_CHANNELS = ["EMAIL", "PHONE", "MEETING", "PORTAL", "LETTER", "OTHER"] as const;
export const COMPLAINT_ROOT_CAUSES = ["MATERIAL", "MANUFACTURING", "DOCUMENTATION", "TRANSPORT_COLD_CHAIN", "HANDLING_STORAGE", "PROCESS", "HUMAN_ERROR", "SUPPLIER", "NOT_DETERMINED", "OTHER"] as const;
export const COMPLAINT_OUTCOMES = ["UPHELD", "PARTLY_UPHELD", "NOT_UPHELD"] as const;
export const COMPLAINT_REMEDIES = ["REPLACEMENT", "CREDIT", "REDELIVERY", "CORRECTED_DOCUMENTS", "EXPLANATION", "NO_REMEDY", "OTHER"] as const;
export const COMPLAINT_REACTIONS = ["SATISFIED", "NOT_SATISFIED", "NO_RESPONSE"] as const;
export const COMPLAINT_REGULATOR_DECISIONS = ["UNDER_CONSIDERATION", "REPORTED", "NOT_REPORTABLE"] as const;
export const COMPLAINT_ACTION_TYPES = ["CONTAINMENT", "CORRECTIVE", "PREVENTIVE"] as const;

/** Default response clocks, in working days unless stated. Organisations will be able to override these. */
export const COMPLAINT_CLOCKS = {
  acknowledgeWorkingDays: 2,
  triageWorkingDays: 5,
  triageSeriousWorkingDays: 1,
  resolveCalendarDays: { MINOR: 30, MAJOR: 15, CRITICAL: 5 } as Record<string, number>,
  partnerResponseCalendarDays: 14,
} as const;

export interface ComplaintListItem {
  id: string;
  referenceNumber: string;
  direction: string;
  status: string;
  title: string;
  severity: string | null;
  category: string | null;
  isSerious: boolean;
  receivedAt: string;
  partnerId: string | null;
  partnerName: string | null;
  projectId: string | null;
  projectLabel: string | null;
  ownerName: string | null;
  outcome: string | null;
  /** The next unmet deadline (acknowledge, triage or resolve) and whether it has passed. */
  nextDueAt: string | null;
  nextDueLabel: string | null;
  overdue: boolean;
  openActions: number;
}

export interface ComplaintEventRecord { id: string; kind: string; summary: string; body: string | null; actorName: string | null; createdAt: string }
export interface ComplaintAttachmentRecord { id: string; documentId: string; fileName: string | null; title: string; mimeType: string | null; fileSizeBytes: number | null; note: string | null; addedByName: string | null; createdAt: string }
export interface ComplaintActionRecord {
  id: string; type: string; description: string; ownerId: string; ownerName: string | null; dueDate: string; status: string;
  completedAt: string | null; completionNotes: string | null; overdue: boolean;
}

export interface ComplaintDetail extends ComplaintListItem {
  description: string;
  channel: string | null;
  heldFromStatus: string | null;
  holdReason: string | null;
  flagPatientSafety: boolean;
  flagSuspectedFalsified: boolean;
  flagTemperatureExcursion: boolean;
  contactId: string | null;
  contactName: string | null;
  /** Personal data: null unless the caller holds quality.complaints.view. */
  complainantName: string | null;
  complainantEmail: string | null;
  complainantPhone: string | null;
  projectLineId: string | null;
  productBatchId: string | null;
  batchNumber: string | null;
  productMasterId: string | null;
  productName: string | null;
  ownerId: string | null;
  investigatorId: string | null;
  investigatorName: string | null;
  loggedByName: string | null;
  acknowledgeDueAt: string | null; acknowledgedAt: string | null;
  triageDueAt: string | null; triagedAt: string | null;
  resolveDueAt: string | null; resolvedAt: string | null; closedAt: string | null;
  investigationStartedAt: string | null; investigationCompletedAt: string | null;
  investigationScope: string | null; rootCauseCategory: string | null; rootCause: string | null; findings: string | null; impactSummary: string | null;
  partnerResponseDueAt: string | null; partnerRespondedAt: string | null; partnerResponse: string | null;
  remedyType: string | null; remedyNotes: string | null; responseSentAt: string | null; responseSummary: string | null; complainantReaction: string | null;
  regulatorDecision: string | null; regulatorDecisionReason: string | null; regulatorReference: string | null; regulatorDecisionByName: string | null; regulatorDecisionAt: string | null;
  closureSummary: string | null; lessonsLearned: string | null;
  effectivenessCheckDueAt: string | null; effectivenessCheckedAt: string | null; effectivenessNotes: string | null;
  closedByName: string | null; closureOverrideReason: string | null; reopenCount: number;
  events: ComplaintEventRecord[];
  attachments: ComplaintAttachmentRecord[];
  actions: ComplaintActionRecord[];
  /** Risk-register entries raised from this complaint. */
  risks: { id: string; title: string; severity: string; status: string }[];
  /** What the caller may do now. */
  can: { edit: boolean; investigate: boolean; approve: boolean; seePersonal: boolean };
}

export interface ComplaintDashboard {
  open: number; overdue: number; serious: number; awaitingAcknowledgement: number; awaitingTriage: number; investigating: number;
  closedLast90Days: number; averageDaysToClose: number | null; openActions: number; overdueActions: number;
  byCategory: { category: string; count: number }[];
  byPartner: { partnerId: string; partnerName: string; count: number; upheld: number }[];
}

export interface CreateComplaintInput {
  direction: string; title: string; description: string; receivedAt?: string; channel?: string;
  partnerId?: string; contactId?: string; complainantName?: string; complainantEmail?: string; complainantPhone?: string;
  projectId?: string; projectLineId?: string; productBatchId?: string; productMasterId?: string;
  category?: string; severity?: string;
  flagPatientSafety?: boolean; flagSuspectedFalsified?: boolean; flagTemperatureExcursion?: boolean;
}

// ---------------------------------------------------------------------------
// Partner scorecard (2026-10-20): a dynamic score and benchmark per stakeholder, computed live from platform data.
// ---------------------------------------------------------------------------
export type ScorecardStatus = "good" | "warning" | "critical" | "neutral";
export type ScorecardGroup = "DELIVERY" | "QUALITY" | "COMPLIANCE" | "RESPONSIVENESS" | "ACTIVITY";

/** The records behind one scorecard measure (drill-down): a small generic table, each row optionally linking to its record. */
export interface ScorecardRecordRow { id: string; cells: string[]; href: string | null; flag: "good" | "warning" | "critical" | null }
export interface ScorecardRecordSet { key: string; title: string; columns: string[]; rows: ScorecardRecordRow[]; total: number; note: string | null }

export interface ScorecardMetric {
  key: string;
  group: ScorecardGroup;
  label: string;
  /** Display value, e.g. "92%", "3 days", "2 of 5". */
  display: string;
  /** 0–100 contribution to the overall score; null when the measure is informational or has no data yet. */
  score: number | null;
  /** How much the measure counts towards the overall score (0 = informational). */
  weight: number;
  status: ScorecardStatus;
  /** Plain-English explanation of what the number is built from. */
  detail: string;
  /** What the organisation's other stakeholders in the same role average on this measure, where comparable. */
  benchmark: string | null;
  /** Where to look in the platform for the underlying records. */
  href: string | null;
}

export interface ScorecardTrendPoint { period: string; onTimePercent: number | null; deliveries: number; complaints: number | null }

export interface PartnerScorecard {
  partnerId: string;
  partnerName: string;
  roles: string[];
  /** 0–100, weighted over the measures that have data; null when there is nothing to score yet. */
  overallScore: number | null;
  band: "STRONG" | "SATISFACTORY" | "WATCH" | "AT_RISK" | "NOT_ENOUGH_DATA";
  /** The band the number alone gives, before the critical-measure cap. Display colours follow this. */
  scoreBand: "STRONG" | "SATISFACTORY" | "WATCH" | "AT_RISK" | "NOT_ENOUGH_DATA";
  /** Labels of measures in a critical state, shown as a separate flag beside the score. */
  attention: string[];
  /** Share of the applicable weighting that has data behind it (0–100). */
  coverage: number;
  /** A measure in critical state stops the band reading better than WATCH; this says why. */
  bandNote: string | null;
  /** The four most important measures right now: critical first, then warnings, then by weight. */
  headline: ScorecardMetric[];
  metrics: ScorecardMetric[];
  /** False when the caller may not see complaint data (it is ring-fenced to quality roles). */
  includesComplaints: boolean;
  /** Last six quarters, oldest first. */
  trend: ScorecardTrendPoint[];
  generatedAt: string;
}

/**
 * Delivery-performance parameters for the partner scorecard, based on published global-health procurement practice:
 * USAID GHSC-PSM (2016 quarterly report: OTIF target 90%; a shipment is on time if delivered from 30 business days before to
 * 5 business days after the agreed date) and the Global Fund (end-2017 KPI report: 84% of orders on time and in full, above its
 * target; "on time" = due date + 14 days). Single source of truth; to become editable per organisation.
 */
export const SCORECARD_THRESHOLDS = {
  onTime: { good: 95, warn: 85 },
  inFull: { good: 95, warn: 85 },
  otif: { good: 90, warn: 80 },
  window: { earlyBusinessDays: 30, lateBusinessDays: 5 },
  basis: "USAID GHSC-PSM (OTIF target 90%; on time = 30 business days early to 5 late) and Global Fund (84% OTIF in 2017; on time = due date + 14 days)",
} as const;

/** The delivery-scoring parameters in force for an organisation (its own settings, or the platform defaults). */
export interface ScorecardSettings {
  onTimeGood: number; onTimeWarn: number; inFullGood: number; inFullWarn: number; otifGood: number; otifWarn: number;
  earlyDays: number; lateDays: number;
  /** True when the organisation has saved its own values. */
  isCustom: boolean;
  canEdit: boolean;
  updatedAt: string | null;
}
export type UpdateScorecardSettingsInput = Partial<Omit<ScorecardSettings, "isCustom" | "canEdit" | "updatedAt">> & { reason?: string };

// ---------------------------------------------------------------------------
// Framework agreements and call-offs (step 7 part 2, 2026-10-22)
// ---------------------------------------------------------------------------
export type CallOffStatus = "PENDING_APPROVAL" | "AWAITING_SUPPLIER" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export const CALL_OFF_STATUS_LABEL: Record<CallOffStatus, string> = { PENDING_APPROVAL: "Awaiting second authorisation", AWAITING_SUPPLIER: "Waiting for the supplier", ACCEPTED: "Accepted", DECLINED: "Declined", CANCELLED: "Cancelled" };
export interface ApprovalSettingsView {
  individualLimit: number; splitWindowDays: number; confirmed: boolean; confirmedAt: string | null;
  /** Currency the limits are written in; null reads them in each tender's own currency. */
  limitCurrency: string | null;
  roleLimits: { roleId: string; roleName: string; limit: number }[];
  /** Roles in the organisation that a limit can be set for. */
  availableRoles: { id: string; name: string }[];
  /** The caller's own limit and where it comes from. */
  yourLimit: number;
}
export interface FrameworkItem { tenderLineId: string; lineNumber: number; lotNumber: number | null; description: string; unit: string | null; bidPrice: number; price: number; reviewPending: boolean }
export interface FrameworkContractView { contractId: string; reference: string; status: string; supplierName: string | null; endDate: string | null; executedAt: string | null; holdEndsAt: string | null; holdActive: boolean; rank: number | null; callOffCount: number; items: FrameworkItem[]; performance: FrameworkRollup }
export interface FrameworkRollup { placed: number; accepted: number; declined: number; cancelled: number; awaiting: number; acceptedShare: number | null; avgResponseHours: number | null; valueAccepted: number; projects: number; onTimePercent: number | null; inFullPercent: number | null; deliveriesMeasured: number }
export interface CallOffView {
  id: string; contractId: string; reference: string; method: string; status: CallOffStatus; supplierName: string | null; currency: string | null; totalValue: number; testedValue: number;
  requiresSecondApproval: boolean; ceilingExceeded: boolean; deliveryCountryCode: string | null; requiredBy: string | null; notes: string | null; createdAt: string; raisedBy: string | null;
  firstApprovedAt: string | null; secondApprovedAt: string | null; rejectedReason: string | null; declineReason: string | null; respondedAt: string | null; supplierProjectId: string | null; canApprove: boolean;
  lines: { tenderLineId: string; description: string; quantity: number; unitPrice: number; lineTotal: number }[];
}
export interface PriceReviewView { id: string; contractId: string; tenderLineId: string; description: string; previousPrice: number; proposedPrice: number; reason: string; status: "PROPOSED" | "ACCEPTED" | "REJECTED"; byYou: boolean; createdAt: string; responseNote: string | null }
export interface FrameworkView {
  viewer: { party: "OWNER" | "SUPPLIER" };
  tender: { id: string; referenceNumber: string; title: string; currency: string | null; termMonths: number | null; method: "DIRECT" | "ROTATION" | null; priceHoldDays: number | null };
  ceiling: { value: number | null; committed: number; remaining: number | null } | null;
  committedToYou: number | null;
  settings: ApprovalSettingsView | null;
  contracts: FrameworkContractView[];
  callOffs: CallOffView[];
  priceReviews: PriceReviewView[];
  miniCompetitions: MiniCompetitionView[];
  invitations: MiniInvitationView[];
}
export type MiniQuoteStatus = "INVITED" | "QUOTED" | "DECLINED" | "WON" | "LOST" | "CANCELLED";
export interface MiniQuoteLineView { tenderLineId: string; description: string; quantity: number; frameworkPrice: number; quotedPrice: number | null; leadTimeDays: number | null }
/** Owner's view of one competition. While quoting is open the quotes are sealed: only the count is shown. */
export interface MiniCompetitionView {
  id: string; reference: string; status: "OPEN" | "AWARDED" | "CANCELLED"; closesAt: string; sealed: boolean; notes: string | null; requiredBy: string | null; deliveryCountryCode: string | null;
  lines: { tenderLineId: string; description: string; quantity: number }[]; invited: number; quotesReceived: number; awardedQuoteId: string | null; awardReason: string | null; cancelReason: string | null; canAward: boolean;
  quotes: { id: string; supplierName: string | null; status: MiniQuoteStatus; totalValue: number | null; quotedAt: string | null; quoteNotes: string | null; declineReason: string | null; lines: MiniQuoteLineView[] }[];
}
/** A supplier's own invitation. It never shows other suppliers or their prices. */
export interface MiniInvitationView {
  id: string; reference: string; status: MiniQuoteStatus; closesAt: string; open: boolean; requestNotes: string | null; deliveryCountryCode: string | null; requiredBy: string | null; quotedAt: string | null; totalValue: number | null; quoteNotes: string | null; declineReason: string | null; lines: MiniQuoteLineView[];
}

export * from "./project-line-input";

// ---- Insights app (2026-10-25). All anonymised aggregates; a figure only appears when at least five distinct organisations contributed. ----
export interface InsightsFreshness { prices: string | null; sourcing: string | null; logistics: string | null }
export interface InsightsPricedCategory { category: string; sourceCount: number; observations: number; latestMonth: string }
/** Shared regulatory reference counts for one country, for the Insights map layers. Counts only: no product, holder, organisation or notice text. A count under the minimum is left out. */
export interface InsightsReferenceCountry { countryCode: string; exportRestrictions: number; registrations: number; safetyNotices: number }
/** One month of shipping figures for one mode and commodity group. Every row has at least the minimum number of organisations behind it. */
export interface InsightsLogisticsTrendPoint { month: string; transportMode: string | null; commodityGroup: string | null; sourceCount: number; shipmentCount: number; avgDistanceKm: number; avgCo2TotalKg: number; avgDurationDays: number | null; avgEfficiencyScore: number }
/** Sourcing relationships on record at the end of a month (running total) for one product group. */
export interface InsightsSourcingTrendPoint { month: string; category: string; sourceCount: number; approvalCount: number }
export interface InsightsPriceTrendPoint { month: string; currency: string; sourceCount: number; minPrice: number; maxPrice: number; avgPrice: number }
export interface InsightsPriceMovementPoint { month: string; index: number; sourceCount: number; matchedItems: number }
/** Like-for-like cost-price index (starts at 100) for a product group, optionally for one region of manufacture or delivery. A ratio, never a price. */
export interface InsightsPriceMovement { category: string; segmentBy: "manufactureRegion" | "destinationRegion" | null; segment: string | null; currency: string; points: InsightsPriceMovementPoint[] }
export interface InsightsFreightRate { freightMode: string; originRegion: string | null; destinationRegion: string | null; currency: string; sourceCount: number; shipments: number; avgDistanceKm: number; avgCostPerTonne: number; minCostPerTonne: number; maxCostPerTonne: number; avgCostPerTonneKm: number }
export interface InsightsServicePrice { serviceCategory: string; pricingBasis: string; deliveryRegion: string | null; currency: string; sourceCount: number; observations: number; minPrice: number; maxPrice: number; avgPrice: number }
export type InsightsPriceDimension = "destinationRegion" | "manufactureRegion" | "incoterm";
export interface InsightsPriceBreakdownRow { label: string | null; currency: string; sourceCount: number; observations: number; minPrice: number; maxPrice: number; avgPrice: number }
export interface InsightsOverview { pricedCategories: number; sourcedCategories: number; logisticsRoutes: number; minimumContributors: number; freshness: InsightsFreshness }

/** Insights personalisation (2026-10-25): a saved view (a page and its filters) or a highlight pinned to the Overview. */
export interface InsightsUserItem { id: string; kind: "VIEW" | "PIN"; name: string; target: string; state: Record<string, unknown> | null; position: number; createdAt: string }
export interface SaveInsightsUserItemInput { kind: "VIEW" | "PIN"; name: string; target: string; state?: Record<string, unknown> | null }
