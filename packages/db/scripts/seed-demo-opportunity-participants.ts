import { prisma, syncOrganisationOpportunities, withPlatformStaffContext } from "../src/index";

/**
 * People involved on the demo CRM opportunities (2026-10-27, requested by Lewis: every opportunity linked to the issuer, bidders, manufacturers, forwarders and anyone else who touched it).
 * Runs the same sync the CRM uses for every opportunity already linked to a tender or project, so participants appear exactly as they would for a live user. It only adds
 * participants (restricted to stakeholders already in the CRM). Stages follow a link only where the opportunity was set to follow it, so no current stage, value or date changes.
 * Simulated data only, idempotent. DRY_RUN defaults to true: the work is done and then rolled back, and the counts are printed.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
class Rollback extends Error {}

async function main() {
  try {
    await withPlatformStaffContext(async (tx) => {
      const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
      if (!demo) throw new Error("Universe Demo not found.");
      const all = await tx.crmOpportunity.groupBy({ by: ["linkedType"], where: { organizationId: demo.id, archivedAt: null }, _count: { _all: true } });
      console.log("opportunities by link type:", JSON.stringify(all.map((g) => [g.linkedType, g._count._all])), "with tender:", await tx.crmOpportunity.count({ where: { organizationId: demo.id, archivedAt: null, sourceTenderId: { not: null } } }));
      const res = await syncOrganisationOpportunities(tx, demo.id, null);
      console.log(`${dryRun ? "[dry run] would sync" : "synced"} ${res.opportunities} linked opportunities: ${res.participantsAdded} people added, ${res.participantsRetired} retired, ${res.stageChanges} stage changes`);
      if (dryRun) throw new Rollback();
    });
  } catch (e) { if (!(e instanceof Rollback)) throw e; console.log("[dry run] nothing was written."); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
