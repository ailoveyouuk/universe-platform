import type {
  AuthenticatedUser,
  ConfirmDocumentUploadInput,
  StandaloneDocumentSummary,
  LinkStandaloneDocumentInput,
  CountryOption,
  CreateOrganizationInput,
  CreatePartnerInput,
  AddPartnerCertificationInput,
  UpdatePartnerCertificationInput,
  AddPartnerCompanyCheckInput,
  UpdatePartnerCompanyCheckInput,
  PartnerCertificationSummary,
  PartnerCompanyCheckSummary,
  PartnerApprovalHistorySummary,
  CreateProductMasterInput,
  ImportProductMasterResult,
  ImportProductMasterRow,
  CreateProductSourceApprovalInput,
  CreateProjectInput,
  CreateSupplierEnquiryInput,
  CreateSupplierProductInput,
  InviteUserInput,
  OrganizationSummary,
  PartnerPerformanceMetric,
  PartnerSummary,
  ProductAmendmentSummary,
  ProductCatalogDetail,
  ProductCatalogListResult,
  ProductCatalogMatch,
  ProductCatalogCompletenessStats,
  ProductCatalogDashboardStats,
  ProductPriceHistoryPoint,
  RejectProductAmendmentInput,
  ProductSourceApprovalSummary,
  AddProjectContactInput,
  AddProjectLeadInput,
  ContactSummary,
  ProjectDetail,
  ProjectFinancialSummary,
  ProjectLineInput,
  ProjectStatusHistoryEntry,
  ProjectSummary,
  QualityDashboardSummary,
  QaQueueSummary,
  RequestDocumentUploadInput,
  RequestDocumentUploadResult,
  RoleSummary,
  SupplierLead,
  SupplierProduct,
  SupplierProfile,
  StakeholderRegistryDetail,
  StakeholderRegistryMatch,
  StakeholderRegistryProduct,
  SupplierSearchResult,
  UpdatePartnerInput,
  UpdateProductMasterInput,
  UpdateProductMasterResult,
  UpdateProductSourceApprovalInput,
  UpdateProjectInput,
  UpdateSupplierEnquiryInput,
  UpdateSupplierProductInput,
  UpsertSupplierProfileInput,
  UserSummary,
  EvidenceStandardSummary,
  StakeholderEvidenceRecordSummary,
  CreateEvidenceStandardInput,
  UpdateEvidenceStandardInput,
  CreateEvidenceRecordInput,
  UpdateEvidenceRecordInput,
  VerifyEvidenceRecordInput,
  ProductBatchSummary,
  ProductBatchDetail,
  BatchTemperatureLogSummary,
  CreateProductBatchInput,
  UpdateProductBatchInput,
  SearchProductBatchesInput,
  CreateTemperatureLogInput,
  ReviewTemperatureLogInput,
  FieldChangeLogEntry,
  RiskAssessmentSummary,
  RiskAssessmentListItem,
  CreateRiskAssessmentInput,
  UpdateRiskAssessmentInput,
  CloseRiskAssessmentInput,
  EvidenceDueForReviewSummary,
  ControlledDocumentSummary,
  CreateControlledDocumentInput,
  UpdateControlledDocumentInput,
  LogisticsFilters,
  OrgLogisticsLineSummary,
  LogisticsRouteSummary,
  ProductSourcingSummary,
  StakeholderRatingBucket,
} from "@universe/types";

/**
 * Thin typed wrapper around the shared API service. Every app in the
 * platform uses this instead of calling the database directly, and instead
 * of hand-rolling fetch calls — this is the ONE client all frontends share,
 * so an API contract change only needs updating in one place.
 */
