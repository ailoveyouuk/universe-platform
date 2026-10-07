/**
 * One-off seed script for compliance-standards-gap-analysis.md's "What
 * still needs doing" item 1: seed Unimed's own EvidenceStandardDefinition
 * catalog, so the Approve-stakeholder gate (PartnersService.update()) has
 * something real to check instead of being a no-op.
 *
 * Catalog drawn from the pre-existing hardcoded CertificationType /
 * PartnerCompanyCheckType lists in packages/db/src/enums.ts (Unimed's real
 * supplier-file document types, confirmed against actual BD-folder
 * evidence per that file's own comments) — not invented fresh. Reduced
 * from ~28 raw enum values to 21 non-overlapping standards (the two
 * enums independently listed FINANCIAL_CREDIT_STATUS/VAT_CERTIFICATE/
 * BUSINESS_INSURANCE under both a DOCUMENT-style and a CHECK-style
 * identity for the same real-world requirement — collapsed to one row
 * each here rather than carried over as duplicates), and stakeholder
 * types are restricted to the five roles the Evidence Standards screen's
 * own form actually exposes checkboxes for (CLIENT, MANUFACTURER,
 * SUPPLIER, FREIGHT_FORWARDER, WAREHOUSING) — LOGISTICS exists in
 * Partner.roleType but has no checkbox in apps/project-management's
 * StandardForm, so it's left out here too rather than creating rows
 * nothing in the UI can ever target.
 *
 * Idempotent: upserts on (organizationId, name) so re-running this after
 * Lewis edits a row in the UI won't duplicate or clobber it, other than
 * resetting it to this script's values if a name collides.
 *
 * Run from the repo root on a machine with a working DATABASE_URL (the
 * same one `npx prisma migrate deploy`/`generate` already use) — this
 * environment's own shell has no network path to the database, so this
 * is written to be run by Lewis, not executed here.
 *
 *   cd packages/db
 *   npm run seed:evidence-standards
 *
 * (pass an exact org name if more than one organization name contains
 * "Unimed": npm run seed:evidence-standards -- "Exact Org Name")
 */
import { prisma, withTenantContext } from "../src/index";

type EvidenceType = "DOCUMENT" | "CHECK";
type Category = "QUALITY" | "BUSINESS" | "FINANCIAL" | "REGULATORY" | "INSURANCE" | "OTHER";

interface StandardSeed {
  name: string;
  description: string;
  category: Category;
  appliesToStakeholderTypes: string[];
  evidenceType: EvidenceType;
  isMandatory: boolean;
  requiresExpiry: boolean;
  reVerificationFrequencyMonths?: number;
  sortOrder: number;
}

const MANU = "MANUFACTURER";
const SUPP = "SUPPLIER";
const FREIGHT = "FREIGHT_FORWARDER";
const WARE = "WAREHOUSING";

