import type {
  AuthenticatedUser,
  CreateOrganizationInput,
  CreatePartnerInput,
  CreateProjectInput,
  CreateSupplierProductInput,
  InviteUserInput,
  OrganizationSummary,
  PartnerSummary,
  ProjectDetail,
  ProjectLineInput,
  ProjectSummary,
  RoleSummary,
  SupplierLead,
  SupplierProduct,
  SupplierProfile,
  SupplierSearchResult,
  UpdatePartnerInput,
  UpdateProjectInput,
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
