import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { QualityComplaintsService } from "../src/quality/quality-complaints.service";

describe("Quality complaints", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new QualityComplaintsService();
  let org: string; let other: string; let logger: string; let investigator: string; let approver: string; let partnerId: string;

  const ALL = ["quality.complaints.view", "quality.complaints.log", "quality.complaints.investigate", "quality.complaints.approve"];
  const as = (organizationId: string, id: string, permissions: string[]): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `c-${id.slice(0, 6)}@example.com`, forename: "Test", surname: "User",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions,
  });
  const logU = () => as(org, logger, ["quality.complaints.view", "quality.complaints.log"]);
  const invU = () => as(org, investigator, ALL);
  const appU = () => as(org, approver, ALL);
  const past = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `C Org ${suffix}`, slug: `c-org-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    other = (await createOrganizationWithDefaultRoles({ name: `C Other ${suffix}`, slug: `c-oth-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    await withPlatformStaffContext(async (tx) => {
      const mk = async (organizationId: string, tag: string) => (await tx.user.create({ data: { organizationId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "C", status: "ACTIVE", entraObjectId: `oid-c-${tag}-${suffix}` } })).id;
      logger = await mk(org, "log"); investigator = await mk(org, "inv"); approver = await mk(org, "app");
      // The quality leads are found by role, so give the investigator and approver a role carrying the complaint permissions.
      const role = await tx.role.create({ data: { organizationId: org, name: `Complaint leads ${suffix}`, appScope: "*" } });
      for (const key of ALL) {
        const perm = await tx.permission.upsert({ where: { key }, update: {}, create: { key, description: key } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
      }
      for (const uid of [investigator, approver]) await tx.userRole.create({ data: { userId: uid, roleId: role.id } });
    });
    await withTenantContext(org, async (tx) => {
      partnerId = (await tx.partner.create({ data: { organizationId: org, name: `Complained-about Ltd ${suffix}`, normalizedName: `complained-about ltd ${suffix}` } })).id;
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  const log = (over: Record<string, unknown> = {}) =>
    svc.create(logU(), { direction: "INBOUND_CLIENT", title: `Damaged cartons ${suffix}`, description: "Cartons arrived crushed.", receivedAt: past(1), partnerId, complainantName: "A. Client", complainantEmail: "a@client.example", ...over } as never);

  /** Runs a complaint to RESOLVED so closure rules can be tested. */
  const toResolved = async (over: Record<string, unknown> = {}) => {
    const c = await log(over);
    await svc.acknowledge(logU(), c.id);
    await svc.triage(invU(), c.id, { category: "PRODUCT_QUALITY", severity: "MAJOR", ownerId: investigator, investigatorId: investigator } as never);
    await svc.saveInvestigation(invU(), c.id, { outcome: "UPHELD", rootCauseCategory: "HANDLING_STORAGE", findings: "Pallet was double-stacked.", complete: true });
    return svc.resolve(invU(), c.id, { remedyType: "REPLACEMENT" } as never);
  };

  it("logs with a per-year reference, clocks and a timeline entry", async () => {
    const c = await log();
    expect(c.referenceNumber).toMatch(/^CMP-\d{4}-\d{4}$/);
    expect(c.status).toBe("LOGGED");
    expect(c.acknowledgeDueAt).toBeTruthy();
    expect(c.events[0].summary).toMatch(/Logged/);
    const second = await log();
    expect(Number(second.referenceNumber.slice(-4))).toBe(Number(c.referenceNumber.slice(-4)) + 1);
  });

  it("walks the whole workflow and writes field-level audit rows", async () => {
    const c = await toResolved();
    expect(c.status).toBe("RESOLVED");
    expect(c.severity).toBe("MAJOR");
    const closed = await svc.close(appU(), c.id, { closureSummary: "Replaced; storage rule reinforced." });
    expect(closed.status).toBe("CLOSED");
    const log = await withTenantContext(org, (tx) => tx.fieldChangeLog.findMany({ where: { tableName: "quality_complaints", recordId: c.id } }));
    expect(log.some((l) => l.fieldName === "status" && l.newValue === "CLOSED")).toBe(true);
  });

  it("enforces stage order", async () => {
    const c = await log();
    await expect(svc.resolve(invU(), c.id, { remedyType: "CREDIT" } as never)).rejects.toThrow(/investigation/i);
    await expect(svc.saveInvestigation(invU(), c.id, { findings: "x" })).rejects.toThrow(/Triage/);
    await expect(svc.close(appU(), c.id, { closureSummary: "x" })).rejects.toThrow(/resolved/i);
  });

  it("will not complete an investigation without outcome, root cause and findings", async () => {
    const c = await log();
    await svc.triage(invU(), c.id, { category: "DELIVERY", severity: "MINOR", ownerId: investigator } as never);
    await expect(svc.saveInvestigation(invU(), c.id, { outcome: "UPHELD", complete: true })).rejects.toThrow(/root-cause/);
  });

  it("flags serious cases as critical, fast-tracks triage and alerts the quality leads", async () => {
    const c = await log({ flagPatientSafety: true, severity: "MINOR" });
    expect(c.isSerious).toBe(true);
    expect(c.severity).toBe("CRITICAL");
    const notes = await withTenantContext(org, (tx) => tx.notification.findMany({ where: { subjectType: "complaint", subjectId: c.id, kind: "COMPLAINT_SERIOUS" } }));
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.requiresAction)).toBe(true);
    const normal = await log();
    expect(new Date(c.triageDueAt!).getTime()).toBeLessThan(new Date(normal.triageDueAt!).getTime());
    // triage cannot lower a serious case
    const t = await svc.triage(invU(), c.id, { category: "SAFETY", severity: "MINOR", ownerId: investigator } as never);
    expect(t.severity).toBe("CRITICAL");
    expect(t.regulatorDecision).toBe("UNDER_CONSIDERATION");
  });

  it("will not close a serious complaint until the regulator-reporting decision is recorded", async () => {
    const c = await toResolved({ flagSuspectedFalsified: true });
    await expect(svc.close(appU(), c.id, { closureSummary: "x" })).rejects.toThrow(/regulator/i);
    await expect(svc.recordRegulatorDecision(appU(), c.id, { decision: "REPORTED", reason: "Suspected falsified" } as never)).rejects.toThrow(/reference/);
    await svc.recordRegulatorDecision(appU(), c.id, { decision: "REPORTED", reason: "Suspected falsified", reference: "MHRA-123" } as never);
    expect((await svc.close(appU(), c.id, { closureSummary: "Reported and contained." })).status).toBe("CLOSED");
  });

  it("four-eyes: the investigator cannot approve closure without a recorded reason", async () => {
    const c = await toResolved();
    const asInvestigator = invU();
    await expect(svc.close(asInvestigator, c.id, { closureSummary: "Done" })).rejects.toThrow(/investigated/);
    const closed = await svc.close(asInvestigator, c.id, { closureSummary: "Done", overrideReason: "Only qualified person on site" });
    expect(closed.closureOverrideReason).toMatch(/qualified/);
  });

  it("corrective actions block closure until done, and notify the owner", async () => {
    const c = await toResolved();
    const withAction = await svc.addAction(invU(), c.id, { type: "CORRECTIVE", description: "Retrain loaders", ownerId: logger, dueDate: future(7) });
    const a = withAction.actions[0];
    const note = await withTenantContext(org, (tx) => tx.notification.findFirst({ where: { subjectType: "complaint-action", subjectId: a.id, recipientUserId: logger } }));
    expect(note?.actionStatus).toBe("OPEN");
    await expect(svc.close(appU(), c.id, { closureSummary: "x" })).rejects.toThrow(/still open/);
    // only the owner or an investigator may update it
    await svc.updateAction(logU(), c.id, a.id, { status: "DONE", completionNotes: "Done" });
    const after = await withTenantContext(org, (tx) => tx.notification.findFirst({ where: { subjectType: "complaint-action", subjectId: a.id } }));
    expect(after?.actionStatus).toBe("DONE");
    expect((await svc.close(appU(), c.id, { closureSummary: "All done" })).status).toBe("CLOSED");
  });

  it("holds and resumes where it left off; withdraw and reopen are recorded and counted", async () => {
    const c = await log();
    await svc.triage(invU(), c.id, { category: "SERVICE", severity: "MINOR", ownerId: investigator } as never);
    expect((await svc.hold(invU(), c.id, "Waiting for batch records")).status).toBe("ON_HOLD");
    expect((await svc.resume(invU(), c.id)).status).toBe("TRIAGED");
    expect((await svc.withdraw(appU(), c.id, "Complainant withdrew")).status).toBe("WITHDRAWN");
    const re = await svc.reopen(appU(), c.id, "Complainant raised it again");
    expect(re.reopenCount).toBe(1);
    expect(re.status).toBe("TRIAGED");
  });

  it("supply-chain complaints record the partner's response and are not acknowledged to a complainant", async () => {
    const c = await log({ direction: "OUTBOUND_SUPPLY_CHAIN", title: `Late forwarder ${suffix}` });
    expect(c.acknowledgeDueAt).toBeNull();
    expect(c.partnerResponseDueAt).toBeTruthy();
    await expect(svc.acknowledge(logU(), c.id)).rejects.toThrow(/client complaints/);
    const r = await svc.recordPartnerResponse(invU(), c.id, { partnerResponse: "Port congestion." });
    expect(r.partnerRespondedAt).toBeTruthy();
    await expect(svc.recordPartnerResponse(invU(), (await log()).id, { partnerResponse: "x" })).rejects.toThrow(/supply-chain/);
  });

  it("raises a risk-register entry against the complaint", async () => {
    const c = await log();
    const d = await svc.raiseRisk(invU(), c.id, { severity: "HIGH", likelihood: "MEDIUM" });
    expect(d.risks).toHaveLength(1);
    const r = await withTenantContext(org, (tx) => tx.riskAssessment.findFirst({ where: { subjectType: "COMPLAINT", subjectId: c.id } }));
    expect(r?.severity).toBe("HIGH");
  });

  it("hides the complainant's personal data from people without the view permission", async () => {
    const c = await log();
    const mid = as(org, logger, ["quality.complaints.view"]);
    expect((await svc.get(mid, c.id)).complainantEmail).toBe("a@client.example");
    await expect(svc.get(as(org, logger, ["quality.complaints.log"]), c.id)).rejects.toThrow(/Missing permission/);
  });

  it("checks permissions per stage", async () => {
    const c = await log();
    await expect(svc.triage(logU(), c.id, { category: "OTHER", severity: "MINOR", ownerId: investigator } as never)).rejects.toThrow(/Missing permission/);
    await expect(svc.close(as(org, investigator, ["quality.complaints.view", "quality.complaints.investigate"]), c.id, { closureSummary: "x" })).rejects.toThrow(/Missing permission/);
  });

  it("refuses links to records in another organisation and keeps complaints private to their organisation", async () => {
    const foreign = await withTenantContext(other, (tx) => tx.partner.create({ data: { organizationId: other, name: `Foreign ${suffix}`, normalizedName: `foreign ${suffix}` } }));
    await expect(log({ partnerId: foreign.id })).rejects.toThrow(/not found in your organisation/);
    const c = await log();
    const stranger = as(other, randomUUID(), ALL);
    await expect(svc.get(stranger, c.id)).rejects.toThrow(/not found/i);
    const page = await svc.listPage(stranger, {});
    expect(page.items.find((i) => i.id === c.id)).toBeUndefined();
  });

  it("lists, filters overdue and summarises on the dashboard", async () => {
    const old = await log({ receivedAt: past(30) });
    const page = await svc.listPage(appU(), { overdue: true });
    expect(page.items.some((i) => i.id === old.id && i.overdue)).toBe(true);
    const d = await svc.dashboard(appU());
    expect(d.open).toBeGreaterThan(0);
    expect(d.overdue).toBeGreaterThan(0);
    expect(d.byPartner.some((p) => p.partnerId === partnerId)).toBe(true);
  });

  it("never deletes: there is no delete path, and closed complaints cannot be edited", async () => {
    const c = await toResolved();
    await svc.close(appU(), c.id, { closureSummary: "x" });
    await expect(svc.update(logU(), c.id, { title: "New" })).rejects.toThrow(/closed/i);
  });
});
