import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "@universe/db";
import { describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { generateScaleData, PROFILES } from "../../../packages/db/scripts/generate-scale-data";
import { AuditLogService } from "../src/audit-log/audit-log.service";
import { ContactsService } from "../src/contacts/contacts.service";
import { LogisticsInsightsService } from "../src/logistics-insights/logistics-insights.service";
import { OrganizationsService } from "../src/organizations/organizations.service";
import { PartnerPerformanceService } from "../src/quality/partner-performance.service";
import { PartnersService } from "../src/partners/partners.service";
import { ProductBatchesService } from "../src/batches/product-batches.service";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductSourceApprovalsService } from "../src/quality/product-source-approvals.service";
import { ProjectsService } from "../src/projects/projects.service";
import { QaQueueService } from "../src/quality/qa-queue.service";
import { RiskAssessmentsService } from "../src/risk-assessments/risk-assessments.service";
import { SearchService } from "../src/search/search.service";
import { UsersService } from "../src/users/users.service";

/**
 * Generates the scale dataset into the throwaway test database and times every
 * list / search / rollup the apps call, as the busiest organisation's admin and
 * as platform staff. Report-only: it never fails on slowness — the table it
 * writes (scale-report.md) is the deliverable. See docs/SCALE-AUDIT.md.
 */
const PROFILE = process.env.SCALE_PROFILE ?? "small";

function user(organizationId: string, staff: boolean): RequestUser {
  return {
    id: randomUUID(),
    organizationId,
    homeOrganizationId: organizationId,
    email: "scale@sim.example",
    forename: "Scale",
    surname: "Tester",
    organizationName: "x",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole: staff ? "SUPER_ADMIN" : "NONE",
    permissions: ["projects.view", "projects.edit", "projects.financials.view", "org.users.manage", "org.profile.manage", "org.roles.manage", "products.approve", "partners.approve", "qa.queue.view", "partners.financials.view"],
  } as RequestUser;
}

describe(`Scale measurement (${PROFILE})`, () => {
  it("generates data and times every list endpoint", async () => {
    const tGen = Date.now();
    const { whaleOrgId: busiestOrgId } = await generateScaleData(PROFILE, 1);
    const genSeconds = (Date.now() - tGen) / 1000;

    const counts = await withPlatformStaffContext(async (tx) => ({
      organizations: await tx.organization.count(),
      users: await tx.user.count(),
      products: await tx.productMaster.count(),
      partners: await tx.partner.count(),
      projects: await tx.project.count(),
      lines: await tx.projectLine.count(),
      batches: await tx.productBatch.count(),
      risks: await tx.riskAssessment.count(),
      auditRows: await tx.fieldChangeLog.count(),
    }));

    const staff = user(busiestOrgId, true);
    const admin = user(busiestOrgId, false);
    const rows: { name: string; ms: number; cold?: number; size: string }[] = [];
    async function time(name: string, fn: () => Promise<unknown>) {
      const t = Date.now();
      try {
        const out: any = await fn();
        const cold = Date.now() - t;
        const t2 = Date.now();
        await fn();
        const warm = Date.now() - t2;
        const size = Array.isArray(out) ? `${out.length} rows` : out?.items ? `${out.items.length} items` : "ok";
        rows.push({ name, ms: warm, cold, size });
      } catch (e) {
        rows.push({ name, ms: Date.now() - t, size: `ERROR ${(e as Error).message.slice(0, 80)}` });
      }
    }

    const projects = new ProjectsService({} as never);
    await time("GET /users (platform staff, all orgs)", () => new UsersService().findAll(staff));
    await time("GET /users (largest org admin)", () => new UsersService().findAll(admin));
    await time("GET /organizations (platform staff)", () => new (OrganizationsService as any)({} as never, {} as never, {} as never).findAll(staff));
    await time("GET /partners", () => new (PartnersService as any)({} as never, {} as never).findAll(admin));
    await time("GET /projects", () => projects.findAll(admin));
    await time("GET /projects/financial-summary", () => projects.getFinancialSummary(admin));
    await time("GET /contacts", () => new ContactsService().findAll(admin));
    await time("GET /product-batches (search)", () => new ProductBatchesService().search(admin, {} as never));
    await time("GET /risk-assessments/all", () => new (RiskAssessmentsService as any)().listAll(admin));
    await time("GET /quality/product-approvals", () => new ProductSourceApprovalsService().findAll(admin));
    await time("GET /quality/performance", () => new PartnerPerformanceService().getPerformance(admin));
    await time("GET /quality/qa-queue", () => new QaQueueService().getQueue(admin));
    await time("GET /logistics-insights/lines", () => new LogisticsInsightsService().getOrgLines(admin, {} as never));
    // global routes read the separate insights database, which the throwaway setup does not have — not measurable here.
    await time("GET /product-catalog (page 1)", () => new (ProductCatalogService as any)({} as never).list({ page: 1, pageSize: 50 }));
    await time("GET /product-catalog/search?q=syringe", () => new (ProductCatalogService as any)({} as never).search("syringe"));
    await time("GET /product-catalog/dashboard-stats", () => new (ProductCatalogService as any)({} as never).getDashboardStats());
    await time("GET /search?q=syringe (global search)", () => new SearchService().search(admin, "syringe"));
    await time("GET /audit-log/feed (platform staff)", () => new AuditLogService().feed(staff, {}));

    const report = [
      `# Scale report — profile \`${PROFILE}\``,
      "",
      `The "admin" calls run as the largest simulated organisation (a quarter of all partners and projects). Generated in ${genSeconds.toFixed(0)}s. Row counts: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}.`,
      "Engine: Azure SQL Edge (container) — absolute times will differ on Azure SQL; use for relative comparison and to find the slow ones.",
      "",
      "Times are service-level (database + mapping), no network, JSON or screen rendering. Warm = second call; cold = first.",
      "",
      "| Endpoint | Warm (ms) | Cold (ms) | Result |",
      "|---|---:|---:|---|",
      ...rows.sort((a, b) => b.ms - a.ms).map((r) => `| ${r.name} | ${r.ms} | ${r.cold ?? ""} | ${r.size} |`),
    ].join("\n");
    writeFileSync("scale-report.md", report);
    console.log("\n" + report + "\n");

    expect(PROFILES[PROFILE]).toBeDefined();
    expect(counts.users).toBeGreaterThan(0);
    await prisma.$disconnect();
  });
});
