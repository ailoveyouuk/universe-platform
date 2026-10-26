/**
 * Adds the CRM permissions (crm.view, crm.manage) to organisations that existed before the CRM, by role name, mirroring the DEFAULT_* role
 * templates in organizations.ts. Idempotent; adds only, never removes. Run:  cd packages/db && npm run backfill:crm-permissions
 *
 *   Organization Admin, Stakeholder Demo -> view, manage
 *   Project Manager                      -> view
 */
import { prisma, withTenantContext } from "../src/index";

const GRANTS: Record<string, string[]> = {
  "Organization Admin": ["crm.view", "crm.manage"], "Stakeholder Demo": ["crm.view", "crm.manage"], "Project Manager": ["crm.view"],
};
const DESCRIPTIONS: Record<string, string> = {
  "crm.view": "See your organisation's stakeholder relationships in the CRM",
  "crm.manage": "Set owners, tiers, status and review dates on relationships in the CRM",
};
const DRY = process.env.DRY_RUN === "true";

async function main() {
  if (DRY) console.log("DRY RUN: nothing will be written.");
  const perms = new Map<string, string>();
  for (const key of Object.keys(DESCRIPTIONS)) {
    if (DRY) { const p = await prisma.permission.findUnique({ where: { key } }); perms.set(key, p?.id ?? `(new ${key})`); continue; }
    perms.set(key, (await prisma.permission.upsert({ where: { key }, update: { description: DESCRIPTIONS[key] }, create: { key, description: DESCRIPTIONS[key] } })).id);
  }
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  let granted = 0;
  for (const org of orgs) {
    await withTenantContext(org.id, async (tx) => {
      const roles = await tx.role.findMany({ where: { organizationId: org.id, name: { in: Object.keys(GRANTS) } }, select: { id: true, name: true } });
      for (const role of roles) {
        for (const key of GRANTS[role.name]!) {
          if (DRY) { granted++; continue; }
          await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perms.get(key)! } }, update: {}, create: { roleId: role.id, permissionId: perms.get(key)! } });
          granted++;
        }
      }
    });
  }
  console.log(`${DRY ? "Would check" : "CRM permissions ready:"} ${granted} role grants across ${orgs.length} organisations.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
