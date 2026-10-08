/**
 * Deletes an organization and ALL of its data — added 2026-10-08, to clear
 * out "Unimed (Pilot)"'s pilot/smoke-test data before seeding comprehensive
 * demo data under a fresh, clearly-labelled org instead (see the demo-data
 * build plan in the Claude project for the full context — Lewis explicitly
 * authorized removing the Pilot org and its data on 2026-10-08).
 *
 * SAFETY: this is a genuinely destructive, irreversible operation against
 * the real Azure SQL database. It is DRY-RUN BY DEFAULT — it only COUNTS
 * and prints what it WOULD delete, using the exact same where-clauses the
 * real delete uses. Pass --execute to actually delete. Always run without
 * --execute first and read the counts before adding it.
 *
 * This deletes the User row(s) belonging to this org too (not just their
 * data) — "remove the account altogether" was the explicit instruction. A
 * brand new User row gets created fresh under "Unimed (Demo)" by
 * provision-unimed-demo.ts afterwards — simpler than trying to carry one
 * row through a full-org delete, and the User row itself carries no data
 * worth preserving (status/entraObjectId just re-link on next sign-in,
 * same bootstrap path as any new org).
 *
 * Usage (from packages/db):
 *   npx tsx scripts/wipe-organization.ts "Unimed (Pilot)"             # dry run (counts only)
 *   npx tsx scripts/wipe-organization.ts "Unimed (Pilot)" --execute   # actually deletes
 */
import { prisma, withPlatformStaffContext } from "../src/index";

const orgNameArg = process.argv[2];
const EXECUTE = process.argv.includes("--execute");

if (!orgNameArg) {
  throw new Error('Usage: npx tsx scripts/wipe-organization.ts "<exact org name>" [--execute]');
}