export class UniverseApiClient {
  constructor(
    private baseUrl: string,
    private getAccessToken: () => Promise<string>,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      // Nest's default error body is {"statusCode":...,"message":"...","error":"..."}
      // — surface just the human-readable message when the body parses as
      // that shape (e.g. EvidenceService.gateFailureMessage's text on a
      // blocked partner approval), falling back to the raw body for
      // anything else so nothing silently disappears. Added 2026-10-08
      // alongside the evidence-gating UI, which needs this exact message.
      let message = body;
      try {
        const parsed = JSON.parse(body) as { message?: string | string[] };
        if (typeof parsed.message === "string") message = parsed.message;
        else if (Array.isArray(parsed.message)) message = parsed.message.join(" ");
      } catch {
        // body wasn't JSON — use it as-is
      }
      throw new Error(message || `API request failed: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as T;
  }

  me(): Promise<AuthenticatedUser> {
    return this.request("/me");
  }

  listProjects(): Promise<ProjectSummary[]> {
    return this.request("/projects");
  }

  getProject(id: string): Promise<ProjectDetail> {
    return this.request(`/projects/${id}`);
  }

  getProjectFinancialSummary(currency?: string): Promise<ProjectFinancialSummary> {
    return this.request(`/projects/financial-summary${currency ? `?currency=${currency}` : ""}`);
  }

  getSingleProjectFinancialSummary(projectId: string, currency?: string): Promise<ProjectFinancialSummary> {
    return this.request(`/projects/${projectId}/financial-summary${currency ? `?currency=${currency}` : ""}`);
  }

  createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    return this.request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Soft-delete/retirement — see Project.isArchived's doc comment in
   * schema.prisma. Never a hard delete — see ProjectsService.archive. */
  archiveProject(id: string): Promise<ProjectDetail> {
    return this.request(`/projects/${id}/archive`, { method: "PATCH" });
  }

  unarchiveProject(id: string): Promise<ProjectDetail> {
    return this.request(`/projects/${id}/unarchive`, { method: "PATCH" });
  }

  addProjectLine(projectId: string, input: ProjectLineInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines`, { method: "POST", body: JSON.stringify(input) });
  }

