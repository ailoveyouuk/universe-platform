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
  /** BUYER (default) or SUPPLIER — added 2026-09-24, see Organization.type's
   * doc comment in schema.prisma. */
  type: "BUYER" | "SUPPLIER";
  /** Added 2026-09-26 — see Organization.logoUrl's doc comment. */
  logoUrl: string | null;
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
  /** BUYER (default) or SUPPLIER — see Organization.type's doc comment in
   * schema.prisma. */
  type?: "BUYER" | "SUPPLIER";
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
