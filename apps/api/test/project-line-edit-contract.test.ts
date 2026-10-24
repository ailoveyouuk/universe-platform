import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext } from "@universe/db";
import { projectLineSummaryToInput } from "@universe/types";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProjectLineDto } from "../src/projects/dto/project-line.dto";
import { ProjectsService } from "../src/projects/projects.service";

/**
 * Contract between the line the API returns and the body the edit form sends back (2026-10-24). The edit form turns a line it was given
 * into an update body; the API validates with whitelist + forbidNonWhitelisted, so any field the form echoes that the DTO does not list
 * is a 400 on save. That happened with the server-computed on-time/in-full flags and was only found by a live walkthrough. This test
 * takes a real line from the API, runs it through the same mapper the form uses, and checks the result against the real DTO and a real save.
 */
describe("Project line edit contract", () => {
  const suffix = randomUUID().slice(0, 8);
  const projects = new ProjectsService({} as never);
  let orgId: string; let projectId: string;
  const user = (): RequestUser => ({
    id: randomUUID(), organizationId: orgId, homeOrganizationId: orgId, email: `lc-${suffix}@example.com`, forename: "T", surname: "T", organizationName: "x",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["projects.view", "projects.edit", "projects.financials.view", "projects.financials.edit"],
  });

  beforeAll(async () => {
    orgId = (await createOrganizationWithDefaultRoles({ name: `LineContract ${suffix}`, slug: `lc-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      projectId = (await tx.project.create({ data: { organizationId: orgId, referenceNumber: `LC-${suffix}`, title: "Contract", category: "PROCUREMENT", projectType: "NON_PHARMACEUTICAL" } })).id;
    });
  });

  it("a line read from the API maps to a body the line DTO accepts, with every dated, priced and delivered field filled", async () => {
    const created = await projects.addLine(user(), projectId, {
      clientProductDescription: "Wooden pallets", quantity: 400, productCategory: "LOGISTICS_SERVICES", weightKg: 12000, supplierUnitPrice: 14.5, productMarginPercent: 12,
      goodsCollectedDate: "2026-10-01", goodsDeliveredToClientDate: "2026-10-31", projectedDeliveryDate: "2026-11-03", actualDeliveryDate: "2026-10-31", gad: "2026-11-01", supplierGad: "2026-10-05", quantityReceived: 400,
    } as never);
    const line = created.lines[0];
    // Make sure the computed flags are really present on what the API returned, otherwise the test would prove nothing.
    expect(line.internalOnTime).not.toBeUndefined();
    expect(line.supplierOnTime).not.toBeUndefined();
    expect(line.supplierInFull).not.toBeUndefined();

    const body = projectLineSummaryToInput(line);
    const dto = plainToInstance(ProjectLineDto, JSON.parse(JSON.stringify(body)));
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join("; ")}`)).toEqual([]);
  });

  it("saving that body back succeeds and keeps the values", async () => {
    const detail = await projects.findOne(user(), projectId);
    const line = detail.lines[0];
    const body = { ...projectLineSummaryToInput(line), clientProductDescription: "Wooden pallets (edited)" };
    const dto = plainToInstance(ProjectLineDto, JSON.parse(JSON.stringify(body)));
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    const updated = await projects.updateLine(user(), projectId, line.id, dto);
    const again = updated.lines.find((l) => l.id === line.id)!;
    expect(again.clientProductDescription).toBe("Wooden pallets (edited)");
    expect(Number(again.supplierUnitPrice)).toBe(14.5);
    expect(again.productCategory).toBe("LOGISTICS_SERVICES");
  });
});
