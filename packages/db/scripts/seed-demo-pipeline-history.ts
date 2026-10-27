import { prisma, withPlatformStaffContext } from "../src/index";
import { COMMODITY_GROUPS } from "@universe/types";

/**
 * Pipeline history for the demo CRM (2026-10-27, requested by Lewis: win probability that learns from past submissions, stage conversion, forecast accuracy).
 * Simulated data only, deterministic (the same opportunity always gets the same history), idempotent, DRY_RUN defaults to true. Writes:
 *  1. a commodity or service group on every opportunity that has none: taken from the linked project's lines where there is one, else chosen from the
 *     group list by the opportunity id (so the like-for-like comparison has variety to work with);
 *  2. stage events for every opportunity that has none: created, then each stage it plausibly passed through, ending on its current stage at the time it
 *     entered it (won opportunities passed through every stage; lost ones stopped part-way; withdrawn ones earlier);
 *  3. about one open opportunity in six also gets a value or date revision event, so forecast accuracy has something to show. Current values are untouched.
 * Existing opportunity values, stages and dates are never changed.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const PATH = ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"];
const h = (s: string, salt = 0) => Math.abs([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7 + salt));
const DAY = 86400000;

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const org = demo.id;
    const opps = await tx.crmOpportunity.findMany({ where: { organizationId: org }, select: { id: true, stage: true, createdAt: true, stageChangedAt: true, commodityGroup: true, linkedType: true, linkedId: true, expectedValue: true, currency: true, expectedDate: true, createdById: true } });
    const have = new Set((await tx.crmOpportunityEvent.findMany({ where: { organizationId: org }, distinct: ["opportunityId"], select: { opportunityId: true } })).map((e) => e.opportunityId));

    // 1. commodity groups
    const need = opps.filter((o) => !o.commodityGroup);
    const projectIds = [...new Set(need.filter((o) => o.linkedType === "PROJECT" && o.linkedId).map((o) => o.linkedId!))];
    const lines = projectIds.length ? await tx.projectLine.findMany({ where: { projectId: { in: projectIds }, archivedAt: null, productCategory: { not: null } }, select: { projectId: true, productCategory: true } }) : [];
    const fromProject = new Map<string, string>();
    for (const pid of projectIds) { const t = new Map<string, number>(); for (const l of lines) if (l.projectId === pid) t.set(l.productCategory!, (t.get(l.productCategory!) ?? 0) + 1); const top = [...t].sort((a, b) => b[1] - a[1])[0]; if (top && (COMMODITY_GROUPS as readonly string[]).includes(top[0])) fromProject.set(pid, top[0]); }
    const groupFor = (o: (typeof opps)[number]) => (o.linkedId && fromProject.get(o.linkedId)) || COMMODITY_GROUPS[h(o.id, 1) % COMMODITY_GROUPS.length];
    console.log(`${dryRun ? "[dry run] would set" : "setting"} a commodity group on ${need.length} of ${opps.length} opportunities (${need.filter((o) => o.linkedId && fromProject.has(o.linkedId)).length} from linked projects)`);

    // 2 and 3. events
    const events: Parameters<typeof tx.crmOpportunityEvent.createMany>[0]["data"] = [];
    let withEvents = 0, revisions = 0;
    for (const o of opps) {
      if (have.has(o.id)) continue;
      withEvents++;
      const final = o.stage;
      let steps: string[];
      if (final === "WON") steps = [...PATH, "WON"];
      else if (final === "LOST") steps = [...PATH.slice(0, 1 + (h(o.id, 2) % 4)), "LOST"];
      else if (final === "WITHDRAWN") steps = [...PATH.slice(0, h(o.id, 3) % 4 || 1), "WITHDRAWN"];
      else steps = PATH.slice(0, PATH.indexOf(final) + 1);
      const end = o.stageChangedAt.getTime();
      const start = Math.min(o.createdAt.getTime(), end - steps.length * 6 * DAY);
      const span = Math.max(end - start, steps.length * DAY);
      steps.forEach((to, i) => {
        const weight = (i + (h(o.id + to, 4) % 40) / 100) / Math.max(steps.length - 1, 1);
        const at = i === 0 ? start : i === steps.length - 1 ? end : start + span * Math.min(weight, 0.97);
        events.push({ organizationId: org, opportunityId: o.id, eventType: i === 0 ? "CREATED" : "STAGE", fromStage: i === 0 ? null : steps[i - 1], toStage: to, newValue: i === 0 ? o.expectedValue : null, currency: i === 0 ? o.currency : null, newDate: i === 0 ? o.expectedDate : null, changedById: o.createdById, occurredAt: new Date(Math.max(start, Math.min(at, end))), reason: "Simulated history" });
      });
      if (["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"].includes(final) && h(o.id, 5) % 6 === 0 && o.expectedDate && o.expectedValue !== null) {
        revisions++;
        const slip = 14 + (h(o.id, 6) % 60); const pct = 0.85 + (h(o.id, 7) % 30) / 100;
        events.push({ organizationId: org, opportunityId: o.id, eventType: "REVISION", oldValue: Math.round(Number(o.expectedValue) * pct), newValue: o.expectedValue, currency: o.currency, oldDate: new Date(o.expectedDate.getTime() - slip * DAY), newDate: o.expectedDate, changedById: o.createdById, occurredAt: new Date(Math.min(end + 2 * DAY, Date.now())), reason: "Simulated history" });
      }
    }
    console.log(`${dryRun ? "[dry run] would write" : "writing"} ${events.length} events for ${withEvents} opportunities (${revisions} with a revision); ${have.size} already have history`);
    if (dryRun) return;
    for (const o of need) await tx.crmOpportunity.update({ where: { id: o.id }, data: { commodityGroup: groupFor(o) } });
    for (let i = 0; i < events.length; i += 500) await tx.crmOpportunityEvent.createMany({ data: events.slice(i, i + 500) });
    console.log("done");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
