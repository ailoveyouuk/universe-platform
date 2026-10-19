/**
 * Adds the tender permissions (tenders.view/issue/bid/evaluate/award) to organisations that existed before the Tender app, by
 * organisation type, mirroring DEFAULT_* role templates in organizations.ts. Idempotent. Run:
 *   cd packages/db && npm run backfill:tender-permissions
 *
 *   Organization Admin (buyer-type orgs)  -> all five
 *   Project Manager                       -> view, bid
 *   Supplier Admin / Manufacturer Admin   -> view, bid
 *   Stakeholder Demo (demo orgs)          -> all five
 */
import { prisma, withTenantContext } from "../src/index";

const ALL = ["tenders.view", "tenders.issue", "tenders.bid", "tenders.evaluate", "tenders.award"];
const GRANTS: Record<string, string[]> = {
  "Organization Admin": ALL, "Stakeholder Demo": ALL, "Project Manager": ["tenders.view", "tenders.bid"],
  "Supplier Admin": ["tenders.view", "tenders.bid"], "Manufacturer Admin": ["tenders.view", "tenders.bid"],
};
const DESCRIPTIONS: Record<string, string> = {
  "tenders.view": "Browse published tenders, see eligibility, shortlist and save searches",
  "tenders.issue": "Build, publish and manage your organisation's own tenders",
  "tenders.bid": "Express interest in and submit bids to tenders",
  "tenders.evaluate": "Score bids and record evaluation decisions on your organisation's tenders",
  "tenders.award": "Award tenders and manage the resulting contracts",
};

const DRY = process.env.DRY_RUN === "true";

async function main() {
  if (DRY) console.log("DRY RUN: nothing will be written.");
  const perms = new Map<string, string>();
  for (const key of ALL) {
    if (DRY) { const p = await prisma.permission.findUnique({ where: { key } }); perms.set(key, p?.id ?? `(new ${key})`); continue; }
    perms.set(key, (await prisma.permission.upsert({ where: { key }, update: { description: DESCRIPTIONS[key] }, create: { key, description: DESCRIPTIONS[key] } })).id);
  }
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  let granted = 0;
  for (const org of orgs) {
    await withTenantContext(org.id, async (tx) => {
      const roles = await tx.role.findMany({ where: { organizationId: org.id, name: { in: Object.keys(GRANTS) } }, select: { id: true, name: true } });
      for (const role of roles) {
        for (const key of GRANTS[role.name]) {
          if (DRY) { granted++; console.log(`  would grant ${key} to "${role.name}" in ${org.name}`); continue; }
          await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perms.get(key)! } }, update: {}, create: { roleId: role.id, permissionId: perms.get(key)! } });
          granted++;
        }
      }
    });
  }
  console.log(`${DRY ? "Would check" : "Tender permissions ready:"} ${granted} role grants across ${orgs.length} organisations.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
