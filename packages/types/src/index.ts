/**
 * Shared, hand-written types used across apps for shapes that don't map
 * 1:1 onto a Prisma model (API request/response DTOs, computed fields, etc.).
 * Prisma-generated model types themselves come from "@universe/db" directly —
 * don't duplicate those here.
 */

export interface ProjectSummary {
  id: string;
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
  startDate?: string;
  dueDate?: string;
  firstLine?: CreateProjectLineInput;
}

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  forename: string;
  surname: string;
  /** Added 2026-09-26 for the personalized "powered by Universe" header —
   * see Organization.logoUrl's doc comment in schema.prisma and
   * @universe/ui's OrgHeader, which renders these two fields. */
  organizationName: string;
  organizationLogoUrl: string | null;
  /** Added 2026-09-26 for per-org brand accents — see Organization.primaryColor's
   * doc comment in schema.prisma and @universe/ui's OrgHeader. */
  organizationPrimaryColor: string | null;
  organizationSecondaryColor: string | null;
  platformStaffRole: "NONE" | "SUPPORT" | "SUPER_ADMIN";
  permissions: string[];
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
  /** Added 2026-09-26 — see Organization.logoUrl's doc comment. */
  logoUrl: string | null;
  /** Added 2026-09-26 — see Organization.primaryColor's doc comment. */
  primaryColor: string | null;
  secondaryColor: string | null;
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
  /** Must be true — see CreateOrganizationDto's doc comment (apps/api). */
  confirmedAgreementOnFile: boolean;
}

export interface RoleSummary {
  id: string;
  name: string;
  appScope: string;
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
  manufacturerId: string | null;
  manufacturerName: string | null;
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
  manufacturerId?: string | null;
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

/** Full project detail (header + lines) — what GET /projects/:id returns.
 * ProjectSummary stays as the list-row shape (GET /projects). */
export interface ProjectDetail extends ProjectSummary {
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
  projectId: string;
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
// Quality Assurance (added 2026-10-01, round 3 feedback) — product/partner
// sourcing approvals plus freight/supplier/manufacturer performance
// scorecards. See architecture-decisions.md's "Quality Assurance" section
// for the full design rationale, in particular why "qualified product" is
// its own first-class ProductSourceApproval record rather than something
// derived purely from order history.
// ---------------------------------------------------------------------------

/** Minimal shared-catalog lookup for the QA "new approval" product
 * picker — ProductMaster is global/non-tenant-scoped (see schema.prisma),
 * so this is deliberately not a full ProductMaster type, just enough to
 * populate a search-and-select field. */
export interface ProductMasterOption {
  id: string;
  name: string;
  category: string;
}

/** Search-or-create result for the shared product catalog's own
 * search/create flow (ProductCatalogService) — distinct from
 * ProductMasterOption above, which stays minimal for the QA "new approval"
 * picker. Carries the provenance tag (see ProductMaster.addedByOrganizationId's
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
  /** Added 2026-10-03 — archived entries are excluded from search() and
   * list() by default (see ProductCatalogService), surfaced here only
   * when the caller explicitly asks to include them. */
  isArchived: boolean;
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

export interface ProductCatalogDetail extends ProductCatalogMatch {
  canonicalManufacturerPartNumber: string | null;
  expectedQualityDocumentation: string | null;
  attributeDefinitions: ProductCatalogAttribute[];
}

/** POST /product-catalog body — adds a new entry to the shared catalogue.
 * See CreateProductMasterDto's doc comment in apps/api for the full
 * design. */
export interface CreateProductMasterInput {
  name: string;
  category: string;
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

/** A country from the shared, non-tenant-scoped Country reference table
 * (see schema.prisma) — powers the CountrySelect picker everywhere a
 * country field used to be a free-text ISO alpha-2 input. */
export interface CountryOption {
  code: string;
  name: string;
}

export interface ProductSourceApprovalSummary {
  id: string;
  productMasterId: string;
  productMasterName: string;
  productCategory: string;
  manufacturerId: string;
  manufacturerName: string;
  supplierId: string | null;
  supplierName: string | null;
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

export type QaQueueItemKind = "PARTNER_APPROVAL" | "EVIDENCE_VERIFICATION" | "PRODUCT_APPROVAL";

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
  items: QaQueueItem[];
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

/** One bucket of the global stakeholder-rating distribution — Lewis's "25
 * projects 6/10, 50 8/10, 10 manufacturers are 4/10..." request. Counts
 * only, never a named entity; a bucket below MINIMUM_COHORT_SIZE entities
 * is never returned. */
export interface StakeholderRatingBucket {
  entityType: "PROJECT" | "MANUFACTURER" | "SUPPLIER" | "PROCURING_ORGANIZATION";
  scoreBand: string;
  averageScoreFloor: number;
  count: number;
}