  updateProjectLine(projectId: string, lineId: string, input: ProjectLineInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  // --- Supplier Enquiries (added 2026-09-30, Phase 2) ---
  // Every call returns the full ProjectDetail (same shape GET /projects/:id
  // already returns) — see SupplierEnquiriesService's doc comment. There is
  // deliberately no standalone listSupplierEnquiries(): the enquiries for a
  // line are always already present on ProjectDetail.lines[n].enquiries.

  createSupplierEnquiry(projectId: string, lineId: string, input: CreateSupplierEnquiryInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}/enquiries`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateSupplierEnquiry(
    projectId: string,
    lineId: string,
    enquiryId: string,
    input: UpdateSupplierEnquiryInput,
  ): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}/enquiries/${enquiryId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  // --- Documents (added 2026-10-01, Phase 2b — Blob Storage) ---
  // Two-step upload: request a short-lived SAS upload URL, PUT the file
  // bytes straight to Blob Storage with it, then confirm with the
  // metadata. See DocumentsService's doc comment in apps/api for the full
  // design. Every call that touches a project's document list returns the
  // full ProjectDetail, same convention as Supplier Enquiries above.

  requestDocumentUploadUrl(projectId: string, input: RequestDocumentUploadInput): Promise<RequestDocumentUploadResult> {
    return this.request(`/projects/${projectId}/documents/upload-url`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Not routed through `request()` — this goes straight to Blob Storage
   * using the SAS-bearing uploadUrl from requestDocumentUploadUrl(), not
   * this API, and must NOT carry an Authorization/Bearer header (Blob
   * Storage would reject a request bearing an unrelated auth scheme
   * alongside its own SAS query-string auth). */
  async uploadDocumentFile(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Document upload failed: ${res.status} ${res.statusText} — ${body}`);
    }
  }

  confirmDocumentUpload(projectId: string, input: ConfirmDocumentUploadInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/documents`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getDocumentDownloadUrl(projectId: string, documentId: string): Promise<{ downloadUrl: string }> {
    return this.request(`/projects/${projectId}/documents/${documentId}/download-url`);
  }

  deleteDocument(projectId: string, documentId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/documents/${documentId}`, { method: "DELETE" });
  }

  // --- Standalone documents (added 2026-10-08, stakeholder-evidence
  // document upload). Same two-step SAS flow as the project-scoped
  // methods above, just without a projectId — see
  // DocumentsStandaloneController in apps/api. ---

  requestStandaloneDocumentUploadUrl(input: RequestDocumentUploadInput): Promise<RequestDocumentUploadResult> {
    return this.request(`/documents/upload-url`, { method: "POST", body: JSON.stringify(input) });
  }

  confirmStandaloneDocumentUpload(input: ConfirmDocumentUploadInput): Promise<StandaloneDocumentSummary> {
    return this.request(`/documents`, { method: "POST", body: JSON.stringify(input) });
  }

  linkStandaloneDocument(input: LinkStandaloneDocumentInput): Promise<StandaloneDocumentSummary> {
    return this.request(`/documents/link`, { method: "POST", body: JSON.stringify(input) });
  }

  getStandaloneDocumentDownloadUrl(documentId: string): Promise<{ downloadUrl: string }> {
    return this.request(`/documents/${documentId}/download-url`);
  }

  deleteStandaloneDocument(documentId: string): Promise<void> {
    return this.request(`/documents/${documentId}`, { method: "DELETE" });
  }

  // --- Project status history / Leads / Contacts (added 2026-10-08) ---
  // Leads/Contacts calls return the full ProjectDetail, same convention as
  // addProjectLine/documents above — the caller just swaps project state
  // in on every mutation rather than re-fetching separately.

  getProjectStatusHistory(projectId: string): Promise<ProjectStatusHistoryEntry[]> {
    return this.request(`/projects/${projectId}/status-history`);
  }

  addProjectLead(projectId: string, input: AddProjectLeadInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/leads`, { method: "POST", body: JSON.stringify(input) });
  }

  removeProjectLead(projectId: string, userId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/leads/${userId}`, { method: "DELETE" });
  }

  addProjectContact(projectId: string, input: AddProjectContactInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/contacts`, { method: "POST", body: JSON.stringify(input) });
  }

  removeProjectContact(projectId: string, contactId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/contacts/${contactId}`, { method: "DELETE" });
  }

  // --- Contacts (added 2026-10-08) — read-only finder backing the Team &
  // Contacts picker above. See ContactsService's doc comment in apps/api. ---

  listContacts(): Promise<ContactSummary[]> {
    return this.request(`/contacts`);
  }

  // --- Partners (added 2026-09-27) ---

  listPartners(roleType?: string): Promise<PartnerSummary[]> {
    const query = roleType ? `?roleType=${encodeURIComponent(roleType)}` : "";
    return this.request(`/partners${query}`);
  }

  getPartner(id: string): Promise<PartnerSummary> {
    return this.request(`/partners/${id}`);
  }

  createPartner(input: CreatePartnerInput): Promise<PartnerSummary> {
    return this.request("/partners", { method: "POST", body: JSON.stringify(input) });
  }

  updatePartner(id: string, input: UpdatePartnerInput): Promise<PartnerSummary> {
    return this.request(`/partners/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Partner certifications / company checks / approval history
  // (added 2026-10-08) — single-record add/edit, filling the gap
  // updatePartner's addCertifications/addCompanyChecks left open (whole-
  // Partner-object, add-only). See AddPartnerCertificationInput's doc
  // comment in @universe/types.

  addPartnerCertification(partnerId: string, input: AddPartnerCertificationInput): Promise<PartnerCertificationSummary> {
    return this.request(`/partners/${partnerId}/certifications`, { method: "POST", body: JSON.stringify(input) });
  }

  updatePartnerCertification(
    partnerId: string,
    certId: string,
    input: UpdatePartnerCertificationInput,
  ): Promise<PartnerCertificationSummary> {
    return this.request(`/partners/${partnerId}/certifications/${certId}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  addPartnerCompanyCheck(partnerId: string, input: AddPartnerCompanyCheckInput): Promise<PartnerCompanyCheckSummary> {
    return this.request(`/partners/${partnerId}/company-checks`, { method: "POST", body: JSON.stringify(input) });
  }

  updatePartnerCompanyCheck(
    partnerId: string,
    checkId: string,
    input: UpdatePartnerCompanyCheckInput,
  ): Promise<PartnerCompanyCheckSummary> {
    return this.request(`/partners/${partnerId}/company-checks/${checkId}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  listPartnerApprovalHistory(partnerId: string): Promise<PartnerApprovalHistorySummary[]> {
    return this.request(`/partners/${partnerId}/approval-history`);
  }

  // --- Stakeholder registry (added 2026-10-02) — duplicate-prevention +
  // identity-consent gating, see StakeholderRegistryEntry in schema.prisma
  // and claude/sop-driven-quality-roadmap.md Section B3/C. ---

  searchStakeholderRegistry(
    type: string,
    q: string,
    field?: "name" | "registrationNumber" | "vatNumber",
  ): Promise<StakeholderRegistryMatch[]> {
    const query = `?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}${
      field ? `&field=${encodeURIComponent(field)}` : ""
    }`;
    return this.request(`/stakeholder-registry/search${query}`);
  }

  getStakeholderRegistryEntry(id: string): Promise<StakeholderRegistryDetail> {
    return this.request(`/stakeholder-registry/${id}`);
  }

  getStakeholderRegistryProducts(id: string): Promise<StakeholderRegistryProduct[]> {
    return this.request(`/stakeholder-registry/${id}/products`);
  }

  // --- Product catalog (added 2026-10-02) — the shared, central
  // ProductMaster search-or-create flow. See ProductCatalogService's doc
  // comment in apps/api and claude/product-catalog-build.md: CRM and the
  // future Supplier Portal app should call these same three methods rather
  // than rebuilding product search/creation. ---

  searchProductCatalog(q?: string, category?: string): Promise<ProductCatalogMatch[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/product-catalog/search${query}`);
  }

  getProductCatalogEntry(id: string): Promise<ProductCatalogDetail> {
    return this.request(`/product-catalog/${id}`);
  }

  /** GET /product-catalog/:id/price-history — ProductPriceHistory rows for
   * this catalogue entry. Added 2026-10-09. */
  getProductPriceHistory(productMasterId: string): Promise<ProductPriceHistoryPoint[]> {
    return this.request(`/product-catalog/${productMasterId}/price-history`);
  }

  createProductCatalogEntry(input: CreateProductMasterInput): Promise<ProductCatalogMatch> {
    return this.request("/product-catalog", { method: "POST", body: JSON.stringify(input) });
  }

  /** Paginated browse for the Product Database Management app's catalogue
   * screen — distinct from searchProductCatalog's 25-row typeahead. Added
   * 2026-10-03. */
  listProductCatalog(params?: {
    q?: string;
    category?: string;
    sourceStandard?: string;
    page?: number;
    pageSize?: number;
    includeArchived?: boolean;
    /** Added 2026-10-09 — Stage 0 point 3 (data completeness pass). */
    missingField?: "gtin" | "hsCode" | "unspscCode" | "standardUnit";
  }): Promise<ProductCatalogListResult> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.category) qs.set("category", params.category);
    if (params?.sourceStandard) qs.set("sourceStandard", params.sourceStandard);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.includeArchived) qs.set("includeArchived", "true");
    if (params?.missingField) qs.set("missingField", params.missingField);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/product-catalog${query}`);
  }

  /** GET /product-catalog/completeness-stats — Stage 0 point 3 (data
   * completeness pass). Added 2026-10-09. */
  getProductCatalogCompletenessStats(): Promise<ProductCatalogCompletenessStats> {
    return this.request(`/product-catalog/completeness-stats`);
  }

  /** GET /product-catalog/dashboard-stats — Stage 1 (standardised
   * dashboard pattern), applied to the catalogue screen. Added
   * 2026-10-09. */
  getProductCatalogDashboardStats(): Promise<ProductCatalogDashboardStats> {
    return this.request(`/product-catalog/dashboard-stats`);
  }

  /** Added 2026-10-09 — return type changed from a bare ProductCatalogMatch
   * to UpdateProductMasterResult: platform staff still get the applied
   * row back directly, but everyone else proposing a same-org amendment
   * gets back the new PENDING amendment's id instead (the live product is
   * untouched until a QA/RP user ratifies it) — see
   * ProductCatalogService.update()'s doc comment for the full design. */
  updateProductCatalogEntry(id: string, input: UpdateProductMasterInput): Promise<UpdateProductMasterResult> {
    return this.request(`/product-catalog/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** GET /product-catalog/:id/amendments — this product's amendment
   * history, tenant-scoped to the caller's own organisation. Added
   * 2026-10-09. */
  getProductAmendments(productMasterId: string): Promise<ProductAmendmentSummary[]> {
    return this.request(`/product-catalog/${productMasterId}/amendments`);
  }

  /** GET /product-catalog/amendments/:id — a single amendment by id, for
   * the QA Queue's "Review amendment" deep link. Added 2026-10-09. */
  getProductAmendment(amendmentId: string): Promise<ProductAmendmentSummary> {
    return this.request(`/product-catalog/amendments/${amendmentId}`);
  }

  /** POST /product-catalog/amendments/:id/ratify — applies the proposed
   * changes and marks the amendment APPROVED. Gated server-side on
   * products.approve. Added 2026-10-09. */
  ratifyProductAmendment(amendmentId: string): Promise<ProductAmendmentSummary> {
    return this.request(`/product-catalog/amendments/${amendmentId}/ratify`, { method: "POST" });
  }

  /** POST /product-catalog/amendments/:id/reject — marks the amendment
   * REJECTED; the live product is never touched. Added 2026-10-09. */
  rejectProductAmendment(amendmentId: string, input?: RejectProductAmendmentInput): Promise<ProductAmendmentSummary> {
    return this.request(`/product-catalog/amendments/${amendmentId}/reject`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    });
  }

  importProductCatalogRows(
    sourceStandard: "HS_CODE" | "WHO_EML" | "UNSPSC" | "GS1_GTIN",
    rows: ImportProductMasterRow[],
  ): Promise<ImportProductMasterResult> {
    return this.request("/product-catalog/import", {
      method: "POST",
      body: JSON.stringify({ sourceStandard, rows }),
    });
  }

  // --- Quality Assurance (added 2026-10-01) ---

  getQualityDashboard(): Promise<QualityDashboardSummary> {
    return this.request("/quality/dashboard");
  }

  getQaQueue(): Promise<QaQueueSummary> {
    return this.request("/quality/qa-queue");
  }

  // --- Reference data (added 2026-10-01) ---

  listCountries(): Promise<CountryOption[]> {
    return this.request("/countries");
  }

  listProductSourceApprovals(status?: string): Promise<ProductSourceApprovalSummary[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/quality/product-approvals${query}`);
  }

  createProductSourceApproval(input: CreateProductSourceApprovalInput): Promise<ProductSourceApprovalSummary> {
    return this.request("/quality/product-approvals", { method: "POST", body: JSON.stringify(input) });
  }

  updateProductSourceApproval(id: string, input: UpdateProductSourceApprovalInput): Promise<ProductSourceApprovalSummary> {
    return this.request(`/quality/product-approvals/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  getPartnerPerformance(roleType?: string): Promise<PartnerPerformanceMetric[]> {
    const query = roleType ? `?roleType=${encodeURIComponent(roleType)}` : "";
    return this.request(`/quality/performance${query}`);
  }

  listOrganizations(): Promise<OrganizationSummary[]> {
    return this.request("/organizations");
  }

  createOrganization(input: CreateOrganizationInput): Promise<OrganizationSummary> {
    return this.request("/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listOrganizationRoles(organizationId: string): Promise<RoleSummary[]> {
    return this.request(`/organizations/${organizationId}/roles`);
  }

  listUsers(organizationId?: string): Promise<UserSummary[]> {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
    return this.request(`/users${query}`);
  }

  inviteUser(input: InviteUserInput): Promise<UserSummary> {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  deactivateUser(id: string): Promise<UserSummary> {
    return this.request(`/users/${id}`, { method: "DELETE" });
  }

  updateUserRoles(id: string, roleIds: string[]): Promise<UserSummary> {
    return this.request(`/users/${id}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roleIds }),
    });
  }

  // --- Supplier/manufacturer marketplace (added 2026-09-24) ---

  searchSupplierDirectory(params: { category?: string; countryCode?: string } = {}): Promise<SupplierSearchResult[]> {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ).toString();
    return this.request(`/supplier-directory/search${query ? `?${query}` : ""}`);
  }

  getSupplierProfile(organizationId: string): Promise<SupplierProfile & { countryCodes: string[] }> {
    return this.request(`/supplier-directory/profile/${organizationId}`);
  }

  getMySupplierProfile(): Promise<SupplierProfile | null> {
    return this.request("/supplier-directory/profile/me");
  }

  upsertMySupplierProfile(input: UpsertSupplierProfileInput): Promise<SupplierProfile> {
    return this.request("/supplier-directory/profile/me", { method: "PUT", body: JSON.stringify(input) });
  }

  publishMySupplierProfile(): Promise<SupplierProfile> {
    return this.request("/supplier-directory/profile/me/publish", { method: "POST" });
  }

  unpublishMySupplierProfile(): Promise<SupplierProfile> {
    return this.request("/supplier-directory/profile/me/unpublish", { method: "POST" });
  }

  setMySupplierCountryPresence(countryCodes: string[]): Promise<{ countryCode: string }[]> {
    return this.request("/supplier-directory/profile/me/countries", {
      method: "PUT",
      body: JSON.stringify({ countryCodes }),
    });
  }

  listMySupplierProducts(): Promise<SupplierProduct[]> {
    return this.request("/supplier-directory/products/me");
  }

  createSupplierProduct(input: CreateSupplierProductInput): Promise<SupplierProduct> {
    return this.request("/supplier-directory/products", { method: "POST", body: JSON.stringify(input) });
  }

  updateSupplierProduct(id: string, input: UpdateSupplierProductInput): Promise<SupplierProduct> {
    return this.request(`/supplier-directory/products/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Buyer selects a published supplier product — records interest for the
   * supplier to see; does not itself modify the buyer's own project data
   * (see SupplierDirectoryService.selectProduct's doc comment). */
  selectSupplierProduct(id: string): Promise<SupplierSearchResult> {
    return this.request(`/supplier-directory/products/${id}/select`, { method: "POST" });
  }

  getMySupplierLeads(): Promise<SupplierLead[]> {
    return this.request("/supplier-directory/leads/me");
  }

  // --- Evidence & standards catalog (GDP gap-closing, Gap 3 — added
  // 2026-10-07/08). See EvidenceStandardSummary/StakeholderEvidenceRecordSummary
  // doc comments in @universe/types and EvidenceService in apps/api. ---

  listEvidenceStandards(stakeholderType?: string, includeInactive?: boolean): Promise<EvidenceStandardSummary[]> {
    const qs = new URLSearchParams();
    if (stakeholderType) qs.set("stakeholderType", stakeholderType);
    if (includeInactive) qs.set("includeInactive", "true");
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/evidence-standards${query}`);
  }

  createEvidenceStandard(input: CreateEvidenceStandardInput): Promise<EvidenceStandardSummary> {
    return this.request("/evidence-standards", { method: "POST", body: JSON.stringify(input) });
  }

  updateEvidenceStandard(id: string, input: UpdateEvidenceStandardInput): Promise<EvidenceStandardSummary> {
    return this.request(`/evidence-standards/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  listEvidenceRecordsForPartner(partnerId: string): Promise<StakeholderEvidenceRecordSummary[]> {
    return this.request(`/partners/${partnerId}/evidence-records`);
  }

  createEvidenceRecord(input: CreateEvidenceRecordInput): Promise<StakeholderEvidenceRecordSummary> {
    return this.request("/evidence-records", { method: "POST", body: JSON.stringify(input) });
  }

  updateEvidenceRecord(id: string, input: UpdateEvidenceRecordInput): Promise<StakeholderEvidenceRecordSummary> {
    return this.request(`/evidence-records/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Gap 2's e-signature meaning statement — see verifyRecord's doc
   * comment in EvidenceService. */
  verifyEvidenceRecord(id: string, input: VerifyEvidenceRecordInput): Promise<StakeholderEvidenceRecordSummary> {
    return this.request(`/evidence-records/${id}/verify`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Product batches & temperature logs (Gaps 5/6 — added 2026-10-07/08).
  // See ProductBatchSummary/ProductBatchDetail/BatchTemperatureLogSummary
  // doc comments in @universe/types and ProductBatchesService in apps/api. ---

  searchProductBatches(params?: SearchProductBatchesInput): Promise<ProductBatchSummary[]> {
    const qs = new URLSearchParams();
    if (params?.batchNumber) qs.set("batchNumber", params.batchNumber);
    if (params?.productMasterId) qs.set("productMasterId", params.productMasterId);
    if (params?.manufacturerId) qs.set("manufacturerId", params.manufacturerId);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/batches${query}`);
  }

  getProductBatch(id: string): Promise<ProductBatchDetail> {
    return this.request(`/batches/${id}`);
  }

  createProductBatch(input: CreateProductBatchInput): Promise<ProductBatchSummary> {
    return this.request("/batches", { method: "POST", body: JSON.stringify(input) });
  }

  updateProductBatch(id: string, input: UpdateProductBatchInput): Promise<ProductBatchSummary> {
    return this.request(`/batches/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  addBatchTemperatureLog(batchId: string, input: CreateTemperatureLogInput): Promise<BatchTemperatureLogSummary> {
    return this.request(`/batches/${batchId}/temperature-logs`, { method: "POST", body: JSON.stringify(input) });
  }

  reviewBatchTemperatureLog(logId: string, input: ReviewTemperatureLogInput): Promise<BatchTemperatureLogSummary> {
    return this.request(`/batches/temperature-logs/${logId}/review`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Follow-up frontend pass (added 2026-10-07/08) — Gap 1's audit-log
  // viewer, Gap 3's re-verification dashboard, Gap 4's risk register, and
  // Gap 7's controlled-document module. See AuditLogService,
  // RiskAssessmentsService, EvidenceService.listDueForReVerification, and
  // ControlledDocumentsService in apps/api. ---

  /** Gap 1 — the full field-change history for one record, newest first. */
  getAuditLog(tableName: string, recordId: string): Promise<FieldChangeLogEntry[]> {
    const qs = new URLSearchParams({ tableName, recordId });
    return this.request(`/audit-log?${qs.toString()}`);
  }

  /** Gap 4 — the risk register entries logged against one subject
   * (e.g. subjectType "PARTNER" + a Partner id). */
  listRiskAssessments(subjectType: string, subjectId: string): Promise<RiskAssessmentSummary[]> {
    const qs = new URLSearchParams({ subjectType, subjectId });
    return this.request(`/risk-assessments?${qs.toString()}`);
  }

  /** Gap 4 follow-up — every risk across the organisation (the standalone
   * Risk Register page), with each row's subject display name already
   * resolved server-side. */
  listAllRiskAssessments(): Promise<RiskAssessmentListItem[]> {
    return this.request("/risk-assessments/all");
  }

  createRiskAssessment(input: CreateRiskAssessmentInput): Promise<RiskAssessmentSummary> {
    return this.request("/risk-assessments", { method: "POST", body: JSON.stringify(input) });
  }

  updateRiskAssessment(id: string, input: UpdateRiskAssessmentInput): Promise<RiskAssessmentSummary> {
    return this.request(`/risk-assessments/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Gap 4 — a dedicated "Close" action requiring a reason, distinct from
   * the generic update() above — see CloseRiskAssessmentInput's doc
   * comment in @universe/types. */
  closeRiskAssessment(id: string, input: CloseRiskAssessmentInput): Promise<RiskAssessmentSummary> {
    return this.request(`/risk-assessments/${id}/close`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Gap 3 — evidence records coming due (or overdue) for re-verification,
   * across every partner in the organisation. */
  listEvidenceDueForReview(withinDays?: number): Promise<EvidenceDueForReviewSummary[]> {
    const qs = withinDays !== undefined ? `?withinDays=${withinDays}` : "";
    return this.request(`/evidence-records/due-for-review${qs}`);
  }

  // --- Gap 7 — controlled documents (Unimed's own SOPs/policies). ---

  listControlledDocuments(category?: string): Promise<ControlledDocumentSummary[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request(`/controlled-documents${qs}`);
  }

  createControlledDocument(input: CreateControlledDocumentInput): Promise<ControlledDocumentSummary> {
    return this.request("/controlled-documents", { method: "POST", body: JSON.stringify(input) });
  }

  updateControlledDocument(id: string, input: UpdateControlledDocumentInput): Promise<ControlledDocumentSummary> {
    return this.request(`/controlled-documents/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Supply-chain CO2/distance/efficiency (added 2026-10-08) — see
  // supply-chain-co2-efficiency.md. getLogisticsLines is org-private
  // (this organization's own lines); getGlobalLogisticsRoutes and
  // getGlobalStakeholderRatings are the anonymized, cross-tenant views.
  // All three share the same filter shape. ---

  private logisticsQueryString(filters?: LogisticsFilters): string {
    if (!filters) return "";
    const qs = new URLSearchParams();
    if (filters.manufactureCountryCode) qs.set("manufactureCountryCode", filters.manufactureCountryCode);
    if (filters.destinationCountryCode) qs.set("destinationCountryCode", filters.destinationCountryCode);
    if (filters.transportMode) qs.set("transportMode", filters.transportMode);
    if (filters.incoterm) qs.set("incoterm", filters.incoterm);
    if (filters.commodityGroup) qs.set("commodityGroup", filters.commodityGroup);
    if (filters.scoreBand) qs.set("scoreBand", filters.scoreBand);
    if (filters.minDurationDays !== undefined) qs.set("minDurationDays", String(filters.minDurationDays));
    if (filters.maxDurationDays !== undefined) qs.set("maxDurationDays", String(filters.maxDurationDays));
    if (filters.search) qs.set("search", filters.search);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  getLogisticsLines(filters?: LogisticsFilters): Promise<OrgLogisticsLineSummary[]> {
    return this.request(`/logistics-insights/lines${this.logisticsQueryString(filters)}`);
  }

  getGlobalLogisticsRoutes(filters?: LogisticsFilters): Promise<LogisticsRouteSummary[]> {
    return this.request(`/logistics-insights/global/routes${this.logisticsQueryString(filters)}`);
  }

  getGlobalStakeholderRatings(): Promise<StakeholderRatingBucket[]> {
    return this.request("/logistics-insights/global/stakeholder-ratings");
  }

  getGlobalProductSourcing(): Promise<ProductSourcingSummary[]> {
    return this.request("/product-sourcing-insights/global");
  }
}
