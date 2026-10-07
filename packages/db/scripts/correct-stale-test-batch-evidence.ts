/**
 * One-off correction for stale StakeholderEvidenceRecord rows left behind
 * by the two test-batch import scripts (import-product-db-test-batch.ts,
 * import-supplier-register-test-batch.ts) across their several revisions.
 *
 * Both import scripts are intentionally idempotent via a "skip if a
 * record already exists for this (partner, standard) pair" check — safe
 * for avoiding duplicate creation, but it means a record created by an
 * EARLIER, less-complete run of a script never got refreshed when a
 * later run added expiry dates, corrected a mis-filed FDA number, or
 * introduced a new standard (ISO 14001 / FDA Registration). Found via a
 * live platform QA pass on 2026-10-07 (see
 * claude/product-db-test-batch-import.md for the full writeup):
 *
 *   - Taizhou Rich:   ISO 13485 has no expiry at all; FDA Registration missing entirely.
 *   - Zarys International: ISO 13485 has no expiry; ISO 14001 missing entirely.
 *   - Aimmax Medical Products: ISO 13485's referenceNumber field holds the
 *     FDA registration number by mistake (an earlier bug, fixed in the
 *     import scripts on 2026-10-07); FDA Registration missing entirely.
 *   - Anhui Anyu:     same ISO 13485 referenceNumber mistake; FDA Registration missing.
 *   - 365 Medical (Bunzl): same ISO 13485 referenceNumber mistake; FDA Registration missing.
 *
 * This script explicitly UPDATEs those 5 known-stale ISO 13485 records
 * and CREATEs the specific missing ISO 14001 / FDA Registration records
 * — it does not touch anything else, and does not change the import
 * scripts' own create-if-not-exists behaviour (still correct for new
 * stakeholders going forward). Safe to re-run: every step first checks
 * the record is still in the exact stale state expected (or, for
 * creates, still missing) before acting, so re-running after it has
 * already fixed things is a no-op, not a second write.
 *
 * Run from the repo root on a machine with a working DATABASE_URL:
 *   cd packages/db
 *   npm run fix:stale-test-batch-evidence
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

type IsoCorrection = {
  stakeholder: string;
  standardName: string;
  /** Expect the live record's referenceNumber to currently be one of
   * these (or already correct) before touching it — a safety check, not
   * a blind overwrite. */
  expectedCurrentReferenceNumber: string | null;
  correctReferenceNumber: string | null;
  correctExpiryDate: string; // ISO date
  correctVerifiedAt: string;
  correctNotes: string;
};

const ISO_CORRECTIONS: IsoCorrection[] = [
  {
    stakeholder: "Taizhou Rich", standardName: "ISO 13485 — Medical Devices QMS Certificate",
    expectedCurrentReferenceNumber: null,
    correctReferenceNumber: null, correctExpiryDate: "2026-12-15", correctVerifiedAt: "2026-07-10",
    correctNotes:
      "TEST BATCH IMPORT. Source: Supplier Register (Yifeng Register tab). " +
      "Corrected 2026-10-07: this record was created by an earlier script run before expiry tracking " +
      "was added to the test batch — backfilled the real expiry (15/12/2026) found in the register.",
  },
  {
    stakeholder: "Zarys International", standardName: "ISO 13485 — Medical Devices QMS Certificate",
    expectedCurrentReferenceNumber: null,
    correctReferenceNumber: "SX 2739190-1", correctExpiryDate: "2029-06-08", correctVerifiedAt: "2026-08-04",
    correctNotes:
      "TEST BATCH IMPORT. Source: Supplier Register (Others Register tab, registered as \"Zarys International " +
      "Group\") and the signed certificate PDF in SharePoint (NEW Suppliers Info/Zarys). " +
      "Corrected 2026-10-07: this record was created by an earlier script run before expiry/reference " +
      "tracking was added to the test batch — backfilled the real reference (SX 2739190-1) and expiry " +
      "(08/06/2029) found in the register and the signed certificate.",
  },
  {
    stakeholder: "Aimmax Medical Products", standardName: "ISO 13485 — Medical Devices QMS Certificate",
    expectedCurrentReferenceNumber: "3007594380 (2022)",
    correctReferenceNumber: null, correctExpiryDate: "2028-02-23", correctVerifiedAt: "2026-10-07",
    correctNotes:
      "TEST BATCH IMPORT. Source: Supplier Register (Yifeng Register tab). " +
      "Corrected 2026-10-07: this record's referenceNumber was mistakenly set to \"3007594380 (2022)\" by " +
      "an earlier script run — that is this supplier's separate FDA Registration number (its own column " +
      "in the register), not the ISO 13485 certificate's own reference, which the register doesn't give " +
      "separately. Cleared the field and logged the FDA number as its own FDA Registration evidence record instead.",
  },
  {
    stakeholder: "Anhui Anyu", standardName: "ISO 13485 — Medical Devices QMS Certificate",
    expectedCurrentReferenceNumber: "3012359113 (2022)",
    correctReferenceNumber: null, correctExpiryDate: "2023-08-07", correctVerifiedAt: "2026-10-07",
    correctNotes:
      "TEST BATCH IMPORT. Source: Supplier Register (Yifeng Register tab). " +
      "Corrected 2026-10-07: this record's referenceNumber was mistakenly set to \"3012359113 (2022)\" by " +
      "an earlier script run — that is this supplier's separate FDA Registration number (its own column " +
      "in the register), not the ISO 13485 certificate's own reference, which the register doesn't give " +
      "separately. Cleared the field and logged the FDA number as its own FDA Registration evidence record instead.",
  },
  {
    stakeholder: "365 Medical (Bunzl)", standardName: "ISO 13485 — Medical Devices QMS Certificate",
    expectedCurrentReferenceNumber: "3010586164",
    correctReferenceNumber: null, correctExpiryDate: "2023-09-27", correctVerifiedAt: "2022-09-13",
    correctNotes:
      "TEST BATCH IMPORT. Source: Supplier Register (Others Register tab). " +
      "Corrected 2026-10-07: this record's referenceNumber was mistakenly set to \"3010586164\" by an " +
      "earlier script run — that is this supplier's separate FDA Registration number (its own column in " +
      "the register), not the ISO 13485 certificate's own reference, which the register doesn't give " +
      "separately. Cleared the field and logged the FDA number as its own FDA Registration evidence record instead.",
  },
];

