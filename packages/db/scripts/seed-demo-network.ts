import { prisma, withPlatformStaffContext } from "../src/index";

/** Diagnostic first (dry run): how the demo's stakeholders relate to the registry and to the simulated Universe organisations. */
async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("no demo");
    const org = demo.id;
    const [partners, withReg, regs, regSim, regLinked, orgs, simOrgs, profiles, published, otherPartners] = await Promise.all([
      tx.partner.count({ where: { organizationId: org } }),
      tx.partner.count({ where: { organizationId: org, registryEntryId: { not: null } } }),
      tx.stakeholderRegistryEntry.count(), tx.stakeholderRegistryEntry.count({ where: { isSimulated: true } }), tx.stakeholderRegistryEntry.count({ where: { linkedOrganizationId: { not: null } } }),
      tx.organization.count(), tx.organization.count({ where: { isSimulated: true } }),
      tx.supplierProfile.count(), tx.supplierProfile.count({ where: { publishedAt: { not: null } } }),
      tx.partner.count({ where: { organizationId: { not: org } } }),
    ]);
    console.log({ partners, withReg, regs, regSim, regLinked, orgs, simOrgs, profiles, published, otherPartners });
    const sample = await tx.organization.findMany({ where: { isSimulated: true, id: { not: org } }, take: 12, select: { name: true, type: true, additionalTypes: true } });
    console.log("sample simulated orgs", sample);
    const ps = await tx.partner.findMany({ where: { organizationId: org }, take: 12, select: { name: true, normalizedName: true, registryEntryId: true, sharedWithUniverseRegistry: true } });
    console.log("sample partners", ps);
    const orgNames = new Map((await tx.organization.findMany({ where: { isSimulated: true }, select: { name: true } })).map((o) => [o.name.toLowerCase(), 1]));
    const allP = await tx.partner.findMany({ where: { organizationId: org }, select: { name: true } });
    console.log("partner names equal to an org name:", allP.filter((p) => orgNames.has(p.name.toLowerCase())).length);
    console.log("orgs by type", (await tx.organization.groupBy({ by: ["type"], _count: true })).map((g) => `${g.type}:${g._count}`).join(" "));
  });
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