// Minimal shape every Prisma model delegate exposes that this script uses —
// avoids depending on Prisma's full generated delegate types just to type
// this list, while still keeping count()/deleteMany() type-checked against
// a real (if narrowed) signature.
interface DeleteDelegate {
  count(args: { where: any }): Promise<number>;
  deleteMany(args: { where: any }): Promise<{ count: number }>;
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: orgNameArg } });
  if (!org) {
    throw new Error(`No organization found with name "${orgNameArg}" (exact match required).`);
  }
  console.log(`Target: "${org.name}" (${org.id}) — ${EXECUTE ? "EXECUTING DELETE" : "DRY RUN (pass --execute to delete)"}\n`);

  await withPlatformStaffContext(async (tx) => {
    const orgId = org.id;
    const client = tx as unknown as Record<string, DeleteDelegate>;

    // Ordered leaf-to-root so SQL Server's NoAction FKs never block a
    // delete. {delegateKey, label, where} — delegateKey is the Prisma
    // client property name (camelCase model name) so one list drives both
    // the dry-run counts and the real deletes with identical filters.
    const steps: { delegateKey: string; label: string; where: any }[] = [
      // --- leaves that hang off Project/ProjectLine ---
      { delegateKey: "batchTemperatureLog", label: "BatchTemperatureLog", where: { organizationId: orgId } },
      { delegateKey: "projectLineLogisticsMetric", label: "ProjectLineLogisticsMetric", where: { organizationId: orgId } },
      { delegateKey: "supplierEnquiry", label: "SupplierEnquiry", where: { organizationId: orgId } },
      { delegateKey: "projectLead", label: "ProjectLead", where: { project: { organizationId: orgId } } },
      { delegateKey: "projectContact", label: "ProjectContact", where: { project: { organizationId: orgId } } },
      { delegateKey: "projectStatusHistory", label: "ProjectStatusHistory", where: { organizationId: orgId } },
      { delegateKey: "projectDocument", label: "ProjectDocument", where: { organizationId: orgId } },
      { delegateKey: "productPriceHistory", label: "ProductPriceHistory", where: { organizationId: orgId } },
      { delegateKey: "productBatch", label: "ProductBatch", where: { organizationId: orgId } },

      // --- leaves that hang off Partner ---
      { delegateKey: "stakeholderEvidenceRecord", label: "StakeholderEvidenceRecord", where: { organizationId: orgId } },
      { delegateKey: "partnerApprovalHistory", label: "PartnerApprovalHistory", where: { organizationId: orgId } },
      { delegateKey: "partnerCompanyCheck", label: "PartnerCompanyCheck", where: { organizationId: orgId } },
      { delegateKey: "partnerCertification", label: "PartnerCertification", where: { partner: { organizationId: orgId } } },
      { delegateKey: "productSourceApproval", label: "ProductSourceApproval", where: { organizationId: orgId } },
      { delegateKey: "manufacturerSite", label: "ManufacturerSite", where: { partner: { organizationId: orgId } } },
      { delegateKey: "supplierDetail", label: "SupplierDetail", where: { partner: { organizationId: orgId } } },
      { delegateKey: "manufacturerDetail", label: "ManufacturerDetail", where: { partner: { organizationId: orgId } } },
      { delegateKey: "freightForwarderDetail", label: "FreightForwarderDetail", where: { partner: { organizationId: orgId } } },
      { delegateKey: "clientDetail", label: "ClientDetail", where: { partner: { organizationId: orgId } } },
      { delegateKey: "partnerFinancialDetail", label: "PartnerFinancialDetail", where: { partner: { organizationId: orgId } } },
      { delegateKey: "warehousingDetail", label: "WarehousingDetail", where: { partner: { organizationId: orgId } } },
      { delegateKey: "partnerRole", label: "PartnerRole", where: { partner: { organizationId: orgId } } },

      // --- org-level profile extensions / registries / standalone orgId rows ---
      { delegateKey: "evidenceStandardDefinition", label: "EvidenceStandardDefinition", where: { organizationId: orgId } },
      { delegateKey: "riskAssessment", label: "RiskAssessment", where: { organizationId: orgId } },
      { delegateKey: "controlledDocument", label: "ControlledDocument", where: { organizationId: orgId } },
      { delegateKey: "fieldChangeLog", label: "FieldChangeLog", where: { organizationId: orgId } },
      { delegateKey: "dataSharingConsent", label: "DataSharingConsent", where: { organizationId: orgId } },
      { delegateKey: "organizationManufacturerSite", label: "OrganizationManufacturerSite", where: { organizationId: orgId } },
      { delegateKey: "organizationCountryPresence", label: "OrganizationCountryPresence", where: { organizationId: orgId } },
      { delegateKey: "supplierLead", label: "SupplierLead", where: { OR: [{ supplierOrganizationId: orgId }, { buyerOrganizationId: orgId }] } },
      { delegateKey: "supplierCountryPresence", label: "SupplierCountryPresence", where: { organizationId: orgId } },
      { delegateKey: "supplierProduct", label: "SupplierProduct", where: { organizationId: orgId } },
      { delegateKey: "supplierProfile", label: "SupplierProfile", where: { organizationId: orgId } },
      { delegateKey: "manufacturerProfile", label: "ManufacturerProfile", where: { organizationId: orgId } },
      { delegateKey: "funderProfile", label: "FunderProfile", where: { organizationId: orgId } },
      { delegateKey: "procurementAgentProfile", label: "ProcurementAgentProfile", where: { organizationId: orgId } },
      { delegateKey: "tenderingBodyProfile", label: "TenderingBodyProfile", where: { organizationId: orgId } },
      { delegateKey: "dataInsightsUserProfile", label: "DataInsightsUserProfile", where: { organizationId: orgId } },
      { delegateKey: "stakeholderRegistryEntry", label: "StakeholderRegistryEntry (linked to this org)", where: { linkedOrganizationId: orgId } },
      { delegateKey: "contact", label: "Contact", where: { organizationId: orgId } },

      // --- mid-level: now safe since every direct child above is gone ---
      { delegateKey: "projectLine", label: "ProjectLine", where: { project: { organizationId: orgId } } },
      { delegateKey: "productLine", label: "ProductLine", where: { organizationId: orgId } },
      { delegateKey: "partner", label: "Partner", where: { organizationId: orgId } },
      { delegateKey: "project", label: "Project", where: { organizationId: orgId } },

      // --- roles / permissions / users ---
      { delegateKey: "userRole", label: "UserRole (this org's users or roles)", where: { OR: [{ user: { organizationId: orgId } }, { role: { organizationId: orgId } }] } },
      { delegateKey: "rolePermission", label: "RolePermission (this org's roles)", where: { role: { organizationId: orgId } } },
      { delegateKey: "user", label: "User", where: { organizationId: orgId } },
      { delegateKey: "role", label: "Role", where: { organizationId: orgId } },

      // --- the org itself, last ---
      { delegateKey: "organization", label: "Organization", where: { id: orgId } },
    ];

    let total = 0;
    for (const step of steps) {
      const delegate = client[step.delegateKey];
      if (!delegate) throw new Error(`Unknown Prisma delegate "${step.delegateKey}" — check the spelling against schema.prisma.`);

      if (EXECUTE) {
        const result = await delegate.deleteMany({ where: step.where });
        total += result.count;
        if (result.count > 0) console.log(`  deleted ${result.count.toString().padStart(4)}  ${step.label}`);
      } else {
        const n = await delegate.count({ where: step.where });
        total += n;
        if (n > 0) console.log(`  would delete ${n.toString().padStart(4)}  ${step.label}`);
      }
    }

    console.log(
      EXECUTE
        ? `\nDeleted ${total} rows total. "${org.name}" is gone.`
        : `\nDry run: ${total} rows total would be deleted across ${steps.length} tables. Re-run with --execute to actually delete.`,
    );
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