type FdaCreation = {
  stakeholder: string;
  referenceNumber: string;
  verifiedAt: string | null;
  sourceTab: string;
};

const FDA_CREATIONS: FdaCreation[] = [
  { stakeholder: "Taizhou Rich", referenceNumber: "3016826509 (2022)", verifiedAt: "2026-07-10", sourceTab: "Yifeng Register" },
  { stakeholder: "Aimmax Medical Products", referenceNumber: "3007594380 (2022)", verifiedAt: null, sourceTab: "Yifeng Register" },
  { stakeholder: "Anhui Anyu", referenceNumber: "3012359113 (2022)", verifiedAt: null, sourceTab: "Yifeng Register" },
  { stakeholder: "365 Medical (Bunzl)", referenceNumber: "3010586164", verifiedAt: "2022-09-13", sourceTab: "Others Register" },
];

type Iso14001Creation = {
  stakeholder: string;
  referenceNumber: string | null;
  expiryDate: string;
  verifiedAt: string;
  sourceTab: string;
};

const ISO14001_CREATIONS: Iso14001Creation[] = [
  {
    stakeholder: "Zarys International", referenceNumber: null, expiryDate: "2028-11-16", verifiedAt: "2026-08-04",
    sourceTab: 'Others Register tab, registered as "Zarys International Group"',
  },
];

