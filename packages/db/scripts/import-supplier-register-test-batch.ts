/**
 * Second test batch: 10 suppliers picked from Unimed's real Non-
 * Pharmaceutical Supplier Register (FORM_008.3), independent of the
 * Product Database batch (import-product-db-test-batch.ts). Chosen
 * deliberately for variety rather than at random — see each entry's
 * `source` tab below:
 *   - 4 from "Others Register" (365 Medical, HK Wentworth, A&D
 *     Instruments, Abdos Life Sciences) — Unimed's own register already
 *     carries an approval date and a status for these.
 *   - 4 from "Yifeng Register" (AdLite Medical, Aimmax Medical Products,
 *     AMCAREMED Technology, Anhui Anyu) — manufacturers/suppliers sourced
 *     through Yifeng Yingtai, no approval-date column in that tab.
 *   - 2 from "PENDING APPROVAL" (AccuBio Tech, Alpha Labs) — genuinely
 *     not yet approved by Unimed at all, deliberately included to
 *     exercise StakeholderEvidenceRecord's PENDING status, not just
 *     VERIFIED/EXPIRED.
 * Expiry dates are recomputed against today's date at run time, not
 * trusted from the register's own "Status" column (which can go stale
 * between edits) — e.g. "A&D Instruments" register status says "Approved
 * - Certs in date" but its ISO 9001 (exp 2026-05-08) is already past as
 * of this script being written (2026-10-07); its ISO 13485 (exp
 * 2027-07-06) is not. Both get recorded as separate evidence rows with
 * their own independently-correct status.
 *
 * Standalone from any ProductLine/PO — this batch tests importing
 * Unimed's vetting register directly, not a transaction.
 *
 * KNOWN MODELLING QUESTION (not fixed here, flagged for Lewis): the
 * seeded "ISO 13485" EvidenceStandardDefinition currently has
 * appliesToStakeholderTypes = "MANUFACTURER" only. Every one of these 10
 * real suppliers is registered under a SUPPLIER-style role in Unimed's
 * own process, yet most of them hold ISO 13485. The evidence rows below
 * are still created (it's real evidence Unimed holds on file) but they
 * won't count toward the SUPPLIER-role approval gate as the standard is
 * currently scoped — worth deciding whether ISO 13485 should apply to
 * SUPPLIER too, given how common this is in the real register.
 *
 * Run from the repo root on a machine with a working DATABASE_URL:
 *   cd packages/db
 *   npm run import:supplier-register-test-batch
 */
import { prisma, withTenantContext } from "../src/index";

function normalizeStakeholderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(inc|ltd|llc|limited|corp|corporation|gmbh|plc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type IsoClaim = {
  standardName: "ISO 13485 — Medical Devices QMS Certificate" | "ISO 9001 — Quality Management System Certificate";
  referenceNumber: string | null;
  expiryDate: string; // ISO date
};

type SupplierSeed = {
  canonicalName: string;
  supplierCode: string; // MD/MLE/MLC/CnP, per the register's own "Lists" tab
  sourceTab: "Others Register" | "Yifeng Register" | "PENDING APPROVAL";
  /** Evidence status to use for every ISO claim below, independent of
   * expiry: "VERIFIED_OR_EXPIRED" computes VERIFIED vs EXPIRED from
   * today vs. expiryDate (used for the 8 already-approved-at-some-point
   * suppliers); "PENDING" is used for the 2 genuinely-not-yet-approved
   * PENDING APPROVAL suppliers, where the certificate was submitted but
   * never verified by QA yet. */
  evidenceStatusMode: "VERIFIED_OR_EXPIRED" | "PENDING";
  /** When known, the date Unimed's own process checked this supplier
   * (the register's "Approval date" column) — null where that tab
   * doesn't carry one, rather than guessing. */
  verifiedAt: string | null;
  isoClaims: IsoClaim[];
};

const SUPPLIERS: SupplierSeed[] = [
  {
    canonicalName: "365 Medical (Bunzl)", supplierCode: "CnP", sourceTab: "Others Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: "2022-09-13",
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: "3010586164", expiryDate: "2023-09-27" },
    ],
  },
  {
    canonicalName: "HK Wentworth Ltd (AF First Aid)", supplierCode: "MLC", sourceTab: "Others Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: "2022-09-13",
    isoClaims: [
      { standardName: "ISO 9001 — Quality Management System Certificate", referenceNumber: null, expiryDate: "2024-02-24" },
    ],
  },
  {
    canonicalName: "A&D Instruments", supplierCode: "MLE", sourceTab: "Others Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: "2023-06-26",
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: null, expiryDate: "2027-07-06" },
      { standardName: "ISO 9001 — Quality Management System Certificate", referenceNumber: null, expiryDate: "2026-05-08" },
    ],
  },
  {
    canonicalName: "Abdos Life Sciences Pvt Ltd", supplierCode: "CnP", sourceTab: "Others Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: "2025-07-07",
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: null, expiryDate: "2027-11-04" },
      { standardName: "ISO 9001 — Quality Management System Certificate", referenceNumber: null, expiryDate: "2027-11-04" },
    ],
  },
  {
    canonicalName: "AdLite Medical", supplierCode: "MLE", sourceTab: "Yifeng Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: null,
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: null, expiryDate: "2024-04-05" },
    ],
  },
  {
    canonicalName: "Aimmax Medical Products", supplierCode: "MLC", sourceTab: "Yifeng Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: null,
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: "3007594380 (2022)", expiryDate: "2028-02-23" },
    ],
  },
  {
    canonicalName: "AMCAREMED Technology", supplierCode: "MLE", sourceTab: "Yifeng Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: null,
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: null, expiryDate: "2024-10-20" },
    ],
  },
  {
    canonicalName: "Anhui Anyu", supplierCode: "MLC", sourceTab: "Yifeng Register",
    evidenceStatusMode: "VERIFIED_OR_EXPIRED", verifiedAt: null,
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: "3012359113 (2022)", expiryDate: "2023-08-07" },
    ],
  },
  {
    canonicalName: "AccuBio Tech Co. Ltd", supplierCode: "MLC", sourceTab: "PENDING APPROVAL",
    evidenceStatusMode: "PENDING", verifiedAt: null,
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: null, expiryDate: "2026-07-15" },
    ],
  },
  {
    canonicalName: "Alpha Labs", supplierCode: "MLC", sourceTab: "PENDING APPROVAL",
    evidenceStatusMode: "PENDING", verifiedAt: null,
    isoClaims: [
      { standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: null, expiryDate: "2027-10-15" },
      { standardName: "ISO 9001 — Quality Management System Certificate", referenceNumber: null, expiryDate: "2027-10-15" },
    ],
  },
];

