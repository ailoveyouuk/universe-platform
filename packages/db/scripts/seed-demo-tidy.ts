import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Small gaps found by the baseline coverage audit (2026-10-24). Only fills gaps; never deletes. DRY_RUN defaults to true.
 *   1. Quality scorecard settings for Universe Demo (explicit default thresholds, so the page shows a configured organisation)
 *   2. Data / insights user profiles for the simulated organisations of that type
 *   3. A sample of simulated organisations that hold a second role (suppliers that are also procurement agents, agents that are also suppliers,
 *      manufacturers that are also suppliers) so multi-role behaviour can be seen in Find suppliers and tender eligibility
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const hashStr = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");

    const settings = await tx.qualityScorecardSettings.findUnique({ where: { organizationId: demo.id } });
    console.log(settings ? "Scorecard settings exist; skipped." : "Would add default scorecard settings for Universe Demo.");
    if (!settings && !dryRun) await tx.qualityScorecardSettings.create({ data: { organizationId: demo.id } });

    const insights = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, type: "DATA_INSIGHTS_USER", dataInsightsUserProfile: null } as never, select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(async () => {
      const all = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, type: "DATA_INSIGHTS_USER" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
      const have = new Set((await tx.dataInsightsUserProfile.findMany({ select: { organizationId: true } })).map((r) => r.organizationId));
      return all.filter((o) => !have.has(o.id));
    });
    console.log(`${insights.length} insights organisations without a profile.`);
    const kinds = ["ACADEMIC", "NGO_NONPROFIT_RESEARCH", "MULTILATERAL_MARKET_INTELLIGENCE", "COMMERCIAL_MARKET_INTELLIGENCE", "INDIVIDUAL_RESEARCHER"];
    const purposes = ["Price benchmarking for essential medicines (simulated)", "Supply-chain emissions research (simulated)", "Market intelligence on diagnostics procurement (simulated)", "Lead-time analysis for cold-chain products (simulated)"];
    if (!dryRun) await tx.dataInsightsUserProfile.createMany({ data: insights.map((o) => { const h = hashStr(o.id); return { id: randomUUID(), organizationId: o.id, institutionType: kinds[h % kinds.length], affiliatedInstitution: `${o.name} research group (simulated)`, purposeIntendedUse: purposes[h % purposes.length], publicationIntent: h % 3 === 0 ? "Peer-reviewed publication" : "Internal use only", fundingSourceOfResearch: ["Own funds", "Grant-funded", "Commissioned"][h % 3], dataUseAgreementVersion: "2026-01", dataUseAgreementAcceptedAt: new Date(Date.now() - (30 + (h % 200)) * 86400000) }; }) });

    const orgs = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, type: { in: ["SUPPLIER", "PROCUREMENT_SERVICE_AGENT", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, type: true, additionalTypes: true } });
    let multi = 0;
    for (const o of orgs) {
      if (o.additionalTypes) continue;
      const h = hashStr(o.id);
      const extra = o.type === "SUPPLIER" && h % 4 === 0 ? "PROCUREMENT_SERVICE_AGENT" : o.type === "PROCUREMENT_SERVICE_AGENT" && h % 9 === 0 ? "SUPPLIER" : o.type === "MANUFACTURER" && h % 3 === 0 ? "SUPPLIER" : null;
      if (!extra) continue;
      multi++;
      if (!dryRun) await tx.organization.update({ where: { id: o.id }, data: { additionalTypes: `,${extra},` } });
    }
    console.log(`${multi} simulated organisations ${dryRun ? "would get" : "got"} a second role.`);
    console.log(dryRun ? "DRY RUN: nothing written." : "Written.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
