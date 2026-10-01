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
  quantity: number | null;
  productCategory: string | null;
  countryOfManufactureCode: string | null;
  incoterm: string | null;
  freightMode: string | null;
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
  freightForwarderId: string | null;
  freightForwarderName: string | null;
  freightCost: string | null;
  freightCurrency: string | null;
  /** Distinct from freightCost — see ProjectLine.insuredValue's doc
   * comment in schema.prisma. Added 2026-09-30. */
  insuredValue: string | null;
  insuredCurrency: string | null;
  warehouseReferenceNumber: string | null;
  goodsCollectedDate: string | null;
  goodsManufacturedDate: string | null;
  goodsDeliveredToClientDate: string | null;
  promisedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  internalOnTime: boolean | null;
  supplierOnTime: boolean | null;
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
  unitSalesPrice: string | null;
  clientPaymentAmount: string | null;
  clientPaymentCurrency: string | null;
  clientPaymentDate: string | null;
  internalInvoiceNumber: string | null;
  internalInvoiceDate: string | null;
  grossMargin: string | null;
  margin: string | null;
  strength: string | null;
  form: string | null;
  packSize: string | null;
  batchNumber: string | null;
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
  quantity?: number | null;
  productCategory?: string | null;
  countryOfManufactureCode?: string | null;
  incoterm?: string | null;
  freightMode?: string | null;
  manufacturerId?: string | null;
  supplierId?: string | null;
  clientPoNumber?: string | null;
  clientPoReceiptDate?: string | null;
  internalPoNumber?: string | null;
  internalPoDatePlaced?: string | null;
  gad?: string | null;
  supplierGad?: string | null;
  freightForwarderId?: string | null;
  freightCost?: number | null;
  freightCurrency?: string | null;
  insuredValue?: number | null;
  insuredCurrency?: string | null;
  warehouseReferenceNumber?: string | null;
  goodsCollectedDate?: string | null;
  goodsManufacturedDate?: string | null;
  goodsDeliveredToClientDate?: string | null;
  promisedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  internalOnTime?: boolean | null;
  supplierOnTime?: boolean | null;
  supplierInFull?: boolean | null;
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
  strength?: string | null;
  form?: string | null;
  packSize?: string | null;
  batchNumber?: string | null;
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
}

export interface PartnerManufacturerDetail {
  partNumberConvention?: string | null;
  countryOfManufactureCode?: string | null;
}

export interface PartnerFreightForwarderDetail {
  preferredIncoterm?: string | null;
  serviceRegions?: string | null;
}

export interface PartnerClientDetail {
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  paymentTerms?: string | null;
}

export interface PartnerSummary {
  id: string;
  name: string;
  countryCode: string | null;
  website: string | null;
  approvalStatus: string;
  roles: PartnerRoleSummary[];
  supplierDetail: PartnerSupplierDetail | null;
  manufacturerDetail: PartnerManufacturerDetail | null;
  freightForwarderDetail: PartnerFreightForwarderDetail | null;
  clientDetail: PartnerClientDetail | null;
  createdAt: string;
}

export interface CreatePartnerInput {
  name: string;
  countryCode?: string;
  website?: string;
  /** At least one role required — a Partner with no role is meaningless. */
  roleTypes: string[];
  supplierDetail?: PartnerSupplierDetail;
  manufacturerDetail?: PartnerManufacturerDetail;
  freightForwarderDetail?: PartnerFreightForwarderDetail;
  clientDetail?: PartnerClientDetail;
}

export interface UpdatePartnerInput {
  name?: string;
  countryCode?: string | null;
  website?: string | null;
  approvalStatus?: string;
  /** Adds any role types not already present — does not remove existing
   * ones (see PartnersService.update's doc comment). */
  addRoleTypes?: string[];
  supplierDetail?: PartnerSupplierDetail;
  manufacturerDetail?: PartnerManufacturerDetail;
  freightForwarderDetail?: PartnerFreightForwarderDetail;
  clientDetail?: PartnerClientDetail;
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
