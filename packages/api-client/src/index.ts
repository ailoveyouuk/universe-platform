import type {
  AuthenticatedUser,
  CreateProjectInput,
  InviteUserInput,
  OrganizationSummary,
  ProjectSummary,
  RoleSummary,
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

  getProject(id: string): Promise<ProjectSummary> {
    return this.request(`/projects/${id}`);
  }

  createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listOrganizations(): Promise<OrganizationSummary[]> {
    return this.request("/organizations");
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
}