const STANDARDS: StandardSeed[] = [
  // --- QUALITY ---
  {
    name: "ISO 13485 — Medical Devices QMS Certificate",
    description: "Quality management system certification for medical device manufacturers.",
    category: "QUALITY",
    appliesToStakeholderTypes: [MANU],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: true,
    sortOrder: 10,
  },
  {
    name: "ISO 9001 — Quality Management System Certificate",
    description: "General quality management system certification.",
    category: "QUALITY",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: true,
    sortOrder: 20,
  },
  {
    name: "GMP Certificate",
    description: "Good Manufacturing Practice certification.",
    category: "QUALITY",
    appliesToStakeholderTypes: [MANU],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: true,
    sortOrder: 30,
  },
  {
    name: "GDP Certificate",
    description: "Good Distribution Practice certification for storage/transport custody of pharmaceutical products.",
    category: "QUALITY",
    appliesToStakeholderTypes: [SUPP, FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: true,
    sortOrder: 40,
  },
  {
    name: "Code of Conduct Acknowledgement",
    description: "Unimed's Code of Conduct, sent to every approved supplier for Read & Understood acknowledgement.",
    category: "QUALITY",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: false,
    sortOrder: 50,
  },
  {
    name: "Annual Bona Fide Review",
    description: "Annual Bona Fide re-check for approved pharmaceutical and GDP-impacting outsourced suppliers.",
    category: "QUALITY",
    appliesToStakeholderTypes: [MANU, SUPP],
    evidenceType: "CHECK",
    isMandatory: true,
    requiresExpiry: false,
    reVerificationFrequencyMonths: 12,
    sortOrder: 60,
  },

  // --- REGULATORY ---
  {
    name: "Wholesale Distribution Authorisation (WDA)",
    description: "Wholesale Dealer's Authorisation for distribution of medicinal products.",
    category: "REGULATORY",
    appliesToStakeholderTypes: [SUPP, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: true,
    sortOrder: 70,
  },
  {
    name: "Manufacturer/Importer Authorisation (MIA)",
    description: "Manufacturer's/Importer's Authorisation.",
    category: "REGULATORY",
    appliesToStakeholderTypes: [MANU],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: true,
    sortOrder: 80,
  },
  {
    name: "CE / MDR Certificate",
    description: "CE marking / EU Medical Device Regulation certificate, where device-classed products are involved.",
    category: "REGULATORY",
    appliesToStakeholderTypes: [MANU],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: true,
    sortOrder: 90,
  },
  {
    name: "Device Registration (National / EUDAMED)",
    description: "In-country device registration, or EU device-registration-database (EUDAMED) entry.",
    category: "REGULATORY",
    appliesToStakeholderTypes: [MANU],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: true,
    sortOrder: 100,
  },
  {
    name: "IATA Dangerous Goods Regulations Certification",
    description: "IATA Dangerous Goods Regulations handling certification for freight forwarding.",
    category: "REGULATORY",
    appliesToStakeholderTypes: [FREIGHT],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: true,
    sortOrder: 110,
  },
  {
    name: "AEO Accreditation",
    description: "Authorised Economic Operator accreditation.",
    category: "REGULATORY",
    appliesToStakeholderTypes: [FREIGHT],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: true,
    sortOrder: 120,
  },

  // --- BUSINESS ---
  {
    name: "Company Registration Certificate",
    description: "Certificate of incorporation / company registration document.",
    category: "BUSINESS",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: false,
    sortOrder: 130,
  },
  {
    name: "Companies House / National Registry Check",
    description: "Dated verification against Companies House or the equivalent national company registry.",
    category: "BUSINESS",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "CHECK",
    isMandatory: true,
    requiresExpiry: false,
    reVerificationFrequencyMonths: 12,
    sortOrder: 140,
  },
  {
    name: "Website Verification",
    description: "Dated check confirming the stakeholder's company website is live and consistent with other evidence.",
    category: "BUSINESS",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "CHECK",
    isMandatory: false,
    requiresExpiry: false,
    reVerificationFrequencyMonths: 12,
    sortOrder: 150,
  },
  {
    name: "Trade References",
    description: "Trade reference letters/contacts supplied during onboarding.",
    category: "BUSINESS",
    appliesToStakeholderTypes: [MANU, SUPP],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: false,
    sortOrder: 160,
  },
  {
    name: "Service Level Agreement",
    description: "Signed service level agreement covering transport/warehousing performance terms.",
    category: "BUSINESS",
    appliesToStakeholderTypes: [FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: false,
    sortOrder: 170,
  },
  {
    name: "Technical Agreement",
    description: "Technical/quality agreement between Unimed and the manufacturer or supplier.",
    category: "BUSINESS",
    appliesToStakeholderTypes: [MANU, SUPP],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: false,
    sortOrder: 180,
  },

  // --- FINANCIAL ---
  {
    name: "VAT Certificate",
    description: "VAT registration certificate.",
    category: "FINANCIAL",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: false,
    requiresExpiry: false,
    sortOrder: 190,
  },
  {
    name: "Financial Credit Status Check",
    description: "Dated financial credit status verification.",
    category: "FINANCIAL",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "CHECK",
    isMandatory: true,
    requiresExpiry: false,
    reVerificationFrequencyMonths: 12,
    sortOrder: 200,
  },

  // --- INSURANCE ---
  {
    name: "Business / Professional Insurance Certificate",
    description: "Business and/or professional indemnity insurance certificate.",
    category: "INSURANCE",
    appliesToStakeholderTypes: [MANU, SUPP, FREIGHT, WARE],
    evidenceType: "DOCUMENT",
    isMandatory: true,
    requiresExpiry: true,
    sortOrder: 210,
  },
];

async function main() {
  const orgNameFilter = process.argv[2] ?? "Unimed";
  const org = await prisma.organization.findFirst({
    where: { name: { contains: orgNameFilter } },
  });
  if (!org) {
    throw new Error(
      `No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument, e.g.:\n` +
        `  npx ts-node ... seed-evidence-standards.ts "Unimed Procurement Services Ltd"`,
    );
  }
  console.log(`Seeding EvidenceStandardDefinition rows for organization "${org.name}" (${org.id})`);

  let created = 0;
  let updated = 0;

  await withTenantContext(org.id, async (tx) => {
    for (const s of STANDARDS) {
      const existing = await tx.evidenceStandardDefinition.findFirst({
        where: { organizationId: org.id, name: s.name },
      });
      const data = {
        organizationId: org.id,
        name: s.name,
        description: s.description,
        category: s.category,
        appliesToStakeholderTypes: s.appliesToStakeholderTypes.join(","),
        evidenceType: s.evidenceType,
        isMandatory: s.isMandatory,
        requiresExpiry: s.requiresExpiry,
        reVerificationFrequencyMonths: s.reVerificationFrequencyMonths ?? null,
        active: true,
        sortOrder: s.sortOrder,
      };
      if (existing) {
        await tx.evidenceStandardDefinition.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await tx.evidenceStandardDefinition.create({ data });
        created++;
      }
    }
  });

  console.log(`Done. Created ${created}, updated ${updated} (of ${STANDARDS.length} total standards).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
