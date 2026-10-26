import { describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const tx = {
  crmRelationship: { findFirst: async () => ({ partnerId: "p1" }) },
  partner: { findFirst: async () => ({ approvalStatus: "APPROVED", lastApprovalReviewDate: null, nextApprovalReviewDue: null }) },
  contact: { findMany: async () => { calls.push("contacts"); return []; } },
  project: { count: async () => { calls.push("projects"); return 0; }, findMany: async () => [] },
  projectLine: { findMany: async () => [] },
  qualityComplaint: { count: async () => { calls.push("complaints"); return 0; }, findMany: async () => [] },
  partnerCertification: { findMany: async () => [] },
  partnerCompanyCheck: { findMany: async () => [] },
  partnerApprovalHistory: { findMany: async () => [] },
};
vi.mock("@universe/db", () => ({ withTenantContext: async (_o: string, fn: (t: unknown) => unknown) => fn(tx) }));

const { CrmService } = await import("../src/crm/crm.service");
const user = (over: Record<string, unknown>) => ({ id: "u", organizationId: "o", platformStaffRole: "NONE", permissions: ["crm.view"], apps: ["crm"], ...over }) as never;

describe("Relationship 360 respects the other apps' access", () => {
  const svc = new CrmService({} as never);
  it("hides contacts, projects and complaints from someone with only the CRM", async () => {
    calls.length = 0;
    const d = await svc.detail(user({}), "r1");
    expect(d.contacts).toBeNull(); expect(d.projects).toBeNull(); expect(d.complaints).toBeNull();
    expect(calls).toEqual([]);
  });
  it("shows contacts and projects with Project Management access and the projects permission, complaints only with the quality permission", async () => {
    calls.length = 0;
    const d = await svc.detail(user({ apps: ["crm", "project-management"], permissions: ["crm.view", "projects.view"] }), "r1");
    expect(d.contacts).toEqual([]); expect(d.projects).toEqual({ total: 0, items: [] }); expect(d.complaints).toBeNull();
    const e = await svc.detail(user({ apps: ["crm", "project-management"], permissions: ["crm.view", "quality.complaints.view"] }), "r1");
    expect(e.projects).toBeNull(); expect(e.complaints).toEqual({ total: 0, items: [] });
  });
});
