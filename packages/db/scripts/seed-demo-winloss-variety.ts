import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Variety for the "Why we win and lose" panel in the demo CRM (2026-10-27, requested by Lewis). The decided opportunities were so uniform that most factors said
 * "too few to compare". This changes what the opportunities LOOK LIKE going in, never how they came out:
 *  1. Repeat business: for about a third of the stakeholders that have a decided opportunity, adds one earlier WON opportunity (opened and won before the
 *     first decided one began), with its created and stage history. Titles and notes say it is simulated.
 *  2. Owners: about one decided opportunity in five has its owner cleared, chosen by a hash of the id so it is deterministic and unrelated to the outcome.
 * Stages, values and dates of existing opportunities are untouched; nothing is deleted. Idempotent (earlier opportunities are marked and not added twice; owners
 * already cleared stay cleared). Contact, approval and certificate factors are left alone: they come from interactions and partner records that other parts of the
 * demo depend on. Simulated data only. DRY_RUN defaults to true: the work is done and then rolled back, and the counts are printed.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
class Rollback extends Error {}
const MARK = "Simulated earlier work with this stakeholder.";
const DAY = 86400000;
const h = (s: string, salt = 0) => Math.abs([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 11 + salt));

async function main() {
  try {
    await withPlatformStaffContext(async (tx) => {
      const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
      if (!demo) throw new Error("Universe Demo not found.");
      const org = demo.id;
      const all = await tx.crmOpportunity.findMany({ where: { organizationId: org, archivedAt: null }, select: { id: true, relationshipId: true, title: true, kind: true, stage: true, createdAt: true, stageChangedAt: true, expectedValue: true, currency: true, ownerUserId: true, commodityGroup: true, notes: true, createdById: true } });
      const decided = all.filter((o) => o.stage === "WON" || o.stage === "LOST");
      const already = new Set(all.filter((o) => o.notes === MARK).map((o) => o.relationshipId));

      // 1. earlier won opportunities
      const byRel = new Map<string, typeof decided>();
      for (const o of decided) if (o.notes !== MARK) byRel.set(o.relationshipId, [...(byRel.get(o.relationshipId) ?? []), o]);
      const adds: Parameters<typeof tx.crmOpportunity.createMany>[0]["data"] = [];
      const events: Parameters<typeof tx.crmOpportunityEvent.createMany>[0]["data"] = [];
      for (const [rel, list] of byRel) {
        if (already.has(rel) || h(rel, 1) % 100 >= 35) continue;
        const first = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        const wonAt = first.createdAt.getTime() - (30 + (h(rel, 2) % 150)) * DAY;
        const openedAt = wonAt - (30 + (h(rel, 3) % 90)) * DAY;
        const id = randomUUID();
        adds.push({ id, organizationId: org, relationshipId: rel, title: `Earlier supply: ${first.title}`.replace(/^Earlier supply: (Earlier supply: )+/, "Earlier supply: ").slice(0, 200), kind: first.kind, stage: "WON", stageChangedAt: new Date(wonAt), expectedValue: first.expectedValue === null ? null : Math.round(Number(first.expectedValue) * (0.5 + (h(rel, 4) % 60) / 100)), currency: first.currency, expectedDate: new Date(wonAt), ownerUserId: first.ownerUserId, notes: MARK, commodityGroup: first.commodityGroup, createdById: first.createdById, createdAt: new Date(openedAt) });
        const path = ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED", "WON"];
        path.forEach((to, i) => events.push({ organizationId: org, opportunityId: id, eventType: i === 0 ? "CREATED" : "STAGE", fromStage: i === 0 ? null : path[i - 1], toStage: to, occurredAt: new Date(openedAt + ((wonAt - openedAt) * i) / (path.length - 1)) }));
      }
      // 2. owners
      const clear = decided.filter((o) => o.ownerUserId && o.notes !== MARK && h(o.id, 5) % 100 < 20);
      console.log(`${dryRun ? "[dry run] would add" : "adding"} ${adds.length} earlier won opportunities (${events.length} history events) for ${byRel.size} stakeholders with a decided opportunity (${already.size} already have one); ${dryRun ? "would clear" : "clearing"} the owner on ${clear.length} of ${decided.length} decided opportunities (${clear.filter((o) => o.stage === "WON").length} won, ${clear.filter((o) => o.stage === "LOST").length} lost)`);
      for (let i = 0; i < adds.length; i += 100) await tx.crmOpportunity.createMany({ data: adds.slice(i, i + 100) });
      for (let i = 0; i < events.length; i += 500) await tx.crmOpportunityEvent.createMany({ data: events.slice(i, i + 500) });
      for (const o of clear) await tx.crmOpportunity.update({ where: { id: o.id }, data: { ownerUserId: null } });

      // what the panel will compare afterwards
      const now = await tx.crmOpportunity.findMany({ where: { organizationId: org, archivedAt: null, stage: { in: ["WON", "LOST"] } }, select: { id: true, relationshipId: true, stage: true, createdAt: true, stageChangedAt: true, ownerUserId: true } });
      const split = (t: (o: (typeof now)[number]) => boolean) => { const w = { won: 0, lost: 0 }, wo = { won: 0, lost: 0 }; for (const o of now) (t(o) ? w : wo)[o.stage === "WON" ? "won" : "lost"]++; return `with ${w.won}W/${w.lost}L, without ${wo.won}W/${wo.lost}L`; };
      console.log("owner:", split((o) => !!o.ownerUserId));
      console.log("repeat:", split((o) => now.some((x) => x.id !== o.id && x.relationshipId === o.relationshipId && x.stage === "WON" && x.stageChangedAt.getTime() < o.createdAt.getTime())));
      if (dryRun) throw new Rollback();
    });
  } catch (e) { if (!(e instanceof Rollback)) throw e; console.log("[dry run] nothing was written."); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
