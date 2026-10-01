import type {
  AuthenticatedUser,
  ConfirmDocumentUploadInput,
  CreateOrganizationInput,
  CreatePartnerInput,
  CreateProjectInput,
  CreateSupplierEnquiryInput,
  CreateSupplierProductInput,
  InviteUserInput,
  OrganizationSummary,
  PartnerSummary,
  ProjectDetail,
  ProjectLineInput,
  ProjectSummary,
  RequestDocumentUploadInput,
  RequestDocumentUploadResult,
  RoleSummary,
  SupplierLead,
  SupplierProduct,
  SupplierProfile,
  SupplierSearchResult,
  UpdatePartnerInput,
  UpdateProjectInput,
  UpdateSupplierEnquiryInput,
  UpdateSupplierProductInput,
  UpsertSupplierProfileInput,
  UserSummary,
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
      throw new Error(`API request failed: ${res.status} ${res.statusText} — ${body}`);
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

  createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    return this.request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) });
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
}
