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

export interface CreateProjectInput {
  referenceNumber: string;
  title: string;
  category: "PROCUREMENT" | "TECHNICAL_ASSISTANCE";
  projectType: "PHARMACEUTICAL" | "NON_PHARMACEUTICAL";
  clientId?: string;
  deliveryCountry?: string;
  startDate?: string;
  dueDate?: string;
  productCategory?: string;
  clientProductDescription?: string;
  quantity?: number;
}

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  forename: string;
  surname: string;
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
}

export interface RoleSummary {
  id: string;
  name: string;
  appScope: string;
}
