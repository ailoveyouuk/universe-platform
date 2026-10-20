/**
 * Adds the quality complaint permissions to organisations that existed before the complaints module. Idempotent. Run:
 *   cd packages/db && npm run backfill:complaint-permissions      (DRY_RUN=true to preview)
 *
 *   Organization Admin, Quality Assurance, Responsible Person, Stakeholder Demo -> view, log, investigate, approve
 *   Project Manager                                                               -> view, log
 */
import { prisma, withTenantContext } from "../src/index";

const ALL = ["quality.complaints.view", "quality.complaints.log", "quality.complaints.investigate", "quality.complaints.approve"];
const GRANTS: Record<string, string[]> = {
  "Organization Admin": ALL, "Quality Assurance": ALL, "Responsible Person": ALL, "Stakeholder Demo": ALL,
  "Project Manager": ["quality.complaints.view", "quality.complaints.log"],
};
const DESCRIPTIONS: Record<string, string> = {
  "quality.complaints.view": "View quality complaints, including complainant details",
  "quality.complaints.log": "Log, acknowledge and add notes to quality complaints",
  "quality.complaints.investigate": "Triage, investigate, resolve and raise corrective/preventive actions on quality complaints",
  "quality.complaints.approve": "Approve closure of quality complaints and record regulator-reporting decisions",
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
  console.log(`${DRY ? "Would check" : "Complaint permissions ready:"} ${granted} role grants across ${orgs.length} organisations.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
