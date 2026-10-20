import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Marks a simulated organisation as a demo organisation (2026-10-20, requested by Lewis: "Andean Care Alliance 106" becomes a demo
 * procurement organisation alongside Universe Demo). Only flips Organization.isDemo; touches no other data. ORG_NAME selects the
 * organisation. DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const NAME = process.env.ORG_NAME ?? "Andean Care Alliance 106";

async function main() {
  const orgs = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { name: NAME }, select: { id: true, name: true, isDemo: true, isSimulated: true } }));
  if (orgs.length !== 1) throw new Error(`Expected one organisation named "${NAME}", found ${orgs.length}`);
  const o = orgs[0];
  if (!o.isSimulated) throw new Error(`"${NAME}" is not a simulated organisation; refusing to flag it as a demo organisation.`);
  const before = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { name: true } }));
  console.log(`Demo organisations now: ${before.map((b) => b.name).join(", ")}`);
  if (o.isDemo) { console.log(`${NAME} is already a demo organisation.`); return; }
  if (dryRun) { console.log(`DRY RUN: would set isDemo=true on ${NAME}.`); return; }
  await withPlatformStaffContext((tx) => tx.organization.update({ where: { id: o.id }, data: { isDemo: true } }));
  console.log(`${NAME} is now a demo organisation.`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