async function main() {
  const orgNameFilter = process.argv[2] ?? "Unimed";
  const org = await prisma.organization.findFirst({ where: { name: { contains: orgNameFilter } } });
  if (!org) {
    throw new Error(`No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument.`);
  }
  console.log(`Correcting stale test-batch evidence for organization "${org.name}" (${org.id})\n`);

  const now = new Date();

  await withTenantContext(org.id, async (tx) => {
    console.log("--- ISO 13485 corrections ---");
    for (const c of ISO_CORRECTIONS) {
      const normalizedName = normalizeStakeholderName(c.stakeholder);
      const partner = await tx.partner.findFirst({ where: { organizationId: org.id, normalizedName } });
      if (!partner) {
        console.log(`  SKIPPED — no Partner found for "${c.stakeholder}"`);
        continue;
      }
      const standard = await tx.evidenceStandardDefinition.findFirst({
        where: { organizationId: org.id, name: c.standardName },
      });
      if (!standard) {
        console.log(`  SKIPPED — standard "${c.standardName}" not found (run seed:evidence-standards first)`);
        continue;
      }
      const record = await tx.stakeholderEvidenceRecord.findFirst({
        where: { organizationId: org.id, partnerId: partner.id, standardId: standard.id },
      });
      if (!record) {
        console.log(`  SKIPPED — no existing evidence record for ${c.stakeholder} / ${c.standardName} (expected a stale one to fix)`);
        continue;
      }
      if (record.referenceNumber !== c.expectedCurrentReferenceNumber) {
        console.log(
          `  SKIPPED — ${c.stakeholder} / ${c.standardName} referenceNumber is "${record.referenceNumber}", ` +
            `not the expected stale value "${c.expectedCurrentReferenceNumber}" (looks already corrected, or different than assumed) — leaving untouched`,
        );
        continue;
      }
      const expiry = new Date(c.correctExpiryDate);
      const status = expiry < now ? "EXPIRED" : "VERIFIED";
      await tx.stakeholderEvidenceRecord.update({
        where: { id: record.id },
        data: {
          referenceNumber: c.correctReferenceNumber,
          expiryDate: expiry,
          status,
          verifiedAt: new Date(c.correctVerifiedAt),
          notes: c.correctNotes,
        },
      });
      console.log(`  CORRECTED: ${c.stakeholder} / ${c.standardName} (${status}, exp ${c.correctExpiryDate})`);
    }

    console.log("\n--- FDA Registration creations (previously silently skipped) ---");
    for (const f of FDA_CREATIONS) {
      const normalizedName = normalizeStakeholderName(f.stakeholder);
      const partner = await tx.partner.findFirst({ where: { organizationId: org.id, normalizedName } });
      if (!partner) {
        console.log(`  SKIPPED — no Partner found for "${f.stakeholder}"`);
        continue;
      }
      const standard = await tx.evidenceStandardDefinition.findFirst({
        where: { organizationId: org.id, name: "FDA Registration" },
      });
      if (!standard) {
        console.log(`  SKIPPED — "FDA Registration" standard not found (run seed:evidence-standards first)`);
        continue;
      }
      const existing = await tx.stakeholderEvidenceRecord.findFirst({
        where: { organizationId: org.id, partnerId: partner.id, standardId: standard.id },
      });
      if (existing) {
        console.log(`  already on file: ${f.stakeholder} / FDA Registration — nothing to do`);
        continue;
      }
      await tx.stakeholderEvidenceRecord.create({
        data: {
          organizationId: org.id,
          partnerId: partner.id,
          standardId: standard.id,
          referenceNumber: f.referenceNumber,
          status: "VERIFIED",
          verifiedAt: f.verifiedAt ? new Date(f.verifiedAt) : null,
          notes: `TEST BATCH IMPORT. Source: Supplier Register "${f.sourceTab}" tab, "FDA Registration" column. Created 2026-10-07 as part of the stale-evidence correction pass — the original import run silently skipped this because the standard didn't exist in the catalog yet at that time.`,
        },
      });
      console.log(`  CREATED: ${f.stakeholder} / FDA Registration (VERIFIED, ${f.referenceNumber})`);
    }

    console.log("\n--- ISO 14001 creations (previously silently skipped) ---");
    for (const i of ISO14001_CREATIONS) {
      const normalizedName = normalizeStakeholderName(i.stakeholder);
      const partner = await tx.partner.findFirst({ where: { organizationId: org.id, normalizedName } });
      if (!partner) {
        console.log(`  SKIPPED — no Partner found for "${i.stakeholder}"`);
        continue;
      }
      const standard = await tx.evidenceStandardDefinition.findFirst({
        where: { organizationId: org.id, name: "ISO 14001 — Environmental Management System Certificate" },
      });
      if (!standard) {
        console.log(`  SKIPPED — "ISO 14001" standard not found (run seed:evidence-standards first)`);
        continue;
      }
      const existing = await tx.stakeholderEvidenceRecord.findFirst({
        where: { organizationId: org.id, partnerId: partner.id, standardId: standard.id },
      });
      if (existing) {
        console.log(`  already on file: ${i.stakeholder} / ISO 14001 — nothing to do`);
        continue;
      }
      const expiry = new Date(i.expiryDate);
      const status = expiry < now ? "EXPIRED" : "VERIFIED";
      await tx.stakeholderEvidenceRecord.create({
        data: {
          organizationId: org.id,
          partnerId: partner.id,
          standardId: standard.id,
          referenceNumber: i.referenceNumber,
          expiryDate: expiry,
          status,
          verifiedAt: new Date(i.verifiedAt),
          notes: `TEST BATCH IMPORT. Source: Supplier Register (${i.sourceTab}). Created 2026-10-07 as part of the stale-evidence correction pass — the original import run silently skipped this because the standard didn't exist in the catalog yet at that time.`,
        },
      });
      console.log(`  CREATED: ${i.stakeholder} / ISO 14001 (${status}, exp ${i.expiryDate})`);
    }
  });

  console.log("\nDone. Re-check Taizhou Rich, Zarys International, Aimmax Medical Products, Anhui Anyu,");
  console.log("and 365 Medical (Bunzl) in the UI — ISO 13485 should now show its real expiry with no FDA");
  console.log("number misfiled in its reference, and FDA Registration / ISO 14001 (Zarys only) should show");
  console.log("Verified with the real data instead of Missing.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