async function main() {
  const orgNameFilter = process.argv[2] ?? "Unimed";
  const org = await prisma.organization.findFirst({ where: { name: { contains: orgNameFilter } } });
  if (!org) {
    throw new Error(`No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument.`);
  }
  console.log(`Importing Supplier Register test batch for organization "${org.name}" (${org.id})\n`);

  const now = new Date();

  await withTenantContext(org.id, async (tx) => {
    for (const s of SUPPLIERS) {
      const normalizedName = normalizeStakeholderName(s.canonicalName);

      let registryEntry = await tx.stakeholderRegistryEntry.findFirst({ where: { normalizedName } });
      if (!registryEntry) {
        registryEntry = await tx.stakeholderRegistryEntry.create({
          data: { normalizedName, legalName: s.canonicalName, stakeholderTypes: "SUPPLIER" },
        });
        console.log(`  [registry] created "${s.canonicalName}"`);
      } else {
        console.log(`  [registry] matched existing entry for "${s.canonicalName}"`);
      }

      let partner = await tx.partner.findFirst({ where: { organizationId: org.id, normalizedName } });
      if (!partner) {
        partner = await tx.partner.create({
          data: {
            organizationId: org.id,
            name: s.canonicalName,
            normalizedName,
            registryEntryId: registryEntry.id,
            approvalStatus: "PENDING",
          },
        });
        console.log(`  [partner]  created "${s.canonicalName}" (PENDING, code ${s.supplierCode}, from ${s.sourceTab})`);
      } else {
        console.log(`  [partner]  matched existing Partner for "${s.canonicalName}" (status: ${partner.approvalStatus})`);
      }

      const existingRole = await tx.partnerRole.findFirst({ where: { partnerId: partner.id, roleType: "SUPPLIER" } });
      if (!existingRole) {
        await tx.partnerRole.create({ data: { partnerId: partner.id, roleType: "SUPPLIER", isActive: true } });
        console.log(`  [role]     ${s.canonicalName} -> SUPPLIER`);
      }

      for (const claim of s.isoClaims) {
        const standard = await tx.evidenceStandardDefinition.findFirst({
          where: { organizationId: org.id, name: claim.standardName },
        });
        if (!standard) {
          console.log(`  [evidence] SKIPPED — standard "${claim.standardName}" not found (run seed:evidence-standards first)`);
          continue;
        }
        const existing = await tx.stakeholderEvidenceRecord.findFirst({
          where: { organizationId: org.id, partnerId: partner.id, standardId: standard.id },
        });
        if (existing) {
          console.log(`  [evidence] already on file: ${s.canonicalName} / ${claim.standardName}`);
          continue;
        }

        const expiry = new Date(claim.expiryDate);
        const status =
          s.evidenceStatusMode === "PENDING" ? "PENDING" : expiry < now ? "EXPIRED" : "VERIFIED";
        const notes =
          s.evidenceStatusMode === "PENDING"
            ? `TEST BATCH IMPORT. Source: Supplier Register "${s.sourceTab}" tab — certificate submitted by the supplier but not yet reviewed/verified by Unimed's QA team (this supplier is still awaiting its first approval decision).`
            : `TEST BATCH IMPORT. Source: Supplier Register "${s.sourceTab}" tab.` +
              (s.verifiedAt ? "" : " No specific verification date was recorded for this entry in that tab, only the certificate's own expiry.");

        await tx.stakeholderEvidenceRecord.create({
          data: {
            organizationId: org.id,
            partnerId: partner.id,
            standardId: standard.id,
            referenceNumber: claim.referenceNumber,
            expiryDate: expiry,
            status,
            verifiedAt: s.verifiedAt ? new Date(s.verifiedAt) : null,
            notes,
          },
        });
        console.log(
          `  [evidence] created: ${s.canonicalName} / ${claim.standardName} (${status}, exp ${claim.expiryDate})`,
        );
      }
    }
  });

  console.log("\nDone. All 10 should land PENDING in the QA Queue (none satisfy Unimed's full mandatory");
  console.log("evidence catalog from ISO certs alone). Check: the 2 PENDING APPROVAL suppliers' evidence");
  console.log("rows show status PENDING (not VERIFIED/EXPIRED) — they were submitted but never reviewed.");
  console.log("A&D Instruments should show ONE verified standard (ISO 13485) and one EXPIRED (ISO 9001)");
  console.log("on the same stakeholder — a real example of partial/mixed evidence validity.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
