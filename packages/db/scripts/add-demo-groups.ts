import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";
import { NAMING } from "./_catalogue-naming";

/**
 * Adds simulated catalogue products for the eight product groups added on 2026-10-24 (Reproductive Health, Nutrition, Vector Control,
 * Water Sanitation and Hygiene, Immunisation, Kits and Emergency Supplies, Shelter and Household Items, Field and Military Medical).
 * Logistics and Services has no products (services are not catalogue items). Shared simulated products only: sourceStandard SIM-SCALE,
 * isSimulated true. Idempotent: a group that already has PER_GROUP products is skipped. DRY_RUN defaults to true.
 * Afterwards run "Enrich demo data" (catalogue) to fill identifiers and group the entries into product families.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const PER_GROUP = Number(process.env.PER_GROUP ?? 150);
const GROUPS = ["Reproductive Health", "Nutrition", "Vector Control", "Water, Sanitation and Hygiene", "Immunisation", "Kits and Emergency Supplies", "Shelter and Household Items", "Field and Military Medical"];

async function main() {
  const orgs = await prisma.organization.findMany({ where: { isSimulated: true, isDemo: false }, select: { id: true }, take: 60, orderBy: { id: "asc" } });
  if (orgs.length === 0) throw new Error("No simulated organisations found to own the new products.");
  let total = 0;
  for (const group of GROUPS) {
    const naming = NAMING[group];
    if (!naming) throw new Error(`No naming for ${group}`);
    const have = await prisma.productMaster.count({ where: { isSimulated: true, sourceStandard: "SIM-SCALE", category: group } });
    const need = Math.max(0, PER_GROUP - have);
    console.log(`${group}: ${have} existing, adding ${need}`);
    if (need === 0 || dryRun) { total += need; continue; }
    const rows = Array.from({ length: need }, (_, i) => {
      const n = have + i + 1;
      const noun = naming.nouns[n % naming.nouns.length];
      const s1 = naming.specs[(n * 3) % naming.specs.length];
      let s2 = naming.specs[(n * 5 + 1) % naming.specs.length];
      if (s2 === s1) s2 = naming.specs[(n * 5 + 2) % naming.specs.length];
      return { id: randomUUID(), name: `${noun}, ${s1}, ${s2} #${n}`, category: group, sourceStandard: "SIM-SCALE", isSimulated: true, addedByOrganizationId: orgs[n % orgs.length].id };
    });
    await withPlatformStaffContext(async (tx: any) => { for (let k = 0; k < rows.length; k += 100) await tx.productMaster.createMany({ data: rows.slice(k, k + 100) }); });
    total += need;
  }
  console.log(`${dryRun ? "DRY RUN: would add" : "Added"} ${total} simulated products`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
